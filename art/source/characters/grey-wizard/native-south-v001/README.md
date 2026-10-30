# Native south-facing wizard study

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
