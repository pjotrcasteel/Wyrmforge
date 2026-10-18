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

## 8. Continuation — runtime pixel-art pipeline and UX pass (branch `art/runtime-pixel-pipeline-v1`, local, not pushed)

**What changed**

| Commit | Change |
|---|---|
| aefce14 | Pipeline and atlases |
| 54e425e | Runtime integration and tests |
| ac9ddf0 | UI icons and hub backdrop |
| 075759d | Audit and screenshots |
| 0dc8a76 | `.gitattributes` keeps generated art byte-exact |
| d06e7d5 | `GameIcon` used game-wide, compact phone level-up cards |
| f5e347f | Audit status matrix |
| (this commit) | Gameplay roadmap and this handover |

- **Art is code-authored.** It is generated by the dependency-free Node pipeline `tools/art/`, not by an image model: no generator was available. Output: 189 frames (actors 78, wyrms 20, tiles 5, environment 59, icons 27) in `src/Wyrmforge.Presentation.Web/wwwroot/art/`.
- **UI glyphs are now pixel icons.** Unicode glyphs from Domain/Application catalogs are mapped to pixel icons via `Shared/GameIconMap.cs` and `Shared/GameIcon.razor`.
- **Coverage is enforced.** A JS test fails if a catalog glyph is unmapped.

**Evidence**

- [`docs/art/asset-and-screen-audit.md`](../art/asset-and-screen-audit.md)
- Before/after captures in `docs/art/screens/{before,after}`

**Roadmap**

- [`docs/roadmap/wyrmforge-gameplay-next-level.md`](../roadmap/wyrmforge-gameplay-next-level.md). Top 3:
  - M2: visible recipes, Frostfire first
  - M1: school VFX and telegraphs
  - M3: next-goal summary, after settling #117

**Commands and results (local, Windows)**

| Command | Result |
|---|---|
| `node tools/art/build-art.mjs --check` | OK |
| `node --test tests/javascript/*.test.mjs` | 107 pass |
| `dotnet test Wyrmforge.slnx -c Release -p:NuGetAudit=false` | Domain 145 and Application 289 pass |
| Browser tests against a published build on `:4173` | 47 pass |

`-p:NuGetAudit=false` was needed on this machine because NU1900 is raised when a private feed is unreachable. It is an environment issue, not a project change.

**Not verified**

- Real iPhone Safari: only 390 × 844 emulation was checked.
- CI, which is blocked in practice by #60.
- Wyrm fight captures.
- North/south cloister occlusion after the wall change.

**Remaining art gaps**

- Spell, impact and status VFX sprites.
- Pixel map-node badges.

See audit §3b and §5.


## 9. Continuation: Spellcraft handover, Laboratory Phase B (branch `feature/lab-frostfire-mutation`, local, not pushed)

The product owner approved the 2026-10-15 Game Design & Spellcraft handover as the design direction. **Phase B, the first playable Frostfire invention, is implemented** as the researched mutation *Rime Infusion*.

**Where things are:**
- Design, contracts, migration, acceptance coverage, side effects and open decisions: `docs/design/laboratory-frostfire-slice-v1.md`.
- Domain: `src/Wyrmforge.Domain/Progression/Laboratory/`.
- Simulation: `src/Wyrmforge.Application/Runs/Simulation/RunSimulation.Laboratory.cs`.
- UI: `Features/Forge/LaboratoryView.razor`, reached through the Forge's "Laboratory" entry. It is kept off the hub so the five-row menu still fits at 320×568 and 844×390.
- Persistence: `Pages/Home.Laboratory.cs`, key `wyrmforge.laboratory.v1`. Existing saves are untouched.
- New art: `icon.flask`.

**Invariants to keep:**
- One primary cast.
- The mutation reuses the existing Frostfire rule and hides the legacy synergy offer, so they never stack.
- Experiments never consume specimens, and repeats are not novel.
- A specimen is spent only on explicit consent, with the Laboratory saved before the vault.
- Losing the socket path unequips the mutation but keeps the recipe.

**Validation:**
- Domain 156, Application 298 and JS 107 tests pass. The 20 new tests include a seeded real hunt where reactions > 0.
- Browser tests: 45 of 47 pass. `Mobile_DeveloperHuntTrials_*` and `Mobile_HuntLab_Autopilot*` also fail on base commit `435e941`, so they are pre-existing.
- The Laboratory flow was verified in emulated 390×844 Chromium. No real-device or CI run has been done yet.

**Open decisions (product owner):**
- The −10% damage trade-off (since raised to −15%, §13).
- The Rime Heart stabilizer cost.
- Free experiments versus a preparation currency.
- Socket node placement and names.
- Previews: static now, animated later.

