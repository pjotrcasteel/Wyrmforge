# Ashfang source production checkpoint

This is Tier I of the owner's five-tier Wyrm progression. Canonical size/identity direction is in `docs/canon/creatures-and-encounters.md`; source brief and research are in `art/source/enemies/ashfang/design-brief.md`. Tier I targets roughly 15â€“25% of the gameplay viewport width in its normal grounded silhouette; Tier V is a screen-wide Divine embodiment. Intermediate names/sizes are not newly fixed here. Existing `WyrmTierCatalog` reserves five enum tiers but its shipped size multipliers do not yet implement those screen proportions.

Two installed, offline TRELLIS/DINOv2 reconstructions ran locally on RTX 5090. Original masked front/side card pixels, model provenance, raw meshes, Gaussian appearance and shared latents remain preserved. Candidate 001 (front reference) has 212,884 raw vertices / 425,860 faces and peaked at 15,794 MiB allocated CUDA memory. Its baked source has 53,233 vertices / 76,500 faces. Candidate 002 has a more raised neck but includes an unwanted ground slab and is not approved. Eight real appearance views of each candidate are preserved. Neither is a final accepted character.

Candidate 001 now has a 47-bone editable Blender source under `model/local-appearance-001/rigged-block-v3/`: four three-joint walking limbs, pelvis/spine/chest, two neck segments, head, independent jaw, mouth socket, six tail segments and separate wing upper/forearm/finger controls. The inferred wing cape failed the folding/flight review, so v3 replaces those faces with original authored curved membrane meshes and spars, using pixels from the original card. UV atlas packing preserves the reconstructed body texture bytes exactly. The wing helper is `tools/sprite-lab/ashfang_wings.py`; it is authored geometry, not another model inference or a finished approved wing design.

Three anatomy tests are preserved: 24-frame walk, 40-frame raised breath, and 64-frame takeoff/flight/landing. These are blocking studies, not finished animation clips. Local CUDA review renders two views at native 192px cells / 80 pixels per model unit, with a 390px footprint board. The breath test uses an original mouth-bound geometric jet to inspect emitter tracking; it is not a gameplay hazard or polished final fire effect.

Current visual/technical gate remains open. The reconstructed core still needs stronger head/neck and paw readability at Tier-I mobile size, wing folding/power-stroke refinement and improved body/limb connections. The v3 raw evaluated minima are -0.2031 walking, -0.2213 raised breath and -0.2184 launch/landing against a -0.197 ground plane. No hidden floor flattening was applied to make those pass. Earlier inferred-wing and contact attempts remain preserved. Do not expand these studies to accepted eight-direction atlases or replace the live Ashfang yet.

Scripts: `prepare-ashfang-reference.py`, existing offline `reconstruct-creature-local.py`, parameterized appearance rendering/baking, `build-ashfang-rig.py`, `ashfang_wings.py` and `render-ashfang-block.py`. Existing Hollow/Ashling runtime art and C# behaviour are unchanged. Remote checkpoints precede long generation/capture work; draft PR #186 preserves unfinished production.

Remaining: refine source silhouette/anatomy and contacts; validate one readable walk; polish raised/sitting breath, takeoff, sustained/banked flight and landing transitions; export true directions; design explicit C# airborne encounter states and verify actual mobile combat. No aerial gameplay has shipped.

### 21 October contact and unfolding revision (in progress)
V4 rendered evidence is preserved. Next source revision corrects tail contact by evaluating the skinned surface and rotating the attached tail chain, opens wings about their longitudinal hinge, and counter-rotates the raised head toward a near-horizontal breath aim. These are source changes awaiting regenerated motion and visual review; no runtime or acceptance claim. Checked current main and open PRs; concurrent Wet Forest work remains separate.

### V5 evidence and remaining gate — 21 October

Source: `art/source/enemies/ashfang/model/local-appearance-001/rigged-block-v5/`.
Local RTX 5090 render completed for walk, rear/breath and takeoff/flight/landing;
all source and review files are preserved. Tail contact now clears the floor
within the 0.001 model-unit contact tolerance, using bone rotations about its
attached base. The whole surface does **not** pass: the takeoff crouch reaches
-0.202158 against floor -0.197, with the lowest vertex weighted to hind.1.R.
Walk minimum is -0.198327 and rear/breath -0.198218. These residuals remain
visible in the audit rather than hidden by flattening or whole-body offsets.

Visual review: raised breath now aims nearly horizontally; the current geometric
jet only measures mouth alignment and is not final fire artwork. The flight
wings still tuck too close to the body and need independent elbow/wrist folding
and a larger exposed membrane silhouette. Dark torso/leg separation, a pale
baked hotspot below the muzzle, and walk readability remain open. No owner
acceptance, eight-direction export, aerial gameplay integration or release is
claimed. Current main checked at 4f4c0635; open Wet Forest PR #199 is separate.

