# Animation source, exports and reuse

Current native library: `archive/motion-foundation-001-packed/ashfang-animation-foundation.blend`. It is self-contained and contains 41 named, asset-marked `Ashfang|...` actions on the original 112-bone hierarchy. Creator static poses are preserved separately. No flame, smoke, particle, floor or stage geometry is saved in the character. The source asset and all earlier milestones remain under Git LFS.

## Reproduction

Run from the worktree root with Blender 4.5.14 LTS and the bundled Python runtime with Pillow. New native revision paths must not already exist.

```powershell
& $blender -b art/source/bosses/ashfang/archive/tier-I-skin-010-packed/ashfang-tier-I.blend --disable-autoexec --python-exit-code 1 --python tools/ashfang-zagmatorah/author-animations.py -- --output art/source/bosses/ashfang/archive/motion-NEW
& $blender -b art/source/bosses/ashfang/archive/motion-library-008/ashfang-animations.blend --disable-autoexec --python-exit-code 1 --python tools/ashfang-zagmatorah/validate-animations.py -- --motions art/source/bosses/ashfang/archive/motion-library-008/motions.json --output artifacts/ashfang/new-motion-validation.json
& $blender -b art/source/bosses/ashfang/archive/motion-library-008/ashfang-animations.blend --disable-autoexec --python-exit-code 1 --python tools/ashfang-zagmatorah/render-animations.py -- --output artifacts/ashfang/new-render --motions art/source/bosses/ashfang/archive/motion-library-008/motions.json --size 512 --samples 24
& $python tools/ashfang-zagmatorah/pack-animations.py --input artifacts/ashfang/new-render --motions art/source/bosses/ashfang/archive/motion-library-008/motions.json --output art/source/bosses/ashfang/exports/NEW --verify
```

`--clips` permits independent GPU batches; pass both output folders to the packer. Rendering resumes complete PNGs safely. Atomic render manifests expose only completed clips. `--partial` creates an explicitly incomplete atlas checkpoint; a final pack without that flag requires all 41 actions and 7,448 directional frames. The master atlases retain the exact rendered RGBA pixels; validation extracts and checks every master cell by SHA256. Runtime sheets are downsampled to 256px cells. Each direction gets its own atlas, permitting loading only the current action/direction. Runtime atlas dimensions stay within 2048px; master sheets stay within 4096px.

The exported `index.html` works offline beside its PNGs, with no server. It supports the real source frames, eight facings, frame stepping, pause, playback speed, 512px/256px inspection, attachment overlays and a lifecycle sequence. The ground grid follows root-travel metadata and carries across lifecycle clips. Browser review is source playback evidence, not actual Hunt integration or physical-phone acceptance.

## Contracts

Camera elevation is 35.26438968 degrees, orthographic span 22 model units, +Z up and -X forward. Directions follow the current game convention E, SE, S, SW, W, NW, N, NE. Each frame includes its ground pivot, source sample time, projected mouth/limb/wing/tail attachments, mouth direction, root travel and root height. All eight views are actual renders, not mirrored substitutes.

The actor ground anchor stays fixed in the frame. Jump/flight height is already baked into the sprite; do not apply a second height offset when drawing it. Horizontal travel remains separate metadata for authoritative movement/stride synchronization. Scale travel and attachment offsets with uniform tier/model-to-game scale. Event markers identify wind-up/contact/VFX/voice phases; they never cause damage or simulation movement by themselves.

Breath start → loop → end and idle → takeoff → fly → land → idle have matched source poses. Locomotion starts/stops match phase zero. Death holds its final pose. Direction changes retain playback phase. Higher-tier geometry, armor and horns require new deformation/framing review even when reusing these actions. `rig-profile.json` in the packed master folder defines named accessory/VFX sockets and the bind hierarchy. `render-animations.py --model-scale 2` tests scale-aware rendering without changing the original bind skeleton.

Imported mesh reparenting normalizes sub-micro-unit transform noise: bind matrices, geometry, UVs and weights are exact; the mesh world-matrix comparison permits 1e-6 absolute error and records its measured error. No proportion or anatomy edit is involved.

Game assets and C# gameplay remain unchanged. Exported sheets and motions are candidates pending visual acceptance and a separate integration pass.
