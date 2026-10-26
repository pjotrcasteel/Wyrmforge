# Hollowed — original Blender mesh fracture proof (26 October 2026)

**Status: UNAPPROVED 3D art experiment. NOT IN THE GAME.** Branch: `art/hollowed-source-mesh-fracture-proof`. Do not merge this with a claim of finished bone art or change the 3D corpse playback in Hunts. It follows the owner's rejection of the inaccurate scattered glyphs from PR #365 and the production rollback in PR #366.

## Why this implementation is different

Instead of drawing synthetic 2D skulls, the source is the existing editable cape-free `hollow-death.blend` (same mesh, UV maps, materials, camera and keyed death action used by the Hollowed already in production). At frame 7/24, the **evaluated skinned Blender geometry** is split into seven connected anatomical *regions by original armature vertex weights*: head, thorax, pelvis, left/right arm, left/right leg. This is 3D **mesh partitioning**, not a replacement bone model or a sprite overlay. Seven pieces preserve the recognizable creature silhouette while avoiding the fragment storm that failed mobile QC.

The Blender source animates a restrained breakup with bone-related motion cues, real 3D transforms and collision-floor clamping from the entire actual piece geometry. The original death runs until split. The same Blender camera/rig gives real directional views; no 2D facing flips. It renders a repeatable 24-frame, 12fps, native 128px South-facing candidate first. Every cell must have non-empty, unclipped pixels or the build fails. A preserved editable `.blend`, PNG atlas, contact sheet, GIF, geometry provenance manifest and hashes are uploaded as **CI review artifacts**, not copied into `wwwroot`.

This is not a skeletal-bone anatomy rebuild; it remains Hollowed material chunks and could still look wrong. Do not add more randomness to compensate. The seven partitions and rest poses must be judged visually, and reauthored manually if the skin produces broken shapes.

## Source & references

- Existing approved WyrmForge source: `art/source/enemies/hollow/rigged-poc/model/local-appearance-004/rigged-hollow-death-no-cape-standard/hollow-death.blend`.
- [Blender vertex-group documentation](https://docs.blender.org/manual/en/4.0/modeling/meshes/properties/vertex_groups/vertex_groups.html) explains how actual skin weights correspond to regions; use original weights, never guess anatomical pixels.
- [Blender rigid-body animation guidance](https://docs.blender.org/manual/en/5.2/physics/rigid_body/tips.html) distinguishes keyframed control and physical simulation. This proof uses deterministic authored Blender transforms and per-vertex floor checks (not a simulated mass/constraint rig); real physics could be layered only after shape quality is approved.

## Do not integrate until these gates pass

1. **Source validity:** original mesh+UV/materials and 3D skinned collapse; verify anatomy assignment counts for all seven regions and absence of capes.
2. **South-facing visual QC:** inspect 24 actual rendered frames in PNG and GIF at 1x/2x (real 320/390px scale); verify original Hollowed proportions, smooth impact transition, no loss of skull or chest, no floating fragments, sensible mass.
3. **Eight-way QC:** only after South passes, execute `python tools/sprite-lab/render-hollow-source-fracture.py --directions all` and inspect every 3D viewpoint with no clipping or ground penetrations.
4. **Injury continuity:** source-derive actual missing/unusable arm and damaged leg variants, rather than letting generic fragments invent healed limbs.
5. **Hunt integration:** explicit separately reviewed PR; source atlas + optional source action retained, deterministic corpses and correct pause/reduced-motion/mobile budgets. C# combat and corpse lifecycle never change.
6. **Owner sign-off:** automated pixel presence, render success or GitHub merge does not constitute artistic approval.

**No replacement release has been authorized.** Live Hunts continue the existing 3D source-authored collapse clips from PR #366.
