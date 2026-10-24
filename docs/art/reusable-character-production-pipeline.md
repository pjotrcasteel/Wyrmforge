# Reusable actor production — wizard as first consumer

Status: WIP authoring tools on draft PR #335. This is **not** proof of a shipped
Blender sculpt or production rendering. Existing Hollowed/Ashling and PR #332
are entirely separate workstreams and are not modified.

## One shared set of artist/export contracts

The common producer at tools/sprite-lab/actor-atlas.mjs packages ANY actor's
original frames into the existing Hollowed/Ashling manifest schema.
It knows about neither enemy type nor spells nor biped anatomy. It supports:

- Eight individually authored compass directions (N NE E SE S SW W NW);
  any actor-native animation names and timings; an explicit feet/body root.
- Exact per-frame aligned albedo, geometry-derived normal, roughness, height,
  alpha caster, and emission textures. Normal maps alone are not occluders.
- Configurable variants, built from one original rig. For the wizard these are
  Fire/Frost/Storm/Arcane/Necromancer/Summoner staffs and subtle robe trims;
  future creatures can vary hide, armour, anatomy or accessories.
- Missing-frame, binary-alpha, 2-pixel padding, material alignment, path safety
  and atlas-size validation BEFORE output files are created.
- Existing manifest.json plus lit-material.json and export-report.json.
  Export completion never implies animation, art, mobile or GPU acceptance.

The existing wizard-atlas.mjs entrypoint and --school option remain compatible
and now delegate to this generic packer.

For a future creature, a source layout may be:

    art/source/characters/<id>/export-profile.json
    art/source/characters/<id>/frames/<variant>/<pass>/<clip>/<direction>/000.png

Example command (this describes a TOOLING fixture, not a new playable enemy):

    node tools/sprite-lab/actor-atlas.mjs --source art/source/characters/example-creature --output artifacts/actor-exports --actor-id example-creature --variant base --clips scuttle,attack,death --passes albedo,normal,roughness,height,caster,emission

All eight views and every material pass must come from the *same* pose/camera
source. Mirrored placeholders and inferred RGB-to-normal textures are invalid.
The common GPU renderer in PR #332 must receive every world sprite, material
and emission; no separate monster/wizard shader is permitted.

## Separate anatomy from shared playback/export

The pure-Python character_pipeline/biped.py extracts configurable two-leg
stance/swing foot-contact generation. wizard_motion.py is a thin adapter with
identical numerical foot positions, proven by 160-phase regression tests.
New humanoid enemies can use different stride, body proportions, cadence and
contact, while retaining unique design, upper-body actions and their own rig.

Quadrupeds, serpents and flying enemies MUST NOT be forced into humanoid IK.
They own appropriate anatomy, gait/action sources and clipping regions, but
all pass through the SAME atlas, material and lighting pipeline.

## Gates before reusing live art

1. Sculpt and validate original wizard in native Blender; preserve .blend,
   source rig, textured materials and animations. Current bpy script is not
   validated by Blender execution in the present environment.
2. Validate genuinely different 16-frame walking poses with foot contact,
   weighty robe/beard/cape motion, cast, hit, idle and death at 320/390px.
3. Render all eight unmirrored facings, six school variants and fully aligned
   lit material/caster/emission passes. Verify zero-world-light blackness in
   PR #332's shared renderer, not a standalone mage effect.
4. After real visual approval, validate one future nonhumanoid actor using
   this same exporter; never automatically migrate existing Hollowed/Ashling.

Local checks:

    node --test tools/sprite-lab/tests/actor-atlas.test.js
    node --test tools/sprite-lab/tests/wizard-atlas.test.js
    cd tools/sprite-lab
    python -m unittest discover -s tests -p 'test_biped_reuse.py'
    python -m unittest discover -s tests -p 'test_wizard_motion.py'
