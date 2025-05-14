import * as core from "@actions/core";
import { exec } from "@actions/exec";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
// import { resolve } from "path";

async function run(): Promise<void> {
    try {
        await exec("git", ["config", "user.name", "Github Actions"]);
        await exec("git", ["config", "user.email", "actions@github.com"]);
        
        const appId: string = core.getInput("app-id", {required: true});
        const privateKey: string = core.getInput("private-key", {required: true});

        const auth = createAppAuth({
            appId: appId,
            privateKey: privateKey
        });

        const appAuthentication = await auth({ type: "app" });

        const octokit = new Octokit({
            auth: appAuthentication.token
        });

        const owner: string =  process.env.GITHUB_REPOSITORY!.split("/")[0];
        const repo: string =  process.env.GITHUB_REPOSITORY!.split("/")[1];

        core.setOutput("owner", owner);
        core.setOutput("repo", repo);
        const currentVersionVar: string = core.getInput("current-version-variable");
        const { data: repoVar } = await octokit.request("GET /repos/{owner}/{repo}/actions/variables/{name}", {
            owner: owner,
            repo: repo,
            name: currentVersionVar
        });

        let currentVersion: string = repoVar.value;
        let [major, minor, patch]: number[] = currentVersion.split(".").map(Number);
        patch += 1;
        const newVersion: string = `${major}.${minor}.${patch}`;

        await octokit.request("PATCH /repos/{owner}/{repo}/actions/variables/{name}", {
            owner: owner,
            repo: repo,
            name: currentVersionVar,
            value: newVersion
        });

        await octokit.request("DELETE /installation/token", {
            headers: {
                auth: appAuthentication.token
            }
        });

        core.setOutput("new-version", newVersion);
    } catch (error: any) {
        core.setFailed(`Action failed: ${error.message}`);
    }

}

run();
