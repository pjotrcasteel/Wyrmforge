# Native south-facing wizard study — REJECTED

Owner rejected this reconstruction as too cartoony for the Gothic/Diablo-like
setting. Preserve source/evidence, do not continue or promote this art. Passing
format tests are historical technical checks, not appearance approval.

In production, not approved sprite art or runtime replacement. References: approved
base wizard, v004 cape, v007 staff identity, v009 staff proportions. Art canon and
the 30 October production receipt govern this source study.

Source: `tools/art/grey-wizard/source.mjs`, a layered 2D pixel source using the
existing repository Bitmap painter. No 3D, source-skin, rejected wizard rig,
generated frame collage or transformed single cutout. Explicit authored pose keys
move legs/feet, body weight, sleeve/hand, robe silhouette and beard/hat follow.
First scope: Fire, south, idle + 16-frame walk. Other facings/actions/schools remain
unmade. Palette, shape commands and each pose are editable. Exported layer command
JSON and PNGs preserve editing access rather than only a flattened atlas.

64x80 native cell; provisional ground pivot [34,70]. Native scale is a study,
not permission to double the live mage's world size. Review beside current mage
with an explicit scale ratio; real Hunt camera/feet/occlusion proof remains open.
Staff is authored with the same hand coordinates; its crystal emission is separate.
No normal/roughness/height or directional material acceptance is claimed.

Build: `node tools/art/grey-wizard/build.mjs`
Check: `node tools/art/grey-wizard/build.mjs --check`
Review motion through the existing shared `sprite-animation.js` controller.
GIF/contact sheet are source review, never actual in-Hunt footage. Native sprite
identity and walk quality need visual review before expanding the library.

## First validation receipt

- `build.mjs --check`: 38 exports byte-match; 16 unique poses, 31-pigment palette,
  binary alpha, unclipped silhouette; packed albedo + emission 819200 decoded bytes.
- Existing shared controller samples frames 0..15, pause and reduced motion pass.
  Existing focused controller/mage tests: 16/16 pass; no production code changed.
- `capture.cjs`: actual existing Sprite Lab import, playback and pause pass in
  desktop Chromium at 320/390px, no page errors. `review/browser-report.json`.
  Existing lab hardcodes THE HOLLOW / a generic SE single-view label; this source
  is S, not a new Hollowed or additional facing. Do not reuse its exported mapping.
- `review/south-walk.gif`: all 16 poses, 12fps average, native 1x and nearest 4x.
  `review/south-walk.mp4`: four repeats, 64 frames, FFmpeg decode verified.
- These clips show the authored source cycle in place. Root travel/stride fitting,
  firm world foot contact, turns, action blending and in-Hunt material/occlusion
  are **not verified**. The source's first appearance and walk are unapproved.

Review scripts use external developer tools, not runtime dependencies:
`capture.cjs` reads `WYRMFORGE_PLAYWRIGHT_MODULE` and optional
`WYRMFORGE_CHROMIUM`; `video.py --ffmpeg PATH` needs Pillow and FFmpeg/libx264.
No new game engine, offline 3D requirement or live asset replacement is introduced.
