# Hollowed feral movement — corrective animation quality audit

**Review state: the new motion capture candidate is NOT approved or in production.**

## What failed in procedural versions 1–10

The first attempts drove the ankle and wrist positions with separate
sinusoidal functions. That produced short shuffling legs, high flapping arms,
locked shoulders, hooked elbows and oscillating hands.

Adding checks for elbow angles, segment lengths or "wrist below shoulder"
did **not** fix the visual movement. Even rigidly aligning hands with the
forearm just changed floppy arms to stiff arms. The owner correctly rejected
all these visuals. These failed trials are preserved in Git history through
commit `5ec8a40aac7cea61e8c8c002b8e20277a71c64dc`, not shipped.

## Change of method — original CMU measured running motion

Instead of further oscillation tuning, the retargeter reads original CMU
Graphics Lab Subject 09 Motion 01 at 120Hz. The license allows all uses.
A physical 88-frame source gait period is selected using actual
hip-relative marker-pose similarity and converted to a 16-frame cyclic
animation synchronized to Hollowed's real world movement speed.

Joint locations are transferred via original BVH forward kinematics.
Upper/forearms and hands retain original rigged segment lengths; arms
are driven by human-captured shoulder, elbow and wrist movements.
Knees follow actual physical stance and recovery rather than a manually
bounced ankle. No recolouring, pixel warping, replacing approved albedo,
new lighting renderer or C# combat changes are permitted.

Source: `art/source/enemies/hollow/reference/CMU-09_01-run.bvh`
Build: `tools/sprite-lab/build-hollow-mocap-run.py`
Rendered evidence: `docs/art/evidence/hollowed-mocap-run-v1-2026-10-24`.
The eight-direction 128-frame atlas and directional GIFs are **candidate
review only**, not original approved walk content.

## Evidence and acceptance gates

- Exact source BVH SHA256 and authoring Blender .blend are recorded in
  `retarget-provenance.json`. Both remain immutable.
- All 16+closure source poses retain identical original leg and arm segment
  lengths; no independent hand animation is added.
- Side/three-quarter/front/back 96px original-mesh captures were reviewed.
- Eight directions, 16 frames per direction, approved angles and 96px
  cell alpha borders passed automated validation.
- Original Hollowed walk, attack, death; Ashling; original sprite material
  atlases; and the shared GPU lighting engine remain intact.
- Approval **still requires** a full cycle viewed at the actual Hunt scale
  and gameplay speed, correct root/feet contact and attack interruptions,
  visual owner review, and original-geometry normal/depth/caster export for
  the new poses before adoption.
- A screenshot, correct joint angles or CI pass is **never enough** to
  declare artistic approval.

## Primary biomechanics references

- CMU Motion Capture Database, free for all uses:
  https://mocap.cs.cmu.edu/
- Macadam et al., *Role of Arm Mechanics During Sprint Running* (2018):
  https://doi.org/10.1519/ssc.0000000000000391
- *Straight arm walking, bent arm running: gait-specific elbow angles*:
  https://pubmed.ncbi.nlm.nih.gov/31289110/

## Continuation inspection: measured anatomy and separate feral candidate (24 October)

**Still NOT approved. Do not replace the shipping walk, albedo or matching G1 normals.**

### What we found by inspecting the real existing renders

