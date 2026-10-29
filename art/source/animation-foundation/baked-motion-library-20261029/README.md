# Baked walk motion-library source, 29 October 2026

Candidate source only; not accepted animation or completed AN2. The losslessly
compressed editable Blender file retains the original character, rig, materials,
packed images and nine whole-body walk actions. Nothing is cut into rigid PNG limbs.

The base walk and eight additional travel headings share one skeleton and the
same sixteen-frame contact schedule. Their signed headings are recorded in the
manifest. They address the measured gap between the original eight projected
travel directions; rendering, runtime selection, switching continuity and actual
C# Hunt contact acceptance remain open.

Independent saved-source evaluation passes all nine actions: maximum actual
sole slip 0.000000596 m, maximum bone-length error 0.000000189 m, minimum mass
support margin 0.008584 m. The validator rejects deliberately skating, hovering
and incorrect travel-vector mutations. These are source measurements, not raster
or phone-performance acceptance. Original walk/moving-claw authoring with guide
actions also passes the reopened-source regression.

Reproduce with `tools/animation/author_hollow_foundation.py` using the arguments
in `provenance.json`, then `validate_source.py` and `test_source_qc.py`.
No rendered frame or runtime motion variant has been promoted in this checkpoint.
