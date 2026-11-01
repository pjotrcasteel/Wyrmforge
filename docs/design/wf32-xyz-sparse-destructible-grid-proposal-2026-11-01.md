# WF32 / AR3 / AR4 — discrete XYZ tile and destructibility proposal (1 November 2026)

> **RFC / NOT LOCKED / no runtime implementation in this checkpoint.** Owner suggested a classic numbered tile matrix, neighbor-driven transition (“melding”) tiles, explicit height (x, y, z), and future physical destruction. Do not infer approval of a 3D runtime, CV2/FXP, changed collision or draft [PR #459](https://github.com/pjotrcasteel/Wyrmforge/pull/459). Related forest visual gate [#465](https://github.com/pjotrcasteel/Wyrmforge/issues/465) and separate future destruction proposal [#466](https://github.com/pjotrcasteel/Wyrmforge/issues/466).

## Decision under study

Use **one C#-owned, site/seed-stable spatial index** with a dense logical **XY surface tile projection** and **sparse chunked XYZ occupancy for actual destructible solids**. The XY view controls 32×32 authored albedo atlas placement/transition masks. XYZ identifies which solid occupies a height level when a rock, wall or cliff block can lose durability or be removed. Do **not** allocate a full three-dimensional array for empty air or clone all world pixels into memory. This is an extension/view of the *existing* C# AR3 geography/physics authority—not a second world generator or new JS gameplay engine.

A `32×32` tile means **32 source-art pixels wide and tall**, sampled nearest-neighbor. It is **not** an assertion that one cell spans 32 game metres, or that the vertical z increment must be 32 art pixels. Set a single tested pixel-per-metre/world-cell scale against the in-Hunt actor's foot anchor and portrait camera before writing any permanent conversion.

## Two related data views, one authority

1. **Immutable base geography (AR3 unchanged):** `WorldSiteGeography`, `WorldSiteElevationField.Sample`, C# corridors, obstacle polygons, physical grade, material weights and seed. Continuous height and walkability **remain authoritative** where nothing can be excavated; existing route clearance and encounter physics remain intact.
2. **Logical XY visual tile lattice:** a deterministic projection from C# materials/corridors at a world-anchored cell resolution. `(tileX,tileY)` selects a **semantic material ID** such as grass, soil, mud, road or rock; it does *not* save an atlas frame as gameplay truth. Sample meaningful coverage near tile borders/corners to resolve a road bank instead of just nearest-center winner; derive authored corners/edges from adjacent semantic material IDs. An art variant hash may depend on world seed + cell coordinate, never combat RNG. This is the first safe **Wet Forest** proof.
3. **Sparse XYZ *mutable* occupancy (future C# CV2/AR3 extension):** only locations requiring independent blocks/damage/stacking are instantiated. Key `(siteId,tileX,tileY,zLevel)`, value `(semanticMaterialId,occupancyKind,integrity,physicalFlags,version)`. An absent sparse delta means unchanged C# base; an explicit `REMOVED` delta can create a real hole only after the later C# layered-geology contract exists. Chunk keys should be stable and negative-coordinate-safe. A rock face may hold several independent z-level blocks. A fallen tree is likely a single C# prop entity with a footprint, **not** hundreds of damageable soil voxels.
4. **Visual resolver (AR4):** project C# base + mutable delta to source-authored **32px top, side, rim, bank, inner/outer corner and damaged-frame IDs**; screen projection handles foot-anchored depth order. A changed cell invalidates its connected neighbor ring, upper/lower exposed faces and affected occluder metadata. No JS damage authority, no procedural noise source atlas, no per-frame whole-world CPU rebake.
5. **Typed C# destruction event (future CV2/FXP):** damage is assessed once in C#, optionally updating collision/nav/LOS/loot and persistent save delta with stable event ID. G lighting, FXP debris, VFX, audio/haptics and AR4 are consumers. Cosmetic particles can disappear while C# world changes persist. Respect current [cross-engine owner contract](../canon/roadmap.md); do not reopen the deferred FXP engine merely to test forest texture blending.

### Illustrative representation — not an adopted serialized format

```text
XY terrain / art IDs (world-anchored 32px source cells)
  grass grass grass mud
  grass road  road  mud
  grass bank  road  mud

Sparse destructible records (only exceptional occupancy)
  (12,8,0) -> earth / base semantic projection
  (12,8,1) -> stone / solid / 100 HP
  (12,8,2) -> stone / solid / 40 HP
  (12,8,3) -> absent (air)
Fireball hits (12,8,2) -> C# updates HP or removes record
  -> C# rechecks collision/exposed blocks/support once
  -> AR4 resolves new 32px top/face/edge sprites and neighbor seams
  -> G/FXP/VFX/audio consume one typed event
```

The base soil in this example is **conceptual**: a site does not need to store an XYZ record for every base terrain cell.

## Explicit owner scenario — Minecraft-like dirt removal and Wyrm fire fissures

This is an **expected future gameplay capability**, not a cosmetic decal: a Fireball lands on a dirt-covered area, destroys some central and adjacent dirt blocks and leaves a physically altered surface exposing the underlying stone layer. Not every cell must be destroyed. Harder stone resists more damage; an adjacent partly damaged soil tile may remain cracked. The change is deterministic, survives reload if the save model requires it, and alters walkable/blocked topology only through C#.

The effective query must behave like a simple XYZ array — `GetCell(x,y,z)` — even if its memory representation is compressed:

```text
Geologic base (C# generated or authored, chunk-local columns)
  column (12,8): stone at z=0..1, dirt at z=2..3
  column (13,8): stone at z=0..1, dirt at z=2..3

After Fireball (small immutable delta for modified coordinates)
  (12,8,3) -> REMOVED        # stone/dirt below may become visible
  (13,8,3) -> damaged dirt  # neighboring impact falloff
  (12,8,2) -> REMOVED        # exposed stone top z=1
  all other base blocks -> unchanged, resolved by base geology
```

**Critical distinction:** an absent sparse delta is *unchanged base*, not empty air; an explicit `REMOVED` tombstone records a dug-out cell. For a truly editable terrain, C# must eventually own a **base stratum per column** (dirt over stone) and mutable deltas, not pretend a single top-surface color has hidden physical layers. This capability requires an AR3/CV2 gameplay migration and tests; it cannot be implemented by altering only `world-site-pixel32-albedo.js`.

**Fireball pipeline:** one C# explosion at a physical world-space impact/radius computes affected cell keys; uses bounded per-cell damage, hardness, line of sight and cover; applies a single atomic mutation/reward decision; recalculates affected collision, nav/clearance and exposed vertical faces; emits a versioned change-set with changed cells and event ID. The renderer derives tops/face/inner/outer edges from neighbors and the topmost remaining cell. G recomputes relevant occlusion/light metadata; FXP/VFX/audio can emit limited dirt and stone debris without controlling terrain state. Never do damage using visual atlas IDs or JS-particle positions.

**Wyrm fire fissure:** the same C# mutation path accepts a bounded **connected fracture path** across XY cells with depths across z. It may remove/rupture blocks, expose stone, introduce a C#-owned hazardous magma/heat state and locally alter passage. The art atlas supplies authored 32px lip/side/cracked ground/glowing core transition families. Shared G lights the emission; FXP/VFX renders heat/sparks, and AI/navigation reacts only to the C# hazard and collision. This is a reusable **world change operation**, not a separate Wyrm-specific terrain engine. Exact fissure mechanics, damage, cooling and persistence are future CV2/Wyrm design approvals.

**Acceptance test sketches (future):**
- Given fixed seed and layered 5×5 dirt-over-stone area, Fireball at center damages the center + bounded neighbors; the exposed top material becomes stone where dirt is fully removed.
- Same seed, command sequence and saved delta yield byte-identical changed blocks/snapshot after reload and replay.
- Collision/nav and path clearance are revised only for physically removed/added solids; no magical invisible wall or walkable hole.
- Transition resolver updates affected 3×3 XY rings and visible z faces; seams, camera ordering and 32px nearest-neighbor sampling stay correct.
- One long connected Wyrm fissure across multiple chunks produces continuous side/lip art, a C#-authored heat hazard and stable occluder deltas; reduced-FX mode leaves gameplay identical.

## Hard design choices before implementation

| Choice | Recommendation | Why |
|---|---|---|
| Whole dense `[x,y,z]` | **No** | Wastes storage on air, doubles continuous AR3 truth, encourages gameplay fork. |
| Dense/small XY semantic tile IDs | **Yes, as C#-derived projection** | Simple inspectable per-cell matrix; honest native 32px; isolated autotile tests. |
| Sparse XYZ destructible blocks | **Yes, where needed; later design gate** | Rocks/cliffs/bridges/walls need independent integrity and exposed faces. |
| Per-art-tile hit points | **No default** | Art pixels/tiles shouldn't silently define C# collider granularity. Group small props into authoritative entities. |
| Terrain transitions | **Author mapped Wang/edge+corner rules** | One source tile set handles adjacent topological combinations; no smeared generic image blending. |
| Persistence | **Seeded base + ordered authoritative mutation delta** | Save/replay changes rather than an entire regenerated scene or JS-local HP. |
| AR4 prototype gate | **Forest-only, opt-in** | Validate tile grid/visual contract before system-wide destruction refactor. |

## Research and precedent (mechanics only; copy no art)

- [Tiled — Using Terrains](https://doc.mapeditor.org/en/stable/manual/terrain/): source-authored corner/edge/mixed Wang matching and alternative tiles. This directly models the owner's classic melding-tile idea.
- [Tiled — JSON Map Format](https://doc.mapeditor.org/en/stable/reference/json-map-format/): integer tile IDs, layers, chunked tile data for unbounded maps, plus Wang-set metadata.
- [Tiled — Layers](https://doc.mapeditor.org/en/latest/manual/layers/): separate tile and object layers, ordering/offsets for simulated depth. Tiled's simple tile layer stores *tile references only*; custom hit points belong in C# occupancy or entities.
- [Godot — TileSet/terrain authoring](https://docs.godotengine.org/en/stable/tutorials/2d/using_tilesets.html): neighbor-connected authored terrain and tile alternatives; useful algorithmic precedent, **not** proposal to move engines.
- [Godot — TileMapLayer](https://docs.godotengine.org/en/4.6/classes/class_tilemaplayer.html): mutating cells/terrain can update neighbor transitions; broad tile rebuilds cost time, so WyrmForge should invalidate bounded changed chunks only.

## Phased proof, without expanding today's approval

- **WF32-BF0 (current):** freeze forest art scale and the 7 stable C# semantic surface IDs. Produce a readable 2D matrix debug inspector: integer `materialId`, corner/edge mask, atlas frame, seed/variant, and source tile coordinates per visible cell. Keep original rendering modes.
- **WF32-BF1 (current):** use the matrix-derived neighbor contract to replace the inadequate road/bank atlas; prove straight/turn/T/X/end cases, grass↔road↔mud seams at 1×/3× and two real Hunt screenshots. This is an **art and adapter** task, not destruction gameplay.
- **XYZ-0 (future, separate C# owner gate):** architect bounded destructible occupancy in C#, sparse delta serialization, immutable base projection, cell/prop collision reconciliation and versioned snapshot. Start with one 2×2 rock or simple destructible wall on a test scene, not forest floor excavation.
- **XYZ-1 (future):** test Fireball hit, partial damage, removal, changed collision and path/LOS, save/reload/replay, duplicate events, observer systems and bounded dirty-cell rebuild. Defer structural collapse/large excavation until measurable need.
- **Gate:** forest owner must approve visuals from real gameplay. CV2/FXP physical destruction and the overall AR4-B merge gate remain **separate approvals**. Mountain/monastery art remain parked.

## Unanswered scale/engineering questions

World metres per XY tile, vertical z increment/height quantization, minimum destructible unit size, finite-vs-unbounded active chunks, destruction persistence within a Hunt vs world map, clipping around legacy polygon obstacles and bridges/overhang support. All require tests and a distinct owner decision before migrating AR3 authoritative collision.
