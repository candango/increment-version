import * as core from "@actions/core";
import * as github from "@actions/github";

try {
    const nameToGreet = core.getInput("who-to-greet");
    console.log(`Hello, ${nameToGreet}`);

    const paylod = github.context.payload;
    console.log(`Event dispached by: ${paylod.sender.login}`);
} catch (error) {
    core.setFailed(error.message);
}