### V6 articulated span revision — in progress
The extended wing anatomy is rebuilt with a broader bat-like finger fan.
Shoulder, elbow, wrist and digits now fold independently at preserved bone
lengths. Delayed finger recovery follows the shoulder power stroke. The small
takeoff crouch is reduced and the low paw weighting boundary adjusted; contact
and mobile silhouette must be revalidated from the regenerated source.

### V6 review / V7 appearance pass — in progress
V6 preserves broader articulated wings and a clearly changing span in flight.
Walk minimum -0.197438 and takeoff -0.197380 are inside the 0.001 contact
tolerance; rear/breath still reaches -0.198218 on the forepaw during transition.
V7 extends the existing tail surface and matching bone chain together, corrects
the baked pale throat hotspot to molten amber in its local UV region, and makes
a small source value adjustment for native pixel readability. Original texture
and previous sources remain preserved. These changes await visual review.

### V7 turnaround review / V8 fold correction — in progress
Eight independent cameras exposed overlapping upright folded membranes in the
front view. V8 reduces the shoulder/elbow sweep and changes wrist tuck so the
folded fan trails back beside the body instead of standing like a sail. Grounded
raised forepaws use a sole-floor lower bound through the rearing transition;
this preserves their raised goal while avoiding an abrupt contact-mode switch.
V7 texture correction removes the conspicuous pale throat spot; all eight
source views and previous candidates remain preserved.

### V8 contact / V9 digit fan revision — in progress
V8 whole-surface minima: walk -0.197091, rear/breath -0.197481, flight -0.197460
against floor -0.197, inside the documented 0.001 tolerance. All eight cameras
were reviewed. The arm folds improved but the digit fan still stayed too broad
when grounded. V9 gathers individual finger chains toward the trailing body
line with quaternion rotations and preserved lengths, reopening them for
flight; no vertex scaling or mirrored sprites. Awaiting regenerated review.

### V9 review / V10 raised wing correction — in progress
V9 broader flight reads better than V5 and the white throat hotspot is removed.
All three clips are finite and unclipped; walk endpoint error is zero. Actual
camera widths range 60–104px at 80 pixels/model-unit, so final viewport scaling
still needs fitting across 320/390px game widths. A regression in rear/breath
places a distal wing finger at -0.201694: rotating the trailing fold direction
with the raised torso points it down. V10 keeps that folded direction in world
space and adds slight tip clearance in the raised pose. This must be audited
again; V9 is not a passed contact source.

### V10 checked motion study — 21 October

Source and review: `art/source/enemies/ashfang/model/local-appearance-001/rigged-block-v10/`.
The local RTX 5090 rendered three motion studies and eight independent
camera stills. No hosted inference, model downloads or GPU setting changes.

- Native cell 192px, source density 80 pixels/model-unit; same camera/pixel
  density as V5 for the saved `progress-comparison.png`.
- Walk minimum Z -0.197091, rear/breath -0.197481, takeoff/flight/landing
  -0.197460 against floor -0.197: all within 0.001 contact tolerance.
- All sampled coordinates finite; all three rendered clips unclipped. Walk
  endpoint position error exactly zero. These are numerical checks, not proof
  of anatomical quality, planted-foot drift or accepted animation.
- Broader authored wing skeleton, independently folding shoulder/elbow/wrist
  and finger chains; finger fan closes by rotation at preserved bone lengths.
- Existing tail surface and chain lengthened together. Throat hotspot corrected
  locally in the derived UV atlas; original texture preserved.

Visual comparison confirms a larger changing flight span and removes the pale
throat distraction. Still not production quality: body/leg separation remains
dark, membranes need less broad/paddle-like folds, launch should show clearer
leg drive and a power stroke before sustained altitude, and landing needs more
weight. The current breath jet remains a geometric alignment placeholder.
Eight still directions are not eight-direction animated atlases. No live
Ashfang replacement, new aerial mechanics, release or owner acceptance.

Next source work: refine anatomy and native silhouette, then launch/landing
performance; only after that gate export the full directional action set and
implement/validate C# aerial encounter behavior. All previous candidates and
source meshes, latents, textures, Blender rigs and review evidence remain intact.

### V11 launch and catch timing — in progress
A separate authored source timeline replaces the continuous lift sine study:
crouch, leg extension, first downstroke, departure, cruise, approach/flare,
forepaw/hindpaw catch targets and recovery. The flight study expands to 84
frames at 24fps. Fore/hind paws now extend at different times; metadata labels
are review targets, not claims of measured contact. A per-paw skin/IK audit
records actual sole height and goal error so floor minima alone cannot hide
early liftoff or unreachable foot goals. Current main checked at 2740d7f5;
Refuge PR #202 and other concurrent work remain untouched.

### V11 audit failure / V12 contact-aware targets — in progress
V11 reveals previously unmeasured foot errors: walk max IK goal error 0.0501,
rear/breath 0.0159, landing 0.0902 model units. Floor-only checks were insufficient
to establish planted contact. V12 recenters forepaw goals under the shoulders
and reduces walk travel from 0.16 to 0.11 units, preserving a 0.72 stance share.
The resulting in-place clip records a matching 0.15278-unit cycle travel for
future movement synchronization. Airborne extending paws now travel with the
body instead of interpolating toward unreachable floor goals while still high.
Hind catch retains clearance briefly after the forepaw catch. A source shoulder
stroke limit near ground prevents the new first downstroke penetrating the
floor (V11 worst -0.26543). V11 is preserved as failed source, not approved art.

