# Ashling fire-infused claw attack

Status: attack candidate for owner review; no gameplay or runtime asset replacement. The owner requested fire infusion on the attacking claws after accepting the directional hopping preview.

The new editable animation is a low, planted two-claw rake: prepare and ignite, slash with the right claw, follow with the left, then let the fire fade during recovery. It uses the corrected approved Ashling anatomy and original card-derived texture. The two visual slash beats are animation cues only; they do not introduce two simulation damage events.

Source: `art/source/enemies/ashling/model/local-appearance-002/rigged-attack-v1/ashling-attack.blend`, `attack-samples.npz` and `profile.json`. The action contains 22 frames at 24 fps, returning to its starting pose. Script: `tools/sprite-lab/build-ashling-attack.py`.

Fire is deterministic authored 3D geometry bound to sampled hand landmarks: angular orange/yellow flame tongues on the claws, a hand heat tint, and small rising embers. The flames share the character's depth test so the body can occlude a hand. This uses local CUDA rasterization on the RTX 5090, without external generation or downloads. The effect source geometry, colors, intensity curve and hand landmarks are preserved in `fire-effect-source.npz`; the reproducible authoring script is `tools/sprite-lab/render-ashling-attack.py`.

Review/export: `art/source/enemies/ashling/exports/attack-eight-directions-v3/`.

- `fire-claw-review.gif`: front and three-quarter attack, enlarged using nearest pixels. The review includes a rest pause and plays more slowly than the 24 fps export.
- `eight-directions-review.gif` and `eight-directions-slow.gif`: all eight true geometry views.
- `attack-key-poses.png`: rest, infusion, first rake, second rake, fade and recovery.
- `ashling-attack.png`: 2816×1024 transparent atlas, eight rows of 22 frames in 128×128 cells. Individual frames and manifests are preserved.

The attack needs a larger cell than the 96×96 movement because the slash extends beyond the locomotion silhouette. Projection and cell dimensions increase together to preserve pixel density; the ground anchor gains 16 pixels on each axis. Runtime integration must respect the per-animation cell and anchor metadata rather than stretching both atlases to the same rectangle.

Earlier candidates are preserved: v1 stopped when its 96px frame clipped the second slash in the E direction; v2 passed the expanded-cell checks but its small flames were visually too thin. V3 widens the tongues, makes the base visibly hot yellow, and brings the infusion forward into anticipation.

Validation: `tools/sprite-lab/validate-ashling-attack.py` independently decodes all frames, checks visible atlas pixels and alpha, palette size, margins, shared per-clip anchors, unmirrored rows, distinct poses, finite source coordinates, floor clearance and exact recovery to the starting mesh. It also checks zero fire at rest/recovery and visible fire in every direction. Passing these checks does not establish owner visual acceptance.

Remaining: owner attack review, death clip, shared layering metadata, runtime integration and in-game validation. No release, merge or deployment is implied by this art checkpoint.
