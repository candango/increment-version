# Setup Guide: Candango Increment Version

To use this action, you need to choose an authentication method and set up a repository variable to store the version.

## 1. Choose Your Authentication Method

### Option A: The Secure Way (GitHub App) - Recommended
Best for multi-repository automation and high security.

1. **Create a GitHub App**:
   - Go to your organization or account **Settings > Developer settings > GitHub Apps**.
   - Click **New GitHub App**.
   - Set a name (e.g., `My-Versioning-Bot`) and a homepage URL (any URL will do).
   - **Permissions**:
     - `Repository permissions > Actions`: **Read and write** (to manage variables).
     - `Repository permissions > Contents`: **Read and write** (to push tags).
   - **Save** the app and note the **App ID**.
2. **Generate Private Key**:
   - In the app settings, scroll down to **Private keys** and click **Generate a private key**.
   - Download the `.pem` file and copy its entire content.
3. **Install the App**:
   - Go to **Install App** in the sidebar and install it on the repositories you want to automate.
4. **Configure Secrets**:
   - In your repository **Settings > Secrets and variables > Actions**, add:
     - `APP_ID`: Your GitHub App ID.
     - `APP_PRIVATE_KEY`: The entire content of the `.pem` file.

### Option B: The Quick Way (Direct Token)
Best for quick prototyping or single-repo use.

1. **Get a Token**:
   - Use a **Personal Access Token (PAT)** with `contents:write` and `actions:write` permissions.
   - Or use the default `secrets.GITHUB_TOKEN` (ensure your workflow has `permissions: contents: write` and `actions: write`).
2. **Configure Secret**:
   - Add the token as a secret (e.g., `MY_GITHUB_TOKEN`).

---

## 2. Initialize the Version Variable

This action relies on a **GitHub Repository Variable** to track the current version.

1. Go to your repository **Settings > Secrets and variables > Actions > Variables**.
2. Click **New repository variable**.
3. Name: `CURRENT_VERSION` (or your custom name).
4. Value: `0.1.0` (your starting version).

---

## 3. Basic Workflow Example

```yaml
name: Release Version
on:
  push:
    branches: [master]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: candango/increment-version@v1
        with:
          # Use ONE of the following:
          # A) GitHub App Auth
          app-id: ${{ vars.APP_ID }}
          private-key: ${{ secrets.APP_PRIVATE_KEY }}
          # OR B) Direct Token Auth
          # github-token: ${{ secrets.MY_PAT_OR_GITHUB_TOKEN }}
          
          # Optional: Configure language
          language: 'python'
          file-path: 'src/my_app/__init__.py'
```

For advanced pre-release (alpha/beta) workflows, see the **[Examples Section](docs/examples.md)**.
