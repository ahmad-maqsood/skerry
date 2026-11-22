# In-App Updates

The island checks for updates, downloads, installs, and restarts automatically within the app.

- **Automatic updates (enabled by default)**: Settings -> "About" -> "Automatic updates", stored in `skerry-auto-update`. When enabled, the main window (`src/features/updater/updaterController.ts`) checks once after startup, then every 6 hours (single `setTimeout`, no polling); check or download failures retry with 1, 5, and 30-minute backoffs before returning to 6 hours; background download failures do not enter an error state, remaining at "New version available" with failure details so todos appear normally and clicking "Update" restarts the download; proxies are re-read before every check. Once downloaded, an "Update to vX.Y.Z" task appears at the top of the todo list; when the island is in collapsed state (including tucked or hidden to tray) and receives no pointer or keyboard activity for 2 minutes, `useIdleUpdateInstall` executes the installation (NSIS passive mode), and the installer relaunches the island upon completion. Expanding panels, hovering, or typing resets the idle timer, and auto-install is suppressed during fullscreen games.
- **Disabling automatic updates**: Disables automatic background checks and automatic installations.
- **Update section on About page**: Always displays current status (not checked yet, checking, up to date, new version available, download progress, ready to install, error and reason) and a "Check now" button regardless of toggle state; adds an "Install now" button when an update is downloaded. Users who disable the todo page can still update here.
- Deleting the update todo only dismisses the reminder from the list; downloaded packages are retained. Downloads take place exclusively in the main window; the standalone settings window mirrors status and forwards actions to the main window.
- When an update is ready, red notification dots appear on the "Todos" icon and the "Update" button on the island (`updateDot.ts`).

Implementation relies on Tauri 2 `tauri-plugin-updater`. All update packages are signed with minisign and verified against a built-in public key; packages with mismatched signatures will not be installed.

## Releasing

Releases are built, signed, and published entirely via GitHub Actions. Maintainers never build or sign binaries on local workstations.

### Building or publishing a release

1. Set the version once: `node scripts/release/bump-version.mjs patch` (or `minor`, `major`), then commit and push it. The version must match in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`.
2. Open GitHub repository -> **Actions** -> **Release** -> **Run workflow**.
3. Tick **Publish a GitHub release** to publish. Leave it unticked to only build.
4. Click **Run workflow**.

Either way the workflow checks the signing secrets, runs `pnpm check` and Clippy, then builds signed NSIS (`.exe`) and MSI (`.msi`) installers with `.sig` files, `latest.json` and `SHA256SUMS.txt`.

- **Unticked**: the files are attached to the workflow run as a `skerry-installers` download (kept 7 days). Nothing is published and no tag is created.
- **Ticked**: also creates tag and release `vX.Y.Z` with generated notes. A version containing `-` (for example `0.1.0-beta.1`) is published as a pre-release that the in-app updater ignores. An existing release is never overwritten; bump the version instead.


### Troubleshooting Releases

- **Missing release secrets**:
  - The workflow will fail early with an error listing the missing secret name(s): `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, or `TAURI_UPDATER_PUBKEY`.
  - Fix: Navigate to **Settings** -> **Secrets and variables** -> **Actions** in your GitHub repository and add each required repository secret.
- **Workflow lacks write permissions (403 on git push or release create)**:
  - If publishing fails creating the release, ensure GitHub Actions has write access.
  - Fix: In repository **Settings** -> **Actions** -> **General** -> **Workflow permissions**, select **Read and write permissions**.
- **Signature mismatch after update**:
  - Occurs if `TAURI_UPDATER_PUBKEY` injected during release does not match the public key embedded in installed app builds.
  - Fix: Ensure the same key pair is used across releases. If a new key pair must be adopted, existing users must install the new release manually once.

## Update Manifest and Endpoints

The in-app updater operates on a single stable channel that checks:
`https://github.com/ahmad-maqsood/skerry/releases/latest/download/latest.json`

- **Pre-releases**: Pre-releases (versions containing `-`, such as `v0.1.0-beta.1`) are published with the GitHub pre-release flag. GitHub does not mark pre-releases as `latest`, ensuring existing stable users are never automatically upgraded to pre-releases.
- **Manifest structure**: `latest.json` specifies version, notes, publication date, and platform payloads for `windows-x86_64`, `windows-x86_64-nsis`, and `windows-x86_64-msi` with respective download URLs and cryptographic signatures.

## Signing Keys

Update packages must be signed with a private key, verified by the app's embedded public key. **Private keys are never committed to the repository** and remain securely stored in repository secrets.

Generate a key pair once before setting up releases:

```powershell
pnpm tauri signer generate -w $env:USERPROFILE\.tauri\skerry.key
```

This generates `skerry.key` (private key) and `skerry.key.pub` (public key):
- `TAURI_SIGNING_PRIVATE_KEY`: Content of `skerry.key`.
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: Passphrase used when generating the key (empty string if none).
- `TAURI_UPDATER_PUBKEY`: Content of `skerry.key.pub`.
