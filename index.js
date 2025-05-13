import * as core from "@actions/core";
import * as github from "@actions/github";

try {
    const currentVersion = core.getInput("current-version");
    console.log(`The current version is:  ${currentVersion}`);

    const paylod = github.context.payload;
    console.log(`Event dispached by: ${paylod.sender.login}`);
} catch (error) {
    core.setFailed(error.message);
}
