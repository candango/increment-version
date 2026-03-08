# Advanced Workflow Examples

This guide shows how to implement professional versioning cycles (Alpha -> Beta -> Stable) using this action.

## 1. Automated Pre-release Strategy

This workflow automatically determines the pre-release type based on the branch.

```yaml
name: Continuous Versioning
on:
  push:
    branches: [dev, staging, master]

jobs:
  version:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Calculate Release Type
        id: type
        run: |
          if [[ "${{ github.ref_name }}" == "dev" ]]; then
            echo "is_prerelease=true" >> $GITHUB_OUTPUT
            echo "type=a" >> $GITHUB_OUTPUT
          elif [[ "${{ github.ref_name }}" == "staging" ]]; then
            echo "is_prerelease=true" >> $GITHUB_OUTPUT
            echo "type=b" >> $GITHUB_OUTPUT
          else
            echo "is_prerelease=false" >> $GITHUB_OUTPUT
            echo "type=rc" >> $GITHUB_OUTPUT
          fi

      - uses: candango/increment-version@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          is-prerelease: ${{ steps.type.outputs.is_prerelease }}
          prerelease-type: ${{ steps.type.outputs.type }}
```

### How it works:
- **`dev` branch**: Produces `0.9.8a1`, `0.9.8a2`, etc.
- **`staging` branch**: When you merge `dev` to `staging`, it automatically transitions to `0.9.8b1`.
- **`master` branch**: When you merge `staging` to `master`, it stabilizes to `0.9.8` (stable).

---

## 2. Python (Firenado/Metadata) Example

For Python projects that use `__version__ = (x, y, z)` in `__init__.py`.

```yaml
- uses: candango/increment-version@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    language: 'python'
    file-path: 'firenado/__init__.py'
```

The action will update the tuple in `__init__.py` *inside the CI runner* before you run your build/publish commands.

---

## 3. JavaScript (npm) Example

For projects where `package.json` must be updated before `npm publish`.

```yaml
- uses: actions/checkout@v4
- uses: candango/increment-version@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    language: 'javascript'
- name: Publish to npm
  run: npm publish
```

The `package.json` is updated in-place, the build is published with the new version, and the Git Tag is created, all without a "Bump version" commit.
