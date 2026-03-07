# ADR 0001: Version Increment Strategy

## Context and Problem Statement

The project needs a reliable and automated way to manage versioning during Continuous Integration (CI). Traditional methods (like updating a `package.json` file in a PR) often create "commit loops" or require complex permission setups.

## Decision Drivers

- **Simplicity**: The process should be straightforward for CI runners.
- **Security**: Minimize the use of long-lived Personal Access Tokens (PATs).
- **Auditability**: Versions should be clearly visible and tracked.

## Considered Options

1. **Local File Update**: Update `package.json` or a `.version` file and commit it back to the repo.
2. **Git Tags Only**: Derive version from the latest Git tag.
3. **GitHub Repository Variables**: Store the current version in a GitHub Action Variable.

## Decision Outcome

Chosen option: **GitHub Repository Variables**.

- **Why**: It allows for a single source of truth that is easily readable and writable via the GitHub API without modifying the repository's source code files during CI.
- **Authentication**: Use a **GitHub App** to generate short-lived tokens, which is more secure than using PATs.
- **Increment Logic**: The action will automatically increment the **patch** version (X.Y.Z → X.Y.Z+1).
- **Git Tagging**: After updating the variable, a Git tag (e.g., `v1.2.3`) will be created on the current commit to mark the release.

## Consequences

- **Good**: No "empty" commits just to update version files.
- **Good**: Better security via GitHub App tokens.
- **Bad**: Requires a one-time manual setup of a GitHub App and a repository variable (default: `CURRENT_VERSION`).
- **Bad**: Requires specific permissions (`variables:write`, `contents:write`) for the GitHub App.
