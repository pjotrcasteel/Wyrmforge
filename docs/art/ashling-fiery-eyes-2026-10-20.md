# Ashling fiery eyes

The owner approved the death preview and requested little fiery eyes as a general Ashling appearance change. Current review exports are `movement-fiery-eyes-v1`, `attack-fiery-eyes-v1` and `death-fiery-eyes-v1` under `art/source/enemies/ashling/exports/`. This appearance revision awaits owner review; runtime integration remains pending.

The eyes use small orange/yellow hot pixels on the actual head surface. Original-face close-up inspection and per-pixel mesh coordinates are preserved in `model/local-appearance-002/eye-study-v1/`. The selected socket centers come from original surface-map pixels (192,326) and (281,319). Elliptical vertex masks use 0.020/0.013 model-unit radii in X/Z and a depth restriction to avoid affecting the rear surface. The weights and original surface centers are preserved in each export's `eye-source.npz`.

The same weights interpolate over the evaluated deformed head in every frame and actual direction, using local CUDA rasterization. The whole mesh provides occlusion, so eyes do not shine through the back of the head. The pass changes only visible eye RGB pixels in the already-approved frames; it does not regenerate, mirror or reshape art. Eye heat is constant during movement/attack, fades during death and is fully absent by frame 13. The corpse and existing claw fire remain unchanged once the eyes extinguish.

Authoring: `tools/sprite-lab/inspect-ashling-face.py` and `add-ashling-ember-eyes.py`. Independent CPU validation: `validate-ashling-eyes.py`. The validator checks decoded alpha/footprint preservation, atlas pixel packing, identical timing/anchors/direction transforms, palette limits, zero rear-view edits, a small per-frame changed-pixel budget, and exact restoration of the original death pixels after extinction, including the held corpse. Reports live beside each atlas. All work runs locally on RTX 5090; no service or model download.

These are new appearance exports; earlier approved movement, weighted attack and death sources/atlases remain preserved. Each new export includes its predecessor path, source rig, frame metadata, atlas hash, masks, validation and native/enlarged GIF review. Runtime must use the new appearance atlases together after visual approval.

All 528 frames pass independent eye validation. Movement uses 62 visible colors; attack/death use 58. At most 8 movement pixels and 7 attack/death pixels change per frame. N-facing rows have zero edits. Every death frame from 13 onward is byte-identical to its predecessor export, including the held corpse. The eye pass preserves alpha, frame rectangles, anchors and orientation transforms exactly.

Remaining: appearance review, generic animation-layer metadata, runtime integration and in-game validation. No merge, release or deployment in this art checkpoint.
