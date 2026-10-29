# Source-supported catch step — final AN review candidate, 29 October 2026

This source supersedes the longer 0.75-duty guide as the opt-in runtime candidate.
The original cape-free mesh, UVs, texture, Armature preserve-volume setting and
all source weights remain intact. Both supported and pre-balance guide actions
are editable in `hollow-foundation.blend`. `source-skin-lod.blend` retains that rig
and original hidden mesh plus the 12,000-triangle candidate, with protected soles.

The authored grounded fraction is 0.65 (rather than 0.75), load ramp 0.15 cycles,
forward stride 0.56m, side stride 0.22m, pelvis drop 0.075m and two native pixels
of flexion reserve. The shorter stance allows a catch through turning pursuits.
The 0.75 study passed synthetic cases but failed two actual C# Hunt observations;
its source and failure evidence are retained. No limits or tolerances were widened.
The complete runtime pose retains a 0.10m knee skin envelope and up to 10 degrees
of spine balance, with hips and ankles constrained to actual joint reach.

Reproduce (repository root, Blender 4.5.14 locally; CI pinned 4.5.3):

```powershell
blender -b -t 2 --python-exit-code 1 --python tools/animation/author_hollow_foundation.py -- --out artifacts/an-catch-step-source --only walk,attack-travel --phase-samples 16 --action-samples 16 --stride-metres 0.56 --flexion-reserve-pixels 2 --pelvis-drop-metres 0.075 --stance-fraction 0.65 --guides
blender -b -t 2 --python-exit-code 1 --python tools/animation/export_source_skin.py -- art/source/animation-foundation/catch-step-20261029 --out artifacts/an-catch-step-skin --triangles 12000 --load-ramp-fraction 0.15 --lateral-stride-metres 0.22 --guide-poses --orientation-warp-degrees 60 --balance-joint-degrees 10 --protect-contact-surfaces --middle-ground-clearance-metres 0.1
$env:AN_SEEDS='32'; $env:AN_CAPTURE_ENTITY='29'; $env:AN_INITIAL_MOVING='1'
node tools/animation/check_shared_skin_trajectories.mjs artifacts/an-catch-step-skin artifacts/an-catch-step-seed29-poses.json
python tools/animation/validate_runtime_skin_geometry.py artifacts/an-catch-step-skin artifacts/an-catch-step-seed29-poses.json --out artifacts/an-catch-step-geometry.json
blender -b --python-exit-code 1 --python tools/animation/validate_preserve_volume_mesh.py -- artifacts/an-catch-step-skin artifacts/an-catch-step-seed29-poses.json --out artifacts/an-catch-step-blender-mesh.json
```

Validation and review movies: `docs/animation/evidence/20261029/`.
The candidate flag does not change C# movement, damage, death or saved progress.
Default art, Ashling, injuries and painted Town remain intact. Final artistic
acceptance and a production cutover are owner decisions; no physical-phone
performance acceptance or full GPU-environment migration is claimed.
