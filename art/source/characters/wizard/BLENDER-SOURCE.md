# WyrmForge wizard — native Blender source checkpoint

**Branch:** `feat/player-wizard-rigged-sprites` · draft PR #335 · 24 October 2026.

This is a new, original wizard source-building path. The character concept remains
an elderly, weathered, grey-robed wanderer with an unmistakable beard, independent
school staffs and grounded Gothic materials. Hollowed/Ashling sprites are **style
and atlas-contract references only**, not the fictional enemy figures shown in an
earlier concept board. No creature or renderer files are modified by this bundle.

## Contents

- `build_wizard_blender.py`: Blender 4.5+ authoring script. Intended to save an
  **editable .blend** with a shared skeleton, two-leg IK, planted gait, six staff
  collections, beard bones, and Cloth-modified coat and cape meshes with pinning,
  self-collision and body/leg collision volumes. Includes original Gothic shape,
  material and preview-studio source.
- `wizard_motion.py`: host-independent **16-frame** contact/swing trajectory,
  pose and casting-charge timing. This is not authoritative gameplay movement.
- `test_wizard_motion.py` and `test_wizard_blender_source.py`: pure Python checks;
  no Blender installation needed.
- `review_gait.py`: generates diagnostic wireframe GIF/contact sheet for the IK
  design. **The diagnostic is not a game sprite or proof of a rendered model.**

## Run and preserve source

Run tests from tools/sprite-lab (the tests live in its tests/ folder), on any Python 3.10+:

```bash
python -m unittest discover -s tests -p 'test_wizard_motion.py' -v
python -m unittest discover -s tests -p 'test_wizard_blender_source.py' -v
python review_gait.py
```

Run with Blender **4.5 LTS or newer** locally:

```bash
blender --background --python build_wizard_blender.py -- \
  --output /path/to/wizard-production-source.blend --school fire --preview --eight-review
```

Retain the native `.blend`, editable meshes/materials/weights/animations and the
original generated script. Never replace this source with only PNG atlases.
The six staff collections are in the same `.blend`; only one is shown by default.

## Acceptance gates still OPEN

1. **Blender execution is unverified in this environment.** The working runtime
   lacks Blender/bpy, so no `.blend` file has been created or reopened here.
   Python compilation, source structure checks and numerical walk tests pass.
2. IK is authored, but **not yet visually approved** for realistic human foot
   contact, knees, staff handling, gait rhythm and 320/390px mobile readability.
3. Cloth modifiers are configured with collision/pinning but have **not been
   simulated/baked/inspected** for self-intersections or frame consistency.
4. Model geometry is a more structured editable sculpting/rigging *foundation*,
   not an approved professionally hand-sculpted surface with final UV textures.
5. Real eight-direction exported beauty/albedo/normals/height/roughness/caster/
   emission atlases, five actions and six school variants are NOT yet complete.
6. Staff emission and light descriptors in PR #335 must eventually be integrated
   by the single shared GPU lighting engine in **PR #332**, without a bespoke
   mage-only drawing or lighting path.

**Do not merge PR #335, replace `arena-mage.js` or claim mobile/artistic approval
until these gates pass.**

Engineering references: Blender 4.5 Python `ClothSettings` / `ClothCollisionSettings`
API, WyrmForge canonical art/animation requirements, existing Hollowed/Ashling
atlas manifests and shared `LitSprite` contract under PR #332.

The eight-direction review rotates the rig, all IK controls, cape, beard and staff
**together**; source images use a reference-lit authoring camera and are NOT
production albedo or normal-map atlases.
