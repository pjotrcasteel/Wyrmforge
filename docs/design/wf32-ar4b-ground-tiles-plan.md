# WF32 / AR4-B: authored 32px terrain-system plan (1 November 2026)

> **Implementation milestone — unapproved work on draft [PR #459](https://github.com/pjotrcasteel/Wyrmforge/pull/459), tracked in [issue #465](https://github.com/pjotrcasteel/Wyrmforge/issues/465).** Canonical requirements remain [roadmap](../canon/roadmap.md) and [art identity](../canon/art-and-animation.md). This plan is not a claim of completed art or visual sign-off.

## Why the previous studies failed

Real Hunt captures of `source32`, `source32b`, `source32c` and `source32d` show technical C#→material binding, but weak finished visual grammar. The forest's broad colour is the most promising; road banks/turns lack deliberate forms; mountain ground remains texturally shallow; regular monastery paving resembles a repeated wallpaper. World-sized generated PNGs with seeded pixels create **reproducible noise**, not a source-authored tile-based 2.5D environment. Tests prove stability, **not** art quality. Do not label those world sources as owner-approved.

Owner decision (1 November): **Wet Forest first.** Finish its 32px ground, compacted-earth road bank/junction and actual 320px Hunt presentation before touching other sites. **Mountain Pass B3 cliffs and monastery-region B4 ground/paving are parked** until the owner reviews the forest. Monastery buildings remain deferred to AR5. Preserve the positive forest base and avoid changes to lighting-engine internals or C# geography.

## Current work order — forest-only approval gate (supersedes earlier parallel B3/B4 order)

1. **ACTIVE BF0/B1:** validate existing WyrmForge `grass-moss`, `trampled-earth` and `wet-mud` concepts and #429 source art; author a real editable 32×32 **forest** grass↔mud↔compacted-road system with coherent macro clumps, occasional rocks/roots, worn center and naturally connected shoulder/bank transitions. Current v1 Wang road's cookie-pebble pattern is **rejected** as a material look.
2. **ACTIVE BF2/B5:** keep forest site C# geometry/seed, original source32c forest grass and shared G lighting boundaries; test one-time atlas compositor against authored source/stress map. Capture genuine 320×568 Wet Forest Hunt after source improvements **and moving gameplay**, display PNGs individually.
3. **MANDATORY CHECKPOINT BF6:** ask for explicit **Wet Forest-only owner approval**. This approval cannot approve mountain/monastery, AR4-C, AR5 or merge PR #459.
4. **PARKED B3/B4:** mountain rock/1–3m cliff face kit; monastery paving/ground. Keep existing screenshots/tests as regression baselines. No new art or CI work directed at these environments while forest is the visual target; structures remain out of scope.
5. **Later full AR4-B:** resume B3/B4 only after Wet Forest owner review; the full site/material approval gate and draft merge policy remain mandatory.

## Visual contract and real artistic source

- **Native 32×32 pixel cells** define terrain authored at full native scale. This is an art grid, not a claim that C# world metres equal 32 pixels. Derive render pixels/world units from the existing Hunt camera and accepted sprite foot scale; do not tune C# colliders for art.
- **Top-down three-quarter 2.5D**: feet attach at canonical ground contact, horizontal surfaces read from above, and cliff *front faces* have coherent vertical exposure. Fixed projection, no painted directional cast shadows in neutral albedo.
- **Original source**: prefer the existing owner-liked WF32 P1i soft materials and P1j 2.5D vegetation/rock source on [art PR #429](https://github.com/pjotrcasteel/Wyrmforge/pull/429); use this PR's atlas only for new ground-transition art and renderer adapter. No re-importing unsanctioned public asset packs and no copied reference-game tiles. Future source masters must remain editable (pixel-layer artwork/atlas mapping, not just opaque generated output). The previous `source32d` is reference/rollback only.
- **Palette/materials**: finite per-biome ramps; clustered light/mid/shadow groups, deliberate earth clasts/roots/grass tufts. Edges communicate material boundaries without one-pixel random speckle blankets. Grass may have three purposeful interiors; road bears worn center/rut or embedded pebbles in natural groups; grass verge grades through packed dirt into road core.
- **Tiled-compatible terrain semantics**: explicit bit- or ID-mapped edge/corner coverage, inner/outer corners, straight banks, diagonal bends, road end caps, T and X joins, pinch/width cases and adjacent-edge consistency. The classic 16-corner/16-edge/47-blob categories are **families for coverage planning**, not a substitute for looking at actual tiles.

## Delivery order / acceptance

| Gate | Work | Required evidence |
|---|---|---|
| B0 source/style inventory | Compare real source #429, 32px atlas prototypes, existing engine units/camera, actual CI screenshots and reference scale. Document the chosen grass/road palette and perspective contract. | Editable tile source structure and pixel-size reference at true 1×, no claim of art acceptance. |
| B1 authored Wet Forest terrain grammar | True native 32×32 grass, compacted earth, mud and road cores; coherent grass↔soil↔road shoulder families with all boundary directions/corners/junctions. Include multiple designed *interiors* that do not resemble a repeated 32px stamp. | An **adversarial stress-map** with straight/curved/split/end/narrow roads, wet and dry verge interactions at 1× and nearest-neighbour 3×, plus deterministic tile-ID and seam tests. |
| B2 existing-Hunt renderer integration | A cosmetic one-time atlas/transition compositor under an opt-in `arenaTerrain` review mode consuming authoritative C# surface/road/obstacle data. Deterministic authored variants only; keep previous modes and default gameplay intact. | Same C# site/seed/world geometry in native and semantic captures, no generated world art as a second map, no per-frame source authoring, no G/physics branch. |
| **B3 cliffs — PARKED** | Authored slate/granite plateau top, top rim, visible fractured vertical face, foot/base, external/interior corners and grade-safe ramp transitions. Use AR3's 1–3m cliff and pass classifications directly. | Real 390px mountain pass Hunt, player next to cliff and ramp so scale/elevation reads unambiguously; shared G lighting ownership unchanged. |
| **B4 monastery ground — PARKED** | Weathered varied stone/packed-earth courtyard, connected lanes and boundaries at fixed 32px cadence. **No architecture deliverable**. | 390px real Hunt camera on the ground/courtyard; building placeholders explicitly labeled unassessed. |
| **B5 Wet Forest gameplay review — ACTIVE** | New real **Wet Forest** Town→Chart→Hunt screenshots at **320×568** and moving player/camera proof; other sites retained only as baselines. Screenshot files accessible and **visibly embedded in owner chat**. | Clean C# site/grade/obstacle invariants, normal mode parity, mobile native clarity. |
| **BF6 owner forest checkpoint — ACTIVE** | Ask explicitly about forest road morphology, grass banks, tile repetitions, source-art identity and 32px scale. | **Owner's separate affirmative Wet Forest approval** is required before B3/B4 resume. It is **not** aggregate AR4-B approval; PR #459 remains draft/unmerged. AR4-C, G6–G10 and mobile production sign-off remain separate gates. |

## Engine boundaries (hard)

1. **C# AR3** alone owns terrain types, elevation, legal route geometry, player motion, collisions, path centers, obstacles, rewards, saves and seed.
2. **AR4** maps those authoritative fields to visual tile IDs, atlases and material descriptors only. A Tiled/Wang authoring scheme does **not** introduce Tiled as a second runtime world generator.
3. **Shared G engine** alone owns lights, normals, occlusion and shadows. Authored albedo supplies no fake cast shadows or hard-coded night tint.
4. Preserve original WF32 [#429](https://github.com/pjotrcasteel/Wyrmforge/pull/429), all G/AI/AN work, production Canvas fallback and existing material demo modes. Additive opt-in visual work first.
5. No claim of phone performance, monastery architecture approval, AR5 dressing or AR4-B acceptance until evidenced.

## Research implementation references (ideas, **not** licences to copy art)

- [Tiled — Terrain/Wang sets](https://doc.mapeditor.org/en/latest/manual/terrain/): corner/edge transition authoring, multiple alternative tiles.
- [Aseprite — Tilemaps](https://www.aseprite.org/docs/tilemap/): source tileset and tilemap edit workflow; [CLI](https://www.aseprite.org/docs/cli/) for automated atlas export.
- [LDtk — Auto-layers](https://ldtk.io/docs/general/auto-layers/): source-authored rules and contexts from semantic terrain, which can be adapted to our existing C# terrain contract.
- [Godot — Multiple resolutions](https://docs.godotengine.org/en/4.6/tutorials/rendering/multiple_resolutions.html): integer/nearest sampling and stable native-pixel presentation principles.
- [RPG Maker — Mapping cliffs](https://www.rpgmakerweb.com/blog/tips-and-tricks-mapping-cliffs): explicitly authored top, vertical face, base and joining corner silhouettes.

## Milestone checkpoint status

2026-11-01: **B0 planning recorded. B1 source-only 16-mask/8-variant study committed with art/refinement/export open. B2 opt-in Hunt compositor implemented, awaiting CI/gameplay visuals. B3–B6 incomplete; no owner sign-off or real-device approval.** [B1 source-only review](../art/previews/wf32-ar4b-wang/README.md) records visible repetition and other unresolved issues. New review path `?arenaTerrain=source32wang` uses the unchanged `source32d` forest/stone source bindings and overlays the new road tiles **only where the C# 4px surface winners say Road**; first genuine [CI B2 Hunt captures](../evidence/ar4-b-wang-road-study-2026-11-01/README.md) were produced at 320/390px; the **visual result is unacceptable** (obvious repeating pebble cadence, weak cliff face). Rework B1 source and B3 cliffs before owner approval. Existing modes remain unchanged. Existing `source32d` trial failed visual quality expectations. Tracker [#465](https://github.com/pjotrcasteel/Wyrmforge/issues/465) is open; draft [#459](https://github.com/pjotrcasteel/Wyrmforge/pull/459) is unmerged. Subsequent commit/evidence references should be appended here without rewriting approvals.

### 1 November owner sequencing follow-up

**Do not continue cliff or monastery art while Wet Forest is unresolved.** The existing three-site Playwright regression cases may remain to guard against unintended rendering failures, but new review evidence and source work must target the Wet Forest first. Current issue tracker: [#465](https://github.com/pjotrcasteel/Wyrmforge/issues/465).

### Wet Forest B1v2 source-only revision (1 November)

A new **forest-only** `source32wang` study is planned to replace the rejected three-pebbles-per-tile road with sparse compacted-soil masses, occasional authored roots and low-frequency clasts. No C# terrain class or height changed. Original `source32c` forest base and earlier v1 image evidence remain available. [B1v2 native stress board](../art/previews/wf32-ar4b-road-v2/README.md) is an **unapproved source preview**, never a Hunt capture. The separately gated Mountain Pass and monastery are not revised by this iteration.
