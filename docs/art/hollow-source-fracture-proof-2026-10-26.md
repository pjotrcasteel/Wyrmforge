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

## Implementation checkpoint — impact, playback and GPU-compatible glow

The experimental branch now contains **real runtime integration code** but the source atlas is **not approved** and therefore **does not run in production**:

- `tools/sprite-lab/render-hollow-source-fracture.py` now exports **24 source-mesh-keyed 3D frames × eight true facings**, one atlas per direction, a contact sheet, GIF and editable Blender file plus the source hashes and body-region/UV/material diagnostics. Seven deterministic physical mesh sections are derived from the actual Hollowed rig weights; the torso/pelvis remain weighted while head and limbs have more forceful arcs. Every frame rejects clipping; the pre-/post-break silhouette overlap is recorded. CI artifacts are NOT copied into the production asset directory.
- `js/hollow-fracture.js` strictly validates schema, authoring provenance, matching cell/pivot, **all eight direction files** and explicit `ownerApproved:true`. The exporter **always emits `ownerApproved:false`** until a human approves the art. Atlas loading is all-or-nothing. No generated glyphs or rotated walking frames; no 2D bones from rejected PR #365.
- `js/hollow-sprites.js` can render that source atlas at the correct existing foot anchor and 12fps **only if available and approved**. Otherwise all deaths continue to use existing 3D source-authored collapse clips, preserving missing-left-arm/broken-arm/broken-leg variants. 25% of *standard, intact* Hollowed receive the impact-rich fracture after approval; the other three quarters retain normal 3D collapses. No additional gameplay RNG or damage.
- `js/hollow-fracture.js` emits short, warm **universal GPU `point` light descriptors** anchored to an actual active fracture corpse, with deterministic keyed rise/fade, bounded intensity/radius, zero shadow-map allocation and a two-light mobile cap. They can be composed into the original G2 `LightingSnapshot` without mutating authoritative C# data. Current Canvas Hunts receive a matching adapter via existing `arena-spell-lighting.js` and `arena-night-lighting.js` paths; **this is NOT a claim that Hunts currently render through G5's universal GPU pass**.
- `tests/javascript/hollow-fracture.test.mjs` checks original-source gating, all eight views, corpse pivots and held frame, determinism, injury safety, generic GPU contract, cleanup, and original C#-owned snapshot immutability. Runtime and proof-only CI are included in the branch.

**Preview blockers:** GitHub-hosted Blender CI must execute successfully and produce the eight-way artifact; its rendered anatomy/lighting/settle poses must be visually approved. Do not set `ownerApproved:true`, enable corpse explosions for players or merge this draft as complete source art before those gates. Burn/glow is an emitter descriptor and Canvas transitional lighting adapter; full native GPU emission integration still depends on G5.

**26 Oct hardening:** Standard/intact Hollowed now use the approved source breakup without a second chance roll (roughly one quarter of the complete injury/arm appearance mix). In contrast to the earlier 7% result, this matches the agreed impact frequency while injury variants keep their own 3D deaths. Both GPU and transitional Canvas paths honor all-light-off/zero-black diagnostics, reject invalid coordinates, and do not overwrite authoritative C# emitter IDs.


## Owner art-direction approval and release disposition — 26 October 2026

The owner explicitly approved the source-mesh fracture direction for iterative release ("Approve 369 we can always improve").
The earlier visual-QC **sign-off requirement is waived for this iteration**; it remains important to inspect and improve the final result.
This approval does **not** fabricate missing sprite atlases or assert that GitHub Actions executed.
PR #369 may merge the safe fallback renderer and **automatic approved-art Blender build/publisher** now.
The game will continue showing the original authored 3D collapse until eight real, hash-checked,
source-derived PNGs and their production `ownerApproved: true` manifest have been built and committed.
The main-branch workflow releases those assets after genuine original-geometry/alpha/continuity gates;
it cannot replace them with random procedural bone drawings.
