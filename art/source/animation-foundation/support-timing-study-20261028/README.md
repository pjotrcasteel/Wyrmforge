# Supported timing study, not accepted art

Parent source is the same cape-free Hollowed. This source-only study uses a 0.56m forward stride, 0.75 stance fraction, two native pixels of source knee reserve and 0.075m of explicitly authored pelvis crouch. It preserves all actual skin weights, original texture, bone lengths and joint limits. Source authoring passes, but runtime continuity/native/mobile acceptance is not established by this checkpoint.

```
blender -b --python-exit-code 1 --python tools/animation/author_hollow_foundation.py -- --out artifacts/an-long-support-study --only walk,attack-travel --phase-samples 16 --action-samples 16 --stride-metres 0.56 --flexion-reserve-pixels 2 --pelvis-drop-metres 0.075 --stance-fraction 0.75
blender -b --python-exit-code 1 --python tools/animation/export_source_skin.py -- art/source/animation-foundation/support-timing-study-20261028 --out artifacts/an-long-support-skin --triangles 12000 --load-ramp-fraction 0.25 --lateral-stride-metres 0.22
```

A 0.56m uniform lateral stride was rejected: it crosses the anatomical stance width. A 0.62 duty fraction with short cycles still produced abrupt mass transfer despite correct planted contacts. These studies do not expand ground-contact or bone-length acceptance tolerances. Source-skin changes are confined to the opt-in candidate; concurrent anatomical art and default gameplay stay separate.
