# Notice

## Upstream project and modification history

Skerry is a modified derivative of [Fly Island](https://github.com/flyl1u/fly-island), originally created by **flyl1u**.

This version of Skerry includes modifications to the upstream project. **Modification notice date: 2026-11-22.** Skerry has been redesigned, extended, and is maintained separately. It is not an official continuation of, and is not endorsed by, the upstream Fly Island project.

The upstream project is licensed under the [GNU General Public License, version 3.0 (GPL-3.0)](https://www.gnu.org/licenses/gpl-3.0.html). Skerry's main application is distributed under GPL-3.0-only; see [LICENSE](LICENSE). The GPL applies to the covered work as a whole, subject to its terms.

## Separately licensed first-party components

The optional plugin workspace crates under `plugins/` declare the MIT License in their Cargo manifests. A copy of that license is provided in [plugins/LICENSE-MIT](plugins/LICENSE-MIT). These plugin crates are separate components; their declared MIT license does not change the GPL license of the main Skerry application.

## Third-party dependencies

Skerry uses third-party npm packages and Rust crates. Their copyright notices and license terms remain with their respective authors and projects. The project manifests and lockfiles identify dependency versions, but they are not a substitute for each dependency's license text or required notices.

A complete, version-specific inventory of all direct and transitive dependency licenses has not yet been generated and verified. Do not treat this notice as a complete third-party license bundle. Before distributing a release as having a complete third-party notices package, generate and review the notices for the exact dependency graph used by that release and include the required texts.

## Source code for releases

For each published release, GitHub provides automatically generated source archives from the corresponding release tag on the [Skerry Releases](https://github.com/ahmad-maqsood/skerry/releases) page. The source for a distributed binary must correspond to the exact version of that binary, including relevant build scripts and configuration.

