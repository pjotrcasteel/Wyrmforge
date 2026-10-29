# Contact-safe preserve-volume source derivative — 29 October 2026

Review candidate, not owner-approved art or default production cutover.
Parent: `../guided-support-20261029/hollow-foundation.blend`. The saved derivative
retains the parent rig/actions and original hidden mesh, plus the 12,000-triangle
`AN source skin candidate`. Preserve-volume Armature deformation, original UVs,
texture and all source bone weights are retained. Decimation excludes sole
patches and their one-native-pixel guard band. The runtime full-body solve uses
an explicit 0.10m knee skin envelope above ground, projecting only the bend
around the fixed hip/ankle axis; planted soles and both segment lengths remain
fixed. This corrects a deeply folded knee penetrating the floor during a corner.
No deformation tolerance was enlarged. This envelope is source data, not C#
collision, damage or movement authority.

Reproduce from repository root (Blender 4.5.14 LTS locally; CI pins 4.5.3):

```powershell
blender -b --python-exit-code 1 --python tools/animation/export_source_skin.py -- art/source/animation-foundation/guided-support-20261029 --out artifacts/an-dqs-ground-envelope-skin --triangles 12000 --load-ramp-fraction 0.25 --lateral-stride-metres 0.22 --guide-poses --orientation-warp-degrees 60 --balance-joint-degrees 10 --protect-contact-surfaces --middle-ground-clearance-metres 0.1
$env:AN_SEEDS='32'; $env:AN_CAPTURE_ENTITY='29'; $env:AN_INITIAL_MOVING='1'
node tools/animation/check_shared_skin_trajectories.mjs artifacts/an-dqs-ground-envelope-skin artifacts/an-dqs-ground-envelope-seed29-poses.json
python tools/animation/validate_runtime_skin_geometry.py artifacts/an-dqs-ground-envelope-skin artifacts/an-dqs-ground-envelope-seed29-poses.json --out artifacts/an-dqs-ground-envelope-geometry.json
blender -b --python-exit-code 1 --python tools/animation/validate_preserve_volume_mesh.py -- artifacts/an-dqs-ground-envelope-skin artifacts/an-dqs-ground-envelope-seed29-poses.json --out artifacts/an-dqs-ground-envelope-blender-mesh.json
```

288/288 seed/motion cases pass. All 12,555 exported vertices over 1,089 poses
pass the independent ground/support replay: maximum penetration 6.58e-9m,
retained world-sole drift 2.16e-8m; minimum actual LOD sole support 0.008084m.
47 poses replayed through the saved Blender Armature modifier match every
exported vertex within 1.72e-6m. Earlier bone/pure-foot-only checks did not prove
blended skin fidelity. The previous linear skin implementation and its captures
are superseded by the declared dual-quaternion backend.
