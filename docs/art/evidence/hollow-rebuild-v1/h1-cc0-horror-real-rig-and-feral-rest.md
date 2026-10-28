# Hollowed H1 — CC0 Horror Monster source and anatomically lowered claw-rest stance

**28 October 2026. Status: SOURCE-ART STUDY ONLY. Artistic approval is NOT requested or given.**

## Source decision

After repeated actual Blender review of the rejected MakeHuman studies,
CC BY Rosswet Thin Zombie, CC0 Rikindle3D, CC0 Mudeater and simple CC0
mannequin/brute candidates, the strongest *accessible and legally modifiable*
source foundation so far is [**3D Horror Game Monster**](https://opengameart.org/content/3d-horror-game-monster)
from **City Building Game Art** under **CC0 1.0**.

The download named `Colors.zip` contains textures, not model geometry.
The creator's **`Poses.zip`** contains actual FBX source. Only the selected
mesh-bearing `Idle.fbx` was imported; other source animations were excluded.
All 3D source and UV/rig data are kept inside the isolated Blender art
workflow; no game runtime or animation system has been altered.

The original CC0 source screening is in
[GitHub Actions run #40776719105](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40776719105).
Model metadata from its actual imported Blender evaluation:
- **1 editable mesh**, **1,854 skin vertices / 3,584 triangles**, 1 UV.
- **58 vertex groups** and **three armature objects** (main deform rig
  `Armature.002` contains 70 bones).
- **Zero animation actions** retained.
- Shape authoring works in a separate source `.blend`, with **two reversible
  shape keys**: the untouched original basis and the WyrmForge H1 sketch.
- First H1 source sculpt deformed **1,711 source vertices** with a maximum
  **0.7113m** displacement and 94 front-visible scar faces. Two ash-necrotic
  material variants have no emission. Technical checks passed, but the design
  visually still looked like a T-posed gray humanoid.

## Rig examination and important anatomy finding

I inspected the actual source hierarchy, not a generic guessed skeleton:
- Main 70-bone rig: `joint3` (upper chest) has children
  `Clav_L` and `Clav_R`, which lead to `joint14`/`joint14.001`
  (upper-arm chains), `joint11`/`joint11.001` (elbows),
  `joint12`/`joint12.001` (wrists) and several digit chains.
- Head/jaw: `joint4` leading to `Jaw`, `joint18`,
  `joint19`, etc.
- Lower skeleton: independent connected thigh/shin/foot chains.
- Bone display tails in this old FBX source do not always align with the
  arm direction; source posing therefore applies rotations in the true
  **bone-local rest matrix** and verifies the actual evaluated wrist positions.

The read-only inventory is authored by
`tools/art/hollow-rebuild/inspect_source_rig_blender.py`, preserved in
`source-armature-anatomy.json` in CI artifacts.

## NEW: authored static feral resting stance, not animation

`tools/art/hollow-rebuild/pose_feral_rest_source_blender.py` takes the
previous H1 source `.blend` and authors a second **editable Blender source
copy** with bone-local rotations limited to the existing shoulder/upper-arm,
elbow and head joints. This *removes the horizontal T-pose* while preserving
the original skinned geometry, existing bone hierarchy/weights and source
texture work.

Actual source QC in **[successful Blender run #40777834359](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40777834359)**:
- Main deform rig: 70 bones.
- **Actual left wrist lowered 0.6496 metres**.
- **Actual right wrist lowered 0.7621 metres**.
- No frame keys, no action objects, no NLA edits, **0 attack clips**.
- Actual Blender eight-angle clay/material views and native 96px source
  previews preserved. These are **NOT game screenshots**.
- Rest-standing character no longer has the airplane/T-pose from the prior
  source studies, but the figure still needs more organic head/shoulder
  anatomy, real ribs/inner cavity and differentiated 96px claws.
- **No owner visual approval**; this rest pose is NOT a completed game model
  or finished attack animation.

The [genuine new Blender artifacts](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40777834359)
include the source `hollowed-h1-feral-rest-source-UNAPPROVED.blend`,
`rest-source-qc.json`, 8 orthographic high-res review images and native
96px previews, plus the original CC0 model's license/provenance.

## Art quality gate (still OPEN)

The source pose now looks more creature-like, with a heavy unequal shoulder
line and both claws dropped. **This is still not Ashling-quality Hollowed
art**: the broad gray-smooth torso, imprecise snarling facial planes and
flat red-brown wound must become convincingly **sculpted** detached-membrane,
mandible/brow, true exposed ribs and ash-specific cracked material. Do not
fake that using glow, texture decals or random floating bone bits.

Next H1 source sculpt must focus on actual anatomical mesh rebuilding, not
another small morph of the stock FBX. Work on the new `.blend` and bone weights
**without touching animation engine PR #387**. Approval happens only after
real Blender high-res eight-way + true mobile resolution comparison with
approved Ashling, in a genuinely reviewable image/GIF in chat.

**No PR merge, gameplay integration, production sprite, deployment or clip
change until explicit owner authorization.**
