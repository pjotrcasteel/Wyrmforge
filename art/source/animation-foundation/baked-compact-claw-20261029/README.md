# Compact full-body moving-claw source candidate

Preserved editable character, rig, packed source images and actions. The claw is
a complete whole-body 16 gait-phase × 8 action-stage surface, 128 poses, not an
independent upper-body loop. Action duration is 1.333 seconds (eight stages at
6 fps); gait follows observed root movement independently within this surface.
This coarse action sampling needs visual review before any runtime acceptance.

Independent reopened-source actual-mesh checks pass: maximum sole slip
0.000000483m; minimum mass-support margin 0.008266m. Base walk to claw entry and
exit match all mesh vertices at all sixteen phases within 0.000001481m.
Skating, hover, transition-discontinuity and wrong-travel mutations are rejected.

That entry/exit proof applies to this source's base walk only. It does not prove
entry from the extra walk-heading variants, arbitrary lateral/backwards motion,
crossing-target performance or raster/phone acceptance. No such claim is made.
See `provenance.json` for exact reproducible author arguments and source hashes.
