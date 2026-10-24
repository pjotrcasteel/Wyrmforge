# Ashling fire-infused claw attack

Status: attack candidate for owner review; no gameplay or runtime asset replacement. The owner requested fire infusion on the attacking claws after accepting the directional hopping preview.

The new editable animation is a low, planted two-claw rake: prepare and ignite, slash with the right claw, follow with the left, then let the fire fade during recovery. It uses the corrected approved Ashling anatomy and original card-derived texture. The two visual slash beats are animation cues only; they do not introduce two simulation damage events.

Source: `art/source/enemies/ashling/model/local-appearance-002/rigged-attack-v1/ashling-attack.blend`, `attack-samples.npz` and `profile.json`. The action contains 22 frames at 24 fps, returning to its starting pose. Script: `tools/sprite-lab/build-ashling-attack.py`.

Fire is deterministic authored 3D geometry bound to sampled hand landmarks: angular orange/yellow flame tongues on the claws, a hand heat tint, and small rising embers. The flames share the character's depth test so the body can occlude a hand. This uses local CUDA rasterization on the RTX 5090, without external generation or downloads. The effect source geometry, colors, intensity curve and hand landmarks are preserved in `fire-effect-source.npz`; the reproducible authoring script is `tools/sprite-lab/render-ashling-attack.py`.

Initial planted-attack review/export: `art/source/enemies/ashling/exports/attack-eight-directions-v3/`. Superseded as the current review target by the short launch below; preserved for comparison.

- `fire-claw-review.gif`: front and three-quarter attack, enlarged using nearest pixels. The review includes a rest pause and plays more slowly than the 24 fps export.
- `eight-directions-review.gif` and `eight-directions-slow.gif`: all eight true geometry views.
- `attack-key-poses.png`: rest, infusion, first rake, second rake, fade and recovery.
- `ashling-attack.png`: 2816×1024 transparent atlas, eight rows of 22 frames in 128×128 cells. Individual frames and manifests are preserved.

The attack needs a larger cell than the 96×96 movement because the slash extends beyond the locomotion silhouette. Projection and cell dimensions increase together to preserve pixel density; the ground anchor gains 16 pixels on each axis. Runtime integration must respect the per-animation cell and anchor metadata rather than stretching both atlases to the same rectangle.

Earlier candidates are preserved: v1 stopped when its 96px frame clipped the second slash in the E direction; v2 passed the expanded-cell checks but its small flames were visually too thin. V3 widens the tongues, makes the base visibly hot yellow, and brings the infusion forward into anticipation.

Validation: `tools/sprite-lab/validate-ashling-attack.py` independently decodes all frames, checks visible atlas pixels and alpha, palette size, margins, shared per-clip anchors, unmirrored rows, distinct poses, finite source coordinates, floor clearance and exact recovery to the starting mesh. It also checks zero fire at rest/recovery and visible fire in every direction. Passing these checks does not establish owner visual acceptance.

Remaining: owner attack review, death clip, shared layering metadata, runtime integration and in-game validation. No release, merge or deployment is implied by this art checkpoint.

## Owner-requested weighted launch revision

The owner liked the fiery claws and requested a small launch to give the attack weight. Current source is `model/local-appearance-002/rigged-attack-launch-v3/` under the Ashling source directory. Current export is `exports/attack-launch-eight-directions-v2/`. The fire treatment and two-rake structure are retained.

The pelvis loads down 0.065 model units before pushing forward/up; maximum forward offset is 0.15 model units and maximum pelvis lift is 0.095. The leading foot releases first, with three main-strike airborne frames (8–10, zero-based), then the feet catch at frames 11 and 12. Landing compression carries through the second rake. Small staggered recovery steps return to the exact start pose; frame 19 briefly has both feet clear during recovery. These are source animation dimensions, not new simulation movement or damage parameters.

The first launching rig/export is preserved but rejected: the second rake's long claws crossed the floor by about 0.0235 model units during landing compression. The corrected source raises that finishing rake while retaining the body compression. Its evaluated mesh minimum is exactly the -0.5 floor, with zero recovery error. Supporting ankles after landing drift at most 2.98e-8 model units. Foot sole geometry determines the ankle height during toe roll and flight.

All 176 corrected directional frames pass independent validation: 182,627 opaque pixel samples match atlas packing, 58 palette colors, binary alpha, unclipped bounds, unmirrored directions, finite geometry, exact recovery and fire absent at rest/recovery but visible in every direction. Each row has 21 distinct images because the first and final poses intentionally match. No runtime asset replacement has occurred.

`weighted-launch-review.gif` adds a static projected ground grid and a simple grounding shadow to W/SW views, using the exported sprites without modifying their pixels. `launch-contact-review.png` preserves sampled review poses. The shadow and grid are review aids, not baked into the runtime atlas. Script: `tools/sprite-lab/review-ashling-launch.py`. The ordinary fire-claw and eight-direction previews are also included.

The owner subsequently approved the weighted launch with “perfect”. Future generic animation-layer integration must respect its authored leg support/flight rather than blindly replacing the legs with a walk cycle. Simulation authority and runtime integration remain separate pending work. The death candidate is tracked in `ashling-death-2026-10-20.md`.