- The originally captured run actually bends the knees roughly 0–116° / 2–108°, but the legs are often hidden by the long garment at native 96px scale. Correct knee values alone did not communicate a sprint.
- The first retarget kept each shoulder approximately fixed while the hands travelled ~0.25m vertically. This helped explain the owner's puppet/hand-bounce complaint. An independently editable [coupled biomechanics retarget](../../tools/sprite-lab/build-hollow-mocap-biomechanics.py) introduced source-recorded shoulder yaw/roll and hip counter-rotation, plus 120Hz *hips-relative* marker denoising. Its [comparison](evidence/hollowed-mocap-biomechanics-2026-10-24/baseline-vs-biomechanics-eight-directions.png) was personally inspected at 96px and **rejected as an insufficient artistic improvement**.
- A [Blender full-skinning audit](evidence/hollowed-mocap-biomechanics-2026-10-24/skin-and-rig-audit.json) measured 55,573 skinned vertices across 16 frames: zero unweighted vertices, zero significantly unnormalized vertex groups, and zero references to nonexistent bones. This does not prove good weight painting. It found large 0.110m hand bones on 0.167m forearms (preserve the approved monstrous claw design) and near-static 0.02m garment-hem motion alongside ~0.28m shin travel.
- The separate [feral-presentation modifier](../../tools/sprite-lab/refine-hollow-mocap-feral-presentation.py) **preserves the measured CMU stride and leg motion**; it transports the authored hand-rest angle through the captured forearm rotation instead of adding wrist oscillators. It also trails existing cloth bones behind the runner with small previous-frame thigh-dependent inertia, maintaining actual cloth-bone lengths. No approved mesh vertices/weights, original BVH, first two .blend candidates or production assets are overwritten.
- Candidate timing changes from 16 frames at 22fps (full stride 0.727s; ~165 steps/min) to 25fps (0.64s; ~188 steps/min), a deliberate **preview-only** sprint cadence; source biomechanics and production animation timing are not silently changed. See running-cadence research https://pmc.ncbi.nlm.nih.gov/articles/PMC12440572/ and cloth follow-through https://learn.toonboom.com/modules/animation-principles/topic/follow-through-principle .
- The [feral-presentation 8-way 128-frame atlas](evidence/hollowed-mocap-feral-2026-10-24/candidate-walk-eight-directions.png) and [side-by-side native-cell comparison](evidence/hollowed-mocap-feral-2026-10-24/biomechanics-vs-feral-eight-directions.png) were generated by passing CI: https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40093916838 . Full GIFs for all eight directions and editable source .blend are in that workflow's artifact and the evidence/source folders.

### Artist gate after inspecting this evidence

The changes are measurable but the native-sized running silhouette is **still not convincing enough** to replace the Hollowed's movement. In particular the upper-body pumping and overall forward-drive readability need further expert animation direction; the garment correction is modest, not a redesigned costume or solved physics simulation. Do not describe this motion as production-quality simply because joints, material workflows and eight-direction renders pass.

Before any cutover: validate fast-infected locomotion in *real moving footage* at 25fps including shoulders/elbows/wrists, knees/foot planting and in-Hunt travel sync; test clips at actual mobile Hunt scale and attack interruption. Get owner acceptance of genuine visual movement. **Only then** regenerate exact matching normal/depth/caster passes from accepted final geometry, in the same atomic atlas/material change. Prior #332 walk normals must never be paired with either new candidate.

Shared GPU proof is independently failing on #332 head at https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40087228220 ; the child issue at https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40087880772 is a blank light-depth test at both phone viewports. The shared renderer remains owned by #332 (cross-PR report added). No lighting-engine modification was made here.

## Long cape removal — actual editable geometry (24 October, #333)

Owner direction: **remove the long cape from the Hollowed.** The cape was part of the source skinned mesh and hid leg recovery during running, so do not fake this with CSS overlays, alpha masks or material tinting.

- Produced a first independent editable cape-free CMU running candidate in `rigged-mocap-no-cape-candidate/`. Removed 11,505 cloth-dominant below-waist triangles, kept source `.blend`, original pose keys, UVs and vertex weights; CI [run 40094651125](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40094651125) passed the full 128-frame eight-direction source/alpha review.
- Actual visual inspection revealed leftover ragged rear fabric because the original 55,573-vertex textured mesh contains 1,244 disconnected mesh islands. Rather than indiscriminately deleting torso polygons, the subsequent [island-based source edit](../../tools/sprite-lab/build-hollow-no-cape-islands.py) removes **73 complete, rearward-hanging cape mesh islands (10,137 triangles)** with explicit protection for leg/torso-dominated geometry. Original authored rigs, CMU source and earlier no-cape candidate are all preserved.
- Full eight-direction 96px atlas and GIFs are in [new no-cape visual evidence](evidence/hollowed-no-cape-islands-2026-10-24/) with a [before/after comparison](evidence/hollowed-no-cape-islands-2026-10-24/partial-vs-complete-removal-eight-directions.png). [CI run 40095099076](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40095099076) passed, including source-derived geometry sampling and 128 frame alpha/anchor checks.
- This satisfies a **source-geometry review of long cape removal**, not production integration or approval of the overall run. A few short torn-cloth costume details may remain. Never use changed candidate poses with original normal/depth/caster atlases. After owner confirms visual direction, carry cape-free geometry through **walk, attack and death together** with exactly matching regenerated albedo, normals, depth, shadow-caster and manifests. Do not change Ashling or the shared #332 GPU engine.

## Cape-free continuation: rig and visual QA (24 October, later checkpoint)

