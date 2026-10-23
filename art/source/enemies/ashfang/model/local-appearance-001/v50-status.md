# V50 head and organic carried limbs — 21 October 2026

Owner accepts the V48 body and rejects the head/straight airborne claws. This
boundary is now recorded in canonical creatures. Research and exact transfer:
[organic performance study](../../organic-performance-study.md). Main a8dbe114
and open PRs checked; no runtime/player/concurrent-session files changed.

Head source is rebuilt with a narrower tapered muzzle, deeper forehead,
repositioned eye slits/brows, nostrils, charcoal facial planes and a closing jaw.
Fangs are smaller and mostly covered at rest. Mouth socket follows the revised
muzzle. Head-review-v2 shows actual three-camera inspection at 500px/unit;
silhouette-review-v1 separately shows native full-body context at 110px/unit.
The first head-detail camera clipped the rear neck edge; v2 is uncropped.

Each paw now has three digits with two skeletal joints each (24 new bones).
Distal paw pads were shortened to let toes articulate. Wrists/ankles rotate
into a carried pose; hocks move in the chest/pelvis coordinate system rather
than global coordinates. Lift-gated curl follows the existing tuck controls,
with separate delayed proximal/distal reactions to the wing signal and small
fore/hind/left/right timing differences. Toes open with the existing landing
reach before contact. Performance is authored in the persistent source; no
gameplay rule changed.

Actual cruise controls: wrist 0.6772–0.9437rad across fore/hind responses,
proximal toe curl 0.5172–0.5828rad and distal curl 0.8286–0.8714rad. The exact
values are authored performance, not measured animal biomechanics. The source
and air-limb audit are editable/preserved. limb-review-v2 compares actual V48
and new limb geometry at 400px/unit, explicitly labelled inspection-only with
the torso omitted. V1's camera missed the source root advance; v2 corrects it.

All nine source motions are finite and floor-safe: minimum -0.195817 against
floor -0.197. Six regular actions render unclipped in game/side cameras. Walk
and flight loops close exactly, including new digits. source-check-summary.json
proves first 1234 core torso/neck/tail vertices unchanged versus V48 in every
sample. wing-preservation.json separately proves all wing and body-armor samples
exactly unchanged. This preserves the accepted body while changing head/paws.

Native full flight/landing review: motion-review-v1/flight-sequence.gif. Head
and limb detail evidence: head-review-v2/head-inspection.png and
limb-review-v2/carried-limbs.gif. GPU receipts identify the local RTX 5090.
No new screenshot composites or external assets were published.

This is a candidate, not owner acceptance of the head or organic performance.
Remaining: visual review at native mobile size and all facings, final fire VFX,
hit/death and complete action/direction export, plus C# aerial integration.
No completed spritesheet, live boss replacement or new combat behavior claimed.
PR #186 remains draft; V49 and earlier evidence retained.
