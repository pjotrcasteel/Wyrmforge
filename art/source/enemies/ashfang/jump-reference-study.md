# Ashfang jump mechanics study — 21 October 2026

Production research; intended-design authority remains docs/canon/art-and-animation.md and docs/canon/creatures-and-encounters.md. Owner specifically requested tiger/dinosaur jump research plus dragon games and movies after the V13 launch still looked static.

## Attributable references and limits

- Wildlife Conservation Society, [Animal Movements](https://cdn.wcs.org/2020/04/03/2fmonxnlv7_Animal_Movements.pdf), tiger activity on page 9; [San Diego Zoo tiger](https://animals.sandiegozoo.org/animals/tiger): useful tiger/ambush-predator context. These do not provide measured tiger joint curves. No exact jump distance or tiger timing is used to parameterize this fantasy rig.
- Harris & Steudel, [domestic cat jumping performance](https://pubmed.ncbi.nlm.nih.gov/12432010/), JEB 2002: measured felid hindlimb morphology/performance. Domestic cats are a smaller living analogue, not a measured tiger takeoff dataset.
- Schilling & Hackert, [sagittal spine motion during asymmetrical mammal gaits](https://journals.biologists.com/jeb/article/209/19/3925/16373/Sagittal-spine-movements-of-small-therian-mammals), JEB 2006: distributed trunk flexion/extension and pelvic timing; extension occurs after hindlimb liftoff in the studied gallops/bounds. This is small-mammal gait research, not an Ashfang jump prescription.
- ILM, [The Dinosaurs production interview](https://www.ilm.com/ilm-vfx-the-dinosaurs-interview-netflix/): use living-animal reference informed by anatomy, size-appropriate rigs and tail/leg relationships. Their discussion of relatively rigid dinosaur spines is a reason to keep Ashfang's plated torso restrained rather than copying a highly flexible cat wholesale. Extinct dinosaur jumps are reconstructed performances, not directly filmed observations.
- Framestore, [How to Train Your Dragon](https://www.framestore.com/work/how-train-your-dragon): anatomical skeleton/muscle systems, big-cat movement for Toothless and distinct movement for different dragon masses; creature-specific performance instead of one uniform flight motion. Film identity is not copied. [Taking Flight](https://youtu.be/709_epnQQHk) is linked from their production page; no frame timings are claimed from that video.
- Autodesk's direct Capcom team interview, [Monster Hunter Wilds production](https://blogs.autodesk.com/media-and-entertainment/2026/04/23/the-production-infrastructure-behind-capcoms-monster-hunter-wilds/): secondary motion needs curved offsets/delay and interference control, with baking into editable animation. Transfer is delayed tail/neck response driven by the primary action, not independent noise or copied game animation.
- Weta, [Smaug](https://www.wetafx.co.nz/films/case-studies/smaug): persistent creature/performance reference from the existing brief, not a licensed source model.

These are written production accounts, research findings and displayed stills. No downloaded third-party movie/game assets; no claim of frame-by-frame footage measurements. The following is original animation design inference, not zoological fact.

## Why V13 reads static

The builder sets pelvis, spine, chest and both neck joints to the same absolute rotation. A smoothstep lifts the entire torso from zero velocity; feet then tuck. Tail yaw is an independent sine. Measured floor contact therefore passes while the body never visibly gathers and uncoils.

## Revised performance experiment

1. Move weight back over the hind support while the pelvis gathers and the trunk flexes slightly; the head keeps attention forward.
2. Chest leads out of the crouch, forepaws release, hind legs continue supporting and then extend.
3. At departure, a forward/upward root trajectory has immediate upward velocity, blending into wing-supported flight. It is a leg-driven bound into flight, not a hovering elevator.
4. Pelvis, spine, chest and neck use separate rotations with continuous connected joints; limb and wing attachments follow the actual chest/hip transforms.
5. Forelimbs gather before hindlimbs. Head and tail follow primary acceleration with restrained delay; no random jitter.
6. Reach into landing, catch with forelegs, compress chest, bring hindquarters through, then settle neck/tail. Keep the existing per-paw reach and floor audits; add body-pose evidence so a static trunk cannot pass as organic motion merely by avoiding the ground.

Keep Tier-I mobile size and four legs plus separate wings. Root travel in this source study is explicit review motion, not automatic gameplay movement or damage. Actual C# aerial behavior and art acceptance remain outstanding.
