# Aggressive motion foundation 002

Owner feedback and reference findings: [PERFORMANCE-PASS.md](PERFORMANCE-PASS.md). The previous foundation 001 remains available for comparison and was rejected as too weak. This revision preserves the dragon's appearance and the original 112-bone bind hierarchy.

## Current source and commands

Native authoring source: `archive/motion-library-014/ashfang-animations.blend`. Standalone packed master: `archive/motion-foundation-002-packed/ashfang-animation-foundation.blend`. Editable action names remain `Ashfang|<action>`. [Updated catalog](ANIMATION-CATALOG-002.md) includes new durations/events. Original static creator poses and earlier native revisions remain preserved.

Run from this task worktree. Use Blender 4.5.14 LTS and Python with Pillow/NumPy. New native revision folders must not already exist.

```powershell
$blender = 'C:\Wyrmforge\artifacts\toolchains\blender-4.5.14\blender-4.5.14-windows-x64\blender.exe'
$python = 'C:\Users\Pjotr\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
& $blender -b art/source/bosses/ashfang/archive/tier-I-skin-010-packed/ashfang-tier-I.blend --disable-autoexec --python-exit-code 1 --python tools/ashfang-zagmatorah/author-animations.py -- --output art/source/bosses/ashfang/archive/motion-NEW
& $blender -b art/source/bosses/ashfang/archive/motion-library-014/ashfang-animations.blend --disable-autoexec --python-exit-code 1 --python tools/ashfang-zagmatorah/validate-animations.py -- --motions art/source/bosses/ashfang/archive/motion-library-014/motions.json --output artifacts/ashfang/revalidate-002.json
& $blender -b art/source/bosses/ashfang/archive/motion-library-014/ashfang-animations.blend --disable-autoexec --python-exit-code 1 --python tools/ashfang-zagmatorah/render-animations.py -- --output artifacts/ashfang/NEW-render --motions art/source/bosses/ashfang/archive/motion-library-014/motions.json --size 512 --samples 24
& $python tools/ashfang-zagmatorah/pack-animations.py --input artifacts/ashfang/NEW-render --motions art/source/bosses/ashfang/archive/motion-library-014/motions.json --output art/source/bosses/ashfang/exports/NEW --verify
```

Independent batches use disjoint `--clips` lists and separate output folders; pass all folders to `--input` when packing. PNG resume checks require a complete PNG footer. The final pack requires every expected clip and direction, calculates the expected frame count from source intervals, and verifies every lossless master cell against the rendered source pixels. Revision 002 expects 41 actions / 7,736 directional frames / 656 atlases.

The authoring script preserves the prior recipe as `author-animations-foundation-001.py`; historical commit `7db5271b` contains the complete first foundation recipe/tools. New render/validation tools read `cameraCenter` and stance metadata, falling back to the old framing/contact convention when absent.

## Framing, contacts and timing

The 35.26438968-degree orthographic camera retains a span of 22 model units and the same pixel density. Camera aim is now `[3.8,0,5.4]` to contain the higher takeoff and larger wing strokes. Each frame's ground pivot/attachment metadata accounts for that change. Consumers must use the exported pivots rather than assume the old rectangle center.

Source samples are 24 fps and exported pixels 12 fps. The fast claw rake/downstroke still spans multiple exported samples; the strike is accelerated rather than uniformly sped up. Run's 5.4-unit stride over 1.167 seconds is approximately 1.82 times the prior travel speed. Irregular attention impulses are authored deterministically and vanish at loop/handoff boundaries. Actual attack selection, targeting, hit detection, ability timing and random choices remain in C#.

Ground validation records the actual deformed mesh, all source frames, loop/handoff seams and per-foot world drift. Stance drift tolerance is 0.002 model units (under 0.047 pixels at 512px / 22 units); measured run drift is approximately 0.00121 units. This is documented subpixel IK residual, not permission for visible sliding. Ground penetration threshold remains -0.075 model units. Deaths are settled against the evaluated mesh and hold a final pose. Temporary controls/constraints are removed from the source.

Jump/flight height is baked into the sprite; horizontal root travel is separate metadata. Uniform tier scale multiplies travel and socket offsets. Accessory horns/armor still need new bounds/deformation review. Fire and smoke stay separate game VFX; breath exports include the dragon's performance and mouth effect windows.

## Review and limitations

Open `exports/motion-foundation-002/index.html` beside its PNGs when the complete export is available. It runs offline. The original foundation 001 player stays unchanged. Use the new 512px/256px selector, eight directions, phase-preserving direction changes, frame step, sockets and lifecycle controls.

Source validation and key-pose review are evidence, not automatic artistic acceptance. The full-rate player and all-action contact sheets are reviewed after export; actual Hunt/phone validation and game integration remain separate. The packed native source and final atlases must be independently retrieved through Git LFS and hash-verified before delivery is described as remotely preserved.
