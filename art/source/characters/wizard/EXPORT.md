# Wizard sprite atlas export

Sprite assembly only. Requires original editable Blender rig, authored animation and 8-direction RGBA frames; never creates character frames from a static concept.

Use current art/source/characters/wizard/export-profile.json; required source path:

    art/source/characters/wizard/frames/fire/albedo/walk/N/000.png
    art/source/characters/wizard/frames/fire/albedo/walk/N/001.png
    art/source/characters/wizard/frames/fire/normal/walk/N/000.png

Repeat for the 8 exact directions N NE E SE S SW W NW, five actions idle/walk/cast/hurt/death, and six school IDs.
All materials for each pose must have the identical alpha mask. Normal maps must be authored/exported from source geometry.
Normal maps alone do not cast volume shadows; shadow geometry remains a separate PR #332 integration step.

For a partial WALK-ONLY proof:

    node tools/sprite-lab/wizard-atlas.mjs --source art/source/characters/wizard --output artifacts/wizard-atlas --school fire --clips walk --passes albedo

For a complete atlas candidate, omit --clips and supply --passes albedo,normal,roughness,height,caster.
The generated manifest is compatible with Hollowed/Ashling; additional lit-material.json explicitly associates pose-synchronous passes.
All generated export reports retain false values for visual approval, GPU acceptance, mobile validation and runtime integration.
Do not replace the temporary runtime mage until the real source, animation, materials and game-scale mobile review are approved.
Current shared sprite-animation.js has no independent idle playback path; implement generic idle support only when the source is ready, not a mage-specific renderer.

Test: node --test tools/sprite-lab/tests/wizard-atlas.test.js

Current status: working export producer and unit tests; NO production wizard rig, animation atlases or runtime integration.