### V12 measured timing result — before GPU review
The unreachable landing/rear targets are removed: max IK error is under 1e-7
model units for both. Walk max is 0.004076 (0.326 native pixels at 80px/unit),
down from 0.050077 (~4px). Whole-surface minima remain inside the 0.001 floor
tolerance. Forepaws catch near frame 68 while hind soles remain about 0.022
units higher; hindpaws catch at frame 71. These are measured source contacts,
not just event labels. Render review now follows source 24fps timing (GIF
40/50ms frame durations), adds phase/frame labels and a fixed ground guide with
altitude-responsive shadow. Prior GIFs used 55ms frames and extra endpoint holds.
No runtime controller behavior changes are included.

### V12 rendered review
Local GPU renders completed: three timed GIFs, per-frame game/side PNGs and
eight actual-camera stills. `launch-landing-contacts.png` shows crouch, first
stroke, departure, approach and staggered catches at the same pixel density.
The silhouette still has broad paddle-like wing edges, so the next source
refinement is a concave membrane edge between articulated supporting fingers.
This visual shortcoming remains distinct from the passed source contact gate.

### V13 membrane topology refinement — in progress
The authored fan surface now retreats toward its root between supporting
finger tips, producing smooth concave trailing bays. The fingers retain full
length/span; this changes the skinned 3D geometry rather than masking a render
or warping an image. Existing source-card UV appearance remains attached.
Regenerate and inspect the open/folded silhouette plus contact audit.

### Native source lighting refinement — in progress
V13 pixel review will use one shared world-space directional key computed from
the actual deformed vertex normals. A restrained stone highlight and reserved
stone palette ramp improve plate/limb shape separation, while bright molten
albedo retains its source values. This is a reproducible 3D render-lighting
change, not painted outlines or a blanket glow. Both game/side motion and all
eight cameras use the same light; original source albedo remains intact.
Visual/native contact checks still required; it is not new runtime lighting.

V13 initial render stopped because a shadow-tone integer shadowed the lighting
function name. The import is now explicitly `shade_surface`; partial frames and
a failure receipt remain in motion-review-v1, and retry uses motion-review-v2.
No successful render or visual acceptance is claimed for the partial folder.

### V13 completed local review — 21 October

Successful review is **motion-review-v2**; motion-review-v1 is preserved partial
output from the corrected name collision. Three GIFs, game/side frame PNGs,
`motion-contact-review.png` and eight actual-camera stills are preserved.
`source-check-summary.json` records finite/unclipped samples, floor tolerance,
loop closure and measured IK errors. Whole-surface floor tolerance passes for
all three clips. Walk max IK goal error 0.004076 model units (0.326 native px);
rear/breath and flight/landing errors below 1e-7. Walk closure is exactly zero.

Concave membrane bays make the digit support more visible and the new source
timeline distinguishes crouch/drive, first downstroke, departure, approach,
forepaw catch and hind catch. Review playback now follows nominal 24fps rather
than the earlier slower GIF playback. Static guide/shadow, labels and actual
per-paw audits aid evaluation; no simulation events are implemented by these
labels. The same world-space light is used across views, preserving molten
albedo while lifting quiet stone planes. No original card pixels are replaced.

The reconstructed neck/torso, fine membrane shapes and native limb separation
remain visually rough. Final fire is still absent (geometric origin/aim jet
only); continuous flight/overflight, full action library, directional animation
exports and actual mobile Hunt validation remain outstanding. Numerical source
checks are not acceptance of the artwork. This is still a draft production PR.

### V14 research-led body mechanics — in progress
Owner rejected the static jump and requested tiger/dinosaur and dragon-media
research. See `art/source/enemies/ashfang/jump-reference-study.md` for primary
references, limitations and concrete transfer. The source cause is confirmed:
V13 used one rotation for pelvis/spine/chest/neck and a zero-velocity lift curve.
V14 introduces connected but independently rotating trunk/neck joints, weight
gathering over hind support, chest-led fore release before hind departure, an
upward-velocity launch trajectory with explicit forward root travel, delayed
tail response and a restrained landing/head settle. Limb/wing sockets attach
to the actual posed chest/pelvis. Source NPZs now preserve bone points/names
and explicit root motion; body audit records the changed line of action. Shadow
follows the ground projection of that travel. All changes await contact and
visual checks; no simulation movement is implied. Main checked at 3add7360,
concurrent Refuge PR #204 remains untouched.

V14 source generation stopped on landing frame 71: the articulated pelvis and
stronger compression exhausted the former 0.45-radian tail correction search
(-0.201990 minimum). The failed candidate, completed walk/rear samples and
failure receipt are preserved. V15 extends the bounded tail bracing search to
0.675 radians and adds partial contact receipts on any future failure. This
rotates the attached tail bones; it does not flatten skin or lift the whole body.