**Next:** Laboratory Phase C.1 (a second mutation), then C.2 (preparation economy) and C.3 (two sockets and loadouts). See roadmap §5 M7 and §11.


## 10. Continuation: Laboratory Phase C.1 (same branch)

**Built:**
- **Storm Infusion**, a second mutation: Arcane Orb × Storm Heart → existing Arcane Conduit, socket Charged Focus (`hybrid-storm-arcane-2`), casts 10% slower (since 15%, §13).
- **Research leads**: TRACK a mutation and the next hunt draws its specimen Wyrm (not in the First Hunt or a due Ascendant rite).
- **`LaboratoryAdvisor`**: one next step, used by the Forge status line and the run summary's research prompt.
- **BalanceLab `--laboratory`**: a self-play study. Proposals are in `docs/design/laboratory-tuning-v1.md`; no constants changed.

Details: `docs/design/laboratory-frostfire-slice-v1.md` §8.

**Validation:**
- Domain, Application and JS (107) tests pass.
- Browser tests: only the 2 known pre-existing failures.
- Storm and Rime capture flows verified in emulated 390×844 Chromium.

**Open decisions (product owner):** the tuning proposals in `laboratory-tuning-v1.md` §3, and whether a lead should expire after failed hunts.

## 11. Continuation: Spell blueprint and compatibility contracts (same branch)

**Built:**
- `Wyrmforge.Domain/Spells/Composition`: structural `SpellTag`s, `SpellComponentCatalog`, `SpellBlueprint`, a versioned `BlueprintRuleset.V1` (complexity 6, 3 elements, 16 reaction events per step) and a deterministic `BlueprintValidator` with player-facing reasons and fixes.
- Both mutations are now defined as blueprints. Sockets accept tags. `Equip` rejects invalid blueprints.
- `ReactionBudget` caps secondary reaction events per combat step.
- The Laboratory shows a blueprint line with complexity.
- No gameplay change: in an 80-hunt probe the peak was 2 events per step, with 0 suppressed.

Details: `docs/design/spell-blueprint-contracts-v1.md`.

**Validation:** build clean; Domain 187 and Application 311 tests pass.

**Product-owner request (deferred):** redo the arena completely. It is bland, the maps all look alike, and they look poor; enemies, the mage and effects are fine. Do this during the story phase (Phase D) so the story drives the art direction. It is recorded in the roadmap under M7.

**Next options:** C.2 (preparation economy with rare-monster reagents), C.3 (two sockets and loadouts), element inversion, and tuning sign-off (`laboratory-tuning-v1.md` §3).

## 12. Continuation: Laboratory Phase C.3 sockets, loadouts and respec (same branch)

**Built:**
- Up to two equipped mutations. Sockets are generic by element: Rimebrand and Charged Focus, plus two new bridge sockets, Flashfire (Fire–Storm) and Glacial Lens (Arcane–Frost).
- A blueprint fits any socket sharing one of its elements; `BlueprintValidator` now matches its documented "accepts none" contract.
- One primary cast is preserved: only the mutation matching the chosen primary wakes, and there is one mutation per foundation.
- Laboratory socket list (EQUIP / SWAP / UNEQUIP / ATLAS), per-socket reconcile on respec, and an advisor prompt for the second mutation.
- `HuntLoadoutBook`: three Atlas loadouts (Web plus sockets) saved under `wyrmforge.loadouts.v1`. Apply is a free respec that reports anything it could not restore.
- Saves migrate: `Slots` added; `Equipped` is still written for older builds.
- The tutorial, story and first-hunt enemy brief (`user_handover_files/`) is committed as the arena-refactor reference.

Details: `docs/design/laboratory-sockets-loadouts-v1.md`.

**Validation:**
- Domain 203, Application 314 and JS 107 tests pass.
- The full flow was captured at 390×844.

**Next options:**
- C.2 once elites and the Reliquary exist (arena refactor, story phase).
- Element inversion.
- Tuning sign-off.
- ~~Open decisions: the socket names and placement.~~ Resolved in §13.

## 13. Product-owner decisions applied (same branch)

- Sockets Flashfire and Glacial Lens are kept as named and placed.
- Trade-offs raised: Rime Infusion −15% damage, Storm Infusion casts 15% slower. Re-run study: Rime +3.2% vs legacy Frostfire, Storm −1.1% vs legacy Conduit (both still well above baseline). See `docs/design/laboratory-tuning-v1.md` §5.
- Research leads lapse after 3 finished hunts that miss the specimen; the Laboratory shows hunts left.
- Loadouts also remember the preferred primary (highlighted as LAST OATH; the player still commits) and the Forge offering (re-selected only while held; never spends).
- Storm Heart offering + Storm Infusion may stack; no change.
- **Next build: the arena roster** from `user_handover_files/WyrmForge_First_Hunt_Encounter_Design.md` (habitats, new enemies, elites, Reliquary, Bell Warden), which unblocks Laboratory C.2.

