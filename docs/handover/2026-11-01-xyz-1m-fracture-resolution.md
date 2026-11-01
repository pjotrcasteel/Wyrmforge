# XYZ physical scale locked; proposed integer-aligned fracture cells — 1 November 2026

## Owner decision and arithmetic

- **Approved:** one authoritative C# XYZ world block is **1m × 1m × 1m**. Each visual top/side face is authored from a **native 32×32 source-pixel tile**. Thus a 5×5-cell Fireball footprint spans 5m horizontally, and a 1–3m small cliff spans one to three vertical layers.
- **Not a clean choice:** 10cm fracture cells would give `32 * (0.1m / 1m) = 3.2` source pixels per edge, leading to fractional boundaries and jagged/inconsistent masks.
- **Proposed, pending separate visual validation:** 8 subcells per axis = **12.5cm each**, exactly **4 source pixels per axis**; 8×8×8 = **512 addressable microcells** per block. A 512-bit sparse occupancy mask would cost **64 bytes per modified parent block**, not 512 child objects. Optional visual-only smaller cracks may be drawn by authored textures/effects; they must not secretly change physics.
- C# `WorldSiteFractureGeometry.Pack(x,y,z)` and `Unpack(index)` supply exact 0–511 local indices; no dense 3D array is allocated. Unit tests verify all 512 positions, 4px alignment and out-of-range rejection.
- Isolated follow-up: immutable C# `WorldSiteFractureMask` uses exactly eight `ulong` layer words (512 bits = 64 bytes) and represents a set bit as a removed microcell. Repeated removal is idempotent, other local cubes remain intact, bitmasks replay through C# JSON, and fully excavated blocks are distinguishable.

## XYZ1/XYZ2 isolated C# fracture-state integration (draft, pending CI)

The existing `WorldSiteStrataMutationState` now owns **only changed blocks'** `WorldSiteCellFracture` masks, via `TryExcavateMicrocell`, `FindFracture`, and `GetMicrocellContact`. One 12.5cm soil microcolumn can be removed without erasing its 1m parent; its newly exposed C# material is actual rock, not a road/ground decal. A fully excavated 512-bit block behaves as a removed soil stratum in whole-cell `GetCell` / `GetExposedSurfaceCell` / contact queries. Intact terrain has no microcell allocations.

- `ApplyFractureImpact` accepts an explicit 1m parent/local integer center and a bounded 0–12 microcell-radius **3D** sphere. It can excavate adjacent 1m dirt blocks across true cell boundaries. The *pre-impact* top occupancy per microcolumn shields buried rock for the entire blast; a subsequent distinct impact can reach genuinely uncovered stone. Deterministic integer order and one shared exactly-once impact-ID registry allow replay without creating another combat engine.
- The sparse C# mutation save upgrades to **v4** with a `Fractures` list (key, immutable mask, latest revision). v2/v3 snapshots restore unchanged and upgrade on new capture; malformed masks, versions, duplicate cells/revisions, and foreign physical scale are rejected.
- Partial fractures do **not** silently mix with existing whole-cell integrity changes on the same block. `GetMicrocellContact` exposes the fine geometry, while the old block-level `GetGroundContact` remains intentionally conservative for partial holes. A future *existing C#* combat/collision/nav adapter must define combined integrity, actor footprint, stepping/falling, debris and LOS before any gameplay cutover.
- This is still **experimental data and isolated impact logic only**: no in-Hunt Fireball hook, live destructible colliders, nav, world save slots, lighting/VFX, or source-art render pass. The physical subdivision remains a technically exercised proposal pending visual approval, **not approved final 32px material artwork**. Canonical **XYZ3** remains the *future native-32px art and in-Hunt visual proof* milestone.

## Migration boundary and existing evidence

The previous AR3 site measures 190m × 310m in real C# geography. Its **historical full-frame diagnostic image** uses 950×1550 logical pixels at 5 pixels/m, so a 32px debug tile represented 6.4m horizontally. That diagnostic scale is not the approved physical block size. The C# `WorldSiteStrataGrid` constructor now defaults to 1m on both XY and Z (190×310 columns/rows), while the existing opt-in Hunt debug renderer explicitly requests `PreviewCellWidthMeters` (6.4m) to preserve its reviewed screenshots until it can render only visible cells at native 32px source resolution. Production Hunt collision, navigation and screen extent remain unchanged.

The C# snapshot regression fixture for the historical debug image explicitly uses the smaller preview grid as well. Do not accidentally render 190×310 blocks into a full offscreen pixel canvas when testing one 5×5 impact; authoritative 1m contact and identity tests remain separate. The 1px high-contrast inset is **debug-only**, never a permanent terrain material edge or a 4px microcell outline.

Do **not** stretch the entire 190m×310m site into a 950×1550 pixel static atlas of 1m cells. The future viewport-cropped compositor must resolve the visible C# XY indices under the actual camera, with nearest-neighbor pixel-safe sampling, authored transition tiles, correct sides/corners/occlusion and performance bounds. Physical metres and screen pixels must be related by an explicit camera transform; physical Z is 1m regardless of the sprite tile height.

## Follow-on acceptance (still open)

1. Build a viewport-cropped 1m Wet Forest diagnostic showing true `(x,y,z)` block IDs and 1px inset per 32px tile at 320/390 device widths. Prove no offscreen 190×310 world-image raster allocation or 6.4m fallback confusion.
2. **Isolated C# fracture-state prototype implemented, pending CI:** sparse v4 masks, per-microcolumn stone exposure, bounded 3D cross-block blast, initial cover shielding and replay. Remaining before acceptance: choose one shared C# integrity/coverage policy, top/side boundary geometry, collider occupancy and live world save slots.
3. Connect confirmed existing C# Fireball impacts to terrain, collision/nav/LOS, safe exits and save slots, with deterministic radius, edge, cooldown, water and late-duplicate tests. Existing G/FXP/VFX/audio consume one versioned event; none owns extra hit/loot physics.
4. Deliver actual in-Hunt 320/390 captures/short video with visually readable authored materials. **AR4-B visual approval is still required; debug colors and old screenshots do not count.** Do not merge [matrix draft #467](https://github.com/pjotrcasteel/Wyrmforge/pull/467) or [art draft #459](https://github.com/pjotrcasteel/Wyrmforge/pull/459) without approval.

Wet Forest is the sole active art/prototype region. Mountain pass and monastery stay parked.
