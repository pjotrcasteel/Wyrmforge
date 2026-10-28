# Source-skin LOD candidate, 28 October 2026

This derivative retains the signed parent `../hollow-foundation.blend` (SHA-256 `7fd3aa88aea9dd4f2caad0f0c1860d10eece936900e5c332771c298e2acfa89e`) and its editable source actions, UV, skin weights and original packed texture. The derivative includes both original and reduced meshes. It is not an accepted replacement for the concurrent anatomical-art work in #390/#391.

Runtime exports are `src/Wyrmforge.Presentation.Web/wwwroot/art/review/animation-foundation-skin/`. Their hashed manifest references the exact parent source, full-body TRS poses, contact anatomy and 12,000-triangle mesh. All source weight influences are retained. The earlier 1,800-triangle derivative in the parent folder is preserved evidence, rejected for silhouette loss. Protected-group decimation is rejected for actual source holes.

Reproduce with Blender 4.5.14 LTS (CI source validation pins 4.5.3):

```
blender -b --python-exit-code 1 --python tools/animation/export_source_skin.py -- art/source/animation-foundation/skin-resource-20261028 --out artifacts/an-skin-reexport --triangles 12000
node tools/animation/check_shared_skin_trajectories.mjs artifacts/an-skin-reexport artifacts/an-runtime-skin-matrices.json
blender -b --python-exit-code 1 --python tools/animation/validate_skin_matrices.py -- art/source/animation-foundation/skin-resource-20261028 artifacts/an-runtime-skin-matrices.json
```

These commands check source/skin geometry. Actual Hunt capture, physical-device limits and owner visual approval are separate gates. Do not call source-only success art acceptance.
