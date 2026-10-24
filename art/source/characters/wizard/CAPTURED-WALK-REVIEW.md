# Real recorded walking — source and acceptance boundary

**Source:** Carnegie Mellon Graphics Lab BVH conversion of subject 07 trial
04 (slow walk). Converted by Bruce Hahne. Original source hosted publicly
at https://mocap.cs.cmu.edu and via una-dinosauria/cmu-mocap.
CMU allows inclusion in commercial games; do not resell raw data standalone.
Use original motion attribution acknowledgement where convenient.

This milestone **replaces sine-wave pseudo-gaits as walking reference**, NOT
the rejected clay mesh with a new game sprite. A CI workflow downloads one
pinned 07_04.bvh source, verifies its Git blob SHA, parses all joints, selects
a similar-pose full step cycle, and records a real 16-pose human skeleton
motion GIF, contact sheet and MP4. Source frames are not fabricated by
image interpolation. Raw BVH is deliberately not repackaged for sale.

It is a reusable offline pipeline for future humanoid characters. Different
anatomies must retarget individual rigs rather than reusing this skeleton as-is.

## Explicitly NOT complete
- The user-approved Gothic dark-blue/grey character is still only source art.
- Source BVH has **not yet been retargeted** to original wizard anatomy, robes,
  staff socket or master rig, nor has original source pixel art been created.
- No new South walking atlas is approved, and no additional direction, school
  staff, hit/cast/death atlas or material/light pass has been published.
- The production wizard remains disabled in the shared player renderer.

## Quality gate for the NEXT milestone
Retarget a selected captured cycle to the original male base mesh, check
planted feet/hip centre and believable arm/staff interactions with real
source Blender renders and owner review, then model the approved Gothic
hat, beard, weathered robe and school staffs on that anatomy.
Do not repeat the rejected procedural-mesh route.

The new motion recording is a movement-data acceptance candidate ONLY; it
does not represent the quality or look of the final wizard.