**PR #333 remains DRAFT. No sprint candidate or hand-proportion variant is
artistically accepted. Do not replace runtime walk pixels or reuse old walk
normals/depth/caster passes with altered poses or topology.**

### Accepted technical groundwork, not an animation acceptance

The independently editable `rigged-mocap-no-cape-islands-candidate`
removed **73 rear cape mesh islands / 10,137 genuine source triangles**
without deleting the running legs, losing UVs or replacing Ashling assets.
This was rendered across eight facings at native 96px:
[no-cape 128 frames](evidence/hollowed-no-cape-islands-2026-10-24/candidate-walk-eight-directions.png),
[frame-by-frame comparisons](evidence/hollowed-no-cape-islands-2026-10-24/partial-vs-complete-removal-eight-directions.png).
GitHub Actions [passed](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40095099076).

### Why the next animation was NOT promoted

A new
[CMU shoulder-led source variant](../../tools/sprite-lab/refine-hollow-no-cape-sprint-anatomy.py)
restored anterior/posterior upper-arm motion and preserved all 16 source
pelvis/leg poses. The first actual skinned review exposed hands and forearms
lifted into a cartoonish boxing guard. The candidate is **rejected on visual
grounds**, regardless of automated joint checks:
[complete A/B eight-direction atlas](evidence/hollowed-no-cape-anatomy-2026-10-24/no-cape-before-vs-shoulder-run-eight-directions.png).

The
[constrained low-arm version](../../tools/sprite-lab/refine-hollow-no-cape-sprint-guarded.py)
passed Blender render and source-provenance checks
([CI run](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40096437419)).
Its hands sit lower, but side/three-quarter running GIFs still produce a
repeated forward **C-shaped claw/forearm silhouette**, not authoritative
professional sprinting anatomy. **Reject it too.** Avoid further arbitrary
wrist keyframes, bone-sine animations, or stiffening the hands to hide the defect.

The original model's hand control is 0.11006 units versus a 0.16680-unit
forearm, an exaggerated ratio. A
[separate mesh-weighted 23% distal geometry reduction](../../tools/sprite-lab/refine-hollow-no-cape-hand-proportions.py)
changed 3,373 left and 3,177 right hand-influenced source vertices
with maximum ~0.030 units displacement, keeping 48,950 vertices,
68,380 triangles and all authored UVs. The
[all-eight-directions GIF evidence](evidence/hollowed-short-claws-2026-10-24/)
shows only a modest native-pixel improvement: **arm choreography is the
primary remaining issue**; shorter claws alone are insufficient.
[CI passed](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40096948043),
including a geometric comparison confirming original pelvis/leg sampling,
foot-contact markers at 17 frames × 2 feet, and unchanged non-hand geometry.

### Required continuation (not yet delivered)

A convincing running action now needs genuine shoulder/torso driven sprint
coordination and proper *forearm following* throughout the complete stride,
with no elbow extension reversal and no hooked hand/cross-body loops.
Respect the leg contact / compression / takeoff / recovery phases and
the original CMU motion-capture timing; validate real travel speed against
the actual Hunt movement rather than merely showing a centered sprite GIF.
Audit weighted shoulder, elbow and hand surface deformation in enlarged
front/back/side/three-quarter motion and all eight native-pixel loops.
Keep the long cape absent in all final clips; if the costume change is
adopted, attack/death must be regenerated from the **same edited mesh**,
not from old cape-containing geometry.

Nothing gets called `production ready` before motion and 96px Hunt-size
mobile captures are actually accepted. On acceptance, source-derived
walk/attack/death geometry, normals, depth and shadow casters must be
exported and hash-verified atomically; never put novel colours or material
passes over older body poses. PR #332 still owns the shared GPU renderer.

## 24 October — captured-chain correction and full GIF review gate

**User-facing review media requirement:** every future visually reviewable
Hollowed milestone MUST include genuine animated footage, not only pose sheets:
all eight 96px direction GIFs, synchronized A/B clips at native 96px and
nearest-neighbour 4× enlargements, and eventually true moving Hunt/device
captures. Always **view the actual GIFs before asking for owner acceptance**.

