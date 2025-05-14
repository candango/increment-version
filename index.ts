import * as core from "@actions/core";
import { exec } from "@actions/exec";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
// import { resolve } from "path";

async function run(): Promise<void> {
    try {
        await exec("git", ["config", "user.name", "Github Actions"]);
        await exec("git", ["config", "user.email", "actions@github.com"]);
        
        const owner: string =  process.env.GITHUB_REPOSITORY!.split("/")[0];
        const repo: string =  process.env.GITHUB_REPOSITORY!.split("/")[1];
        const appId: string = core.getInput("app-id", {required: true});
        const privateKey: string = core.getInput("private-key", {required: true});

        const auth = createAppAuth({
            appId: appId,
            privateKey: privateKey
        });

        const appOctokit = new Octokit({
            authStrategy: createAppAuth,
            auth: {
                appId: appId,
                privateKey: privateKey
            }
        });

        let installationId: number;
        try {
            const { data: installation } = await appOctokit.apps.getRepoInstallation({
                owner,
                repo
            });

            installationId = installation.id;
        } catch (error: any) {
            core.setFailed(`Get repo installation failed: ${error.message}. Check if the application is installed at repo ${owner}/${repo}`);
            return
        }

        const installationAuth = await auth({ type: "installation", installationId });
        const octokit = new Octokit({
            auth: installationAuth.token
        });

        core.setOutput("owner", owner);
        core.setOutput("repo", repo);

        const currentVersionVar: string = core.getInput("current-version-variable");
        try { 
            const { data: repoVar } = await octokit.request("GET /repos/{owner}/{repo}/actions/variables/{name}", {
                owner: owner,
                repo: repo,
                name: currentVersionVar,
                headers: {
                    "X-GitHub-Api-Version": "2022-11-28"
                }
            });

            let currentVersion: string = repoVar.value;
            let [major, minor, patch]: number[] = currentVersion.split(".").map(Number);
            patch += 1;
            const newVersion: string = `${major}.${minor}.${patch}`;

            try { 
                await octokit.request("PATCH /repos/{owner}/{repo}/actions/variables/{name}", {
                    owner: owner,
                    repo: repo,
                    name: currentVersionVar,
                    value: newVersion,
                    headers: {
                        "X-GitHub-Api-Version": "2022-11-28"
                    }
                });
            } catch(error: any) {
                core.setFailed(`Change repo variable failed: ${error.message}`);
            }


            core.setOutput("new-version", newVersion);
        } catch(error: any) {
            core.setFailed(`Get repo variable failed: ${error.message}`);
        }

        try { 
            await octokit.request("DELETE /installation/token", {
                headers: {
                    "X-GitHub-Api-Version": "2022-11-28"
                }
            });
        } catch(error: any) {
            core.setFailed(`Failed deleting the installation token: ${error.message}`);
        }
    } catch (error: any) {
        core.setFailed(`Action failed: ${error.message}`);
    }

}

run();