V15 regenerated source completes. Flight max IK goal error remains below 1e-7
units and whole-surface minimum -0.197356 stays within floor tolerance. Fore
soles rise near frames 15–18 while hind support remains near floor; at frame 18
fore soles are about -0.104 versus hind -0.194. Landing fore soles catch at
frame 68 and hind at 71. Other motions remain unchanged within float precision
(walk max coordinate delta versus V13 1.79e-7 units). A side-view bone overlay
will expose actual spine/pelvis/neck articulation during the rendered review.

### V15 research-led jump review completed — 21 October

Current source is rigged-block-v15, with motion-review-v1 and body-review-v1.
`before-after-jump.gif` compares V13/V15 at the same camera, pixel density and
24fps timing; `body-mechanics.gif` overlays the actual bone poses on the source
side view. Body angle evidence shows separate pelvis, spine, chest, neck and
head changes relative to frame 0. No skeletal lengths are scaled to create the
body motion. Source root travel is -0.24 units forward and preserved explicitly
in rootMotion; the shadow follows its ground projection. This travel has not
been connected to C# gameplay movement.

The game/side renders show forequarter release over hind support, a changed
line of action into departure, and delayed recovery of neck/tail. Finite and
unclipped checks pass for all three studies, walk endpoint error remains zero
and all source minima are within the 0.001 floor tolerance. Flight max IK goal
error is below 1e-7 units. Walking's pre-existing max error remains 0.004076
(0.326 native px). These checks establish source integrity, not final art quality.

Primary research and the limits of its transfer are recorded in
`art/source/enemies/ashfang/jump-reference-study.md`: felid morphology and
mammal spine timing, ILM dinosaur performance, Framestore dragon anatomy and
Capcom secondary-motion practice. No exact tiger/dinosaur jump curve or
frame-by-frame movie measurements are claimed; this is an original authored
six-limbed creature performance informed by those sources.

The reconstructed torso/neck silhouette and native limb separation still need
art refinement. Fire is still a geometric alignment jet. Current turnaround
stills remain the V13 anatomy reference, not a completed V15 directional
animation library. Sustained flight/overflight, all actions/directions, viewport
fitting and actual C# aerial gameplay/mobile Hunt validation remain outstanding.
Keep draft and do not present this as finished or owner-approved artwork.

### V16 hind-limb correction and push — in progress
Owner reports weird/weak rear legs. V15 actual bones confirm the rear knee
bends backward and above the hip: neutral left hip Y/Z 0.170/-0.025, knee
0.272/-0.007, although the rest knee is forward/down. The rear IK pole was
incorrectly +Y. V16 uses a pelvis-local forward/down bend plane with less
lateral splay, narrower paw plants and a bounded radial haunch sculpt on the
existing textured source. The crouch holds longer/deeper, then uncoils over a
shorter interval. Hind drive rolls around a toe anchor, retains rear-leg
extension through departure and delays tuck. A hind-leg audit records local
knee offsets and extension ratios. These changes await contact/visual gates.
Current main checked at 3dd57e18; concurrent Fire Hunt PR #205 remains separate.

V16 source completes and the rear-knee plane check passes for every sampled
walk/rear/flight frame: knees are forward and below the hips in pelvis-local
space. Whole-surface contact remains within tolerance and flight IK goals
remain reachable. The coiled left leg changes from extension ratio ~0.397 to
~0.752 during launch, but hock/toe calibration still needs visual review; the
posed bone toe sits higher than the actual lowest paw surface during roll.
Preserve this source before inspecting exact foot skin ownership and rendering.

### V16 foot ownership diagnostic / V17 source correction
`foot-skin-bounds.json` confirms hind paw ownership spans Y -0.0549 to +0.4313
(~0.486 units) versus a 0.103-unit foot bone. The hard low-Z classification
captured underbelly/tail, causing toe roll to raise the hock excessively. V17
restricts leg rows and low paw ellipses, assigns trailing source to tail instead
of paws, and sculpts the low inter-leg webbing into an arched underside before
skinning. Actual paw rows and original source remain preserved. No faces are
deleted or render pixels masked. Revalidate knee plane, contact, toe roll and
push extension; do not infer quality from V16 floor pass alone.

### V17 failed source gate / V18 underside correction
V17 rear push reaches 0.923 extension ratio (versus 0.752 in V16), but the
source floor gate fails: changing forepaw ownership unnecessarily put low
front geometry on the shin (-0.25638 walk), and unlifted peripheral inter-leg
webbing followed the torso through the floor (-0.24092 crouch). Preserve as
failed source. V18 restores the prior low forepaw ownership, keeps rear-paw
isolation, and sculpts the full unprotected inter-leg underside to a curved
belly contour rather than leaving low peripheral webbing. Paw footprint masks
protect the actual soles; no rendered floor clamping or deleted faces.