## 14. Arena roster — step 1 shipped (habitats)

Design: `docs/design/arena-roster-v1.md`.

- **Roster renames.** The existing mobs are renamed with their `EnemyKind` ints unchanged: Hollow (was Chaser), Mire Hound (was RiftStalker), Ashling (was Skitter), Penitent (was Brute).
- **Habitats.** Each map node now has a local `Habitat`, derived without touching the layout RNG. The sequence is outskirts → wet forest → (forest trail | open field | dead hamlet) → deserted village → (monastery grounds | flooded cloister) → scorched approach → lair.
- **Habitat composition.** Map encounters draw their composition from the brief's habitat weights. Director inserts respect the habitat's introduction policy.
- **Spawn origins and cues.** Spawns enter from the habitat's origin (road, flanks or all sides), and the HUD cues and edge warning name the habitat.
- **Safe spawns.** Spawns can never fall back onto the hunter. A deterministic ring search keeps them 150 px or more away and skips the spawn when no safe ground exists.
- **Balance.** Removing the on-hunter spawns halves BalanceLab damage taken (280 → 144; defeats 158 → 62). This was deliberate: the brief bans fake difficulty, and steps 2–4 restore pressure with readable threats. Target: 220–280 damage taken by step 4.
- **Next:** roster step 2, Hound flank/pounce plus the Ash Slinger lob and new silhouettes.

## 15. Arena roster — step 2 shipped (Hound pounce, Ash Slinger, silhouettes)

Design: `docs/design/arena-roster-v1.md` §8.

- **Mire Hound.** It flanks, then winds up for 0.5 s with the lane locked, then pounces 150 px for 15 damage (once). After that it recovers and retreats, which gives the player a punish window.
- **Ash Slinger (new `EnemyKind` 4, `Artillery` role).** It holds range and winds up for 0.65 s with the landing spot locked. The ember lands in a 34 px mark for 14 damage. 30% burst damage interrupts the throw.
- **Fairness caps.** No more than 2 committed telegraphs early in a hunt, no ranged attacks in the first 10 s, and Slinger windups are staggered. Damage is fixed, with no stage scaling.
- **Art.** New generated sprites for all five kinds (walk plus an attack pose). Ground telegraphs come from `arena-enemy-telegraphs.js`.
- **Balance.** Damage taken went from 144 to 161 and defeats from 62 to 73, concentrated in the non-dodging Greedy agent.
- **Next:** step 3, the Ash Priest (at most 2 revives, interruptible) and the Penitent directional shield.

## 16. Arena roster — step 3 shipped (Ash Priest, morale, Penitent shield)

Design: `docs/design/arena-roster-v1.md` §9.

- **Ash Priest (new `EnemyKind` 5, `Support` role).** It stays behind its pack. Its 0.9 s heal restores 45% to one locked ally (cooldown 9–13 s). Its 1.5 s ritual raises Ashling remains at half health, at most 2 per encounter, with no second experience drop. 20% burst damage interrupts either cast.
- **Morale.** Killing a priest routs nearby Ashlings for 2.5 s; then they return.
- **Penitent shield.** Frontal hits (±60°) deal 25%, flanks and rear deal full damage, and a 40% hit breaks the guard. A 0.65 s locked-arc bash deals 16, followed by an exposed recovery. Penitents guard nearby priests and slingers.
- **Composition.** A priest only spawns after three Ashlings are planned.
- **Art.** A new Ash Priest sprite, plus bash, heal and revive telegraphs, shield arcs and remains markers.
- **Balance.** Damage taken is unchanged at about 162; defeats went from 73 to 86 because fights run longer.
- **Next:** step 4, the Drowned Wraith and pack recipes.

## 17. End-of-run review prompt

Every run end (extraction, death or abandon) opens a dismissible **How was that hunt?** card after any cinematic, leaderboard or quest overlay. It has five one-tap stars that open the feedback form with Enjoyment prefilled, **Write a review**, **Not now**, ✕, a backdrop click or Esc, and **Don't ask again**, which stores `wyrmforge.reviewPrompt.v1 = muted`. Like mobile in-app review prompts, it asks at a natural pause and never mid-fight. The run summary button is now the more visible **★ Review this hunt**.

