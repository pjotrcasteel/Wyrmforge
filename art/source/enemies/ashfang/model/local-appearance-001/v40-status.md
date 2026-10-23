# V40 anatomical source review — 21 October 2026

Authority: [canonical art](../../../../../../docs/canon/art-and-animation.md),
[creatures](../../../../../../docs/canon/creatures-and-encounters.md).
Reference application: [game study](../../game-dragon-reference-study.md).

V37 was rejected as cricket-like. V38 replaced the entire narrow reconstructed
trunk/neck and forelegs with continuous volumetric authored surfaces, enlarged
the thighs/paws and separated the lower jaw. V38's remaining long wing sail and
clipped side preview failed internal review. V39 articulated the wrist/finger
fold in opposing directions. V40 settles those joints along the back, broadens
the skull, and transfers continuous side-card UVs rather than discontinuous
nearest-source texels. Original card, old sources and prior motion studies stay.

Actual V40 evidence: one grounded sample and editable Blender rig, four actual
3D cameras, silhouette/clay/texture rows, native 110px per model unit in a 256px
cell. The larger cell adds padding, not magnification. RTX 5090 renderer; all
four views unclipped, finite stance above floor, no changed player/game code.
There is no newly validated action set, eight-direction animation or runtime
integration. The V37 motion library belongs to the previous anatomy.

Internal visual findings: fuller chest/thigh/paw mass, no long folded-wing sail,
and more coherent card texture. Remaining failures: folded membranes still form
a rounded hump, head lacks sufficiently strong planar/brow/jaw definition, and
surface material is too uniformly molten with projection banding on the tail.
The source is **not visually accepted**. Do not launch another full motion bake
before correcting these issues at native mobile size. No screenshot-derived
pixels are published. Next work is folded-membrane deformation, skull planes,
and stone/ember separation, then the same silhouette gate and animation review.

Checked main 233a1c9f and open concurrent PRs before changing source tools.
PR #186 remains draft. Local source and review checkpoints are pushed separately.
