# Fire mage: animation audit and integration entry point

Read this file first. It supersedes the integration/status statements in older handovers, which are retained as historical source notes.

## Result

This is an editable animation draft, **not a complete production character**. Five original Aseprite files parse successfully (49 frames total, including overlapping/older versions). The new integration file consolidates the 30 current animated frames, then adds eight timeline frames that reuse existing artwork for optional recovery/cancel studies. There are **no newly drawn in-between poses**. Do not describe the 38-frame master as 38 unique drawings or an eight-direction character.

Use `Integration/Fire-Mage-Integration.aseprite`, `Integration/animation-manifest.json`, and `Integration/TRANSITIONS.md`. All original files remain unchanged. The static 32×40 turnaround is an identity reference; do not silently mix it with the 36×40 animation cells.

## What exists

| Animation | Right | Front | Back | Left / diagonals |
| --- | --- | --- | --- | --- |
| Idle | 4 frames, 1310 ms | Missing animation; static turnaround only | Missing animation; static turnaround only | Missing |
| Walk | 8 frames, 1040 ms | 4 frames, 600 ms | 4 frames, 600 ms | Missing |
| Walk start | 3 frames, 360 ms | Missing | Missing | Missing |
| Walk stop | 3 frames, 400 ms; one demonstrated exit phase | Missing | Missing | Missing |
| Cast | 4 frames, 860 ms | Missing | Missing | Missing |
| Cast recovery variant | Optional 6-frame study, 860 ms, reused poses | Missing | Missing | Missing |
| Early cast cancel | Optional 2-frame study, 220 ms, reused poses | Missing | Missing | Missing |
| Turn / moving cast / hit / death | Missing | Missing | Missing | Missing |

Hit/death and moving-cast requirements must be reconciled with the current game design. Do not silently implement a walking cast from the existing full-body stationary cast. No diagonal or left-facing artwork is supplied. Mirroring the right view changes anatomical staff handedness and is not an approved solution.

## Integration steps

1. Open the master in Aseprite and check each tag. `validation.json` records binary/atlas checks, not editor or game approval.
2. Import the untrimmed 36×40 atlas with nearest-neighbour filtering, no smoothing or mipmaps. All manifest frame indexes are **zero-based**; Aseprite UI numbers are one higher. Match the renderer's alpha convention.
3. Use `mage-diffuse.png` for a flattened Fire character. Alternatively compose the separate Body, shaft, head and sigil layers. Do not draw both the flattened diffuse and its components. `mage-fire-emissive.png` is separate and hidden in the native default composite; it is an emission colour source, not a normal/specular map. Adapt strength/channels to the engine.
4. Use clip durations and events from the JSON. Keep the original `cast_right` default. The recovery/cancel studies are opt-in pending visual review; they reuse gather/anticipation on the return, so no second spell is released.
5. Implement transitions using `TRANSITIONS.md`. Add in-game captures for repeated start/stop, cast interruptions and turns. Use actual ground motion when checking staff contact.
6. Address `ART-REMAINING.md` before claiming complete directional coverage. Unsupported clips must be explicit in the content validator; do not substitute an unrelated direction silently.

The master uses five layers: body, shaft, Fire head, Fire emission, Fire robe sigil. The sigil is present only in the back walk. Empty sigil cels elsewhere are intentional. The right pivot (15,39) is provisional from the source handover. Front/back pivots are deliberately null until registered visually in-game. No per-frame hand socket, muzzle socket, root trajectory, or validated world contact curve is supplied; do not invent those from the high-resolution source JSON.

## Files and verification

- `Integration/animation-manifest.json`: clip ranges, timing, events, atlas rectangles, layer paths and per-frame source provenance.
- `Integration/aseprite-audit.json`: original native dimensions, tags, layers, timings.
- `Integration/validation.json`: checks passed and checks still pending.
- `Integration/*-audit.png`: native-frame contact sheets.
- `Integration/*.gif`: native-cel review loops. One-shot actions loop here only for review.
- `Integration/tools/build_integration.py`: deterministic repack/export; Python 3 + Pillow. Run `python Integration/tools/build_integration.py` from the extracted package. It verifies every copied cel and exported diffuse frame against its source.

The parser follows the Aseprite file specification: https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md . It supports this package's RGBA raster files; it is not a general Aseprite renderer for arbitrary blend modes, tilemaps or group hierarchies.