The independent [source-measured 3D whole-arm-chain correction](../../tools/sprite-lab/refine-hollow-no-cape-captured-arm-chain.py)
fixes the previous broken retargeting approach that independently forced
forearm/wrist heights. It rotates shoulder–elbow, elbow–wrist and wrist–hand
as **one coupled captured 3D chain**, with one constant orientation calibration
derived from mean measured humerus pose. It preserves original elbow angle
and all 16 lower-body poses exactly; no procedural limb oscillation.
An editable .blend and 8×16 96px atlas were generated in
`rigged-mocap-no-cape-captured-chain-candidate/`.
[CI and full render succeeded](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40097778715).
[Four-view sheet](evidence/hollowed-no-cape-captured-chain-2026-10-24/mocap-run-four-view.png);
[all 8 direction GIFs](evidence/hollowed-no-cape-captured-chain-2026-10-24/);
[actual side-view A/B GIF at 96px](evidence/hollowed-no-cape-captured-chain-2026-10-24/compare-e-native-96px.gif);
[4× comparison](evidence/hollowed-no-cape-captured-chain-2026-10-24/compare-e-zoom-4x.gif).

**Personal moving-image review: not visually accepted.** The arm chain is
mechanically coherent, but the long distal claw flips upward in swing
recovery. Particularly west-facing motion still resembles a boxing hook.

A second [separate captured-chain + anatomically relaxed hand candidate](../../tools/sprite-lab/refine-hollow-no-cape-captured-chain-hands.py)
starts from the previously tested *real shorter-claw weighted mesh*, uses
the same complete 3D measured arm chain, but keeps wrist-to-hand direction
near the measured forearm with a small fixed relaxed bend instead of an
independent wrist-wave. **This does not freeze the arm**, and captured elbow
angles/leg action remain intact. Again a separate original-editable .blend,
provenance, eight 16-frame 96px direction GIFs, and 6 directional
old/new/native/4× examples were generated:
[passing render/validation run](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40098058638).
[Side native GIF](evidence/hollowed-no-cape-captured-hands-2026-10-24/compare-e-native-96px.gif),
[side 4× GIF](evidence/hollowed-no-cape-captured-hands-2026-10-24/compare-e-zoom-4x.gif),
[rear 4× GIF](evidence/hollowed-no-cape-captured-hands-2026-10-24/compare-w-zoom-4x.gif),
[diagonal 4× GIF](evidence/hollowed-no-cape-captured-hands-2026-10-24/compare-sw-zoom-4x.gif).

**Latest visual judgment: hand silhouette is somewhat cleaner but the difference
is limited at native 96px; it is NOT yet the aggressive convincing sprint.**
The leading remaining issue is the original rig/capture retarget and surface
deformation for upper-arm/forearm coordination in the actual moving silhouette,
not missing automation or the absence of a cosmetic cape. Do not misrepresent
passing CI as artistic approval. The owner's approval is required *before*
cutting over either unapproved trial. Do not touch Ashling, #332 light engine,
Town, wizard, or runtime C# behavior. Keep all rejected/source candidates out
of production material atlases and retain both originals and diffs.

## Broken LEFT leg — contact authored and opt-in Arena playback review (25 October)

**Still a distinct UNAPPROVED art candidate in draft PR #333.** The owner
reported that the dragged recovery looked better, not that the atlas/material
cutover or mobile Hunt transitions were approved.

- V1–V7 remain rejected historical attempts. The initial separate
  `rigged-hollow-broken-leg-contact-authored` candidate passed Blender
  sampling/render but was visually rejected for looking too healthy.
- The next source `rigged-hollow-broken-leg-dragged-recovery` preserves the
  source cape-free mesh, normal healthy-arm reach and 16 source pose cycle,
  while independently authoring both feet, weight-bearing failure and a
  toe-down lateral left-foot recovery. It was built with
  `tools/sprite-lab/author-hollow-broken-leg-dragged-recovery.py`.
- [True 8-direction 96px GIFs and moving comparisons](evidence/hollowed-broken-leg-dragged-recovery)
  come from the *actual Blender skinned geometry*. The second render
  [passed CI](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40135413094).
  Rendering success is not biomechanical or owner acceptance.
- The original 1536×768 PNG is copied **byte-identically** into
  `wwwroot/art/enemies/hollow-rigged/review/broken-leg-left/walk.png`
  with an explicit rejected/unapproved runtime manifest. Git source blob
  SHA: `de61a7961418b9d9c5abb53899c2edf2ba3c7933`.
- A real Canvas runtime review is wired by `hollow-leg-review.js` and
  `hollow-sprites.js`. Opt in using
  `/enemy-lab?kind=Hollow&seed=42&autoplay=true&cast=false&hollowLegReview=dragged`
  on the **PR build**. The original bundled actor is the default on every
  ordinary URL. Even in preview mode, **ONLY the standard Hollowed's
  walking atlas changes**; neither damaged-arm variant, attack/death,
  shared lighting engine nor C# simulation is modified.
