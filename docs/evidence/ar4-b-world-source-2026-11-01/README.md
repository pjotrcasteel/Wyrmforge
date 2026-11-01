# AR4-B world-continuous WF32 ground study — genuine Hunt evidence (1 November 2026)

These three PNGs are **actual WyrmForge browser screenshots** from
[CI run 41294058530](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/41294058530)
(shard 1) on [code commit e1c43b79](https://github.com/pjotrcasteel/Wyrmforge/commit/e1c43b79e098b5b1e63930a0962753b7959a3300).
The test navigated **Town → Free Play → Chart → playable Hunt** at native
320×568 and 390×844 sizes and changed only the opt-in cosmetic view to
`?arenaTerrain=source32c`, retaining the same authoritative C# site,
world seed, obstacle count, grade, actor, movement and camera.

1. [Forest fork — 320×568](ar4-forest-fork-world-source-320.png).
   The visible stamped 32px grass patterns are gone. Ground marks and
   earth wear now come from two source-authored 1024×2112 world windows
   sampled in absolute world coordinates without 32px/256px wrap.
   **Not approved:** forest composition is still too empty/sparse, the
   C#-weighted road silhouette needs a fuller organic edge/corner art
   vocabulary, and there are no source-approved tree/slope height cues.
2. [Mountain pass — 390×844](ar4-mountain-pass-world-source-390.png).
   Road surface is continuously sourced. The cliffs/rock obstacles are
   still flat grey diagnostic C# outlines and **not source-authored stone**.
3. [Monastery region — 390×844](ar4-mountain-monastery-world-source-390.png).
   The C# monastery spectator focus correctly frames the structure,
   but the building and paving remain flat diagnostics, not final pixel art.

Source provenance:
- Editable offline painter: `tools/art/prototypes/ar4-wf32-forest-world-study.mjs`.
- Source banks: `wwwroot/art/terrain/wf32/ar4b-world/{grass,road}-world.png`
  (1024×2112 RGBA native pixels, seed 1387).
- Git blob SHAs (asserted and byte-reproduced by Node tests):
  grass `742d260abb107dfae32d0629977b788069bab5a4`;
  road `d2248081002c773f10f831e000d85b2f8f6618ab`.
- Both banks are decoded once and sampled only for **Grass/Road** C# surface winners.
  The earlier `source32b` authored 32px edge/corner frames still supply narrow
  junction bands; no source textures or lighting are generated per render frame.
- Prior `source32`, `source32b` and P1i `materials` remain independently
  reviewable; ordinary Hunts, AR3 C# geography/obstacles and shared G lighting
  are unchanged.

**Art acceptance gate:** owner approved pixel density/crispness **only**.
Neither these screenshots nor green CI approve WF32 grass/road composition,
rock/cliff art, monastery architecture, stone-source blending, AR4-B, mobile
device performance, or any merge. Keep PR #459 draft until explicit review.
