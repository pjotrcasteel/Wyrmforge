# V46 repaired dragon motion gate — 21 October 2026

Continues [V45's wing/anatomy evidence](v45-status.md). Canonical art/creature
rules and the original card remain authority. Current main/open PRs checked;
no game/player/concurrent-session files changed. PR #186 remains draft.

The source repair replaces nearest-wing spar weighting, unstable inverse-fold
correction and shoulder-centred membrane fans. Rigid spars follow their own
bone segments; shared membrane boundaries follow wrist, elbow and both finger
knuckles through translation-only membrane controls. Continuous wrist-based
bays avoid loose ribs and huge intermediate triangles. New angular skull planes,
swept horns, brows, cheek spurs, fangs and shoulder armor strengthen the anatomy.
All source generation and GPU rasterization were local on the existing setup.

V42 failed partial fold is preserved, V43 is the stable but incorrectly rooted
fan intermediate, V44 is the rebuilt four-pose review, V45 the 33-state fold
diagnostic, and V46 carries that repaired source through three real actions.

| V46 actual clip | Frames | Minimum Z | Finite / unclipped | Loop error |
|---|---:|---:|---|---:|
| Walk | 24 | -0.195635 | pass | 0 |
| Rear/breath | 40 | -0.195627 | pass | nonloop |
| Takeoff/flight/land | 84 | -0.195633 | pass | nonloop |

Floor is -0.197. Evidence is the saved editable rig, source samples, contact
audits, `motion-review-v1/technical-review.json`, native per-frame renders,
three GIFs and the inspected `motion-contact-sheet.png`. Reviewed key poses in
game and side views. This is technical/motion evidence, not owner appearance
acceptance or finished fire VFX. The geometric mouth jet remains a placeholder.

The V45 dense fold diagnostic also remains finite, bounded and floor-safe in
all 33 states; its GIF shows clay and native texture, labelled diagnostic-only.
Final presentation should not substitute the failed V37 comparison's left-hand
clay for the current source. No screenshot-derived pixels are newly published.

Remaining: owner visual acceptance, plate/material refinement and all-facing
Tier-I scale, sustained flight/landing/aerial-cycle revalidation for this new
source, hit/death and final action/direction export. No runtime integration,
new C# attacks/damage/immunity, or finished spritesheet is claimed.
