# GitHub plugin guide

See your recent GitHub Actions runs on the island, and get notified about failed runs, review requests and mentions.

## What it shows

Open the island's **Notifications** page and select **Plugins**.

- **GitHub activity:** recent workflow runs from the repositories you list. The plugin reads the newest 5 runs of each repository, and the island shows the newest 8 overall.
- **Failed runs:** a notification for a listed run that failed, timed out or failed to start, if it was updated in the last 24 hours.
- **Review requests and mentions:** unread GitHub notifications for you or your team. These come from **every repository your token can read**, not only the ones you list.

Click a run or notification to open it on GitHub.

## Setup

### 1. Create a token

The plugin needs a **classic** personal access token.

1. On GitHub, open [Tokens (classic)](https://github.com/settings/tokens): profile picture, **Settings**, **Developer settings**, **Personal access tokens**, **Tokens (classic)**.
2. Select **Generate new token**, then **Generate new token (classic)**.
3. Enter a name such as `Skerry`, and choose an expiration date.
4. Select the **`notifications`** scope. For private repositories, also select **`repo`**.
5. Select **Generate token** and copy it. GitHub shows it only once.

> **Know what `repo` allows:** it gives full read and write access to every repository you can access, although this plugin only reads. Select it only if you need private repositories, set an expiration date, and treat the token like a password.

If an organization uses SAML single sign-on, also [authorize the token](https://docs.github.com/en/enterprise-cloud@latest/authentication/authenticating-with-single-sign-on/authorizing-a-personal-access-token-for-use-with-single-sign-on) for that organization.

### 2. Add it to Skerry

1. Open Skerry **Settings**, then **Plugins**.
2. If GitHub is under **Available**, select **Install**.
3. Turn on **Enable**.
4. Paste the token into **GitHub token** and select **Save**. The box empties after saving. This is expected.

### 3. Choose repositories

In **Repositories to watch**, enter names as `owner/repo`, separated by commas or spaces, then select **Save**. For example:

```text
octocat/Hello-World, your-name/your-project
```

Pasted `https://github.com/owner/repo` addresses also work. The plugin uses the first 15 valid repositories.

## Settings

| Setting | What it does | Default |
| --- | --- | --- |
| GitHub token | Signs requests to GitHub. Nothing is shown without it. | Empty |
| Repositories to watch | Chooses where workflow runs and failed runs come from. | Empty |
| Notify on review requests | Shows requests for your review. | On |
| Notify on mentions | Shows mentions of you or your team. | On |
| Notify on failed workflow runs | Shows failed runs from your listed repositories. | On |
| Refresh interval | How often to check: 1, 2 or 5 minutes. | 2 minutes |

**Refresh now** checks without waiting for the next interval. Saving a setting restarts the plugin.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Nothing appears | The plugin is enabled, a token is saved, and the **Plugins** section is selected on the Notifications page. |
| No workflow runs | Each repository is written as `owner/repo`, has GitHub Actions runs, and your token can read it. Private repositories need `repo`. |
| No review requests or mentions | The token is a classic token with `notifications` or `repo`, the matching toggle is on, and the notification is still unread on GitHub. |
| Everything disappeared | GitHub may have rejected the token (expired or revoked). Save a new one. |
| Updates have paused | GitHub may be limiting requests. The plugin waits, then resumes by itself. |

## Privacy

Plugins run as programs with your Windows account's access. The permissions shown in Settings are not enforced limits. What follows describes what this plugin's code does.

- The token is stored in Windows Credential Manager.
- The plugin sends requests only to `api.github.com`. Clicking an item opens `github.com` in your browser.
- To stop using the token, delete it under [Tokens (classic)](https://github.com/settings/tokens). Do this when you uninstall the plugin too.