## 18. Arena roster — step 4 shipped (Drowned Wraith, pack recipes, director events)

Design: `docs/design/arena-roster-v1.md` §10.

- **Drowned Wraith (new `EnemyKind` 6).** Untargetable and harmless while submerged (a faint ripple), it rises 50 px from the hunter after a 0.8 s ring tell, locks a 0.4 s claw wedge (14 damage), then stays exposed for 1.5 s before sinking. It never rises on the hunter, and it is forced up after 6 s so it can never stall a clear.
- **Pack recipes.** Seven named packs (Wandering Dead, Hunting Pack, Ashling Mob, Priest Warband, Bastion, Drowned Watch, Last Stand) open each habitat plan; fillers spend the rest.
- **Director events.** Surge sends the habitat's signature pack; the Approach/Lair climax sends a Last Stand.
- **Balance.** Damage is unchanged at about 161; defeats went from 86 to 65.
- **Next:** step 5, ordinary elites.

## 19. Arena roster — step 5 shipped (ordinary elites) and chain-lightning revamp

Design: `docs/design/arena-roster-v1.md` §11.

- **Elites.** One seeded roll per node from stage 3 onward: 10%, never on the Outskirts, at most 1 per node and 2 per hunt map.
  - Each promotes an ordinary spawn: +35–60% HP, +10–25% impact, 2.5× XP paid once.
  - It gains one readable power: Gravebound, Packblood, Ember Anointer, Cinder Marksman, Thornrunner, Oathshield or Drowncaller.
  - On screen: an affix-coloured sigil and crest, plus a compact callout. `EliteDefeat` is the typed reward hook.
- **Chain lightning.** The straight 3 px line is now `arena-lightning-vfx.js`:
  - A seeded midpoint-displaced bolt with a glow, a white core, short forks and an endpoint spark.
  - The shape re-rolls every 40 ms and is still under reduced motion. C# endpoints are kept exactly.
- **Balance.** Flat. Kills 1219, damage 161, defeats 63.
- **Next:** the Encountered Enemies book, then step 6, the Reliquary.

## 20. Encountered Enemies book (Codex → Bestiary)

References: the Hades Codex (entries unlock by meeting and killing), Monster Hunter's research levels, and the Hollow Knight Hunter's Journal (silhouettes tease what is still out there).

