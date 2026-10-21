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
