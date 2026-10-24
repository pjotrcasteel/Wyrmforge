# Automatic GitHub Pages versioning

`AppBuildInfo` displays the informational version embedded in the published WebAssembly assembly and the associated commit SHA. A fixed `Directory.Build.props` version formerly caused repeated releases to show `0.0.179` even when the SHA changed.

The **Deploy Wyrmforge demo** workflow derives `VersionPrefix` from its GitHub Actions run number using `auto_version.py`. Its historical anchor is the already deployed **run #422 = 0.0.179**. Each subsequent workflow run increases the patch number (run #423 -> `0.0.180`, run #424 -> `0.0.181`). Gaps for cancelled or failed releases are expected; no numeric version may be reused by a later Pages workflow run. A rerun of the *same* GitHub Actions run preserves the version for reproducibility.

The committed `Directory.Build.props` value is a local/development fallback and the **fixed baseline**, not the live deployment version. Do **not** increment it manually: changing the baseline also changes the entire derived release range. If release numbering must be migrated, update the mapping and its tests together in a dedicated change.

Pages **build and publish** both pass the same derived `VersionPrefix` and `SourceRevisionId`. The post-deployment browser smoke verifies that the live app's `[data-game-version]` and on-screen short commit SHA match that exact deployment. A mismatched or stale Pages release fails its smoke check instead of looking like success.

```sh
python3 -m unittest discover -s tools/release -p 'test_*.py'
```
