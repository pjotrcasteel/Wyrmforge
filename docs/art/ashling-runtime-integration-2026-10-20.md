# Ashling runtime integration

Approved fiery-eye movement, weighted fire-claw attack and death PNGs are integrated into the production Canvas renderer used by ordinary Hunts and Enemy Lab. This is a task-branch implementation, not a merged or deployed release. Current main was fetched and merged (`f4d6273b`); open concurrent PRs #136, #128 and #118 were inspected and preserved.

Runtime bundle: `src/Wyrmforge.Presentation.Web/wwwroot/art/enemies/ashling-rigged/`. PNG bytes exactly match approved `movement-fiery-eyes-v1`, `attack-fiery-eyes-v1` and `death-fiery-eyes-v1` source exports. The manifest uses cache hashes and per-clip cells/anchors: 96px walk, 128px attack/death, uniform 0.85 world units per source pixel. The three PNGs total about 1.43 MB compressed. No interpolation filter, mirroring or generated replacement art is used.

`rigged-sprites.js` adds a reusable profile-driven full-body adapter over the existing shared `sprite-animation.js` controller. `ashling-sprites.js` only supplies kind, bundle location and fallback profile. Movement follows actual displacement (17.28 world units per cycle). Turning follows the target with phase carry, 720 degrees/sec and boundary hysteresis. The full-body launch preserves authored feet instead of compositing a walking support layer over airborne legs.

Generic `motionWindows` metadata reconciles the presentation anchor with simulation travel only during authored flight (frames 8–11) and recovery (17–21). Planted portions keep their visible anchor steady; underlying gait phase keeps advancing. Simulation positions, collision, contact damage and enemy behavior are read-only inputs. The two visual claw beats do not create additional damage events. Future full-body enemies can supply different windows. Hollow retains its established semantic-region compositor and original assets.

Identity-bearing C# death bursts interrupt living playback and create an eight-direction collapse, then a held corpse, fading after three seconds and removed at four. Disappearance alone creates no corpse. A bounded 96-corpse map, clock-reset handling, duplicate-death handling, pause/freeze and reduced-motion policies follow the existing renderer contract. The legacy painted corpse is skipped only when the new bundle is ready; old painted/native art remains a loading/offline fallback.

Validation so far:

- Release web publish succeeds. All 231 JavaScript tests pass, including full-body planting/travel windows, facing/phase carry, pause/freeze, authoritative death, source-byte hashes and consistent cell pixel density.
- All four targeted real-game browser regressions pass: both Ashling tests and both existing Hollow tests. These use the published Blazor game, real C# simulation and Canvas renderer. Browser test build has zero warnings/errors.
- Actual mobile turning capture passes with SE/E/NE/N facings during attacks, advancing action frames and gait phase, stable pause, no horizontal overflow at 320px and zero page errors. Ashling attacks remain full-body throughout.
- Lifecycle capture passes real movement, contact attack, authoritative collapse, held death frame 27, pause and all five runtime bundle fetches. The scripted capture toggles live Autocast/Movement-agent controls after attaching diagnostics so the quick kill cannot finish during initial page loading. Initial attempts that waited for early collapse only after a casting page finished loading missed that short window; no gameplay was changed to make the capture pass.

Reproduce with Release publish to `artifacts/ashling-runtime`, SPA server on 4190, then `capture-ashling-runtime.cjs` and `capture-ashling-turning.cjs` against that URL. Targeted .NET tests use `FullyQualifiedName~AshlingBrowserTests|FullyQualifiedName~HollowBrowserTests`. Local captures use desktop Edge at 390×844 and 320×844; physical iPhone Safari performance remains unverified.

Preserved evidence: `docs/art/evidence/ashling-runtime-2026-10-20/` contains the moving-attack GIF, 390px walk/collapse/held-corpse screenshots, 320px paused view, and full lifecycle/turning JSON reports. Final lifecycle capture records collapse frame 6, held frame 27, stable pause and no errors. The local .NET invocation passed all four selected tests in 28 seconds using Edge. The 231-test JavaScript report is `artifacts/ashling-javascript-tests.txt` (transient local output).

Remaining before shipping: check PR CI and follow release/version/deployment workflow when shipping is authorized. This document does not claim the task branch is live on GitHub Pages.