### V18 exact failure inspection / V19 paw-boundary correction
Rest-vertex inspection pinpoints the remaining failures: low rear paw inner
edge (X .053/Y .301) was assigned to pelvis; front edge (X .198/Y .071) fell
just outside the restricted rear row; another low paw point (X .063/Y .275)
was assigned to shin. V19 retains these actual low paw surfaces in the rear
foot group over Y .04–.34, with original lateral threshold, while excluding
midbody and trailing tail. The rear toe endpoint is placed nearer the actual
claw span, and toe roll reduced to 0.32 radians to retain more leg extension.
Fore goals recenter slightly and cycle travel becomes 0.10/0.72 units to avoid
reintroducing unreachable steps after the underside sculpt. V18 remains a
failed floor-gate candidate; inspect-source-floor.py preserves this diagnostic.

V19 regenerated source passes floor tolerance for walk (-0.197478), rear/breath
(-0.197483) and flight (-0.197418). All goals are reachable within 0.000277
units (0.023 native px) in walk and below 1e-7 in other studies. The rear chain
reaches about 0.952 hip-to-hock extension ratio during the push before delayed
tuck. Knees remain below hips; the loaded crouch bends forward. At frames 22–23
the nearly extended leg trails behind, so knee Y may pass behind hip Y without
inverting its bend plane. Do not confuse that normal leg sweep with the old
neutral knee-above-hip inversion. Visual/native silhouette gate remains pending.

### V19 visual review / V20 readable push timing
V19 passes finite/unclipped, floor and reach checks; walk closes exactly. Actual
foot ownership shrinks from ~0.486 to ~0.266 rear Y span, excluding belly/tail.
Game/side motion, bone overlays and eight camera stills are preserved. Review
shows the early wing downstroke hides the corrected hind extension at frame 22.
V20 holds the wing up until phase 0.265, exposing the leg push, then powers the
wing through its first downstroke by 0.365. Body/leg kinematics stay unchanged;
review labels now distinguish hind extension from departure/first downstroke.
This is an authored readability choice, not a measured tiger/dragon timing.

### V20 completed hind-drive review — 21 October

Current source: rigged-block-v20. Motion review and actual-bone overlay are
preserved, together with `before-after-hind-push.gif` comparing V15/V20 at
identical side camera/density/24fps, and `peak-push-comparison.png`. V19 eight
camera stills remain valid for the same neutral source anatomy; V20 only
changes flight wing timing. No final directional animation atlas is claimed.

The incorrect backward/above-hip neutral rear knee is corrected. Paw skin no
longer spans underbelly/trailing tail. Existing source haunches are fuller,
inter-leg underside is arched, rear plants narrower, crouch held/deepened, and
toe drive extends the hip-to-hock chain to ~0.952 of its total length before
delayed tuck. The first wing stroke is delayed so it does not hide the push.
This extension metric describes rig geometry, not a measured physical force.

Checks: every study finite and unclipped; exact walk loop closure; all surface
minima within 0.001 of floor -0.197. Max walking goal error 0.000277 units
(~0.023 native px), rear/breath and flight below 1e-7. Rear knees remain below
hips; forward bend in the loaded crouch transitions to a trailing nearly
extended leg at departure. Numerical receipts are in source-check-summary.json.

The renderer now exposes rear extension before wing takeover, but source
quality is still a motion study: detailed leg/foot/torso shapes and pixel
separation require artistic refinement and owner review. Fire remains a
geometric mouth-alignment jet. Full actions/directions, sustained flight and
overflight, viewport fitting and real C# aerial/mobile Hunt validation remain
outstanding. Nothing here replaces the live boss or marks the creature done.
Previous failed source attempts and diagnostics remain preserved.

## V21 anatomy and wing articulation candidate
Owner rejected V20 rear-foot wedge, short tail, head shape and rigid wing stroke. V21 tapers the reconstructed heel and muzzle, extends the complete trailing tail surface rather than only its center, and gives the elbow recovery flexion with wrist/digit delays sampled from the actual shoulder stroke. Source build completed; visual GPU review pending. Art remains unaccepted and runtime unchanged.


V21 GPU reviews pass finite/clipping/floor checks for all three studies with exact walk closure. Visual inspection still found an apron around the extended rear shin. V22 constrains that source surface toward the lower-limb axis and adds an editable membrane pressure/recovery shape key, keyed separately per action. This deforms the 3D bays between spars; no image warping. V22 visual review pending.


V22 reviews remain finite, unclipped and floor-safe with exact walking closure. The extended foot silhouette still has a low apron, so V23 additionally tapers the actual textured foot surface around the hock-to-toe axis, preserving a wider toe fan. This is a source geometry correction, not a knee-pole or image transform. V23 build completed; render pending. Head refinement remains incomplete.


V23 review complete on NVIDIA RTX 5090: all studies finite and unclipped,
walking loop closes exactly, and minimum surface Z remains within 0.001 of
floor -0.197. Machine-readable values: V23/source-check-summary.json. Longer
source tail, narrower terminal muzzle and revised leg taper are visible; wing
recovery now flexes at elbow/wrist with delayed digits and keyed membrane
pressure. No hosted generation or hardware settings changes.

