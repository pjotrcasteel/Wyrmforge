# WyrmForge — Work execution handover: world-first Arena Generator reset (29 October 2026)

> **Execution instructions, not a second design authority.** The only binding product requirements are the canonical [world-first AR0–AR7 roadmap](../canon/roadmap.md#world-authored-arenas-and-groundmaterial-fidelity--ar0ar7-owner-decision-29-october-2026-locked), [Hunts and world §4.3 and §5.0](../canon/hunts-and-world.md#50-map-to-arena-geographic-fidelity-and-discovery--locked-owner-decision-29-october-2026) and [architecture engine ownership](../canon/architecture-and-quality.md#geographic-site-and-surface-interaction-ownership--locked-29-october-2026). This handover coordinates implementation only. **No AR or FXP implementation is claimed by this document.**

## Owner's direction

Start the **terrain-composition approach** over because repeated painting, mirrored 900px→252-world-pixel textures, feather masks, random material-cell borders and disconnected material labs failed. Do **not** delete approved source paintings, rewrite the live Hunt/AI/lighting/physics engines, or remove existing production fallback. Work first in **semantic solid colors** and expose the **actual playable Hunt camera** to the owner. Only after convincing locations are approved should their material IDs acquire real artwork.

A Hunter's Chart forest **fork** must generate a fork with the correct connected exits; a **mountain** must generate a constrained mountain site; a **Wyrm Lair** must generate the right lair. Map illustration, real exit graph and actual arena geometry come from **one authoritative versioned C# site definition**. Each encounter should have a recognizable history, meaningful exploration, legitimate chance of material/relic/knowledge rewards, and actual danger. No new arbitrary gear/equipment economy. Sites must be repeatable yet not look cloned.

## Start now: scope isolation and true dependencies (owner correction, 29 October 2026)

1. Inspect **current** `main` and existing contracts; identify conflict risk with [#338](https://github.com/pjotrcasteel/Wyrmforge/pull/338) (road/terrain), [#340](https://github.com/pjotrcasteel/Wyrmforge/pull/340) (source art) and [#381](https://github.com/pjotrcasteel/Wyrmforge/pull/381) (GPU/live adoption). This is **a short ownership/conflict audit, not an acceptance prerequisite or permission to stop**. Preserve their branches and assets; do not merge, delete or overwrite them. A status check of Hollowed, ENG, G5 or AI must never prevent starting AR0–AR3.
2. **START AR0 IMPLEMENTATION IMMEDIATELY.** The owner's correction explicitly exempts **AR0–AR3** from the older Hollowed → ENG → G5 → AI feature-engine sequence. Hollowed PR #399 approval, ENG0–ENG4 completion, the draft live-GPU PR #381 merge/acceptance, AI real-device sign-off and FXP milestones **are NOT prerequisites** for AR0, AR1, AR2 or AR3. That old sequence applies only to unrelated shared engine work. Do not inspect these gates and return 'blocked'; commence C# map→arena geography and a solid-color actual-Hunt proof using the current live renderer. Use a separate feature branch, preserve ongoing sessions and honor [AGENTS.md](../../AGENTS.md) source/commit rules. AR4–AR5 require owner AR3 approval and shared G interfaces (not a completed G5 production cutover); AR6 cosmetic motion requires FXP7–FXP8. No other unrelated milestones gate AR0–AR3.
3. Work uses the existing .NET/C# architecture and platform-neutral domain/application. Potential touchpoints include `WyrmrealmMapNode`, `WyrmrealmMapGenerator`, `HuntArenaGenerator`, `ArenaEnvironmentState`, run render snapshots, `WyrmrealmMapView`, `arena-territory-art.js`, `arena-environment.js`, the live Hunt renderer, and the existing shared `LightingEngine`. Names for new contract shapes are illustrative, not orders to invent new types.
4. Do not build an image-to-terrain decoder, second world engine, arena physics engine, separate light renderer, JS-authoritative reward/route generator, or entirely new standalone browser minigame. Existing Arena/Material Labs can support debug controls only when backed by the **same** C# plan used in real Hunts.

## Implementation order — continue across commits, stop only at a real approval gate

### AR0 — data contract + semantic debug proof (first delivery)

- Audit map-node → route/region → site identity → actual environment snapshot → render. Write a brief crosswalk of current data ownership, missing fields, version/replay constraints, and preservation scope.
- Model **stable geographic identity** with a single shared C# descriptor/recipe: site and region IDs, graph edge to local port IDs/directions, mandatory landmarks, terrain class/height/slope/moisture/wear fields, physical entrances/exits, optional discovery envelope, and version/seed. Prefer extension/adaptation of existing models over duplicative contracts.
- Ensure a chart node and live arena both consume this same plan. If drawing data currently differs, close the gap without rewriting current Tier I–III route/extraction/reward mechanics.
- Render typed material IDs as named **solid debug colors** in the **existing real-Hunt renderer/camera**, which may use the current Canvas path until G5 migration. This must be driven by the same C# site data the future GPU adapter will consume, not a separate standalone PNG or new lighting engine. Debug colors must not become gameplay metadata.
- Provide real mobile-sized map/node ↔ live-arena capture pair (320 and 390 widths), diagnostics for seed/region/site/edges/materials, C# deterministic topology/snapshot/save/replay tests and JS integration/browser screenshots where applicable.
- **Owner visual approval gate AR0.** If no actual gameplay capture can be produced, explain the blocker; no AI illustration/mockup may substitute.

### AR1 — three believable locations

- Forest with *correct fork*: road edges and 2 geographically correct exit directions; true forest substrate, believable canopy/roots and optional pocket, no invisible road or fake choice.
- Mountain pass: actual elevation/slope/cliff and navigable corridor, not a green rectangle tinted gray; alternate valid shapes/seeds, safe boss/telegraph clearance where relevant.
- Wyrm Lair: real site identity/landmarks and lineage-corresponding approach/space; never a default generic clearing pretending to be a lair.
- Test repeated seeds, swapped entry directions/orientations, valid graph-to-exit mapping, C# collision/paths, enemy spawn safety, camera scale and realistic silhouette.
- Deliver chart/arena pairs **in flat colors**, actual Hunt, not unrelated artwork. **Owner visual approval gate AR1.**

### AR2 — exploration and reward-bearing site variation

- Sites should be worth exploring: grounded human traces, side clearings/optional caves/wagons/crypts, clues and a *chance* at legally eligible material, relic, temporary advantage or knowledge reward, without a compulsory detour.
- Reuse existing tier rarity, material cargo, one-time pickup, route commitment, extraction, refuge and save mechanics. No invented gears/gear drops; reserve future equipment integration behind its own approved progression specification.
- Property and play tests: real reachable loot, one award per identity, bypassed branches unavailable, retry/refuge/reload idempotent, optional detours do not strand player or permanently remove necessary path.
- Provide real playable footage of one discovery and one honestly empty or low-reward optional location; absence of guaranteed loot is intentional.

### AR3 — semantic ecology, still flat colors

- Materials are **classes + continuous weight fields**, not giant painted image chunks. Roads are compacted by actual travel; mud gathers in appropriate drainage/low zones; moss/grass respond to shade/shelter, rock to geology/slope, water to actual hydrology.
- The same saved seed and map geometry must remain unchanged with debug/material display toggled. Test physical path/mask continuity and scrolling; remove artificial color blobs, checkerboard/16px seams and arbitrary ellipse placement.
- Real Hunt map/arena paired captures on multiple seeds, several sites, 320 and 390 widths. **Owner visual approval gate AR3** before any new material production.

### AR4–AR5 — only after AR3 approval

- AR4: genuinely repeat-resistant, world-scaled, source-authored material library; PR #340 source art retained and optionally re-authored as microdetail. Use the **existing shared G GPU material contracts** for prototype/visual review; do not require PR #381's G5 production cutover to author and inspect materials. No mirrored 252px repeats, fake pre-lit water, arbitrary per-frame canvas bakes, or separate paint-only engine. Production cutover remains G5/AR7 work.
- AR5: anchored vegetation/trees, rocks, plausible ruins and scene dressing; authoritative collision/occlusion consistency, stable camera/depth, no stamped foliage, proof on real device. Offer typed physical response profiles; **do not implement physics in AR**.
- Visual acceptance for AR4 then AR5 at ordinary gameplay size, same scene/seed solid-vs-material comparisons.

### FXP7–FXP8 then AR6 — integration only

- Existing FXP1–FXP6 is the **one** cosmetic 2.5D physics runtime for debris. Extend its existing contracts, once eligible, with FXP7 typed contacts/soft surface reactions and FXP8 bounded mud/splash/displacement; do not create `arena-physics.js` or a separate dirt solver.
- C# retains gameplay collision, actual hazard/loot/deformation authority. Animation exposes accurate grounded foot-contact cues. AR configures visual material profiles and displays tracks/scorches/deformation overlays. FXP computes physical movement, VFX and lighting use their shared APIs. Visual static decals need not run through rigid-body physics; avoid excess work.
- AR6 acceptance requires **actual** mage/Hollowed traversals, Fire/Frost/Storm impacts, correct contact, bounded persistent-looking marks, replay, no duplicate damage and reduced-effects fallback. Block only this integration on required FXP work—do not block AR0–AR5 waiting for physics.

### AR7 — production acceptance

- Compare existing vs replacement in an actual Hunt with Chart node, fork, mountain and lair, several seeds and natural exploration; capture real in-game screenshot/GIF/video at 320/390.
- Measure real iOS/Android frame-time, memory, heat/battery, scrolling, low-end/reduced-effects; prove live GPU material/actor shadow adoption and zero-light response.
- **Owner approval is mandatory**. Passing CI or a PR merge is not acceptance.

## Evidence checklist and stop rules

- Validate source and line ownership with real code before claims. Reuse current MSTest/C# domain simulation and JS/Playwright/browser smoke suites; add seeded graph/property tests, screenshots and device QA.
- For each PR: explain source preservation, exact edited files, mapping chart→arena, which C# paths own gameplay decisions, which FXP/G/VFX/AR parts only render, test results and a link to the real capture. Include known acceptance gaps and no silent invalid fallbacks.
- **Begin implementation on this request, not a status-only review.** Push coherent work and update draft PR and docs frequently so context loss does not lose progress. One commit is **not** permission to stop and ask the user to say 'continue'. Continue through the **AR0 real-in-game visual acceptance gate**; after approval move to the next milestone. Do not block AR0–AR3 on Hollowed, ENG, G5, AI or FXP completion.
- At AR0, AR1, AR3, AR4, AR5 and AR7 visual gates: provide actual capture(s) for owner inspection and **stop before proceeding past the gate**. Do not replace real gameplay evidence with generated conceptual images.
- Do not merge visually unapproved art or represent unfinished AR/FXP/G/AI acceptance as complete. Preserve working fallback while preparing a safe cutover.
