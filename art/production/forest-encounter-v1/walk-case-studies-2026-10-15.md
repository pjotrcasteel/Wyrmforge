# Mage walk review and case studies

15 October 2026. The current v2 walk is rejected as a convincing walk. Keep its images as an experiment, not as a production reference.

## What was actually reviewed

- All four current mage walk keys, the exported GIF timing, the atlas metadata, and the 80-pixel canvas renders.
- Doron Ben-Ami's published walk-structure lesson transcript on LinkedIn Learning.
- Animation Mentor's published basic-human-walk breakdown featuring Jason Martinsen.
- Animation Mentor's published sneak-walk breakdown featuring Natasha Krinsky.
- CMU subject 07's trial descriptions and the rendered preview for trial 07_01. The AVI was downloaded and four sampled frames were inspected (8, 16, 24, 32); this is captured-motion visualization, not live-action footage. The source catalog lists capture at 120 Hz; the AVI is 30 fps. Do not confuse those rates.
- Erich Schaefer's original Diablo II postmortem in Game Developer, October 2000.

The written workshop breakdowns were read; their full embedded videos were not viewed. The GDC 2022 slides and several other sources could not be retrieved, so they are not evidence for this decision.

## Case 1 — basic human walk: structure before detail

[Jason Martinsen / Animation Mentor](https://www.animationmentor.com/blog/tutorial-animating-human-walk-cycle/) breaks down contacts, impact, passing and rise, with the opposite contact completing the next step. It also addresses hip/chest motion, foot roll, curve cleanup and conversion from in-place motion to forward movement. Its example range is 20–30 frames at 24 fps.

[Doron Ben-Ami / LinkedIn Learning](https://www.linkedin.com/learning/2d-animation-walk-cycles-basics/the-poses-contact-down-passing-and-high-point) explicitly distinguishes contact, down, passing and high poses and explains foot paths and the gentle upper-body arc.

Application to WyrmForge: the previous four-key sheet used contact/passing/contact/passing, omitting clear impact and push-off transitions. Four types of key pose are not the same thing as four finished frames covering a complete two-step stride. Increasing frame count alone would not fix incorrect support or timing.

## Case 2 — cautious character walk: personality still needs support

[Natasha Krinsky / Animation Mentor](https://www.animationmentor.com/blog/tutorial-animating-sneak-walk-cycle-with-personality/) keeps the weight over the supporting foot, adjusts the torso for balance, checks more than one view, and varies lift/placement timing deliberately. The eccentric backward lean belongs to that character and reference.

Application: a mage exploring wet ruins can use restrained, deliberate placement, but should not inherit a cartoon sneak or exaggerated high-knee march by default. First establish an ordinary balanced walk; then layer the character's attitude onto it. The staff arm and cloak must respond to the same body motion rather than remaining unrelated static decorations.

## Case 3 — real captured walking: legs are part of a whole body

[CMU Graphics Lab, subject 07](http://mocap.cs.cmu.edu/search.php?subjectnumber=7) identifies normal, slow and brisk walking trials. [Trial 07_01 rendered preview](http://mocap.cs.cmu.edu/subjects/07/07_01.avi) was the inspected reference.

Observation from the sampled preview: pelvis, trunk, shoulders and feet change together during the support transfer. The figure remains recognizable without costume or surface detail. This supports testing a simple body before a finished mage.

Application: a crossed-shin silhouette is not an acceptance target. Leg overlap should emerge from joint positions and the chosen camera. The previous prompt optimized for a conspicuous X shape rather than establishing consistent left/right foot paths, support and joint motion. Avoid treating a front-view mocap preview as a ready-made southeast sprite blueprint.

## Case 4 — Diablo II: consistent construction at sprite scale

[Erich Schaefer's Diablo II postmortem](https://media.gdcvault.com/GD_Mag_Archives/GDM_October_2000.pdf), printed pages 50–51, describes constructing and rendering nearly all in-game art in 3D Studio Max. The character illustration caption describes approximately 75-pixel-tall in-game characters.

Application: our 80-pixel target does not remove the need for consistent anatomy and projection. A controlled model/rig or carefully maintained drawing construction can supply every frame and direction. This is a pipeline lesson, not a recommendation to copy Diablo assets or a claim that 3D is the only way to make sprite animation.

## Diagnosis of the current WyrmForge loop

| Finding | Evidence | Consequence |
| --- | --- | --- |
| Cadence too fast for the intended deliberate walk | Four keys at 7 fps; 4/7 = 0.571 seconds per two-step loop; 2×60/(4/7) = 210 steps/minute | Frantic rhythm despite restrained upper-body posing |
| Missing weight-taking and push-off transitions | Current sequence is contact A, passing A, contact B, passing B | Feet and knees pop between poses rather than carrying the body |
| Large knee-lift poses dominate | Visible in the passing keys at gameplay size | Reads as marching/hopping instead of grounded exploration |
| Registration/construction varies | Head-band alpha-centroid offsets of 7.66, 3.92, 4.67 and 5.05 display pixels relative to the current pivot | About 3.74 pixels of lateral variation; requires inspection rather than automatic recentering |
| Detail stays rigid or changes without clear cause | Cloak, shoulders and staff are not driven by a shared animation construction | Moving boots do not establish believable whole-body motion |

The centroid measurement is a heuristic based on a horizontal band of alpha pixels, not a skeletal joint or a physical weight measurement. Pose rotation can affect it. Do not erase legitimate body sway by locking every head to the same pixel. A per-frame bounding box is likewise not an anatomical anchor.

## Revised workflow decision

Stop using independent image generation as the primary method of authoring successive locomotion frames. Keep the approved artwork for identity, materials and atmosphere. Establish the body motion with a controlled rig or deliberate frame-by-frame construction, then produce consistent sprites from that source.

For the next experiment:

1. Use a simple untextured body with a fixed camera, persistent joint identities and two ground tracks. Choose an explicit held-staff grip and keep it throughout.
2. Block both steps, including contact, down/weight acceptance, passing and up/push-off phases. Inspect side and front views before the game camera.
3. Use one second per two-step stride as an initial art-test value. This is a chosen starting point, not a biological rule. Validate pace against actual movement speed.
4. Test the motion in place and moving across a marked floor. In the moving test a planted foot should stay at its world contact until toe-off. Set cycle duration from stride distance and travel speed, not an arbitrary display FPS.
5. Only after support and timing read correctly, add clothing/staff behavior and render at the intended camera and 80-pixel height. Sampling fewer display frames must preserve the authored cycle duration.

## Acceptance before more directions

- The walk reads correctly as a plain silhouette and as a simple body, without the cloak hiding leg errors.
- Each foot has identifiable swing, contact, support and toe-off; leg identities never swap.
- The body takes weight over the support leg before the other foot lifts.
- Knees and heels follow plausible paths; no abrupt pops, lateral skating or unexplained foot interpenetration.
- Pelvis, shoulders, head and staff share coherent motion; anatomy and camera remain consistent.
- The loop boundary preserves pose and motion continuity.
- Forward travel matches the stride; the in-place view alone is insufficient to claim no foot sliding.
- Ground contact uses an anatomical/world anchor, not texture bounds; silhouette is readable on the forest floor at phone size.

Do not generate the remaining directions or call the mage walk ready until these checks pass. The case studies change the method, not merely the wording of the next image prompt.
