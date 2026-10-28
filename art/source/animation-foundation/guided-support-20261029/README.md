# Guided source support candidate — 29 October 2026

This editable .blend preserves both source-supported actions and explicitly named pre-balance guide actions. A guide alone is **not** static mass/support acceptance. The one shared runtime samples the complete guide pose, applies bounded anatomical orientation, then fits actual foot geometry and whole-body mass. No second locomotion/action clock or upper/lower clip compositor is introduced.

Author: Blender 4.5.14 LTS, original cape-free source mesh/UV/weights and texture. Forward stride 0.56m, grounded duty fraction 0.75, two source pixels of knee reserve plus an explicitly authored 0.075m pelvis crouch. The runtime side-step envelope is 0.22m, with up to 60 degrees of pelvis orientation distributed as counter-torque across spine/chest. A non-contact spine balance allowance is bounded to 10 degrees; the difficult tested corner required 1.2615 degrees. Bone lengths, knee limits, actual ground contact and support acceptance tolerances are not relaxed.

Reproduce source and exports:

```
blender -b --python-exit-code 1 --python tools/animation/author_hollow_foundation.py -- --out artifacts/an-guide-support-study --only walk,attack-travel --phase-samples 16 --action-samples 16 --stride-metres 0.56 --flexion-reserve-pixels 2 --pelvis-drop-metres 0.075 --stance-fraction 0.75 --guides
blender -b --python-exit-code 1 --python tools/animation/export_source_skin.py -- art/source/animation-foundation/guided-support-20261029 --out artifacts/an-guide-support-skin --triangles 12000 --load-ramp-fraction 0.25 --lateral-stride-metres 0.22 --guide-poses --orientation-warp-degrees 60 --balance-joint-degrees 10
node tools/animation/check_shared_skin_trajectories.mjs artifacts/an-guide-support-skin artifacts/an-guide-poses.json
blender -b --python-exit-code 1 --python tools/animation/validate_skin_matrices.py -- art/source/animation-foundation/guided-support-20261029 artifacts/an-guide-poses.json
node tools/animation/check_pose_continuity.mjs artifacts/an-guide-poses.json artifacts/an-guide-continuity.json
```

The earlier 0.875 duty / 32-phase shuffle is not promoted: it produced poorer swing timing and corner envelope failures. This candidate still needs current actual-Hunt/native/phone-scale video review and owner acceptance. Concurrent anatomical source rebuild #391 and cloth work #390 are untouched.
