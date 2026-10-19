# Fire / Frost sprite and animation overhaul — live status

**Date:** 2026-10-19  
**Base:** main at `5d6b0df1e6e3e12fe6a43abef1ec4a0021a07ada` (merged PR #135)  
**Branch:** `codex/fire-frost-lifecycle-20261019` (draft PR checkpoint; work in progress)

This is **not** a complete art overhaul. Do not remove this warning until the acceptance evidence exists for each entry.

## Verified implementation inventory

The C# `EnemyKind` enum and `EnemyCatalog.All` register **21 actor kinds**: **17 independent creatures** and **4 distinct non-creature actors**. These are not 21 separate cards. There are also **2 Wyrms** managed separately. A spawnable false form is not a separate monster.

| Kind | Realm | Identity / origin card | Classification | State at base #135 |
|---|---|---|---|---|
| 0 Hollow | Fire | `user_handover_files/concepts/Fire/01-the-hollow.png` | Creature | Painted 8-pose atlas; lifecycle incomplete |
| 1 Mire Hound | Fire | `Fire/05-mire-hound.png` | Creature | Painted base + 8-frame walk; lifecycle incomplete |
| 2 Ashling | Fire | `Fire/02-ashlings.png` | Creature | Native art only |
| 3 Penitent | Fire | `Fire/06-the-penitent.png` | Creature | Native art only |
| 4 Ash Slinger | Fire | `Fire/04-ash-slinger.png` | Creature | Native art only |
| 5 Ash Priest | Fire | `Fire/03-ash-priest.png` | Creature | Native art only |
| 6 Drowned Wraith | Fire | `Fire/07-drowned-wraith.png` | Creature | Native art only |
| 7 Reliquary | Fire | `Fire/09-the-reliquary.png` | Unique creature | Native art only |
| 8 Reliquary Ward | Fire | Reliquary | Summoned ritual object | Native art; no distinct card |
| 9 Bell Warden | Fire | `Fire/08-bell-warden.png` | Set-piece creature | Native art only |
| 10 Frostling Packling | Frost | `Frost/01-the-frostling-packling.png` | Creature | Native art only |
| 11 Shardcaster | Frost | `Frost/03-the-shardcaster.png` | Creature | Native art only |
| 12 Whitefang Stalker | Frost | `Frost/04-the-whitefang-stalker.png` | Creature | Native 8-frame gait; lifecycle incomplete |
| 13 Cairn Sentinel | Frost | `Frost/05-the-cairn-sentinel.png` | Creature | Native art only |
| 14 Hoarfrost Cantor | Frost | `Frost/02-the-hoarfrost-cantor.png` | Creature | Native art only |
| 15 Mirror Wisp | Frost | `Frost/06-the-mirror-wisp.png` | Creature | Native art only |
| 16 Mirror Double | Frost | Mirror Wisp | False clone (no XP) | Native; shared identity |
| 17 Bell of Winter | Frost | `Frost/07-the-bell-of-winter.png` | Set-piece creature | Native art only |
| 18 Reliquary of Glass | Frost | `Frost/08-the-reliquary-of-glass.png` | Unique creature | Native art only |
| 19 Crystal Ward | Frost | Reliquary of Glass | Summoned ritual object | Native; shared identity |
| 20 Glass False Form | Frost | Reliquary of Glass | False clone | Native; shared identity |
| Ashfang | Fire | `Fire/10-ashfang-the-cinder-wyrm.png` | Wyrm (not EnemyKind) | Painted 8-pose atlas; lifecycle incomplete |
| Rimeclaw | Frost | `Frost/09-rimeclaw-the-glacier-wyrm.png` | Wyrm (not EnemyKind) | Native Wyrm atlas |

The four summons/clones still require visual/lifecycle checks **as distinct runtime forms**, without inventing new designs or bestiary entries. Elite variations, revived actors, frozen actors and shield states share canonical creature identities and must be checked without duplicate counting.

## Existing evidence

- `docs/playtesting/combat-recovery/README.md` contains **actual-game** before/after screenshots and short clips for Hollow, Mire Hound, Whitefang and Ashfang only.
- Those clips do **not** prove the full attack/hurt/death lifecycle, every facing, every variant or device performance.
- `src/Wyrmforge.Presentation.Web/wwwroot/art/enemies/manifest.json` registers painted enemy kinds 0 and 1 and painted Wyrm school 1; all other art uses the native atlas.
- The native renderer has 16 poses only for kinds 1 and 12; other registered enemy kinds have four native poses (0–3), with hit/frozen recolours. That is insufficient for the requested full lifecycle.

## Research informing implementation

1. **GDC — Mariel Cartwright, Powerful and Effective Animation for 2D/3D Games**: preserve a readable anticipation posture and controlled attack follow-through rather than adding arbitrary idle motion. https://www.gdcvault.com/play/1021657/Powerful-and-Effective-Animation-for
2. **Carlisle et al. (2019), biomechanics of the canine trot**: diagonal support, paw contact and swing, shoulder/hip displacement and speed-dependent stride length. Apply separate canine pounce/recovery poses **only when C# reports the corresponding action**. https://pubmed.ncbi.nlm.nih.gov/31122684/
3. **Blizzard Diablo IV character art**: preserve large established shape/material groups visible at gameplay camera distance; no pixel-copy of a card. https://news.blizzard.com/en-us/article/23665024/diablo-iv-quarterly-updatejune-2021

## Checkpoints and gates

- [x] Verify `main`, #135, repo instructions, C# kinds versus summoned objects, gallery and existing assets.
- [x] Tie both canine windup/attack/recovery poses and facing to **real C# phases**, not guessed windup disappearance; passed application and JavaScript validation, focused magic and browser smoke at `fcf8c28`.
- [ ] Hollow: actual C# contact-triggered attack/recovery and genuine hit/death capture now published; **remaining** full visual card match, directional art, full lifecycle refinement and normal-hunt acceptance.
- [ ] Mire Hound: captured actual C# Windup/Pounce/Recover, nonlethal hit and C# death in production renderer; **remaining** exact card match, four+ facings, paw-contact acceptance, ordinary hunts and iPhone.
- [ ] Whitefang: C#-driven feint/pounce/recovery, real nonlethal damage flashes and identity-gated native corpse now recorded and regression tested; **remaining** detailed card-matched painted art, 4+ facings, anatomy/pivot review, normal hunts and physical devices.
- [ ] Fire remaining creatures (2–7, 9): source images, runtime atlases, animation lifecycle, before/after footage.
- [ ] Frost remaining creatures (10–11, 13–15, 17–18): same gates.
- [ ] Summoned wards/false forms (8, 16, 19–20): shared identity plus correct object/illusion lifecycle.
- [ ] Both Wyrms: Ashfang validate full lifecycle; Rimeclaw new card-matched sprite atlas and lifecycle footage.
- [ ] Repeatable `/enemy-lab`, `/hunt-lab`, normal hunts, memory/renderer stress test, physical Safari testing.
- [ ] Full tests, deploy smoke, verified merge.

**Deployment issue observed on base:** build and GitHub Pages deploy jobs passed on `main` in run [39240320024](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39240320024), and real browser scene smoke passed, but the run was marked failed because the separate live playtest collector connectivity check returned HTTP **403**. This is not proof that the game assets failed to deploy; the collector integration remains an unresolved external gate. Do not declare full deployment verification.

**Remote checkpoint policy:** push each coherent change to this branch, verify branch HEAD, and update this file. All detailed creature art source files, runtime atlases, atlas metadata and captured screenshots/clips must be published before checking off any visual gate.

## Actual code delivered on this draft branch (not merged)

- C# `EnemyRenderSnapshot.AnimationPhase` and `AnimationFacingX` now expose Mire Hound / Whitefang state-machine truth, and the production Canvas renderer selects their existing canine poses from `Windup`, `Pounce`, and `Recover`. A cancelled warning can no longer fabricate a canine attack.
- `arena.js` now draws **Whitefang's existing native corpse pose** only from an identity-bearing C# `DeathBurstRenderSnapshot`, fading with the bounded corpse lifetime.
- Application development lab and JavaScript regression tests cover canonical canine phase transitions, Hollow's bounded contact/recovery, true damage and death identity, reduction of motion, developer-only isolation and deterministic snapshots. The first complete code checkpoint at `fcf8c28` passed all three PR workflows (validation, browser smoke, focused magic).
- The **recording workflow** `.github/workflows/fire-frost-evidence.yml` builds the real Blazor game. At 1000×900 and seed 42 it has captured original/runtime comparisons plus moving, actual C# attacks (Hollow contact and canine phase actions), real nonlethal damage and authentic death for **Hollow, Mire Hound and Whitefang**. The opt-in developer-only `artEvents=true` scenario passes two nonlethal and one lethal hit through the canonical damage pipeline; it does not fabricate frontend damage or alter ordinary hunts. Recorded JSON shows 4 sampled hitFlash frames and 5 sampled death-burst frames **per actor**, all renderers without errors, and the expected actor phase transitions. The CI workflow [39247569756](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39247569756) passed and **verified its own push** of PNG/WebM/JSON to remote commit `8d807a2`. See [gallery](README.md) and [observations](evidence/after/art-results-hollow-mire-hound-whitefang.json).

**Not delivered:** brand-new painted sprite art, full body animation sets and cardinal facings for the rest of the roster; verified death/hit/attack clips for every creature; physical iPhone measurements. PR #136 remains **draft**, no merge or new Pages deployment from this branch.

## Owner art acceptance and one-monster workflow — 19 October 2026

**FAILED visual acceptance on physical iPhone, live version 0.0.125 / `5d6b0df` (merged #135):** the recovered painted Mire Hound looks incompatible with the currently playable mage. The mage uses authored, discrete-color pixel-art shapes; the hounds look like heavily textured painted illustrations pasted into a pixel-art world. The owner also rejects their apparent scale and animation quality. Existing browser recordings and passing regression tests do not cancel this rejection.

**Locked production direction:** grounded Gothic dark fantasy **in coherent game-resolution pixel art**, as established in `art/README.md`. Preserve original monster cards for anatomy, identity, materials and silhouettes, but do not just shrink/quantize the card. Match the **actual playable mage** for pixel density, values, lighting, shadow, perspective, perceived scale, depth placement, and sharp contours. Individual actors must have anatomically credible, C#-event-driven animation, not simply recolored frames.

**New workflow: finish ONE monster at a time.** First Mire Hound. Check original card against the actual animated actor beside the mage in a normal mobile viewport. Inspect idle/travel, direction, grounded paw contact, real attack, real nonlethal hit and real death. Preserve original collision and attack behavior. No second monster begins before the first is visually accepted or checkpointed as explicitly unfinished. Push source art, runtime sheets and metadata with every completed slice and verify remote HEAD. Never mark all-roster art done without all acceptance evidence.

**Developer lab:** isolated UI PR [#137](https://github.com/pjotrcasteel/Wyrmforge/pull/137) connects Combat Lab selection to the real `/enemy-lab` renderer and reloads selected monsters on change. It is a separate draft based on main to permit early validation/deployment without merging this unfinished overhaul. Draft #136 also carries early unmerged lab changes; reconcile/avoid duplicate commits or conflicts when #137 is merged.

**No new sprite art or iPhone acceptance is claimed by this status update.**

## Remote validation trail

- PR #135 merged into main `5d6b0df`, no original combat logic rebuilt.
- PR #136 is a **draft** with real pushed code and capture assets, not merged or deployed as the live game.
- `f4535e7`: full app validation passed after actual C# nonlethal/death testing.
- `87e8508`: full app validation passed including Hollow C# contact animation; see [action](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39247578081).
- The current proof capture passed [39247569756](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39247569756) and published matching before/after PNG and WebM and recorded telemetry for 3 actors.
- Latest branch HEAD and browser smoke must be checked again at handoff. Published `main` still refers to PR #135, not the draft PR #136.

**No artwork completion claim:** 19 of 21 C# kinds still use native art (including Whitefang, wards and illusions), and Rimeclaw still uses a native Wyrm atlas. No new painted sheet for these kinds has been committed by this checkpoint. Half-finished monster art is explicitly tracked as incomplete.
