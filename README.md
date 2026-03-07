# Candango Increment Version Action

A GitHub Action that automates version incrementing for Continuous Integration (CI) workflows.

## Features

- **Automated Version Increment**: Automatically increments the patch version (X.Y.Z+1).
- **GitHub App Authentication**: Uses GitHub App tokens for secure API access.
- **Repository Variables**: Reads and updates version stored in GitHub Repository Variables.
- **Tagging**: Automatically creates and pushes a git tag for the new version.

## Architecture

This action is written in TypeScript and uses `esbuild` for bundling.

1. **Authentication**: Authenticates as a GitHub App installation to gain necessary permissions.
2. **Retrieve Current Version**: Fetches a specific repository variable (default: `CURRENT_VERSION`) from the GitHub API.
3. **Increment Logic**: Parses the version string and increments the patch version.
4. **Update Variable**: Writes the new version back to the repository variable.
5. **Git Tag**: Tags the current commit with the new version and pushes it to the remote repository.

## Inputs

| Input | Description | Required | Default |
|---|---|---|---|
| `app-id` | GitHub App ID used to generate the token | Yes | - |
| `private-key` | GitHub App private key | Yes | - |
| `current-version-variable` | Name of the repository variable containing the version | No | `CURRENT_VERSION` |

## Outputs

| Output | Description |
|---|---|
| `owner` | Repository owner |
| `repo` | Repository name |
| `new-version` | The newly generated version |

## Automation Guide (for Agents)

When interacting with this repository, agents should:
- Follow the established **ADRs** in `docs/adr/` for architectural decisions.
- Maintain the **CHANGELOG.md** following the "Keep a Changelog" standard.
- Use `npm run build` to update the `dist/` folder after any changes to `index.ts`.

## Documentation

- [Architecture Decision Records (ADRs)](docs/adr/)
- [Changelog](CHANGELOG.md)

## License

MIT
