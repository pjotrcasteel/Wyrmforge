# Flight and finish refinement 003

Current authoring recipe: tools/ashfang-zagmatorah/author-animations.py. Preserved previous recipe: author-animations-foundation-002.py. Start from archive/tier-I-skin-010-packed/ashfang-tier-I.blend and use a new immutable output folder. Current source: archive/motion-library-018/ashfang-animations.blend; standalone master: archive/motion-foundation-003-packed/ashfang-animation-foundation.blend.

Use Blender4.5.14 LTS, Python with Pillow/NumPy and CyclesOptiX. Run tools from the repository worktree.

```powershell
& $blender -b art/source/bosses/ashfang/archive/tier-I-skin-010-packed/ashfang-tier-I.blend --disable-autoexec --python-exit-code 1 --python tools/ashfang-zagmatorah/author-animations.py -- --output art/source/bosses/ashfang/archive/motion-NEW
& $blender -b art/source/bosses/ashfang/archive/motion-library-018/ashfang-animations.blend --disable-autoexec --python-exit-code 1 --python tools/ashfang-zagmatorah/render-animations.py -- --motions art/source/bosses/ashfang/archive/motion-library-018/motions.json --output artifacts/ashfang/NEW-render
& $python tools/ashfang-zagmatorah/pack-animations.py --input artifacts/ashfang/NEW-render --motions art/source/bosses/ashfang/archive/motion-library-018/motions.json --output art/source/bosses/ashfang/exports/NEW --verify
```

See002 reproduction document for executable paths. A full re-render needs41clips/7736 directional frames. Delivery003 freshly renders11 changed clips: roar,takeoff,fly,hover,glide,bank_left,bank_right,air_breath,land,death,death_alt. The30 remaining clips reuse002 raw renders only after prove-unchanged-actions.py verifies exact evaluated mesh and bone matrices at every source frame and an unchanged living material render is pixel-identical. reuse-proven-animation-renders.py preserves source provenance. Pass reuse-002,batch-a,batch-b roots together to the packer.

Orthographic span22,512pxmasters/256pxruntime,24fpssource/12fpsexport,eight independent directions. Takeoff uses source metadata cameraLift to contain the upright launch. Every frame exports its actual ground pivot and attachments, so consumers preserve world height while placing each rectangle. The small eight-view review tiles follow tall poses for inspection; actual source pixels remain unchanged.

Death magmaLife is a rig custom property keyed in all41 actions. Native material Math nodes multiply skin/eye emission by it using a standard single-property driver (works with --disable-autoexec). Death falls1 to0; every living action restores1. Per-frame atlas metadata also includes magmaLife; no game VFX are baked into the dragon.

Source/packed/remote validators check actual deformed geometry, original19841vertices/112bones, UVs/weights/tail mask, packed dependencies, ground and20 handoffs. inspect-flight-refinement.py enforces skyward roar, no upward roar/death hop, aerial forward gaze, frame10 look-up/frame13 upright launch, rear-foot-first landing and cooling/reset behavior. Scale proof requires idle,walk,fly at2x. Master-cell pixel verification and full browser playback/lifecycle review follow packing. Native source and atlases require independent LFS retrieval/hash receipts.

Previous001/002 remain available. This is source/export work; owner acceptance, live Hunt integration, VFX binding and physical-phone playtesting remain separate.
