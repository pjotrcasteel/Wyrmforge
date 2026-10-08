# WyrmForge: testing results and fix direction

Version tested: **0.0.83**, game commit **3241aec08b6b0870258a598ca52c988558a3a9cb**. Date: 8 October 2026.

## Direction

Fix unavoidable targeted attacks first, then prototype mobile combat geometry and improve first-run preparation/guidance. Correct the automated tester before making school-wide buffs or nerfs. The evidence points to concrete fairness and onboarding problems; it does not measure human enjoyment.

## Evidence delivered

| Experiment | Scenarios | Purpose |
| --- | ---: | --- |
| Fresh/content-pool full runs | 4,104 | 17 builds, 6 profiles, 3 arenas; paired fresh/all-base content controls |
| Baseline isolated boss trials | 2,304 | Same prepared build/spell against each ordinary Wyrm |
| Candidate warning-time boss trials | 2,304 | Test a local experimental fix with identical settings/seeds |
| Equal-world-area mobile runs | 816 | Separate viewport shape from combat area |
| Baseline/candidate direct dodge probes | 24 | Verify attack reachability in open space |
| **Total recorded scenarios** | **9,552** | Calibration/repeat checks excluded |

All 4,104 baseline full runs ended naturally. No timeouts or failed decisions occurred. Boss trial results also contained no timeouts. This demonstrates execution of these headless scenarios; it is not a browser performance or complete CI result.

## Fix 1 — make locked target attacks escapable (highest confidence)

**Where:** `src/Wyrmforge.Domain/Combat/Dragons/DragonCatalog.cs`, `src/Wyrmforge.Application/Runs/Hunts/DragonHuntCatalog.cs`, and regression coverage in `tests/Wyrmforge.Application.Tests/Runs/Hunts/`.

TargetBurst captures the player position when its warning starts. With no speed boosts or crowd control, base movement is 190 world units/second. For a player-centred circle, an escape needs warning time greater than radius/speed, plus reaction and a margin. These existing configurations fail even the zero-reaction bound:

| Attack | Radius | Current warning | Ideal base-speed travel | Experimental warning |
| --- | ---: | ---: | ---: | ---: |
| Voidweaver ordinary attack, phase I | 148 | 0.74s | 140.6 | **1.10s** |
| Voidweaver ordinary attack, phase II | 195 | 0.50s | 95.0 | **1.35s** |
| Rimeclaw ordinary attack, phase II | 152 | 0.76s | 144.4 | **1.10s** |
| Rimeclaw player-centred pressure, phase II | 158 | 0.76s | 144.4 | **1.15s** |

Direct simulation probes reproduced ordinary attack hits with instantaneous straight-line escape: Voidweaver phase I inflicted 36 damage, phase II 54, and Rimeclaw phase II 58. Rimeclaw phase I was escapable and inflicted zero in the same setup. Tick rounding did not rescue the failing attacks. Rimeclaw pressure reachability was established from its configuration and player-centred scheduling; it was not separately isolated in a damage probe.

The candidate preserves radii and damage, extends only those warning times, and was tested locally. At a 0.25-second reaction, all three adjusted ordinary circles became geometrically escapable in the direct probe. Voidweaver phase II still recorded 34 damage from an overlapping signature in that window: this is not a claim of damage-free combat or a pure attack-damage counter.

### Candidate boss trial outcomes

Same 20-point Fire/Frost build, same spell/evolution preparation, same seeds. Each row has 48 trials per version, pooling four prepared spells.

| Boss | Arena | Profile | Baseline wins | Candidate wins |
| --- | --- | --- | ---: | ---: |
| Voidweaver | Desktop | EdgeAwareControl | 25/48 | 48/48 |
| Voidweaver | Desktop | EdgeAwareNovice | 24/48 | 42/48 |
| Voidweaver | Portrait | EdgeAwareControl | 35/48 | 46/48 |
| Voidweaver | Portrait | EdgeAwareNovice | 29/48 | 35/48 |
| Voidweaver | Landscape | EdgeAwareControl | 12/48 | 35/48 |
| Voidweaver | Landscape | EdgeAwareNovice | 18/48 | 33/48 |
| Rimeclaw | Desktop | EdgeAwareControl | 48/48 | 48/48 |
| Rimeclaw | Desktop | EdgeAwareNovice | 47/48 | 45/48 |
| Rimeclaw | Portrait | EdgeAwareControl | 48/48 | 48/48 |
| Rimeclaw | Portrait | EdgeAwareNovice | 40/48 | 48/48 |
| Rimeclaw | Landscape | EdgeAwareControl | 24/48 | 48/48 |
| Rimeclaw | Landscape | EdgeAwareNovice | 35/48 | 42/48 |

