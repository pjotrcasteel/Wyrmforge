# AR4-B source32d ground-only CI review — 2026-11-01

Status: **provisional / owner visual approval not granted**. PR #459 stays **draft and unmerged**.

This follows owner feedback that native Wet Forest is better, road needs further work, mountain has no meaningful stone texture, and monastery **buildings are out of scope for now**. This study changes only ground material presentation, never authored structures.

## Actual playable Hunt captures

These are **CI Playwright screenshots of the actual Town → Chart → Hunt route**, not generated render mockups. Captured by [Browser smoke run 41295956914](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/41295956914), shard 1 (job 124817373141), on code commit [50573e8](https://github.com/pjotrcasteel/Wyrmforge/commit/50573e8a4b599d232e05b61b562f2b55b219d8a5). The PNGs also appeared individually as inline images in the owner chat.

1. [Wet Forest source32d, 320×568](./ar4-forest-fork-stone-ground-study-320.png) — retains native authored forest ground; refines compacted earth pixels and grass/road seam palette.
2. [Mountain Pass source32d, 390×844](./ar4-mountain-pass-stone-ground-study-390.png) — world-phase natural rock facets plus distinctly bedded escarpment faces, clipped to C# obstacle polygons.
3. [Monastery-region source32d, 390×844](./ar4-mountain-monastery-stone-ground-study-390.png) — rock substrate and sourced paving clipped to existing C# road/courtyard/terrace geometry; **buildings remain intentionally flat placeholders**.

## Engine and asset boundaries

- New review query: `?arenaTerrain=source32d`. Existing `materials`, `source32`, `source32b`, `source32c` and default Hunt rendering remain available.
- Offline source code: `tools/art/prototypes/ar4-wf32-stone-road-study.mjs`. Four deterministic native-pixel full-world PNGs: `rock`, `cliff`, `paving`, `road` at **1024×2112**. Source manifest explicitly has `approved: false`.
- The existing world source's `grass-world.png` is unchanged; `source32c` remains the positive forest baseline. New road reuses existing authored 32px directional seam shapes, selecting matching grass or road world-phase palettes.
- All material winners, terrace/courtyard outlines, cliff faces, site IDs, height, paths, and colliders remain authored by C# AR3. JS does one-time **albedo composition only**. No runtime noise, terrain generator, gameplay route changes, fake lighting, or G4/G5/G6 lighting/shadow fork.
- Original WF32 source PR #429 and P1i source assets untouched. No architecture sprites, roofs, building models, or AR4-C production lighting were added.

## Visual evaluation still needed

- Forest: keep its recognisable clustered ground morphology.
- Road: higher-density native earth/clast detail and reduced seam-color mismatch, but still needs deliberate road-bank definition and site-appropriate compacted soil structure.
- Mountain: improved over flat blue-grey, but **cliff top versus vertical face** and 1–3 m height cues remain too subtle for final signoff.
- Monastery: ground textured, but regularly coursed paving risks reading as repetitive masonry rather than irregular worn courtyard. Buildings can remain placeholders per owner instruction.

**Stop condition:** AR4-B visual owner approval pending. No merge, no AR5 acceptance, no claims of G6–G10 or full performance completion.