Visual limits: head still lacks the concept card's sharp horned skull profile;
the rear leg remains too wedge-like in the departure silhouette despite the
surface taper. Do not mark these owner criticisms resolved. Full action/direction
library, final fire, mobile footprint fitting and gameplay integration remain
open. V21/V22 sources, renders and diagnostics are preserved. V23 is the current
review candidate, not accepted final art or a runtime replacement.

## Owner rejection and local topology repair â€” 21 October
V23 still fails the owner screenshots: flat tail, broad black head cap and stretched rear-leg sheet. Exact rest/skin tracing finds head-cap vertices spanning X -0.269 to 0.207 and Z up to 0.267, and body/limb boundary triangles with over 200x area inflation at departure. Proportion squeezing did not repair that topology. V24 replaces those local surfaces with card-textured volumetric lofts and a continuous hind-leg joint surface; original torso/jaw remain. Tail has eight attached segments and a rising curved taper. Wing span increases from 1.70 to 2.24 model units and trailing bays deepen (larger membrane area). These are artistic proportions, not measured aerodynamic lift certification. Source built; visual review not yet performed. The legacy wing-removal mask also needs to exclude authored anatomy before review; V24 is preserved as an intermediate.


V25 excludes authored anatomy from the legacy wing-cap removal mask. V24/V25 still retain a low original underside which penetrates the deep crouch; both are preserved as failed-contact intermediates, not approved sources. V26 restores the prior underside arch alongside the new retopology. All sampled V26 vertices clear floor -0.197 (minimum -0.195541); source geometry is built, GPU silhouette review pending. Larger wings use a shallower near-ground downstroke clearance bound. No aerodynamic simulation is claimed.


### V26 inspected correction candidate

Actual RTX 5090 reviews: all 148 samples finite and unclipped, zero walking
loop position error, no surface below floor -0.197. Minimum Z per study:
walk -0.195540369, rear/breath -0.195513263, flight -0.195522904.
Numerical audit: V26/source-check-summary.json. No hardware settings changed.

Matched V23/V26 close-ups are preserved at
V26/anatomy-review-v1/before-after-defects.png. Identical source density,
camera and nearest-neighbour enlargement; head uses walk frame 0 side crop
(43,70,83,106), rear departure frame 22 side (88,90,120,127), tail departure
frame 22 side (103,71,169,103), wings flight frame 38 game (35,10,159,135).
No retouching or pose-specific image repair. The old black head slab and rear
triangular sheet are absent in those inspected poses; tail now has a curved
volumetric taper. Continuous authored rear-leg surfaces replace the failed
original reconstruction; card-derived texture UVs are transferred locally.
Source anatomy replacement counts are in anatomy-rebuild.json. Larger wing
span is 2.24 vs 1.70 source units, with fuller membrane bays and the existing
articulated recovery/pressure motion. Lift is art-directed, not simulated.

Owner acceptance is pending. No runtime replacement or completed creature
claim. Final fire, complete actions/directions and C# aerial mechanics remain
outstanding. Native grounded source widths at 80 px/model unit range 62–127px
in the eight actual camera views; this is NOT yet the final 320/390px viewport
fit. Preserve source proportions when selecting final export density, and
revalidate mobile readability rather than stretching or cropping frames.

## V27 first wingbeat timing â€” owner follow-up
Owner responded 'yes perfect' to the V26 anatomy/larger-wing correction and requested removal of the short jump-before-flap pause. Preserve that anatomy approval separately from completion of the full creature/action library. V27 advances the first power-stroke start from phase 0.265 to 0.205 (about five source frames / 0.21 seconds at 24fps), immediately before altitude starts rising at 0.22. The following cruise beat follows the advanced stroke continuously. Paw release, jump trajectory and anatomy stay as V26. Source built; visual/contact revalidation pending.


V27 local RTX 5090 review completed. All 148 samples finite/unclipped,
walking loop closes exactly, whole source clears floor -0.197. Jump root
trajectory is byte-identical to V26; maximum non-wing bone delta is zero.
Launch stills at timing-review-v1/launch-sequence.png show the wings already
entering the downstroke as the rear legs extend and body rises. Full-speed
motion review saved at motion-review-v1/takeoff-flight-land.gif. Approved
V26 anatomy is unchanged; owner review of this timing adjustment is pending.
No runtime changes or completed full animation-library claim.

## V28 sustained flight and separate landing
Owner approved V27 takeoff timing ('perfect') and requested continuation. V28 adds a 16-frame unique sustained-flight cycle plus closing sample, with periodic torso/tail follow-through, tucked paws and the approved articulated wing anatomy. Landing is separately authored/sampled over phase 0.64â€“1 of the approved sequence, including flare, forepaw catch, rear catch and settle. All three prior clip vertex samples are byte-identical to V27. New flight cycle closes exactly, both new actions finite and above floor; GPU visual review pending. Loop GIF playback excludes the redundant closing sample to prevent a duplicate-frame pause. Sources retain that endpoint for closure auditing. Separate actions do not yet establish seamless flight-loop entry/exit transitions or C# flight gameplay.


