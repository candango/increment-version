import * as core from "@actions/core";
import { exec } from "@actions/exec";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import * as fs from "fs";

class Version {
    major: number;
    minor: number;
    patch: number;
    prerelease?: { type: string; number: number };

    constructor(versionString: string) {
        const match = versionString.match(/^(\d+)\.(\d+)\.(\d+)(?:([a-z]+)(\d+))?$/i);
        if (!match) {
            throw new Error(`Invalid version format: ${versionString}`);
        }

        this.major = parseInt(match[1]);
        this.minor = parseInt(match[2]);
        this.patch = parseInt(match[3]);
        if (match[4]) {
            this.prerelease = {
                type: match[4].toLowerCase(),
                number: parseInt(match[5])
            };
        }
    }

    increment(level: string, isPrerelease: boolean, prereleaseType: string): void {
        if (isPrerelease) {
            if (this.prerelease) {
                if (this.prerelease.type === prereleaseType) {
                    this.prerelease.number += 1;
                } else {
                    this.prerelease.type = prereleaseType;
                    this.prerelease.number = 1;
                }
            } else {
                if (level === "major") this.major += 1;
                else if (level === "minor") this.minor += 1;
                else this.patch += 1;
                this.prerelease = { type: prereleaseType, number: 1 };
            }
        } else {
            if (this.prerelease) {
                this.prerelease = undefined;
            } else {
                if (level === "major") {
                    this.major += 1;
                    this.minor = 0;
                    this.patch = 0;
                } else if (level === "minor") {
                    this.minor += 1;
                    this.patch = 0;
                } else {
                    this.patch += 1;
                }
            }
        }
    }

    toString(): string {
        let base = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease) {
            base += `${this.prerelease.type}${this.prerelease.number}`;
        }
        return base;
    }

    toSemVer(): string {
        let base = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease) {
            base += `-${this.prerelease.type}.${this.prerelease.number}`;
        }
        return base;
    }

    toPythonTuple(): string {
        return `(${this.major}, ${this.minor}, ${this.patch}${this.prerelease ? `, '${this.prerelease.type}${this.prerelease.number}'` : ""})`;
    }
}

interface VersionProvider {
    updateMetadata(newVersion: Version, filePath?: string): Promise<void>;
}

class PythonProvider implements VersionProvider {
    async updateMetadata(newVersion: Version, filePath?: string): Promise<void> {
        const target = filePath || "__init__.py";
        if (!fs.existsSync(target)) {
            core.warning(`Python version file not found: ${target}. Skipping file update.`);
            return;
        }

        let content = fs.readFileSync(target, "utf8");
        content = content.replace(/__version__\s*=\s*\([^)]+\)/, `__version__ = ${newVersion.toPythonTuple()}`);
        content = content.replace(/version\s*=\s*["'][^"']+["']/, `version = "${newVersion.toString()}"`);
        fs.writeFileSync(target, content);
        core.info(`Updated Python metadata in ${target}`);
        core.debug(`New content: ${content}`);
    }
}

class JavaScriptProvider implements VersionProvider {
    async updateMetadata(newVersion: Version): Promise<void> {
        if (!fs.existsSync("package.json")) {
            core.warning("package.json not found. Skipping file update.");
            return;
        }
        // npm version requires standard SemVer
        await exec("npm", ["version", newVersion.toSemVer(), "--no-git-tag-version"]);
        core.info(`Updated JavaScript metadata in package.json using SemVer: ${newVersion.toSemVer()}`);
    }
}

class GenericProvider implements VersionProvider {
    async updateMetadata(): Promise<void> {
        core.info("Generic project detected. Skipping file metadata update.");
    }
}

