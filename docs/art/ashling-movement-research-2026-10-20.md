# Ashling movement — research and failed-gait diagnosis

The owner's latest review rejects the current movement's leg articulation: the eight-direction sheet does not convincingly show the intended Gollum-like hop. This supersedes the earlier provisional continuation/acceptance record. Preserve the renders as comparison material; do not extend their lifecycle or integrate them into the game as accepted movement.

## Research consulted

- [Wētā's Gollum production account](https://www-ext.wetafx.co.nz/films/case-studies/gollum): the animators translated Andy Serkis's on-set performance into the creature. This supports starting with performed body mechanics rather than treating capture or a procedural cycle as the finished performance.
- [Jason Martinsen's jump-and-land tutorial, Animation Mentor](https://www.animationmentor.com/blog/tutorial-animate-a-jump-and-land/): distinct compression and power stretch; offset lead/trailing legs; a staggered midair transition; landing with impact absorption and possible hand support. It explicitly recommends reviewing front and side views.
- [Wayne Gilbert on body mechanics, Animation Mentor](https://www.animationmentor.com/blog/animation-tips-tricks-what-makes-or-breaks-a-good-body-mechanics-shot/): decide the driving forces and their sequence before secondary acting; make leg drive, lean and arm pull legible through breakdown poses.
- [Chris Hurtt on anticipation, Animation Mentor](https://www.animationmentor.com/blog/anticipation-the-12-basic-principles-of-animation/): preparation must visibly communicate the upcoming action; familiarity with one's own loop can hide missing anticipation.

Scope of reference review: the written production accounts and instructor breakdowns were read. Wētā's linked official video (`https://www.youtube.com/watch?v=HUGdsjwTf2s`) was identified and opened, but the embedded player failed and direct playback did not advance beyond preroll during this session. No frame-by-frame film timing or Gollum joint measurements are claimed. No film footage has been downloaded, copied into assets or used as training data. The Ashling motion prescription below is our design inference, not a measured canonical Gollum gait.

## Concrete problem in the current implementation

The current `build-ashling-rig.py` raises pelvis flight height by `0.14 * arc`, while adding `0.12 * arc` to the feet. Those shared vertical components mostly cancel: only `0.02 * arc` changes the hip-to-foot separation. The additional recovery sine does move the ankles, but the flight arc mainly carries an already bent leg along with the torso. There is no explicitly blocked extended push-off pose.

Foot orientation also remains fixed through support and flight (`ankle + (0, -.16, -.055)`). The ankles maintain a fixed lateral spread and the IK knee pole stays forward. Consequently the cycle lacks a deliberately authored heel/toe release, knee splay and strong tuck/reach contrast. Both halves follow the same rhythm with a half-cycle phase shift. Tail and claw motion cannot make up for unclear leg mechanics.

The numerical checks were too narrow as an art gate. Four airborne frames, exact loop closure, a clear floor and stable support markers establish technical properties. They do not establish convincing leg drive, readable silhouettes or the owner's requested movement. The owner's rejection controls the current art status.

## Rebuild prescription

Block one low, asymmetric bound-and-catch sequence using explicit body/limb poses:

1. **Load:** hips descend over planted support; knees fold conspicuously, with the feet and knees separated in silhouette. Shoulders prepare the forward action.
2. **Drive:** hips travel forward/up while the support foot remains planted. Show a visibly straighter supporting leg before toe release.
3. **Tuck:** draw a knee and foot distinctly underneath the body. Offset the other leg, rather than translating the whole bent-leg shape upward.
4. **Reach/catch:** lead foot reaches ahead; an occasional claw brace may support the low scramble. The torso/head follow the transfer of weight with a delay.
5. **Absorb:** landing compresses the knee/hip chain and returns to a low, poised stance. Tail and cloth follow the primary force.

Timing, exact angles and any hand-support pattern are new blocking choices to test, not facts inferred from Gollum footage. The objective is a feral Ashling with readable crouched propulsion, not a copy of a film character's anatomy.

## Next gate before another directional sheet

Produce a side-view pose strip and a slowed loop, with the actual leg bones/contact markers beside the weighted mesh. Review silhouette at native game size and enlarged nearest pixels. Check the skin follows the thigh/shin controls instead of being dominated by pelvis or cloth weights. Compression, extension, tuck and landing must be visibly different even without texture or tail motion. Also inspect a front view for knee/foot overlap.

Only after that blocking reads convincingly should it be shaded, loop-polished and expanded into eight views. Preserve foot planting and floor/loop checks, but add measured joint/landmark changes as diagnostic evidence. Do not use a new numeric angle threshold as a substitute for visual acceptance. No animation or sprite generation was performed during this research checkpoint.
