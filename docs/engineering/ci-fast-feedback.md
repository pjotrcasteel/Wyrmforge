# CI fast feedback and browser sharding

## Why

On 27 October 2026, PR #382 spent approximately 13 minutes running 153 browser cases
in a single process, with another several minutes for browser installation, asset
generation and a web publish. Independent workflows repeated much of that work.

## New development loop

1. **Playable preview first.** `Browser smoke / Playable preview` restores source
   art and publishes the actual Blazor web build. Its GitHub Actions artifact
   `wyrmforge-playable-preview-<SHA>` is available immediately after that job
   succeeds. It **does not wait for browser tests**. Download/unzip the artifact
   and follow its bundled `README.md` to run it on a local web server.
   It is an artifact, **not a public HTTPS preview URL** and is not intended
   to run directly from the iOS Files app.
2. **All browser cases retained, four runners.** Four `browser-shard` jobs
   download the **same exact compiled web artifact**. Each receives a disjoint
   list of fully-qualified MSTest methods from
   `tools/development/browser_shards.py`. All `DataRow` cases of one method
   stay on one runner; newly introduced test methods are automatically included.
   Sharding fails on unrecognized test annotations or duplicate methods
   rather than silently omitting coverage. The `browser` aggregate check
   only passes if the preview and all four shards pass.
3. **Fast core validation on PRs.** `Validate Wyrmforge` still compiles the
   whole solution and runs every JavaScript, .NET Domain and Application
   unit test. Full sprite-art regeneration runs on PRs changing art/source
   or art-generator code; expensive Hunt balance samples run on PRs changing
   simulation/domain/balance code. These checks do not block a
   presentation-only PR.
4. **Integrated safety retained.** A push to `main` always triggers the full
   art and balance checks, in parallel with the existing Pages deployment.
   The specialized material, lighting, WebKit and other scoped workflows
   continue to run when their respective changed-path triggers match.

## Working rules

- CI does **not** waive relevant failure: all selected checks must pass to
  merge. If targeting logic or damage changes, balance runs in the PR.
- A preview artifact makes iterative visual QA possible *before* full regression
  finishes. GitHub Pages is still deployed only from merged `main`.
- If a new browser test uses an unsupported `TestMethod` declaration, the
  shard selection test fails visibly; extend and test the parser before merge.
- Keep the original `browser` job name as the full-suite aggregate for
  branch protection.
- GitHub-hosted runner queue, NuGet restore, large Git LFS downloads and art
  generation are still variable. The improvement must be measured using
  workflow timestamps, **not presumed** from job names.

## Verify a change

- `python3 -m unittest discover -s tools/development -p 'test_*.py'`
- `python3 tools/development/browser_shards.py --shard 0 --shards 4`
- `dotnet test Wyrmforge.slnx -c Release`
- After the PR runs, inspect the `browser-shard` test totals and duration,
  aggregate `browser` result and preview artifact arrival time.
  The first run is the baseline for further adjustments.
