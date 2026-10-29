# Baked full-body walk proof

Opt in with `/enemy-lab?kind=Hollow&seed=42&autoplay=false&cast=false&entityId=5&animationFoundation=sprite-walk`.
This proof uses the existing sprite controller and full-frame atlas renderer.
It contains 16 complete source poses in each of eight genuinely rendered views.
No live skin, per-limb cutout or runtime PNG warp is used by this asset pack.
Its explicit row-switch policy preserves gait phase; it does not claim a
source-authored weight-bearing turn. Contact validation is still in progress.

The source is `art/source/animation-foundation/catch-step-20261029/`.
`manifest.json` records its blend hash, rig signature and eight distinct row
hashes. Original editable geometry, UVs, weights and motion remain preserved.

This is a walk-only, source-lit color review, not final GPU material acceptance.
Missing attack content explicitly uses the existing approved attack art while
the shared gait phase continues. Default gameplay/art and the separate live-skin
research flag remain unchanged. The baked claw, transitions, aligned material
passes, depth/casters, actual contact and phone/device gates remain open.

Reproduce by rendering saved `walk` in all eight directions with
`tools/animation/render_saved_clips.py`, then running:

```text
python tools/animation/export_atlases.py SOURCE --out PACK --clips walk --full-cells
```

The exporter rejects missing/clipped frames and duplicate facing rows. Do not
pretend a partial one-facing proof is a production eight-direction sheet.
