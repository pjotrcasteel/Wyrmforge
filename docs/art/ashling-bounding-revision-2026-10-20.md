# Ashling — low bounding gait revision

**Superseded review status:** after inspecting the directional result, the owner rejected the leg articulation. This remains comparison evidence. The [research checkpoint](ashling-movement-research-2026-10-20.md) identifies the shared hip/foot lift and missing explicit push-off/tuck poses that need rework.

The owner requested more hopping and a more feral, demon-like movement after reviewing the first grounded scuttle. The previous scuttle remains preserved; it is not treated as accepted movement.

`rigged-bound-v3` replaces walking double support with short alternating bounds. Each half-cycle compresses the pelvis, pushes off one foot, tucks both feet briefly, then lands on the opposite foot. The stance fraction is .32 per leg, leaving brief flight between supports. Body lean and roll, stronger claw reach, delayed cloth and a sharper tail response reinforce the low, predatory movement without changing the creature's anatomy or gameplay.

The proof is still sixteen native 96px frames at 20 fps: two small bounds per .8-second loop. Both feet are airborne in four sampled frames; maximum simultaneous contact clearance is .13238 model units, roughly 13% of the one-unit source height. The evaluated mesh stays above the ground plane (minimum Z -.498856 against ground Z -.5). Loop pose error is 0.0 and tracked support drift is 8.94e-8 model units. Frames remain distinct, binary-alpha and unclipped. Artistic acceptance remains the owner's review, not these measurements.

- [Revised hopping preview](evidence/ashling-bound-2026-10-20/bounding-review.gif)
- [Projected moving-ground proof](evidence/ashling-bound-2026-10-20/stride-review.gif)
- [Compression, push-off and airborne poses](evidence/ashling-bound-2026-10-20/contact-poses.png)
- [Technical report](evidence/ashling-bound-2026-10-20/technical-report.json)
- [Earlier grounded scuttle for comparison](evidence/ashling-scuttle-2026-10-20/scuttle-review.gif)

Editable source: `art/source/enemies/ashling/model/local-appearance-002/rigged-bound-v3/ashling-rigged.blend`. The source includes thirty deform/control bones and the authored tail. Evaluated geometry, actual foot contacts, all frames and historical candidates remain preserved. Rendering uses the local RTX 5090 and existing appearance texture.

The owner accepted this single-view bounding gait ("perfect continue"). The [eight-direction movement export](ashling-eight-direction-movement-2026-10-20.md) now extends the same saved poses to every facing. Acceptance of that full directional sheet remains separate. Attacks, death, shared layer metadata and runtime integration remain incomplete. No live enemy art or gameplay changes are included.