async function run(): Promise<void> {
    try {
        await exec("git", ["config", "user.name", "Github Actions"]);
        await exec("git", ["config", "user.email", "actions@github.com"]);
        
        const owner: string =  process.env.GITHUB_REPOSITORY!.split("/")[0];
        const repo: string =  process.env.GITHUB_REPOSITORY!.split("/")[1];

        const githubToken: string = core.getInput("github-token");
        const appId: string = core.getInput("app-id");
        const privateKey: string = core.getInput("private-key");

        let authToken: string;

        if (appId && privateKey) {
            core.info("Authenticating using GitHub App...");
            const auth = createAppAuth({ appId, privateKey });
            const appOctokit = new Octokit({
                authStrategy: createAppAuth,
                auth: { appId, privateKey }
            });

            const { data: installation } = await appOctokit.apps.getRepoInstallation({ owner, repo });
            const installationAuth = await auth({ type: "installation", installationId: installation.id });
            authToken = installationAuth.token;
            core.setSecret(authToken);
        } else if (githubToken) {
            core.info("Authenticating using provided GitHub Token...");
            authToken = githubToken;
            core.setSecret(authToken);
        } else {
            core.setFailed("Authentication failed: No 'github-token' or 'app-id'/'private-key' provided.");
            return;
        }

        const octokit = new Octokit({ auth: authToken });

        core.setOutput("owner", owner);
        core.setOutput("repo", repo);

        const currentVersionVar: string = core.getInput("current-version-variable");
        const language: string = core.getInput("language");
        const filePath: string = core.getInput("file-path");
        const incrementLevel: string = core.getInput("increment-level");
        const isPrerelease: boolean = core.getInput("is-prerelease") === "true";
        const prereleaseType: string = core.getInput("prerelease-type");

        try { 
            core.info(`Fetching current version from variable: ${currentVersionVar}`);
            const { data: repoVar } = await octokit.request("GET /repos/{owner}/{repo}/actions/variables/{name}", {
                owner, repo, name: currentVersionVar,
                headers: { "X-GitHub-Api-Version": "2022-11-28" }
            });

            const currentVersion = new Version(repoVar.value);
            core.info(`Current version is: ${currentVersion.toString()}`);
            
            currentVersion.increment(incrementLevel, isPrerelease, prereleaseType);
            const newVersionStr = currentVersion.toString();
            core.info(`New version will be: ${newVersionStr}`);

            let provider: VersionProvider;
            const detectedLang = language === "auto" ? detectLanguage() : language;
            core.info(`Detected language: ${detectedLang}`);

            switch (detectedLang) {
                case "python": provider = new PythonProvider(); break;
                case "javascript":
                case "typescript": provider = new JavaScriptProvider(); break;
                default: provider = new GenericProvider();
            }

            await provider.updateMetadata(currentVersion, filePath);

            core.info(`Updating repository variable ${currentVersionVar} to ${newVersionStr}`);
            await octokit.request("PATCH /repos/{owner}/{repo}/actions/variables/{name}", {
                owner, repo, name: currentVersionVar, value: newVersionStr,
                headers: { "X-GitHub-Api-Version": "2022-11-28" }
            });

            core.setOutput("new-version", newVersionStr);

            try {
                core.info(`Creating Git tag: v${newVersionStr}`);
                await exec("git", ["tag", `v${newVersionStr}`]); 
                const remoteRepo = `https://x-access-token:${authToken}@github.com/${owner}/${repo}.git`;
                await exec("git", ["remote", "set-url", "origin", remoteRepo]);
                await exec("git", ["push", "origin", `v${newVersionStr}`]); 
                core.info("Git push successful.");
            } catch (error: any) {
                core.setFailed(`Failed tagging repository head: ${error.message}`);
                return;
            }
        } catch(error: any) {
            core.setFailed(`Action failed during versioning logic: ${error.message}`);
        }

        if (appId && privateKey) {
            try { 
                await octokit.request("DELETE /installation/token", {
                    headers: { "X-GitHub-Api-Version": "2022-11-28" }
                });
            } catch(error: any) {
                core.warning(`Failed deleting the installation token: ${error.message}`);
            }
        }
    } catch (error: any) {
        core.setFailed(`Action failed during initialization: ${error.message}`);
    }
}

function detectLanguage(): string {
    if (fs.existsSync("package.json")) return "javascript";
    if (fs.existsSync("__init__.py") || fs.existsSync("pyproject.toml")) return "python";
    if (fs.existsSync("go.mod")) return "go";
    return "generic";
}

run();
