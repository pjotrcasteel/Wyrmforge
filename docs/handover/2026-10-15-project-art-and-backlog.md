# WyrmForge — continuation handover (art, rendering, UX, issues and PRs)

**Baseline:** 15 October 2026. **Repository:** [pjotrcasteel/Wyrmforge](https://github.com/pjotrcasteel/Wyrmforge).  
**Audience:** any developer, model or Work session continuing the real playable game. Read the current main branch, this handover, and the approved images BEFORE making changes. Links/CI states below are a dated snapshot and must be rechecked.

## 1. Vision and decisions that must survive a chat reset

WyrmForge is an original dark, violent fantasy action-RPG/roguelite with freely roaming multiviewport combat, learned elemental magic, Great Hunts, Ascendant/Elder Wyrms and long-term progression. The mood comes from **Diablo I/II**, with a StarCraft-era sense of ominous, grounded sound and atmosphere. The user explicitly gave [this Battlemage gameplay reference](https://www.youtube.com/watch?v=WePyhtxZ4t0) (actual title/game **Legion Breaker**) for **legibility, pixel material, local spell lighting, powerful effects and environmental identity**. It is not a license to copy that game's art, UI, code, fixed side-on combat lane or incremental mechanics. The detailed source study is in [the merged Battlemage reference](../design/battlemage-visual-reference.md).

**The user wants implementation, not another speculative redraw brief.** Before producing art, look at the actual approved GitHub artwork and research relevant buildings/materials. After implementation, inspect the real game-size outcome; if it is clearly wrong, correct it without asking the user to restate the direction. Passing automated tests is not aesthetic approval.

### Approved concepts and continuity

- [Protected city](../../art/world/protected-city-outskirts-v1.png): battered patched walls, visible **wall-mounted failing runes**, wet irregular trails and forest, struggling human civilization. Protective runes must NOT hover in the sky.
- [Forest encounter](../../art/world/forest-monastery-encounter-v1.png): quiet wet ground; contrast between slate-blue mage, gray/bone scavengers and terrain; recognizable enemies without outline halos.
- [Monastery interior](../../art/world/monastery-interior-v1.png): coherent **human-built** flooded cloister, covered walks, courtyard, adjoining study and old wyrm-worship traces, researched against real monastic plans. NOT a cave, random arches or cluttered ritual stage.
- [Engine house v2](../../art/world/protective-engine-house-v2.png): retained revised study; study engineering connections and scale, not unqualified approval as a final production asset. Machines need credible inputs, braces, hinges and outputs.
- The **same mage** always has a muted **slate-blue robe/hood, pale collar, dark face and thin wooden staff**. Earlier white/burgundy costumes are rejected. Never accidentally turn the staff into a warhammer.
- Lore: humans cling to protected cities; ancient magical engines consume increasingly rare material whose true origin is hidden. Wyrms once protected the world. What changed them and the engines' relationship to their fate intentionally remain mysteries.

## 2. October 15 art corrections — critical

### Staff, character poses and school magic

**User rejection:** the mage appeared to be holding a hammer, not a staff. Keep a slim *continuous shaft through the gripping hand*, narrow staff tip and readable pose at actual iPhone scale. Unique idle, walk A/B, windup, release, follow-through, empowered Surge; consistent outfit in all directions. Show powerful, large gestures when casting while **never reducing movement speed, attack cadence, collision or combat responsiveness**. The dynamic pose is visual-only. The visual should be stronger for learned ranks/upgrade behaviors and distinct per school, not a generic recolor or larger particle cloud.

The canonical C# run, cast, projectile, hit and upgrade snapshots drive presentation. Animations may not invent extra concurrent auto-fired attacks. **One committed primary spell** fires at a time; secondary knowledge only changes it through **explicitly learned combinations**. Frostfire is a *single* combined burn-and-freeze hit, not autonomous Fire and Ice streams. A future magic laboratory should allow discovery of recipes and experimentation but the broad recipe engine is not shipped (issue #108).

Modules: `arena-mage.js`, `arena-mage-frames.js`, `arena-spell-vfx.js`, `arena-spell-lighting.js`, relevant C# snapshots and focused-magic/domain tests. Source of truth is in gameplay state; JS art is a consumer.

### No fake perspective, spires, prison railings or non-colliding solids

**User rejection:** ugly tall monastery spires stayed front-facing even when walking away, visibly destroying the **2.5D illusion**. Delete those random monoliths, don't merely repaint them. Buildings must be made of coherent world-anchored plans: walls, damaged buttresses, real supported ruins, chapel/cloister openings, grounded rubble, wet courtyard/paths, study and cistern. The user prefers **less but meaningful architecture** over arbitrarily dense details.

- The camera translates across world space; building facade, roof and side planes have **fixed coordinates**. Never billboard a wall/spire/arch toward the camera.
- Player/enemies are depth-sorted by their world feet/contact position against wall footprints: behind when north of the wall, in front when south. Do not draw all masonry permanently in front of characters.
- The **C# barrier rectangle and `barrier.open` are authoritative**. Raised objects must belong to these actual collisions; do not depict impassable columns on walkable ground.
- Avoid full-width prison grids at crossings. Use worn monastery gateway piers and understated warding that vanishes when the crossing actually opens.
- Flooded ground must read as water versus paving at 390 × 844 portrait, but should not overwhelm or camouflage fighters. Water and wet-wall reflections follow **actual** spell light sources, not independent glow decoration.

[PR #114](https://github.com/pjotrcasteel/Wyrmforge/pull/114) implemented these corrections and has **merged** into main via `fefad33aa`, after latest PR-head validation + browser smoke passed. Scope: fixed slender staff and mobile hood light; real C# wall-footprint elevations/depth sorting; spire removal; better gateway wards, floor contrast and regressions. It is a real playable code change, **not proof of final human art approval**. Verify deployment and actual iPhone visuals before calling the work finished.

Primary renderer files:
`src/Wyrmforge.Presentation.Web/wwwroot/js/arena.js`, `arena-cloister-art.js`, `arena-environment.js`, `arena-territory-art.js` and `arena-mage.js`.

## 3. Gameplay, UX, visual hierarchy and future Magic Lab

The user wants a player to understand the current screen and next action **within seconds**. Humans do not want to scroll or read explanations to understand health, damage or upgrades. Remove abstract help buttons like the former health '?'; communicate with a visible heart/HP, actual health bar, danger color, world-space tells, meaningful silhouette and short label. On mobile, preserve visible main action, safe area and simple tap controls. Progressive disclosure is for optional detail.

The [visual-first UX/Magic Lab RFC](../design/visual-first-magic-ui-rfc.md), merged from [PR #111](https://github.com/pjotrcasteel/Wyrmforge/pull/111), specifies: one-glance Hunt Hub, real spell before/after upgrade comparison, one-screen summary and eventually a one-recipe-row Magic Lab with actual shared VFX. **It is a design proposal and reference, NOT an implemented Magic Lab.** Use its visual grammar; only display rewards/recipes the canonical system can truly provide.

Spell identity should change with actual behavior: wind-up, projectile outline/trajectory, impact footprint, statuses, local lighting and multi-school interactions. Fire, Frost, Storm and Arcane need distinct gestures and impacts; Surge visibly stronger. Learned ranks/milestones must *feel* stronger but never invent phantom missiles or unearned damage. Test crowded combat readability.

## 4. Snapshot of reviewed PRs (15 October 2026)

| PR | Decision | Why / continuation |
| --- | --- | --- |
| [#114](https://github.com/pjotrcasteel/Wyrmforge/pull/114) | **Merged** | Staff and monastery 2.5D corrections. Recheck actual deployed SHA and iPhone rendering. |
| [#111](https://github.com/pjotrcasteel/Wyrmforge/pull/111) | **Merged** | Research and UX design documents; no new runtime UI/recipe implementation. |
| [#94](https://github.com/pjotrcasteel/Wyrmforge/pull/94) | **Merged as archival docs** | Early recorded-audio research is HISTORICAL. Current recorded sources and real licensing are documented in [audio credits](../audio/recorded-audio-credits.md) and the shipped `audio/recorded/manifest.json`. The old candidates JSON cannot override them. |
| [#67](https://github.com/pjotrcasteel/Wyrmforge/pull/67) | **Closed, obsolete implementation** | Would grant one additional Arcane point on each eligible hunt. Modern `HunterProgress` already earns permanent Arcane points from Hunter XP levels. Do NOT add another independent grant without revisiting the design; it risks double awards / bypassing XP pacing. |
| [#64](https://github.com/pjotrcasteel/Wyrmforge/pull/64) | **Closed, historical experiment** | 0.0.83 9,552-scenario imperfect-player and boss-warning analysis. Its proposed timings are *unmerged* and must be revalidated on the latest code, not blindly replayed. |
| [#115](https://github.com/pjotrcasteel/Wyrmforge/pull/115) | **Merged (during handover work)** | Port of #67: adds a per-completed-hunt point **in addition to** the existing XP-driven budget. Design/test interaction is unresolved; tracked in [#117](https://github.com/pjotrcasteel/Wyrmforge/issues/117). |
| [#116](https://github.com/pjotrcasteel/Wyrmforge/pull/116) | **Closed (duplicate handover)** | Canonical documentation already merged directly on main. Its unique [0.0.83 historical fairness study](../playtesting/archive/player-study-0.0.83.md) was saved separately; the overlapping docs contained outdated Arcane/audio claims. |

**Important:** PR state/CI can change after this handover. The PRs and code in GitHub, not this timestamped table, decide current truth. Since this audit, PR #115 merged as `a9d80e2d80`, and issue #117 was opened to preserve the review.

## 5. Open issues audited: preserve, don't falsely mark complete

| Issue | What remains and why it matters |
| --- | --- |
| [#108 — Arcane Laboratory](https://github.com/pjotrcasteel/Wyrmforge/issues/108) | Long-term mid/late-game authorable spell combinations. Discoverable, deterministic recipes; one primary delivery mechanism, catalyst effects, durable discovery/unlock, beautiful true VFX and intuitive mobile UI. Backlog only; finish basic focused magic first. |
| [#66 — Hall of Fame](https://github.com/pjotrcasteel/Wyrmforge/issues/66) | Real consented submission/receipt into D1, organizer moderation and delete, tamper-resistance and honest **COMMUNITY · UNVERIFIED** label. Fictional LEGEND · DEMO entries must remain visibly fake. Avoid public identities in test evidence. |
| [#60 — Cloudflare 403 in GitHub CI](https://github.com/pjotrcasteel/Wyrmforge/issues/60) | Hosted-runner connectivity to Worker `/health` reportedly 403, while real iPhone feedback succeeded. Distinguish external check inconclusive from actual app outage; avoid blanket security bypass or false-green claims. Still open until measured/fixed. |
| [#55 — native iOS/Android](https://github.com/pjotrcasteel/Wyrmforge/issues/55) | Eventually App Store/Play Store. Prototype a native shell / renderer and lifecycle without duplicating C# domain simulation, preserving migration, accessibility, touch, safe area and offline capability. Not the immediate art task. |
| [#117 — Arcane double-credit review](https://github.com/pjotrcasteel/Wyrmforge/issues/117) | Newly identified after #115 merged; combined XP-level and per-hunt reward paths may both grant Atlas progression, with an inconsistent displayed earned amount. Decide intended economy and add integrated regression. |

### Historical fairness finding to carry forward (not a shipped fix)

PR #64 compared synthetic self-play agents, **not calibrated real users**. Its full original findings are preserved in the [archived 0.0.83 study](../playtesting/archive/player-study-0.0.83.md), without old executable harness or optional patch. It found apparently impossible-to-escape circles for some Voidweaver/Rimeclaw warnings under base movement on the old 0.0.83 code. Re-measure real CURRENT attack radius, delay, player speed and overlaps; design new regression tests and actual player trials before making balance changes. Do not copy the unmerged patch and assume it applies. Player-comprehensible hazard tells matter especially on phones.

### Arcane reward semantics must be resolved, not accidentally doubled

`src/Wyrmforge.Domain/Progression/Experience/HunterProgress.cs`: Hunter XP increases a persistent level; `AtlasBudget => Level`, with cap 24. `Home.CreditHunterExperience` uses the level budget, with migration support and saves. Original PR #67 proposed, and **merged PR #115 now implements**, another independent point per non-abandoned hunt. **Both models are currently active in main**, not just proposed: the handler grants the hunt point, then calls `CreditHunterExperience`. They may stack (subject to the 24-point cap). This is a **review finding, not yet a confirmed unintended bug**: settle whether both rewards are intentional, reconcile the displayed earned points, and write a combined integration test as requested in [#117](https://github.com/pjotrcasteel/Wyrmforge/issues/117). Existing `HunterProgressTests.cs` cover the XP model in isolation.

## 6. Build, art and release gates

1. Fetch latest main, current PRs/issues/workflow runs and approved art. Never rely on old conversations or copy an outdated branch onto main.
2. Build a **complete vertical slice**: canonical world/cast state → presentation → visible player feedback → automated checks. No purely decorative facade that violates perspective or collision.
3. Run `node --test tests/javascript/*.test.mjs`, .NET 10 solution build/tests, browser smoke and actual 390 × 844 screenshot comparisons. Check sprite silhouette in idle, walk, windup, Surge, all school lighting and player-vs-wall depth through camera traversal.
4. On real iPhone Safari inspect scaling, touch/movement, crowded combat contrast, frozen/open gate art and reduced motion. CI may pass while art is still ugly, confusing or directionally wrong.
5. Verify GitHub Pages site [WyrmForge](https://pjotrcasteel.github.io/Wyrmforge/) deployed at the expected **exact SHA**. Deployment workflows can fail for issue #60's separately tracked Cloudflare probe without proving the game itself is down.
6. Only close PRs after demonstrating merged/superseded scope; explain the reason and reference authoritative replacement docs. Do not close the five legitimate open issues (#55, #60, #66, #108 and #117) merely to achieve an empty backlog.
7. Update this dated handover whenever a decision, merge, production art approval, game mechanic or relevant issue resolution changes.

## 7. Next work

**First:** validate #114's actual player-visible art at real iPhone scale and correct staff, cloak, monastery projection and gateway if still wrong. **Second:** school-specific dramatic but non-blocking casting motion and authentic rank/Surge impact changes. **Third:** purposeful landmarks and discovered spell-combination previews, eventually issue #108 Magic Lab. Maintain a strong, extendable C# foundation, truthful UI and original artwork.