V28 RTX 5090 visual review completed: all five actions finite and unclipped;
no floor penetration, exact flight/walk endpoint closure. New-action keyposes
are in V28/new-actions-keyposes.png; full-speed previews are
motion-review-v1/flight-loop.gif and landing.gif. Source closure sample is
excluded from looping GIF playback. Continuous surfaces retain approved V26
anatomy; approved V27 source takeoff remains vertex-identical. Landing visibly
flares wings, catches forepaws then hindpaws, and folds into standing. Flight
loop/landing owner review pending. Entry/exit blends, final fire, remaining
full directional library, viewport/mobile validation and gameplay integration
are still outstanding; these actions alone are not a finished flight system.

## V29 continuous flight lifecycle
Owner requested continuation after V28 flight/landing previews. V29 adds a 148-frame connected sequence at 24fps: approved takeoff, 12-frame source-control overlap into cruise, several sustained wingbeats, 12-frame overlap into landing, then flare/catch/settle. Blends are evaluated before FK/IK and skinning. Delayed shoulder/wrist/digit/membrane/tail controls sample the same continuous timeline, including across boundaries. Tail sway mixes sine/cosine components rather than interpolating wrapped phase numbers. Prior five clips remain vertex-identical to V28; connected takeoff through frame 34 is also exact. Transition controls are continuous at frames 34/46/104/116, finite whole sequence and floor-safe. Receipts: V29/transition-audit.json. GPU visual review pending. This is an editable source motion demonstration, not a C# aerial state machine or final spritesheet.


V29 RTX 5090 rendered review completed. All six clips are finite, unclipped
and above the floor; walk/flight loops still close exactly. Six-clip source
summary: source-check-summary.json. Connected sequence lasts 148 source
frames at 24fps; preview: motion-review-v1/flight-sequence.gif. Twelve selected
actual game-camera frames across both joins and landing are preserved in
flight-transition-keyposes.png. The wingbeat continues through each overlap,
then the landing flare opens into the fore/hind catch and wing fold.

Prior five clips remain exactly unchanged. Maximum adjacent-frame vertex
movement at the four join boundaries is 0.0652/0.1740/0.1032/0.2152 model units,
below the sequence's ordinary wing-motion maximum 0.4193. Maximum paw goal
error is 7.46e-8 model units. These numerical bounds support continuity/contact
review but are not a claim of owner visual approval. No gameplay changes.
Final fire breath, remaining actions/directions, mobile export-density fitting,
actual Hunt validation and explicit C# aerial state integration remain open.

## High launch and arena fire flyovers â€” owner addition, 21 October
Owner requested a powerful jump out of the viewport, flyovers, and downward arena fire. Canonical creature scope updated in the same branch. V30 aborted on a mouth-direction Matrix/Quaternion operation; its partial folder is preserved. V31 built all nine source actions with actual editable Blender object-level path/yaw/bank, high launch, downward-breath flyover and two-pass arena sequence. V32 lowers the head and opens the jaw before ignition rather than aiming only as fire ramps up. Six previously reviewed actions are retained. New source path is art choreography, not C# damage, targetability, collision or invulnerability. Proposed lane warnings and lingering ground-fire duration are preview proposals, not finalized balance.

References revisited before the materially new aerial attack: Framestore https://www.framestore.com/work/how-train-your-dragon (skeletal/muscle-driven weight and real-animal-informed flight), Weta https://www.wetafx.co.nz/films/case-studies/smaug (skeleton-to-motion construction). Written production accounts/stills inform original choreography; no film models or clips copied or downloaded. Existing ash ground tile reused from the current game atlas in the fixed-camera arena art study. Native 390px-wide preview uses 52 px/model unit; character scale is fixed across launch and passes. GPU review pending.


V32 first arena render confirms full offscreen departure and two grounded fire passes, but uniform tube shading reads as a solid beam and sparse fire stamps as separated spots. Preserve arena-review-v1 as first evidence. Renderer revision adds moving world-space heat/turbulence and pixel breakup plus dense ground-fire stamps; second render pending. Source model/rig/path unchanged.


### V32 arena review v2 result

Fixed-camera native 390x520 RTX 5090 render is preserved at
V32/arena-review-v2/aerial-fire-attack.gif, with every native frame PNG and
review.json. All 279 source frames finite; minimum whole-character world Z
-0.195522904 (floor -0.197). Geometry is fully outside the visible arena for
116 frames across high departure and offscreen approaches/turns. This is
intentional framing, not a clipped sprite export. There are two separate fire
lanes, with 74 rendered breath frames; every calculated strike ends exactly on
ground Z -0.197. Head aims down before ignition (worst firing direction Z for
strength >0.1 is -0.6295). Model scale is fixed; no image shrinking to fake height.
All six earlier motion samples remain exactly unchanged from V29.

