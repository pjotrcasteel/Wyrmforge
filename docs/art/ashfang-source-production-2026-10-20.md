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
