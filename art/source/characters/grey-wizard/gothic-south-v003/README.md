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
  with unchanged dimensions/names and the updated merged `source-master.png`
  before rebuilding the walk. The builder checks source/rest fidelity.

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

## Review evidence

- `grey-wizard-fire-south.ora`: standard OpenRaster, twelve named native layers,
  merged preview. Packaged without image/pose modifications.
- `review/south-walk.gif` and `.mp4`: sixteen source poses at 12fps, 1x native and
  nearest-neighbour 2x inspection; source cycle only, not gameplay footage.
- `walk-contact-2x.png`: all sixteen poses, no missing frame substitution.
- `review/browser-report.json`: existing Sprite Lab atlas import/play/pause passes
  at desktop Chromium widths 320/390, no page errors. Existing lab hardcodes
  THE HOLLOW/SE for imports; this source is S and its export mapping is not reused.
- `verification.json`: exact source/idle recomposition, binary alpha, sixteen unique
  frames, common anchor, source-only stance measurements and shared controller.
- Focused existing mage/controller JavaScript tests: 16/16 pass. Atlas rebuild
  `--check`: 25/25 outputs byte-identical. GIF has 16 frames, MP4 decode passes,
  OpenRaster has twelve layers. No production code changes or new art acceptance.
