# T1/T2: geometry-first Gothic Town rebuild — asset selection and approval

Status: **VISUAL REJECTION / WIP**. Scope: PR #359. Production Town stays unchanged and T3 remains blocked.

## Mandatory greybox gate

Approved `night-active.webp` and `day-active.webp` are composition references only. Do not project either painting as the 3D model's albedo, or rely on silhouette extrusion to fake complete buildings. Model each architectural volume as **real 3D geometry** with nonzero depth, meaningful side/back faces, modular materials and independent occlusion.

For every building: (1) screenshot of reference crop, (2) untextured model from camera-matched angle, (3) untextured off-axis model, (4) comparative review at mobile resolution. **No texture/lighting stage proceeds before owner approval of the geometry.** The shared G1–G3 GPU lighting engine remains the production target, not a separate scene renderer. Preview outputs are not shipped game assets until that integration is validated.

## Candidate third-party CC0 sources researched Oct 26, 2026

| Kit | Source | Licensing checked | Potential reuse |
| --- | --- | --- | --- |
| Quaternius Medieval Village MegaKit | https://quaternius.com/packs/medievalvillagemegakit.html | CC0, 304 modular parts; Standard subset free, OBJ/FBX/glTF | Slated roof modules, stone and timber walls, stairs, windows, doors and vines; Blacksmith, Codex, Hall of Fame |
| Kenney Fantasy Town Kit | https://kenney.nl/assets/fantasy-town-kit | CC0, 160 parts | Basic walls, market/prop structures and collision-ready blockouts, NOT final Gothic look |
| Quaternius Modular Medieval Building Pack | https://quaternius.com/packs/modularmedievalbuildings.html | CC0, 30 assets; OBJ/FBX/Blend | Town Gate castle battlements, arches and towers |
| Gothic Architectural Structures by Oneironauticus | https://sketchfab.com/3d-models/gothic-architectural-structures-affc5b590531447788aafc23a011154c | CC BY, credit required | Gothic arches/columns, not stand-alone production building |
| Gothic Structures Round by Oneironauticus | https://sketchfab.com/3d-models/gothic-structures-round-version-88cdaa95723449d4ab8ee64632a2c91a | CC BY, credit required | Round arches on observatory/portal, source credit required |

These are **candidate sources, not yet imported or approved**. Download, inspect license files and geometry quality before integrating any source. Keep required attribution and identify each modified source. Do not use AI-generated source models or a source of unclear license without reviewing it.

## Building-specific modeling direction

- **Arcane Nexus:** custom multi-volume hall + stepped entrance + round stone observatory with dome and actual armillary assembly + separate arcane portal building and stairs. The observatory and portal are unique and should not be replaced wholesale by generic kits.
- **Blacksmith:** use modular rough stone/timber roof base; reshape footprint, forge roofline and chimney to approved silhouette.
- **Codex:** use taller stone/timber architectural modules with specific roof, book/academic cues and frontage.
- **Hall of Fame:** larger facade and gothic windows; use Gothic arch/column modules as a base and adapt final proportions.
- **Shared square:** individual stone-paving geometry, well, noticeboard, gate towers, foliage and lamps; real geometry, not a shallow relief.

## Initial Nexus checkpoint

A greybox model has been rendered for a first owner review, with independent volumes for hall, round observatory dome, roof, right portal and stairs. This is **preliminary**, not approved. The review PNG demonstrates that the current geometry needs a narrower, richer hall shape, more precise dome proportions, a stronger astrolabe silhouette and correct portal/stair positioning. The pixel painting must not be used as a mesh texture to conceal these shortcomings.

Accept only an explicit approval based on **actual geometry** compared against canonical art. Green CI does not count as artistic approval.


## Oct 26, 2026 — Arcane Nexus greybox revision checkpoints (NOT ACCEPTED)

- **Step 5**: built independently lifted roof slates, porch double doors, additional dormers, Gothic stone course blocks, enlarged exposed observatory orrery. Actual GLB and orthographic/off-axis screenshots generated and reviewed; detail improvements alone did not correct overall fidelity.
- **Step 6**: replaced the oversized single roof mass with crossing real gables and true 3D framing; modeled a through-depth **open portal passage** instead of the previous solid front slab; added structural arch/rim and massing. Source: `tools/town/arcane_nexus_step6_greybox.py`; structural test: `tools/town/test_arcane_nexus_step6_geometry.py`.
- **Step 7**: narrowed the rectangular portal annex and gallery as a coherent group relative to the tower, added geometric banners and the rooftop astrolabe. Source: `tools/town/arcane_nexus_step7_greybox.py`; test: `tools/town/test_arcane_nexus_step7_geometry.py`. Exports 181 semantic meshes and 83,932 triangles, intentionally **not mobile-optimized**.

**Reproduce Step 7** from repository root (numpy, trimesh, vtk and pillow installed):

```sh
python tools/town/arcane_nexus_step7_greybox.py artifacts/town-nexus/step7 --render --reference path/to/captured-west-town.png
python tools/town/test_arcane_nexus_step7_geometry.py
```

A reproducible user-side screenshot and `.glb` were produced; their portable downloadable previews were provided in chat. No persistent PNGs were claimed as checked into this repo, and no in-game integration of Steps 5–7 was performed.

**Visual QC result: REJECT / CONTINUE GEOMETRY.** The approved west-district source painting is richer and less symmetrical than these greyboxes. Remaining priority problems: portal outer wall too monolithic, observatory facade looks like plain masonry cylinder, the chapel is still a generic Gothic hall, and the greybox camera must be calibrated to the exact in-game camera before T2 completion. Do not apply canonical texture projection to conceal these failures. Do not merge PR #359; T1/T2 still require explicit owner review and acceptance.
