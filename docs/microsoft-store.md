# Publishing to the Microsoft Store

The `Microsoft Store package` workflow (`.github/workflows/msix.yml`) builds
the app on a GitHub runner and wraps it in an MSIX package with
`scripts/build-msix.ps1`. Nothing needs to be built locally.

The package is unsigned on purpose: when you upload an MSIX, the Store signs it
for free, so no code-signing certificate is needed.

## The Store build has no in-app updater

A packaged app cannot replace itself; the Store delivers updates. The workflow
builds with `src-tauri/tauri.store.conf.json`, which clears the updater public
key. `updater_configured` then reports false, the updater stays disabled
("This build can't update itself") and no update check runs. GitHub installers
are built by `release.yml` without this overlay and keep the updater.

## One-time setup

1. Create a free individual developer account in Partner Center and reserve the
   app name (new product -> MSIX or PWA app).
2. In Partner Center open Product management -> Product identity and copy the
   three values.
3. In GitHub open Settings -> Secrets and variables -> Actions -> Variables and
   add these repository variables:

   | Variable | Partner Center value |
   | --- | --- |
   | `MSIX_IDENTITY_NAME` | Package/Identity/Name |
   | `MSIX_PUBLISHER` | Package/Identity/Publisher (the `CN=...` string) |
   | `MSIX_PUBLISHER_DISPLAY_NAME` | Publisher display name |

## Each release

1. Set the new version (the Release workflow's `version` input or
   `pnpm bump`). Every Store submission needs a higher version than the
   previous one.
2. Actions -> Microsoft Store package -> Run workflow.
3. Download the `skerry-msix` artifact and unzip it.
4. In Partner Center create a submission and upload the `.msix` under Packages.

The workflow file must be on the default branch for the Run workflow button to
appear.

## Things to know

- The MSIX version is `major.minor.patch.0`; the Store reserves the last part.
- The manifest declares `runFullTrust` and `userNotificationListener`. Expect
  Partner Center to ask why a restricted capability is needed.
- Launch at startup: the app writes a registry Run entry, which MSIX redirects
  into a private hive, so it has no effect in the packaged app. The manifest
  instead declares a startup task, so users can switch Skerry on under
  Settings -> Apps -> Startup. The in-app "launch at startup" toggle does not
  control it.
- Packaged apps keep app data in a per-package location; uninstalling removes it.
