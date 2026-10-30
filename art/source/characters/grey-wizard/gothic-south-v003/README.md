# Gothic native south-facing source / walk study

**Unapproved production study.** The rejected `native-south-v001` is not reused.
Reference artwork: `gothic-reconstruction-v002.png`, derived from the owner-approved
wizard and Fire staff. These files are a native reconstruction and bounded
single-view animation study, not a new concept approval or shipped player asset.

## Editable source

- `source-master.png`: 72x136 native source, 128px visible-height study, 96-colour
  shared palette. Quantised from the faithful static sampling study, not redrawn
  from the rejected block-style source. Native density/world scale not accepted.
- `source-layers/*.png`: twelve independently editable native raster layers:
  boots, torso, cloak panels, arms, hair/head, beard, hat, staff and gripping hand.
  They recompose **exactly** into the source master at rest.
- `project.json` / `tools/art/grey-wizard/gothic-project.mjs`: explicit semantic
  masks, pixel coordinates, pivot, draw order and sixteen editable pose keys.
  Do not rerun preparation after hand-editing layer PNGs without preserving edits.
- Optional OpenRaster package is an editing convenience; export edited layer PNGs
  with unchanged dimensions/names before rebuilding the walk.

Source preparation: `node tools/art/grey-wizard/prepare-gothic.mjs`.
Pose export: `node tools/art/grey-wizard/build-gothic-walk.mjs`.
Deterministic verification: same command with `--check`.

## Motion/export contract

Offline 2D raster-grid deformation bends cloak/limbs through authored controls;
boots rotate at ankles and hands remain attached to their staff. This is source
authoring/export, **not** a new runtime animation/physics/lighting engine. Baked
full frames use the existing shared sprite controller/atlas contract.

160x160 padded cells, [56,141] pivot, 16 south-facing frames, separate diagnostic
emission map. Provisional worldSize 40 keeps roughly the old mage's body world
height; it is not approved final pixel density. Albedo + emission: 3276800 decoded
bytes. Other directions/actions/schools, normals, roughness and depth are unmade.

The declared source stance translates soles against 2 native pixels of root travel
per pose. Raster sole spread is checked independently for both boots. This narrow
source check **does not prove** actual C# root-speed fitting, source hidden anatomy,
Hunt contacts/occlusion/materials or real-phone performance. Two-pixel hidden edge
extensions cover layer seams; full hidden/source repaint remains a visual concern.

The source still has baked review lighting. Extracted crystal emission is diagnostic,
not accepted relightable material production. Hold live mage replacement until the
native look, actual motion and real Hunt/device gates pass.