V2 fire uses world-space moving heat/turbulence and native pixel breakup;
continuous ground stamps linger for a proposed 60-frame preview lifetime.
This remains an art/VFX study, not approved final fire or gameplay balance.
The GIF includes a 600ms end pause to separate preview replays; source action
has no added hold. Earlier uniform-cone render remains in arena-review-v1.

Source includes independent high-launch and fire-flyover actions plus the
complete arena choreography. Object path/yaw/bank and rig/membrane actions
are editable, baked at 24fps with linear key interpolation. Runtime sprite
exports must use local/followed cameras and carry world movement metadata;
never pack the empty/offscreen arena frames as missing character sprites.

Owner review is pending. Current game still uses grounded Ashfang behavior;
there is no C# altitude state, flyover damage/hazard lifetime, aerial immunity,
targetability or collision change. Lane telegraphs are visual proposals.
Remaining complete actions/directions, mobile Hunt validation and final fire
remain open. Canonical addition records the new requested scope, not shipment.

## V33 correction: overhead shadow attack and exponential nose-up climb
Owner clarified that body must stay above screen during flyovers: only ground indication, moving shadow and arena fire should be visible. High launch now pitches nose-up to about 74.5 degrees with trailing tail pitch and uses normalized expm1 height after push-off. Visible climb height steps increase strictly (first 0.06222, last 1.12273 source units, 18.04x ratio) instead of easing out before leaving. Pass altitude remains 10.5 source units; head aims nearly vertically down before ignition. Existing six grounded/ordinary-flight actions remain vertex-identical to V32. All nine actions finite and above floor. Renderer casts actual posed geometry onto the ground for a winged shadow, instead of a small oval; warning path follows calculated strike positions. Canonical direction updated. GPU fixed-camera visual and zero-visible-body pass audit pending.


V33 fixed-camera RTX 5090 render completed: arena-review-v1/aerial-fire-attack.gif.
All 279 frames finite and above floor. Actual raster audit reports ZERO body
pixels in the visible arena during every frame 79–210 (both passes and turn).
The body is physically above the camera, not suppressed by a renderer toggle.
A vertical projection of the posed geometry casts a readable dragon-shaped
shadow with moving wings. Lane warnings use predicted actual mouth-ray ground
strikes. Source density remains 52px/unit, no actor scale trick. Rising launch
pitches to ~74.5 degrees and height steps increase exponentially until out of
view. The six earlier reviewed animations remain vertex-identical.

Ground fire and warnings remain preview art, not implemented C# hazard or
balance. Owner visual review pending; current grounded runtime unchanged.
Final source-to-spritesheet export, remaining action/direction library, mobile
Hunt validation and aerial encounter integration remain outstanding.

## V34 current Hunt portrait fit â€” owner screen reference
Owner requires current-game viewport fit and unchanged player size even when its model changes. Native screenshot canvas crop [40,4,480,959] is 440x955. Current arena-camera.js translates without zoom; arena.js uses DPR only for backing resolution. Current mage.N.idle atlas visible body is 39px high. Fit settings are in references/current-hunt-fit.json. The user screenshot and derived fit composites stay LOCAL ONLY and are Git-ignored: automatic approval review rejected public publication without explicit permission. No screenshot pixels are included in this checkpoint.

Native density56 px/model unit, fixed camera, launch row300, HUD protection152px and bottom24px. Fire/shadow tracks retarget190px down toward player row. Object-level world offsets are keyed in V34. High/overhead altitude increases to17 source units for the taller camera. Six earlier ordinary actions are vertex-identical; all nine actions finite and above floor. Fit preview preserves native reference/player/HUD pixels without resizing and will be a local composite, not a capture of implemented gameplay. GPU fit and visible-body audits pending. Canonical unchanged-player-size constraint updated.


V34 local Hunt-fit render completed on RTX 5090. Local-only review path:
V34/hunt-fit-review-v1/aerial-fire-attack.gif; all 279 native PNGs and
fit-audit.json remain local. The output uses the supplied canvas crop at
440x955, no resampling. Player reference ROI is pixel-identical at the start;
HUD region is pixel-identical in every PNG. Mage atlas body remains 39px high.
Ashfang grounded bounds are 64.712px wide (~14.71%, approximately the Tier-I
15% lower target); no per-frame scaling. All nine actions finite/floor-safe;
six previous ordinary actions unchanged. Actual raster audit confirms zero
visible body pixels during overhead passes. Fire/shadow tracks now cross
near the player's unchanged portrait-screen row.

This is a screenshot composite for art/scale review, not implemented gameplay
or a live Hunt capture. Screenshot and derived composites are deliberately
Git-ignored following automatic privacy review; they have NOT been published.
The source rig, path metadata, numeric fit settings and implementation receipts
are checkpointed publicly without screenshot pixels. Actual responsive HUD,
C# aerial integration, final VFX/actions/directions and mobile runtime validation
remain outstanding. Do not treat local screenshot compositing as live validation.