Ashfang and Stormcoil rows were exactly unchanged by the candidate. Rimeclaw desktop Novice outcomes fell slightly even as the escape geometry improved, illustrating that longer warnings change the timing of overlapping attacks. Treat these timings as tested starting values, not a final difficulty verdict.

**Acceptance:** assert open-space escape at zero and 0.25-second reactions with an unboosted mage, while a late reaction remains punishable; test walls, portrait/landscape and overlapping signature windows. Include slow movement modifiers in the escape budget. Add the regression before tuning HP or damage.

## Fix 2 — separate mobile display pixels from combat space

**Where:** `src/Wyrmforge.Presentation.Web/wwwroot/js/arena.js` (Frame arguments and rendering), `Features/Arena/ArenaView.razor.cs` (simulation boundary), `Application/Runs/Simulation/Movement/RunSimulation.Movement.cs`, and `Application/Runs/Simulation/Enemies/RunSimulation.Enemies.cs`.

The browser passes CSS canvas width/height directly to the C# simulation. Spawns, enemy caps and stage cadence are driven largely by depth/route rather than available area. The test desktop arena is 921,600 square units; 390×844 and 844×390 arenas are 329,160—only 35.7% as large. This changes threat arrival and available escape room, not just presentation.

The geometry experiment keeps the mobile aspect ratio but increases world dimensions by approximately 1.673×, giving the desktop world area. It uses the unchanged baseline game and the same paired seeds. Each row pools 12 existing prepared builds, 144 runs per geometry:

| Arena/profile | Current extraction | Equal-world-area extraction | Current Wyrm reach | Equal-area Wyrm reach |
| --- | ---: | ---: | ---: | ---: |
| Portrait/EdgeAwareControl | 22/144 (15.3%) | 83/144 (57.6%) | 51/144 (35.4%) | 133/144 (92.4%) |
| Portrait/EdgeAwareNovice | 21/144 (14.6%) | 72/144 (50.0%) | 46/144 (31.9%) | 119/144 (82.6%) |
| Landscape/EdgeAwareControl | 32/144 (22.2%) | 74/144 (51.4%) | 55/144 (38.2%) | 122/144 (84.7%) |
| Landscape/EdgeAwareNovice | 18/144 (12.5%) | 60/144 (41.7%) | 42/144 (29.2%) | 120/144 (83.3%) |

**Recommended implementation:** prototype a world-to-screen transform with an explicit combat-area budget and aspect-aware world rectangle. Render combat positions in world coordinates, keep HUD/text in screen coordinates, and preserve normalized movement input. Review sprite/telegraph readability and on-screen information before selecting a final world scale. A geometry-only win-rate improvement does not prove that the scaled view is comfortable or fun on a phone. If visual testing rejects this approach, introduce an explicit viewport-aware encounter budget instead; do not scatter unrelated mobile damage multipliers through the game.

**Acceptance:** repeat paired fresh-account cohorts in both orientations; separately test real touch movement, resized/orientation-changed arenas, HUD obstruction, telegraph sizes and physical phone frame pacing. Compare each build/profile within the same cohort. This experiment used one seed set and is strong directional evidence, not a representative mobile population.

## Fix 3 — prevent accidental unprepared starts

**Where:** `src/Wyrmforge.Presentation.Web/Features/Forge/RunHubView.razor`, `Features/Forge/BuildView.razor`, and `Pages/Home.razor.cs` (`StartRunAsync`).

The live page allowed a fresh profile to start immediately with 0/24 Arcane points spent. In the expanded baseline, all **216 unspent-build runs were defeated**. This is a simulated outcome across the six profiles, not a measured human failure rate. Partial three-point builds also struggled, especially on mobile.

**Change:** make unspent points prominent beside the start action; when no points are allocated, offer Prepare Build as the primary action and an explicit Start Unprepared alternative. Offer a clear legal beginner build/path rather than making the first task navigating a 49-node graph unaided. For partially spent builds, show the remaining count and the consequence without permanently preventing intentional challenge runs.

**Acceptance:** a fresh player sees the preparation choice before entering; recommended paths are connected and respect mastery exclusivity/budget; replay and deliberate unprepared runs remain available. Add browser coverage for those separate actions.

## Fix 4 — teach controls and explain transitions

**Where:** `Features/Arena/ArenaView.razor`, `Features/Map/WyrmrealmMapView.razor`, `Features/Arena/ArenaView.Moments.cs` and `Features/Arena/RunMomentOverlay.razor`.

The observed first combat view had a kill objective but no visible movement/auto-cast explanation. Input is WASD/arrows or drag movement; spells cast automatically. Temporary run moments disappear after 1.8 seconds and can be replaced by the next moment. These are specific UI/code observations; no new blind-human usability cohort was run.

