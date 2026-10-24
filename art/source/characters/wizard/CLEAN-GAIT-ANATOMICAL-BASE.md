# Independent clean humanoid walk — new source, 24 Oct 2026

**The prior BVH-to-CC0 walking retarget is REJECTED.** The user inspected its
video: deep squats, foot kicks, hanging arms and no believable gait.

This introduces a NEW and independent anatomy-first rig on the real original
CC0 male body; it doesn't import the incompatible CMU rest skeleton or reuse
any deformed keyframe from it. Animation follows explicit stance/swing feet
with a controlled clear step, **zero foot crossover**, a short pelvic bob,
anatomically forward knee controls and opposite shoulder counter-swing.

The 16-frame source, native .blend, contact sheet, GIF and MP4 are produced
by dedicated native Blender CI. These are original rendered views, not
interpolated drawings. The tool provides strict checks on deformed bone
positions, knee bend, head height, pelvic bob and full frame coverage.

**Status is REVIEW ONLY** until someone actually inspects the recorded GIF.
This is a bare anatomical motion study, not the approved Gothic wizard,
not a finished walk in the game, no art/material atlases, and no change
to Hollowed, Ashling, lighting PR #332 or the live actor renderer.

Next milestone after movement review: add approved Gothic model/robe/hat/beard/
staff to this clean rig, then eight directions and actual shared-lit atlases.
