# Wizard art REJECTED: start original production character from proper anatomy

**Decision, 24 Oct 2026: Rejected baseline.** The original user-liked concept art
remains the artistic target. The procedural wizard built by
`tools/sprite-lab/build_wizard_blender.py` is a technical prototype and MUST NOT
be shipped, renamed "production ready", or substituted as the foundation of
the final playable character.

## Why rejected

The 16-frame native Blender review is visually unacceptable: primitive face
and torso topology, oversized toy-like hat and beard, narrow/no knee recovery,
arms with no believable counter-swing, staff that looks like a fixed pole,
poor contact/weight shift and cloth concealing the motion. Fixing the boot
twist from 90 to 0 degrees did not fix natural locomotion. Numeric
difference-per-frame and successful Blender CI have **no bearing on art approval**.

## Replace the artwork and movement source, not the reusable engine

1. Use a professionally structured, original human starting mesh. Auditing
   Blender Studio's **Human Base Meshes v1.4.1** (official CC0 asset bundle) is
   the first bounded investigation. The audit is source/topology evidence, not
   a produced wizard. Alternatively MPFB/MakeHuman core assets are CC0 while
   the addon code is GPLv3: keep addon code OUT of the game.
2. Sculpt a recognizably old and dignified wizard with realistic hands, facial
   planes, proper knees, weighted beard and a distinct original asymmetrical
   cloak silhouette; retain weathered neutral grey and subtle school tint.
   Never copy a film likeness or an existing copyrighted wizard model.
3. **Real walk motion first:** use legally reusable, human-recorded walking
   reference/mocap (with provenance recorded) and retarget onto the accepted
   rig. Include head/hips/shoulder motion, toe-off, weight acceptance, planted
   foot during contact and two-hand/staff interaction. Keep the 16-frame,
   eight-direction shared export schema. Do not call procedural sine shuffling
   a finished walk.
4. Review a native Blender South-facing full walk at gameplay scale *before*
   bulk rendering six schools or building more materials. Reject foot skate,
   90-degree foot motion, mechanical shuffle, clipping or poor silhouettes.
5. The one reusable actor atlas, canonical skeleton interfaces, school-staff
   data, PR #332 universal GPU lighting contracts, and nonhumanoid actor
   adapters remain valuable and stay untouched.
6. The new source must keep actual editability: .blend, original base-license,
   UV textures, character rig and original animation source, plus generated
   aligned material passes. Do not remove earlier technical checkpoints.

## Art acceptance — ALL required

- Original visual direction personally approved by the owner.
- Walk is anatomically plausible from S/SE/E/NE/N/NW/W/SW: planted heel/toe,
  knee recovery, pelvis support and coordinated staff action (NOT merely IK
  target coordinates or a 0-degree foot heading).
- Body and face show original dark-fantasy detail at true mobile gameplay scale.
- Robe preserves legs and silhouette without cutting through them; full loop.
- Idle, cast, hurt and death share the single armature and feet-root.
- All six school variants reuse body rig and motion, changing modest trim
  and distinctive staff geometry + explicit GPU-lighted casting emission.
- Shared GPU light and mobile checks pass after art acceptance.

**Current state:** rejected prototype; no accepted replacement artwork; no
real retargeted mocap; no cutover. This is a deliberate scope correction in
draft PR #335, not a successful new art milestone. Hollowed/Ashling and PR #332
remain independent.