**Change:** provide a short first-trail start card: Move with WASD/arrows or drag; spells cast automatically; collect shards to choose upgrades; clear the displayed kill objective. Let the player dismiss it deliberately. Keep a persistent one-line reason for the next screen: Trail cleared—choose your next route; Wyrm slain—choose Essence; Essence at risk—hold evacuation; Essence secured—bank or descend. Use brief callouts for celebration, not essential instructions.

**Acceptance:** a fresh player can explain what to do and why the current screen appeared using only visible text. Browser checks can verify those prompts; human testing must establish comprehension.

## Fix 5 — improve measurement before school-wide balancing

**Where:** `src/Wyrmforge.Application/Runs/SelfPlay/HeuristicRunAgent.cs`, `src/Wyrmforge.BalanceLab/Program.cs`, `Features/CombatLab/BalanceLabView.razor`, `Application/Runs/Simulation/Snapshots/`, and `Application/Runs/Simulation/Dragons/RunSimulation.Dragons.cs`.

- Add boundary-aware steering to the production test agent, validated against the new diagnostic controls. The old policy spends about 56–59% of mobile movement ticks requesting outward movement while already at a wall. That is a tester defect, not normal human behaviour.
- Expose typed ordinary attack warnings (circle/cone, centre, radius, remaining time, damage kind). Ordinary circular warnings currently appear as cosmetic splash pulses, which the heuristic does not avoid. Do not infer dangerous attacks from every visual pulse.
- Add explicit fresh/account-content selection to CLI and browser Balance Lab. The existing factory call with null progression enables all eight spells/relics, unlike a fresh account.
- Report defeats before first draft, before Wyrm, during Wyrm and during evacuation; distinguish damage sources. Treat end-of-route automatic XP collection separately from manual pickup competence.
- Pair seeds and compare sister builds with the same policy/content/budget. Do not compare a 10-point Keystone route directly against a 20-point hybrid as proof of school strength.

### Why immediate Frost buffs would be premature

On fresh desktop seeds, changing only boundary steering raised Winter Shell Wyrm reach from **1/12 to 11/12** and extraction from **0/12 to 6/12**. Absolute Zero Wyrm reach rose from **2/12 to 9/12**. These policies change combat behaviour, not game balance. The earlier baseline therefore overstated how confidently we could attribute Frost failures to its numerical tuning.

Arcane outcomes still warrant review after attack fairness: both Arcane routes reached Wyrms in **10/12** edge-aware desktop runs but extracted in only **1/12** each. Investigate boss selection/attack survival and build activation before globally increasing Arcane damage.

## Implementation order

1. Add escape-reachability regressions and review the tested warning-time patch.
2. Prototype world/display separation and rerun paired mobile cohorts.
3. Add preparation choices, first-trail controls and persistent transition explanations. These UI tasks can proceed alongside the geometry work.
4. Upgrade agent warning awareness and account-content reporting.
5. Rerun fresh, partially prepared and full-build cohorts; then tune individual schools, early pressure and overlapping boss attacks based on the corrected evidence.

## Reproduction and limitations

The reusable harness is `tools/playtesting/Wyrmforge.PlaytestStudy`. Its README documents the commands and optional candidate patch. Game source was restored after the experiments; this testing phase does not deploy gameplay changes.

Profiles: Control reacts every 0.05s; Deliberate every 0.20s; Novice every 0.40s; Distracted every 0.65s. Imperfect profiles probabilistically ignore hazard/pickup snapshots, select random valid rewards/routes, and add directional error. EdgeAware variants add inward boundary steering. These parameters are explicit hypothetical sensitivity settings, not estimates of how real beginners behave. Novice sometimes outperforms Control by avoiding a deterministic bad trajectory; labels must not be interpreted as validated skill ranks.

Seeds are 10000–10011, reused across combinations. Fresh runs use empty Forge progression. All-base controls include every ordinary spell/relic but only base evolutions, not fully unlocked Mastery progression. No offerings, persistent campaigns or Ascendant encounters were tested here. Checkpoint banking policy is identical across profiles. Decision overlays pause simulation; movement reaction tests do not measure reading time or misunderstood UI.

Boss trials use a fixed Fire/Frost hybrid and one developer-prepared Rank III base evolution. Non-Arcane trials retain Rank I Arcane Orb alongside that spell. Compare bosses within each prepared spell before interpreting pooled results.

Deterministic repeats passed for all profile/arena combinations; Control produced exactly the same metrics as the original Casual policy. The local .NET 10 SDK analyzer assembly was unusable, so compilation used RunAnalyzers=false and EnableNETAnalyzers=false. The SDK formatting command also failed because its Workspaces assembly was missing; new source was checked manually for trailing whitespace and line lengths. Static analysis, the full MSTest suite, browser regression checks and physical-device performance were not completed by this study. Human fun remains unmeasured.