- Original and review-render source hashes, frame boundaries, atlas anchors,
  enable/disable behavior and safe fallback are checked by
  `tests/javascript/hollow-leg-review.test.mjs`. Dedicated CI:
  `.github/workflows/hollow-leg-live-preview.yml`; Chromium snapshots
  from the original `/enemy-lab` at 320/390px are NOT a substitute for
  actual physical mobile performance testing.
- **No material cutover:** the matching pose-derived normal/depth/caster
  atlases must be generated from the accepted final geometry before
  adoption by #332's shared GPU renderer. Also require injured pose to
  remain physically coherent across runtime walking/turning, attack entry
  and exit, death, actual travel speed and foot sliding. Preview may
  show a visual transition back to standard attack and does not claim
  to resolve that animation boundary.

### Toe-floor diagnosis and corrective source

Inspecting the first dragged-leg candidate's **actual 3D gait diagnostics** found
foot-**bone tip** positions down to Z = -0.488m against the authored
Z = -0.435m reference ground plane (5.3cm below the plane). This is not
an acceptable proof of non-penetration; full skinned-mesh floor contact
still requires a separate physical/render test.

The independent `rigged-hollow-broken-leg-ground-safe` candidate reauthors
the ORIGINAL standard-rig source with the SAME contact events and intact
reach, constraining each toe bone to Z >= -0.445m while keeping original
foot-bone length and independent leg IK. The right-leg support schedule and
C# world movement are unchanged. The parent dragged-leg .blend, eight
directions and failed versions are preserved.

Source: `tools/sprite-lab/author-hollow-broken-leg-ground-safe.py`.
Eight-direction real-skin comparison:
`tools/sprite-lab/render-hollow-broken-leg-ground-safe.py`.
Dedicated render/test workflow:
`.github/workflows/hollow-broken-leg-ground-safe.yml`.
**Only the next inspected GIFs, not the arithmetic constraint alone, can
establish whether this looks physically credible.** The current opt-in
runtime still loads the prior dragged-leg image until a render actually
passes and its movement is inspected and approved for the review slot.

### 25 October — abrupt-step velocity defect and new independent gait (pending visual signoff)

The owner reported a mechanically unnatural **fast step** in the new
ground-safe Hollowed's animated walk. Diagnosis from the actual 17-key
Blender gait diagnostics at **22 fps**:

- Broken **left ankle** advances as far as ~0.149 m in a single frame,
  equivalent to ~3.28 m/s, particularly around authored frames 9→10.
- Healthy **right ankle** advances as far as ~0.161 m in a single frame,
  ~3.55 m/s, particularly around frames 10→11.
- The damaged foot's +Y→−Y→+Y excursion was crammed into roughly
  3–4 keyed frames; the healthy lifted recovery was also compressed.
  Artificially lowering FPS is **not** the fix because the game's shared
  sprite sampler ties locomotion to simulation-travelled distance.

**Corrective implementation:** new isolated
`tools/sprite-lab/author-hollow-broken-leg-even-cadence.py` and
`rigged-hollow-broken-leg-even-cadence` editable Blender output;
`render-hollow-broken-leg-even-cadence.py` supplies the 16×8 original
skin-mesh native-resolution moving comparison to previous ground-safe art.
New independently authored left and right contact trajectories shorten
each step while distributing swing/recovery over more of the *same*
16-frame cycle. Preserve the left failed-weight-bearing sequence,
toe-ground safeguard, anatomical IK chain and the standard forward zombie
arm pose. **C# movement speed and normal game animation playback
are unchanged**.

Both source authoring and CI reject frame-to-frame **3D** ankle travel
>= 0.080 m at 22 fps (equivalent 1.76 m/s), including loop closure.
The earlier candidate's 0.149/0.161 m snapping positions must now fail
that regression. This is a gait-trajectory constraint, **not** proof
that the rendered sprite looks right. CI:
`.github/workflows/hollow-broken-leg-even-cadence.yml`.

Leave all V1–V7, previous dragged recovery, ground-safe source and actual
runtime opt-in atlas intact until the latest rendered GIFs have been
inspected and movement is approved. No new lighting normal/depth/caster
material maps or shipping Hollowed replacement is authorized.
