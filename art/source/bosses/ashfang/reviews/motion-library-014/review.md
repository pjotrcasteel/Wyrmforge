# Aggressive performance revision 002

The owner rejected foundation 001 as weak and requested exaggerated, animal-like hunting aggression. Appearance and professional source anatomy are retained. This revision is an authored performance candidate; no owner motion acceptance or live game integration is implied. Intended direction: [canonical art topic](../../../../../../docs/canon/art-and-animation.md). Research/application: [PERFORMANCE-PASS.md](../../PERFORMANCE-PASS.md).

## Performance changes

- Claws raise high/outside with the talon facing outward, then accelerate diagonally across toward the opposite forelimb. The torso and neck wind up and follow through. Source hand excursion rises from 1.264 to 2.520 model units; peak sampled source hand speed rises from 10.625 to 35.181 units/second. These measures establish a changed performance, not artistic acceptance.
- Bite draws the head back, opens the jaw, lunges forward, snaps shut, clamps and adds a brief asymmetric wrench. Head reach beyond the first pose increases from 0.326 to 1.421 units. Jaw contact in an actual encounter still needs authoritative game integration and target-distance review.
- Roar has an inhale/compression, braced rising chest, larger neck extension, wide jaw and uneven sustained pulses. Peak head height rises from 3.939 to 5.649 units. It is a full-body performance; audio/VFX remain separate.
- Takeoff shifts back, squats, raises the wing forelimbs, keeps rear claws planted until liftoff, then drives a rapid downstroke and upward impulse. Tail counterbalance and separate fore/hind constraint release prevent ground crossings. Flight altitude and wing articulation increase, with matched takeoff/fly/land source poses.
- Run uses a faster paired bounding gait, greater limb lift and stronger torso/neck compression. Travel speed is about 1.82 times the original. Ground walk and stalk have longer, more readable steps while retaining quieter hunting intent.
- Deaths now have shock, a rear/last effort, wing flare, faster collapse, side impact, settle and final hold. All source frames are checked against the deformed mesh; the final 15% remains still.
- Ambient/hunting gestures have bounded, unevenly timed attention snaps, snarl beats and asymmetric target-focused motions. They are authored rather than per-frame noise. Existing legal 45-degree turns, named rig bindings and C# authority remain intact.

See `performance-measures.json` for source landmark measures and `keyposes/` for actual rendered shape review. Nine-pose contacts do not establish acceleration; full-rate exported playback is required for timing review. Previous foundation 001 stays available for comparison.

## Source evidence

Native source: `../../archive/motion-library-014/ashfang-animations.blend`. Standalone packed master: `../../archive/motion-foundation-002-packed/ashfang-animation-foundation.blend`, SHA256 `c4c83b1e00be3a4c23dd6f040052d96a5f9c749f647300c2bb206e563c9463df`. Forty-one editable actions, original 112-bone bind hierarchy, original UVs/weights and packed textures. No fire/smoke, stage geometry or temporary control rig in the master.

`source-validation.json`, `packed-motion-validation.json` and `remote-motion-validation.json` pass actual deformation, bounds, loop/handoff seams, source-frame ground checks and held deaths. `packed-anatomy-validation.json` and `remote-native-validation.json` confirm the preserved source anatomy/dependencies. The separate remote master was hash-verified and reopened before delivery.

Stance tolerance is 0.002 model units, below 0.047 pixels at 512px/22 units. Actual maximum run stance drift is approximately 0.00121 units. The ground threshold stays -0.075 units. Death floor settling uses the evaluated mesh. These tolerances are reported explicitly; no visible sliding or clipping is excused by the numeric checks.

`scale-two-proof.json` passes matched actual idle/walk/fly renders at scale one/two, including projected pivots, attachment points and scaled root travel. Larger new horns/armor still need geometry-specific bounds/deformation review.

## Export contract and remaining acceptance

Revision 002 expects 41 clips, 7,736 directional RGBA frames, 328 lossless 512px master atlases and 328 downsampled 256px sheets. Source samples are 24 fps; exports 12 fps. Eight directions are independent renders. Camera aim is `[3.8,0,5.4]`, span 22 units, elevation 35.26438968 degrees; use the new per-frame pivots. Jump/flight height is baked into pixels; horizontal root travel is separate metadata. Mouth sockets/directions and effect windows support separate game VFX.

The complete export/player validation and remote atlas receipt are recorded below after rendering. Live game movement, collisions, hit timing, damage, interruption and action choice remain C# work. Actual Hunt/physical-phone validation and owner performance acceptance remain outstanding. Keep PR #299 draft and preserve the first foundation.

## Complete export/playback receipt

All 7736 source render cells are preserved pixel-exactly in 328 master atlases, accompanied by 328 runtime atlases. Zero empty/clipped frames; all 41 actions and eight directions present. The full offline Edge player loads all 328 runtime images and passes playback, pause, step, direction phase carry, eight views, held death and a complete 23-state hunt performance sequence. The 390px layout passes; it is not a physical-phone test. See browser/browser-report.json and ../../exports/motion-foundation-002/atlas-validation.json. All-action contact pages were inspected. Reference-grid wrapping was corrected for accumulated travel during the long sequence; final screenshots reflect the corrected player.

Asset checkpoint f132c46b114bd70bde7ffa2d66739a1a44eb198c was uploaded and its remote head verified. Independent LFS download/hash verification covered all 1465 then-tracked LFS objects, including all 656 new atlases and the packed master. Final review evidence is checkpointed separately. The original foundation 001 remains available through the new player comparison link. GPU rendering has finished. Owner acceptance, game integration/VFX and actual Hunt/device validation remain outstanding.
