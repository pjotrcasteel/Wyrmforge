# Color interpretation comparison — 20 October 2026

The owner confirms the initial model looks rough. A separate Blender render
interprets generated RGB as display/sRGB and converts it to scene-linear before
assigning FLOAT_COLOR. This reduces the pale, washed-out appearance. It is a
comparison, not a verified upstream color-space correction: the inspected
TRELLIS mesh renderer interpolates the values directly, without declaring an
explicit transfer function in that path.

Geometry, generated RGB values, card/reference and first review are unchanged.
The separate editable scene is `../hollow-srgb-review-v2.blend`.

Visual result: darker brown material separation improves, but skull/teeth, ribs,
hands and cloth remain visibly simplified. The color comparison does not solve
lost surface detail or topology. Gate B remains failed; no rig or walking sheet.
Next refinement must address actual material detail and anatomy, rather than
counting a darker render as a finished character.

Render: CPU Cycles. No new reconstruction, hosted inference or GPU settings change.
