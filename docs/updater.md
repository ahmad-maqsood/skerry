# In-App Updates

The island checks for updates, downloads, installs, and restarts automatically within the app.

- **Automatic updates (enabled by default)**: Settings -> "About" -> "Automatic updates", stored in `skerry-auto-update`. When enabled, the main window (`src/features/updater/updaterController.ts`) checks once after startup, then every 3 hours (single `setTimeout`, no polling); check or download failures retry with 1, 5, and 30-minute backoffs before returning to 3 hours (`autoUpdateSchedule.ts`); background download failures do not enter an error state, remaining at "New version available" with failure details so todos appear normally and clicking "Update" restarts the download; proxies are re-read before every check. Once downloaded, an "Update to vX.Y.Z" task appears at the top of the todo list; when the island is in collapsed state (including tucked or hidden to tray) and receives no pointer or keyboard activity for 1 minute, `useIdleUpdateInstall` executes the installation (NSIS passive mode), and the installer relaunches the island upon completion. Expanding panels, hovering, or typing resets the idle timer, and auto-install is suppressed during fullscreen games.
- **Disabling automatic updates**: Disables automatic background checks and automatic installations.
- **Update section on About page**: Always displays current status (not checked yet, checking, up to date, new version available, download progress, ready to install, error and reason) and a "Check now" button regardless of toggle state; adds an "Install now" button when an update is downloaded. Users who disable the todo page can still update here.
- Deleting the update todo only dismisses the reminder from the list; downloaded packages are retained. Downloads take place exclusively in the main window; the standalone settings window mirrors status and forwards actions to the main window.
- When an update is ready, red notification dots appear on the "Todos" icon and the "Update" button on the island (`updateDot.ts`).

Implementation relies on Tauri 2 `tauri-plugin-updater`. All update packages are signed with minisign and verified against a built-in public key; packages with mismatched signatures will not be installed.

## Releasing

Releases are built, signed, and published entirely via GitHub Actions. Maintainers never build or sign binaries on local workstations.

### Building or publishing a release

1. Open GitHub repository -> **Actions** -> **Release** -> **Run workflow**.
2. **Version**: type the new version (`1.4.0`, `1.4.0-beta.1`, or `patch` / `minor` / `major`). The workflow updates `package.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` and `src-tauri/tauri.conf.json` for you. Leave it empty to release the version already in the files. A typo fails in the first seconds, before anything is built.
3. Tick **Publish a GitHub release** to publish. Leave it unticked for a quick trial build.
4. Click **Run workflow**.

Nothing needs to be done on your own computer. When you publish with a version typed in, the workflow commits `Bump version to X` to the branch it runs on after the checks pass and before the build, then creates the release from that commit. If a run fails after that, start it again with the same version; it is accepted as is. (`pnpm bump` still exists for doing the same by hand: `node scripts/release/bump-version.mjs 1.4.0`.)

Either way the workflow checks the signing secrets first. Clippy and the Rust tests are not run here: CI runs them on every push to `main`, so check that CI is green for the commit you release.

- **Unticked** (trial): builds and signs only the NSIS installer (`.exe` and its `.sig`, plus `SHA256SUMS.txt`) and attaches them to the workflow run as a `skerry-installers` download (kept 7 days). There is no MSI and no `latest.json`, so a trial build cannot be published. Nothing is published and no tag is created. Locally: `node scripts/release/release.mjs --no-upload --nsis-only`.
- **Ticked**: runs `pnpm check`, builds signed NSIS and MSI installers with their `.sig` files, `latest.json` and `SHA256SUMS.txt`, then creates tag and release `vX.Y.Z` with an automatic description (see below). A version containing `-` (for example `0.1.0-beta.1`) is published as a pre-release that the in-app updater ignores. An existing release is never overwritten; bump the version instead.

### The release description

The description of a published release is written automatically by `scripts/release/release-notes.mjs`; nobody edits it by hand:

- **What's new**: the commits since the previous release tag, grouped into *Added*, *Fixed*, *Changed* and *Maintenance* (from the first word of the commit message, or a `feat:` / `fix:` / `docs:` / `chore:` prefix), each linking to its commit. Merge, version-bump and screenshot-refresh commits are left out. The same text is the notes the in-app update dialog shows (`latest.json`). A stable release covers everything since the last stable release; a pre-release since the last tag.
- **Downloads**: the NSIS and MSI installers with their SHA-256 checksums, how to verify them, and a reminder that installed copies update themselves.
- **Full changelog**: a link comparing the previous tag with this one.
- To write the first part yourself, commit `docs/releases/vX.Y.Z.md` before releasing; its text replaces the generated list. Preview the description for the current version with `node scripts/release/release-notes.mjs`.
- The release workflow checks out the full history and tags so the commit list is complete.

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
