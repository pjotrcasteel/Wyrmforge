# Wizard visual review — planted feet and dynamic robes (24 Oct 2026)

**PR #335, wizard only.** Do not modify Hollowed, Ashling, or the universal GPU lighting PR #332.

## Milestone 6: boot twist FIXED AND TESTED

Source defect: the weighted boot was attached to a foot bone inheriting the shin's 2-bone IK rotation. Knee bend therefore rotated the complete shoe roughly sideways. The authored ankle target still appeared correct, so earlier target-only tests missed it.

Change: both `foot.L` and `foot.R` retain their own authored orientation independently of shin rotation. The whole character still turns as one through the eight-direction actor root, not a separate foot renderer or animation workaround.

New Blender-native verifier measures **evaluated/deformed Boot heel and Boot toe geometry** relative to the character's forward (-Y) axis after all armature constraints. It checks the entire South walk plus two samples in each other direction.

Verified from Blender 4.5.15 reopened .blend, successful workflow #40093529309:
- 60 geometric pose/direction/foot checks;
- maximum heading/yaw error: **0.0 degrees**;
- maximum toe pitch: **19.2 degrees**;
- no vertical/90-degree flipping;
- unchanged six school staff sets, source animation clips, and shared actor/source contracts.

This establishes an ORIENTATION regression test, not artist acceptance of heel strike, toe roll, authentic foot planting, walking weight or final native-mobile motion.

## Milestone 7: robe simulation STILL visually inadequate

The first 32-frame warm-up loop caused the coat to fold across the pelvis. Inspection found that the coat's normals were inward and many garment vertices had no pre-simulation bone weight.

All face normals were corrected (629/629 outward), and all coat/cape vertices now follow their armature source before cloth secondary motion. Tailored coat pins were increased to preserve a recognizable front opening. Blender geometry/source tests pass; the coat is less crumpled but **still swings as oversized triangular fabric flaps**, and the cape/leg contacts are not production quality.

Do not mistake the green CI checks for a good-looking walk. The original-like silhouette and reliable physics require a more stable garment architecture:
- a properly skinned underlying robe defining silhouette, seams and foot clearance;
- simulation applied primarily to separate cape/hem flaps with safe collisions;
- tuned weight, gravity, body colliders and cloth cache over the entire walk;
- reviewed source renders at actual game scale plus true 320/390px device captures;
- full export from same source camera with geometry normals, roughness, height, caster and animated emission through the universal lighting engine.

The reference-lit inspection GIF/frames are NOT production pixel-art material atlases and the new `.blend` remains review-only. No temporary mage replacement. Keep PR draft.

## Hybrid rigged/physics garment revision (after the failed full-coat tests)

The freely simulated full robe was replaced by three deliberately isolated
Blender Cloth surfaces: the left and right front hems and the rear cape.
The inner open-front coat is now **skinned to the pelvis**, not simulated;
it maintains the Gothic silhouette and cannot collapse into a knot over
the knees. The hem sections and cape remain physically simulated, UV-authored,
attached and pre-warmed for two complete walking cycles.

The centre-front opening is widened to preserve clearance for visible
alternating feet. After inspecting the 16-frame render, the cape secondary
motion was constrained and damped to stop it flipping over the wizard's hat.

Verified native Blender 4.5.15 run 40095091384:
- 22 editable skeleton bones, six staffs, eight-direction source;
- 60 deformed boot orientation checks, max yaw 0°, pitch 19.2°;
- 629/629 outward-facing coat foundation faces;
- three independently simulated cape/front-hem objects;
- all 16 original South-facing walk frames rendered from the reopened .blend.

**Quality verdict:** the severe robe collision/wrapping is materially reduced,
and the staff and feet now keep their shape. However the walking silhouette
still changes too little at real gameplay scale, knee bending/hip weight is weak,
and garment motion is still a prototype. DO NOT present as completed character
animation or cut over the temporary mage. The next milestone is a hand-reviewed
full walking performance, especially readable alternating foot plants, knees,
hip rotation and a restrained physical trailing cape, before 8-direction exports.
