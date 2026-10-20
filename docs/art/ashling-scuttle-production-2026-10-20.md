# Ashling — first local scuttle proof

Status: one-view visual candidate, not an accepted all-direction enemy or runtime replacement. [Draft PR #168](https://github.com/pjotrcasteel/Wyrmforge/pull/168) preserves the sources and progress.

The reference is the original `02-ashlings.png` Fire card. Two entirely local RTX 5090 reconstructions are preserved. The small front-turnaround attempt is unsuitable because of floor geometry and shortened horns. The high-detail hero attempt supplies the current editable mesh and appearance. It has not been silently substituted into gameplay.

The Ashling now has an authored 30-bone deformation rig. Joint placement follows this mesh's asymmetric crouch, not the Hollow skeleton. The thin tail is an explicitly authored mesh extension guided by the card's silhouette, with eight tail controls and a skin color sampled from the existing Ashling texture. Rear cloth uses separate controls rather than stretching between the walking legs. Head carriage is raised slightly for the elevated camera. No hosted generation, subscriptions or hardware settings were used.

The first 16-frame scuttle uses a low pelvis, short alternating support, lifted recovering feet, arm counter-motion and a delayed tail. The loop is sampled from one weighted mesh, with actual source foot markers checked after Blender evaluates the skin. Nearest texture sampling and a fixed 64-color source palette produce opaque native pixels in 96px cells. The review runs at 20 fps. It is a candidate for fast swarm movement; it changes no C# behavior.

The original three-quarter view obscured too much of the face and arms. The current review uses a near-front view (45-degree source yaw relative to the camera), which separates the horns, claws and legs more clearly. Other inspected yaw views are diagnostic evidence, not approved directional exports. The rear and side silhouettes still need their own checks before expansion.

Technical evidence: all sixteen frames are distinct, correctly sized and have binary alpha; no silhouette touches the cell boundary. The first/last evaluated pose difference is exactly 0.0 model units. Maximum tracked stance contact drift is 8.94e-8 model units after authored world travel. These measurements do not certify artistic quality. The stance-grid GIF projects a real ground plane with spacing dividing the stride, so its loop does not add an artificial ground jump.

- [Scuttle animation, enlarged with nearest pixels](evidence/ashling-scuttle-2026-10-20/scuttle-review.gif)
- [Moving ground-contact proof](evidence/ashling-scuttle-2026-10-20/stride-review.gif)
- [Contact poses](evidence/ashling-scuttle-2026-10-20/contact-poses.png)
- [Technical report](evidence/ashling-scuttle-2026-10-20/technical-report.json)

Editable source: `art/source/enemies/ashling/model/local-appearance-002/rigged-scuttle-v2/ashling-rigged.blend`. Raw latents, geometry, UV mesh/texture, earlier attempts and every rendered frame remain alongside it. Reproduce with `build-ashling-rig.py`, `sample-ashling-rig.py` and `render-ashling-scuttle.py`; each output revision requires a new folder, preserving prior candidates.

Remaining: owner visual review of the single-view scuttle, all eight directions, attack and death, anatomy-specific layer metadata and explicit runtime integration. No owner acceptance is inferred from technical checks. Current main has unrelated Refuge work through 0.0.140; this branch preserves it by making no gameplay or runtime changes.
