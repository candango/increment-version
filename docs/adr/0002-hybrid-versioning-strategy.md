# ADR 0002: Hybrid Versioning Strategy (Ghost Updates)

## Context and Problem Statement

For Python (e.g., Firenado) and JS/TS projects, build systems (`setuptools`, `npm`) require the version metadata to be present in files like `__init__.py` or `package.json` at build time. However, updating these files via CI leads to "commit loops" or "dirty" Git history full of "Bump version" commits.

## Decision Drivers

- **Clean Git History**: No automated commits for version bumps.
- **Accuracy**: Build artifacts (wheels, npm packages) must have the correct version.
- **Single Source of Truth**: GitHub Repository Variables + Git Tags as the final authority.

## Decision Outcome

Chosen option: **Ghost In-place Update Strategy**.

### The Workflow

1. **Source of Truth**: The GitHub Action reads the current version from a **GitHub Repository Variable**.
2. **Increment**: The Action calculates the next version (patch/minor/major).
3. **Ghost Update**: The Action modifies the metadata file (`__init__.py`, `package.json`, etc.) **only within the CI runner environment**. 
   - Uses `sed` or specialized scripts to replace `__version__ = (...)` or `"version": "..."`.
4. **Build/Publish**: The project's build command is executed. The resulting artifacts contain the new version.
5. **Tagging**: The Action creates and pushes a **Git Tag** (e.g., `v0.9.7`) for the current commit.
6. **Variable Sync**: The Action updates the GitHub Repository Variable with the new version for the next run.

### Language-specific Implementation

- **Python**: Identify the file containing `__version__` and replace the tuple/string.
- **JS/TS**: Use `npm version <new-version> --no-git-tag-version` to update `package.json` locally.
- **Go**: No file update needed; just Git Tagging.

## Consequences

- **Good**: Git history remains 100% clean of bot-generated version commits.
- **Good**: Full compatibility with standard build tools and registries.
- **Neutral**: The code in the `master` branch may have a lagging or placeholder version (e.g., `0.0.0-dev`). Developers are encouraged to use `importlib.metadata` (Python) or similar to read the version at runtime.
- **Bad**: Requires the CI to have permission to overwrite local files and push tags.