- **Data (C# only).**
  - The simulation records each kind on spawn and counts kills per kind. `RunSummary.EnemyRecords` and `ElitesSlain` carry them out.
  - `BestiaryState` (Domain) merges every ending, abandoned hunts included. It is saved as `wyrmforge.bestiary.v1`; unknown names and negative counts are dropped on load.
- **Book.** A new **Bestiary** tab in the Codex.
  - **Met creatures:** a cropped, pixel-crisp idle sprite, tier, kills, behaviour, counterplay and habitat. All text is from the brief §2.
  - **10 kills** reveal a hunter's note. **50** mark the creature *Studied*.
  - **A slain elite** adds its affix and counterplay.
  - **Unmet creatures:** "???", a silhouette and a "Rumoured in" habitat hint.
- **Run report.** A "Bestiary • new entries" block lists first sightings and new elites.
- **Tests.** `BestiaryStateTests`, `BestiaryRecordTests` and `bestiary-portraits.test.mjs`.
- **Next:** step 6, the Reliquary.

## 21. Arena roster — step 6 shipped (the Reliquary)

- **What.** An ultra-rare unique: a 6% chance once per hunt, on a stage 4–7 combat node in the monastery habitats.
  - It reveals itself with a 1.2 s hush, then a sigil and an emergence, and fights a ward / corruption / seal rite duel that deepens at half health.
  - It withdraws if the road is cleared first. Full rules are in `docs/design/arena-roster-v1.md` §12.
- **Code.**
  - `RunSimulation.Reliquary.cs`, `ReliquaryBehaviorState`, and `ReliquaryRenderSnapshot` / `ReliquaryFieldRenderSnapshot`.
  - JS: `arena-reliquary-vfx.js`.
  - Callouts are in `ArenaView.Moments.cs`.
- **Codex.** A unique entry: unlocked by a single kill, with no elite form.
- **Next:** step 7, the Bell Warden and Ashfang.

## 22. Design amendment 2026-10-17 reconciled

- The amendment takes precedence over the Spellcraft handover only where the two conflict. The record is `docs/design/design-amendment-2026-10-17-reconciliation.md`.
- **Code conflicts.** The only one is single-primary combat, now marked transitional. No campaign gates exist, and pacing (minor refinements plus level 5/10/15 milestones) is confirmed.
- **Order.** Roster step 7, then Fateweave per-card rerolls, then Frost telemetry, the first Nexus journey and a contextual second auto-cast.

## 23. Arena roster — step 7 shipped (the Bell Warden)

- **What.** An authored set piece on every road that leads straight into the lair. The bell tolls and marks its spot, and the Warden fights a smash / shockwave / toll / rally kit.
  - At half health it cracks: a stagger window, then three-lane tolls. A phase gate means no burst skips the crack.
  - Its fall opens the road and the courtyard gates. Full rules are in `docs/design/arena-roster-v1.md` §13.
- **First hunt.** Always Ashfang (provisional; see the reconciliation record).
- **Code.**
  - `RunSimulation.BellWarden.cs`, `BellWardenBehaviorState`, and `BellWardenRenderSnapshot` / `BellShockwaveRenderSnapshot`.
  - JS: `arena-bellwarden-vfx.js`.
- **Next:** Fateweave per-card rerolls (done in §25).

## 24. Presence scale: bigger elites, uniques and tiered Wyrms

- Elites ×1.25; the Reliquary (27) and Bell Warden (38) are larger than any elite.
- Wyrms ~1.75× larger; `WyrmTier` (Wyrm / Ascendant / Elder / Divine, ×1 / 1.15 / 1.35 / 1.6) leaves room for godlike tiers. Elder and Divine are reserved and need a roaming lair camera.
- Balance is unchanged within noise. Details: `docs/design/arena-roster-v1.md` §13 "Presence scale".
- **Next:** Fateweave (§25).

## 25. Fateweave shipped (per-card rerolls)

- Every level-up card has its own **Reroll** button beneath it; a hunt-wide purse shows the charges left.
  - Each card can be rerolled once per round. Charges never refill on their own.
  - A rare **Gilded reroll** spends the same charge for a stronger card within the same milestone.
- **Code:**
  - `FateweaveState` and `FateweaveSnapshot`;
  - `LevelChoiceService.Reweave` / `CanReweave` / `CanGild`;
  - `RunSimulation.Fateweave.cs`;
  - `LevelUpOverlay` UI.
- Determinism uses a separate seeded stream. Tuning (2 charges, capacity 4, 6% gilded) is provisional; see the reconciliation record.
- **Tests:** `FateweaveTests` (11).
- **Next:** Frost telemetry (§26).

## 26. Frost telemetry (amendment §9)

- **Draft ledger:** what each round offered, what was picked and what was rerolled, per school and relative to the primary.
- **Control ledger:** enemy-seconds denied by freeze/chill, split into threats, elites and the Wyrm. The level-up pulse is kept apart.
- **Where it shows:** BalanceLab tables and CSV, `RunSummary`, and playtest evidence.
- **Code:** `Runs/Telemetry/DraftLedger.cs`, `ControlLedger.cs`, `RunSimulation.Telemetry.cs`.
- **Tests:** `FrostTelemetryTests` (7).
- **Diagnosis** (full version in the reconciliation record):
  - Frost primary cards are offered least often.
  - Frost's control is real.
  - Storm out-controls Frost through a Duelist Lens chill cascade.
  - Frost's actual deficit is Wyrm kill speed.
- **Proposals, not applied:** a proc guard on defeat-burst chill, Frost offer parity, then re-measure.
- **Next:** the first Arcane Nexus journey (Frostfire).

## 27. Arcane Nexus v1 (amendment §3, §11 step 2)

- **One screen:** the Web screen is now the Arcane Nexus. Selecting a research node opens a bench in the inspector with these parts:
  - stage;
  - effect and trade-off;
  - material owned/needed and where to find it;
  - condition pills;
  - experiments;
  - one sticky primary action (track / run / stabilize with consent / equip).
- **Guidance:** a "next discovery" chip (from `LaboratoryAdvisor`). Research nodes carry badges whose shapes differ per stage. The post-hunt prompt opens the Nexus focused on the node. Hunt prep lists equipped mutations.
- **Mobile:** a bottom sheet at about 55% height that keeps the Web visible, 44+ px targets, a 20 px no-pan edge gutter, and extra scroll room so focused nodes sit above the sheet. Sound controls are hidden on this screen.
- **Code:**
  - `Application/Nexus/ArcaneNexus.cs`;
  - `BuildView.razor`(+css);
  - `arcane-web.js` (`focus`, gutter);
  - `ForgeView`, `RunHubView`, `RunSummaryOverlay`.
- **Tests:** `ArcaneNexusTests` (6). Browser tests now use "Arcane Nexus".
- **Next:** a contextual second auto-cast (amendment §11 step 4). Done in §28.

## 28. Contextual second auto-cast: Warding Pulse (amendment §5, §11.4)

- **The spell:** Warding Pulse ◎ (Hunter 3+, never in the first hunt). It deals no damage and shoves movable enemies 78 px out of a 118 px reach. Elites move half as far; set pieces don't move. Recovery 7 s.
- **Arbitration:** the pure `SpellArbiter` with the Guard policy decides when to cast. Each pulse takes the primary's next cast, so there is one shared budget and no second stream.
- **Honest telegraphs:** a pushed Penitent bash whiffs. A pushed hound's lane moves with it, and the telegraph stays truthful. Lobs still land.
- **Traces:** `RunSimulation.DecisionTrace` holds 64 entries: casts plus the first tick of each Recovering/NothingToMove need.
- **Visuals:** an AUTO badge in the HUD, a readiness ring at the hunter's feet and a pulse ring. Hunt prep shows "SECOND SPELL".
- **BalanceLab:** `--contextual` adds the `contextualCasts` column. In the A/B, fragile schools gain the most (Arcane defeats 46→34%) and Storm pays a little (15→21%, within noise).
- **Docs:** `docs/design/contextual-autocast-v1.md`.
- **Next:** amendment §11.5, region and lineage data contracts with state separation. Alternatively, apply the Frost telemetry proposals.

## 29. Region and lineage data contracts (amendment §6, §7, §11.5)

- **Domain:** `RegionId`, `RegionDiscoveryState`, `WyrmLineageCatalog` (one lineage per school, Hunted ≤ Ascendant, Reserved above). `WyrmTier.Primordial` added (×1.48).
- **Application:** `RegionDefinition`/`RegionCatalog`. The Cinder Frontier (working title) is playable. The Frost, Storm and Arcane regions are planned, with concept rosters taken from `user_handover_files/concepts`.
- **Access and influence:** access uses account facts only. Influence is Home/Present/Absent.
- **Persistence:** `SaveLayout` assigns every storage key a `SaveDomain`, and a test enforces it.
- **Simulation:** the factory takes `region:`. The first hunt goes to the home lineage, and Absent lineages are excluded. The starting region is byte-identical.
- **Web:** `wyrmforge.world.v1` with a migration for existing hunters. Hunt prep shows a REGION line.
- **Docs:** `docs/design/regions-and-lineages-v1.md`.
- **Tests:** `RegionWorldTests` (8) and `RegionCatalogTests` (8).
- **Next:** apply the Frost telemetry proposals (proc guard, draft parity), or start authoring the second region's enemies from the concept sheets.

## 30. Frost telemetry follow-up: Stormglass, not Duelist Lens

- **Finding:** a temporary trace of chill and freeze sources showed the Storm control came from the **Stormglass** synergy (freeze on every chain link, and frozen targets feed its own +2 jumps), not from the Duelist Lens. The proc guard was implemented, measured (no effect, Frost slightly worse) and reverted.
- **Fix:** `SpellCombinationResolver.Resolve(..., firstLink)`. Only a chain's first strike freezes; later links and the Rank III fork carry no frost. The card text is updated.
- **BalanceLab** (1,200 runs, same seeds):

  | | Before | After |
  |---|---|---|
  | Storm enemy-seconds denied | 22.9% | 3.6% |
  | Frost enemy-seconds denied (unchanged) | 7.8% | 7.8% |
  | Storm Wyrms slain | 1.69 | 1.69 |
  | Storm defeats | 75 | 75 |

  No other school changed.
- **Tests:** `StormglassDischargeTests` (2).
- **Next:** ~~draft parity for Frost primary cards~~ (misdiagnosis, see §31), then Frost's kill power (Wyrms slain 0.99, the lowest).

## 31. Frost kill power: Frost Shatter

- **Diagnosis:** draft offers are at parity per round. Frost sees fewer primary and evolution offers because it levels slower, and it levels slower because it kills slower. The fix belongs in kill power, not in draft weights.
- **Change:** Frost Shard base damage 16 → 24. New `FrostShatter` (Domain): an enemy Frost Shard kills while Frozen bursts for 50% of its maximum health within 72 px (references: Diablo IV Shatter, Path of Exile freeze-shatter). Scaling from the shattered enemy's health keeps pace with depth. Only Frost Shard triggers it; the shatter splash has no source, so it cannot cascade. `RunSimulation.FrostShatters` counts them; the feedback reuses the Frost nova burst.
- **Measured (BalanceLab, 1,200 runs, vs Stormglass fix `a66a145`):**

| Frost | Before | Shard 24 | Shard 24 + Shatter |
|---|---|---|---|
| Defeated | 7.7% | 5.0% | 2.3% |
| Wyrms slain | 0.99 | 1.12 | 1.18 |
| First Wyrm (s) | 464 | — | 402 |
| Level | 15.2 | 17.6 | 18.0 |
| Enemy denial | 7.8% | 6.2% | 5.9% |

  Arcane, Fire and Storm are unchanged. Kills per minute barely moves (44 → 61) because kills are bounded by spawns; progression speed is the better metric.
- **Tests:** `FrostShatterTests` (Domain), two shatter cases in `OpeningPowerTests`.
- **Owner decision (2026-10-18):** balancing is deferred until every system is in place. Do not open new tuning passes before then; open findings such as Arcane's 20.5% defeat rate wait for that final pass.
- **Next:** amendment §11 slice 5: a second non-campaign start path and clean Chronicle/World/Nexus/Endgame state separation.

## 32. World Gate, Chronicles and the one-time grant ledger (amendment §11.5)

- **World Gate:** a new main-menu destination (after the first hunt) with two arches over product-owner concept art: Free Exploration (region facts, "Road to the Conclave" checklist, ENTER) and Campaign (Book I outline, **In preparation**). BEGIN HUNT is unchanged.
- **Chronicles (Domain):** `StoryBookCatalog` (Book I *The Broken Covenant*, provisional canon), `ChronicleState` (ordered choices, endings) and `ChronicleRegistry` (independent Chronicles, never overwritten). Saved as `wyrmforge.chronicles.v1`.
- **OneTimeGrantLedger** (`wyrmforge.legacyGrants.v1`): permanent rewards are claimed once.
- **AdvancedAccess:** Book I completion **or** every lineage's Wyrm + one Ascendant + Hunter 12. Claimed permanently; the Conclave arrives later.
- **Menu:** six rows. In short landscape the footer moves under the brand; the floating sound controls hide on the World Gate and on short portrait menus (owner allowed hiding them).
- **Tests:** `ChronicleTests` (Domain), `AdvancedAccessTests` (Application), `Mobile_WorldGate_ShowsBothRoadsAndExplorationStartsAHunt` (browser).
- **Next:** author the second region's enemies from the concept folders, or the Arcane Nexus Spellcraft redesign (`concepts/Menus/spellcraft.jpg`). Balancing stays last.

## 33. Frost region F1: Chill, Frostling Packling, Shardcaster

- **Owner direction:** Frost must not feel like a recolour of the Cinder kin. Identity: Fire pressures, Frost boxes in (lanes, footing, slow). Full design: `docs/design/frost-region-roster-v1.md`.
- **Chill:** hunter status, 8% slow per stack up to 5, never a full freeze. Shown as a rime ring at the hunter's feet with one crystal per stack.
- **Frostling Packling (10):** circling pack, telegraphed skitter-bites that punish a chilled hunter.
- **Shardcaster (11):** planted caster; ice lances stop at walls and leave a splinter bloom; black ice patches make the hunter slide.
- **Safety:** both kinds are `HabitatOnly` with `EnemyRealm.Frost`; no habitat lists them, so Fire runs are unchanged. Realms without elite affixes defer the champion to the next spawn.
- **Tests:** `FrostRosterBehaviorTests` (Domain), `FrostEncounterTests` (Application), `arena-frost-vfx.test.mjs` (JS). Sprites were added to the actors atlas.
- **Next:** F2 (shipped, §34).

## 34. Frost region F2: Whitefang Stalker, Cairn Sentinel

- **Whitefang Stalker (12):** flanks behind the hunter's heading, Snowblind Feint leaves a snow cloud (obscures, adds Chill), then a locked-lane pounce with Tendon Chill (+2).
- **Cairn Sentinel (13):** Frost Brace (frontal ×0.3, immovable) into a frontal Avalanche wave (±60°, 170 px); exposed ×1.25 during recovery. Flanking beats both.
- **Design change:** the wave started as a full ring; it became frontal so there is always a readable answer.
- **Tests:** `FrostFlankAndGuardBehaviorTests` (Domain), new cases in `FrostEncounterTests`, `arena-frost-vfx.test.mjs`. Browser 47/49 (the two known mobile failures).
- **Next:** F3, the Hoarfrost Cantor and Mirror Wisp.

## 35. Frost region F3: Hoarfrost Cantor, Mirror Wisp

- **Hoarfrost Cantor (14):** a support that never heals. Breakable chants: Stillness Verse (near: 4 damage, +3 Chill), Reknit (a fallen Frostling's rime husk rises as a 50% thrall, max 2), Rime Hymn (35% max-health crust on 2+ allies for 10 s). A 15% burst, shove or Warding Pulse silences it.
- **Mirror Wisp (15):** veiled (×0.5 damage, half opacity). The Glass Step lands on black ice or 56 px beside the hunter and leaves a harmless reflection double (16) that pays nothing and holds no road open. Then a locked ±50° Shiver Cut and an exposed ×1.4 window.
- **Fixes:** `ENEMY_KIND_COUNT` was 10, so all Frost kinds rendered as the Bell Warden; it now follows the palette table (17). The Wisp's first step distance (90 px) sat outside its own cut, so it was moved to 56 px.
- **Tests:** `FrostRiteAndMirrorBehaviorTests` (Domain), F3 cases in `FrostEncounterTests`, `arena-frost-vfx.test.mjs`, `art-pipeline.test.mjs`. Browser 47/49 (the two known mobile failures).
- **Next:** F4, the Bell of Winter and Reliquary of Glass, Frost elite affixes, habitats and pack recipes, Rimeclaw lair, frost ground, `glacier-region` → Playable and the World Gate region picker.

## 36. Frost region F4a: The Hoarfrost Reaches

- **Region:** `glacier-region` is Playable as *The Hoarfrost Reaches* (working title) once Ashfang is slain. Frost habitats, pack recipes, territory names and extraction plans; Ashfang is Absent, so Frost hunts never attract him.
- **Elites:** Rimehowl, Splinterwright, Twinfang, Barrowlord, Choirwarden, Thousandface (see `frost-region-roster-v1.md`).
- **Snow biome:** its own tiles, drifts, ice patches, snow-laden pines, cairn stacks, a frozen icefall, a buried sledge and pale walls. Frost territories never get the cloister floor.
- **World Gate:** a tap-sized region list with locked reasons; the choice is saved in `wyrmforge.world.v1` (`Selected`, optional). A first hunt in an uncharted region ends at its home Wyrm as a full hunt.
- **Tests:** `RegionCatalogTests`, `FrostEncounterTests`, `FrostEliteTests`, JS snow-biome cases, browser `Mobile_WorldGate_FrostOpensAfterAshfangAndItsHuntRunsOnSnow`. Browser 48/50 (the two known mobile failures).
- **Next:** F4b Bell of Winter, F4c Reliquary of Glass.

## 37. Frost region F4b: The Bell of Winter

- **Set piece (17):** the Frost lair road now raises the Bell of Winter instead of the Bell Warden. The road picks its set piece by region school; regions without one keep an ordinary horde. No reinforcements: Permafrost Slam leaves lasting scars (black-ice footing), Winter Toll sends 3 rings with rotating open lanes, Icicle Recall drops marked icicles on the scars and clears them. Half health: a 2 s rime window, then Deep Winter. Details are in `frost-region-roster-v1.md`.
- **Presentation:** the moments "THE BELL OF WINTER", "DEEP WINTER" and "THE BELL OF WINTER FALLS SILENT"; the bar and entrance follow the bell snapshot `Variant`; the new module is `arena-winterbell-vfx.js`; kind 17 has a sprite and a fallback palette.
- **Tests:** `BellOfWinterBehaviorStateTests` (Domain), `BellOfWinterEncounterTests` (Application), `arena-winterbell-vfx.test.mjs`. Browser 48/50 (the two known mobile failures).
- **Next:** F4c Reliquary of Glass, then the Nexus Spellcraft redesign. Balancing comes last.

## 38. Frost region F4c: The Reliquary of Glass

- **Rare boss (18), Crystal Ward (19), false form (20):** a Frost Reliquary habitat (Mirror mere, Cairn barrows, Buried hamlet) now raises the Reliquary of Glass. Crystal Ward pylons shield it and burn tethers between them; Glacial Prison cages rise over the hunter; Refraction Veil hides it among copies with dead lanterns, and hitting the true body exposes it. At half health it shatters into a deeper rite order. Details are in `frost-region-roster-v1.md`.
- **Presentation:** the moments "THE RELIQUARY OF GLASS", "THE GLASS SHATTERS", "VEIL BROKEN" and the glass defeat and withdraw texts; the new module is `arena-glass-reliquary-vfx.js`; the Reliquary sigil, hush, emergence and bar are themed by the snapshot `Variant`; kinds 18–20 have sprites and fallback palettes.
- **Tests:** `GlassReliquaryBehaviorStateTests` (Domain), `GlassReliquaryEncounterTests` (Application), `arena-glass-reliquary-vfx.test.mjs`. Domain 329, Application 479, JS 170, Browser 48/50 (the two known mobile failures).
- **Next:** the Nexus Spellcraft redesign (handover + amendment). Balancing comes last.
