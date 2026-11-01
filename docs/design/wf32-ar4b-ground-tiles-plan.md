# WF32 / AR4-B: authored 32px terrain-system plan (1 November 2026)

> **Implementation milestone — unapproved work on draft [PR #459](https://github.com/pjotrcasteel/Wyrmforge/pull/459), tracked in [issue #465](https://github.com/pjotrcasteel/Wyrmforge/issues/465).** Canonical requirements remain [roadmap](../canon/roadmap.md) and [art identity](../canon/art-and-animation.md). This plan is not a claim of completed art or visual sign-off.

## Why the previous studies failed

Real Hunt captures of `source32`, `source32b`, `source32c` and `source32d` show technical C#→material binding, but weak finished visual grammar. The forest's broad colour is the most promising; road banks/turns lack deliberate forms; mountain ground remains texturally shallow; regular monastery paving resembles a repeated wallpaper. World-sized generated PNGs with seeded pixels create **reproducible noise**, not a source-authored tile-based 2.5D environment. Tests prove stability, **not** art quality. Do not label those world sources as owner-approved.

Owner decision (1 November): **ground surfaces now; monastery buildings later**. Preserve the original forest direction and avoid work on structures, lighting-engine internals or gameplay terrain.

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
| B3 cliffs | Authored slate/granite plateau top, top rim, visible fractured vertical face, foot/base, external/interior corners and grade-safe ramp transitions. Use AR3's 1–3m cliff and pass classifications directly. | Real 390px mountain pass Hunt, player next to cliff and ramp so scale/elevation reads unambiguously; shared G lighting ownership unchanged. |
| B4 monastery ground | Weathered varied stone/packed-earth courtyard, connected lanes and boundaries at fixed 32px cadence. **No architecture deliverable**. | 390px real Hunt camera on the ground/courtyard; building placeholders explicitly labeled unassessed. |
| B5 gameplay review | New real Town→Chart→Hunt screenshots at 320×568 and 390×844 and a moving player/camera proof. Screenshot files accessible and **visibly embedded in owner chat**. | Clean C# site/grade/obstacle invariants, normal mode parity, mobile native clarity. |
| B6 owner visual gate | Ask explicitly about roads, tile repetitions, mountain rock height and source-art identity, then act on concrete feedback. | **Owner's affirmative AR4-B visual approval**, or remain draft/unmerged. AR4-C, G6–G10 and mobile production sign-off remain separate gates. |

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

2026-11-01: **B0 planning and owner feedback recorded; B1–B6 not completed.** Existing `source32d` trial failed visual quality expectations. Tracker [#465](https://github.com/pjotrcasteel/Wyrmforge/issues/465) is open; draft [#459](https://github.com/pjotrcasteel/Wyrmforge/pull/459) is unmerged. Subsequent commit/evidence references should be appended here without rewriting approvals.
