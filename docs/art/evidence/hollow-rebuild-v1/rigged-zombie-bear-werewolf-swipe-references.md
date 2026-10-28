# Hollowed H1 — zombie, bear and werewolf source-anatomy research

**Scope:** The *new Hollowed visual model*. This is research and static source-sculpt guidance, NOT an animation milestone. PR #387, existing animation engine/controller, all original animation clips, runtime/C# and the Ashling remain read-only. Art approval does not authorize animation integration.

## Real rigged references reviewed

| Reference | Actual useful characteristics | Deliberate limits |
|---|---|---|
| [G4G Crypt Zombie](https://www.g4gassets.com/assets/crypt-zombie/) | Rigged ~1.8m human undead with 24 bones, reaching, crawling and stagger motions; confirms distinct body mechanics of injury/limbs | Do not copy costume/mesh or a generic zombie-pose silhouette |
| [Zombie Animation Pack Vol 01](https://www.cgtrader.com/3d-models/character/other/zombie-animation-pack-vol-01-mocap) | Listed left/right claw strikes, heavy two-hand slam, standing bite, injured run and hit recovery | Listing is NOT permission to download or transplant any proprietary motions |
| [Realistic Bear Rigged and Animated](https://sketchfab.com/3d-models/realistic-bear-rigged-and-animated-pack-d663767174934a218488be7fe4811b6a) | Heavy animal attack category with high/low strikes; strong reference for braced weight and shoulder/forelimb mass | Human Hollowed MUST NOT adopt quadruped legs/muzzle/paws |
| [Dominic Baker rigged werewolf](https://sketchfab.com/3d-models/werewolf-animated-and-rigged-54c2bc4679a04d489aedb3875c0fa79d) | Crouched predator and reachable paw/hand silhouettes from multiple angles | Do not copy fur, wolf anatomy, ears, or monster design |
| [Truong CG Werewolf Maya rig](https://www.artstation.com/marketplace/p/ovGwP/werewolf-maya-rig) | Artist describes extra corrective blendshapes for wrists/shoulders (v002) and scapula/head (v004), reinforcing real deformation risk | Inspiration for source topology/QC only; no rig files imported |
| [Blender armature modifier documentation](https://docs.blender.org/manual/en/latest/modeling/modifiers/deform/armature.html) | Vertex-group bone influence and preserve-volume facilities | Not authorization to edit or substitute WyrmForge's animation engine |

I studied reference descriptions and visible models; **not** undocumented motion timing or original proprietary animation data. The design guidance below is an original synthesis, not a copied rig or frame sequence.

## New Hollowed anatomy — required sculpt corrections

1. **Thoracic mass:** hollow, twisted human ribcage with a structural scapula/deltoid connection. No broad furry bear shoulders, pauldrons, hump/backpack, or detached clavicles.
2. **Asymmetric shoulder chain:** one higher, reaching shoulder with visible scapular projection and contracted tissue, opposite arm more damaged/extended. Shoulders originate in the chest, not disconnected shoulder capsules.
3. **Weighted posture:** bent pelvis, contralateral support leg, knees not locked, planted and recognizably human feet. Full upper body feels precariously powerful, not rigid/T-pose.
4. **Hand design:** distinct palm mass, crooked thumb/knuckles and hooked original digits. Silhouette is legible at *native 96px* even when individual fingertips merge.
5. **Head:** small believable asymmetric orbital cavities and a human mandible/skull, not pumpkin eyes, a cartoon screaming jaw or wolf snout.
6. **Surface destruction:** authored open tissue exposing some human ribs and bone. No floating strands, dangling coat/cape, or freckles of detached orange glow.

## Three **frozen** source deformation diagnostics, for after the sculpt improves

These are NOT actions, keyframes, gameplay attacks, root motion, clip timings, or engine changes.

| Static test pose | Inspect | Reject |
|---|---|---|
| Braced neutral | Head/chest/pelvis/feet identity in 8 real camera directions | Uniform symmetry, weightless feet, generic humanoid |
| Cross-body preparation | Can the striking scapula retract as ribcage twists above the hips while opposite foot stays supportive? | Shoulder crushed into chest, split torso, backwards elbow |
| Far reach | Can scapula/shoulder protract with ribcage rotation, elbow and wrist as one connected anatomical structure? | Arm alone rotates, noodle shoulder, detached claw, hand clips through skull |

Render **actual Blender** clay, black silhouette and native 96px from front/side/back and oblique views with emission OFF. If shoulder mass collapses, return to source topology/weights; do not mask it by VFX.

Future movement concept only (not now implemented): rooted counterweight -> asymmetric thoracic preload -> lead shoulder/scapula -> connected forearm/claw sweep -> recovery. Bear supplies *weight*, werewolf supplies *predatory reach*, zombie supplies *broken human asymmetry*. The body must remain distinctively WyrmForge Hollowed.

## Safeguard

Only new files within `art/source/enemies/hollow/rebuild-v1/`, `tools/art/hollow-rebuild/`, and `docs/art/evidence/hollow-rebuild-v1/` are in scope. No proprietary rig/animation source is downloaded or used. No merge or runtime cutover before the complete visual approval gate; even after approval, any animation-engine adoption requires a separate explicit instruction.
