import * as core from "@actions/core";
import { exec } from "@actions/exec";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

async function run(): Promise<void> {
    try {
        await exec("git", ["config", "user.name", "Github Actions"]);
        await exec("git", ["config", "user.email", "actions@github.com"]);
        
        const appId: string = core.getInput("app-id", {required: true});
        const privateKey: string = core.getInput("private-key", {required: true});
        const octokit = new Octokit({
            authStrategy: createAppAuth,
            auth: {appId, privateKey}
        });

        const installation = await octokit.apps.getAuthenticated();

        // If we need to use the token directly, we can do using this method
        // const appToken: string = installationToken.token;
        // const tokenOctokit = new Octokit({ auth: appToken });
        // const { data: repoVar } = await tokenOctokit.request('GET /repos/{owner}/{repo}/actions/variables/{name}', {
        //     owner: process.env.GITHUB_REPOSITORY!.split('/')[0],
        //     repo: process.env.GITHUB_REPOSITORY!.split('/')[1],
        //     name: currentVersionVar
        // });
        const owner: string =  process.env.GITHUB_REPOSITORY!.split("/")[0];
        const repo: string =  process.env.GITHUB_REPOSITORY!.split("/")[1];
        const { data: installationToken } =  await octokit.apps.getRepoInstallation({
            owner,
            repo
        });
        const installationId: number = (installation.data?.id) as number;
        const installationOctokit = new Octokit({
            authStrategy: createAppAuth,
            auth: { appId, privateKey, installationId }
        });


        core.setOutput("owner", owner);
        core.setOutput("repo", repo);
        const currentVersionVar: string = core.getInput("current-version-variable");
        const { data: repoVar } = await installationOctokit.request("GET /repos/{owner}/{repo}/actions/variables/{name}", {
            owner: owner,
            repo: repo,
            name: currentVersionVar
        });
        
        let currentVersion: string = repoVar.value;
        let [major, minor, patch]: number[] = currentVersion.split(".").map(Number);
        patch += 1;
        const newVersion: string = `${major}.${minor}.${patch}`;

        await installationOctokit.request("PATCH /repos/{owner}/{repo}/actions/variables/{name}", {
            owner: owner,
            repo: repo,
            name: currentVersionVar,
            value: newVersion
        });

        core.setOutput("new-version", newVersion);
    } catch (error: any) {
        core.setFailed(`Action failed: ${error.message}`);
    }

}

run();
