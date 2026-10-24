# REJECTED: current human-to-wizard walking retarget

**Artistic verdict: FAIL. Production blocking.** The owner supplied and reviewed a 4-second recording of the generated CC0 human walk on 24 October 2026. The character alternates between standing, collapsing into a deep squat, and lifting a leg instead of taking steps. Hands hang instead of counterbalancing the body. There is no believable contact or weight transfer. The visual has none of the approved Gothic wizard's character identity. Do not describe this as a working walk or a passed animation milestone.

## Observable defects from the owner's recording
- At ~0.25–0.5 s, the torso/pelvis drops close to the ground while the knees fold aggressively.
- At ~0.75–1.0 s, the character rises abruptly with little convincing support-leg extension.
- The collapse repeats at ~1.5–1.75 s and ~2.75–3.0 s.
- The character behaves like a broken squat/kick cycle, not a supported alternating-heel-to-toe gait.
- Shoulder, arm and hand behavior is disconnected from any staff-bearing locomotion.
- Head/body movement does not communicate an elderly, weighted dark-fantasy wizard.

The recorded video is user-provided feedback; its contents are described here but the private upload is **not** committed to the public repository.

## Definitive technical checkpoint
The latest native run for commit `0944e93` (`40129475675`) **FAILED**: 4 deformed-foot-lane failures and 1 pelvis-surface failure. The run preserved original renders and native source as evidence. Even a green pelvis/foot metric would not override visual rejection.

## Required change in approach
**STOP tuning offsets and declaring green tests as artistic progress.**

1. Keep the CC0 human mesh, UV topology and raw CMU source only as reusable inputs/provenance.
2. Treat `build_cc0_male_mocap_blender.py` and its generated retarget as a rejected experiment, not the final actor rig or motion library.
3. Introduce a properly fitted humanoid deform/control rig with original human anatomy, shoulder/hip/pelvis articulation and correctly weighted feet. Capture-to-rig motion needs true rest-pose/bone-space alignment.
4. Validate a *single South-facing full-body walk* at **game scale** with actual foot contacts, support-leg knee behavior, hip movement, grounded spine, believable arm swing, and no deep squat or limb crossing. Review and reject the real full 16-frame render before any subsequent asset generation.
5. Once and only once that is visually accepted, sculpt and animate the approved worn indigo/charcoal Gothic wizard, bent hat, aged face, split beard, layering, hem movement and six colored staffs; deliver complete shared lit-sprite material passes using GPU lighting PR #332.

## Safety of runtime
PR #335 remains **DRAFT / NOT MERGED**. The approved-wizard runtime atlas loader stays disabled without complete visually accepted animation and GPU-light material review. Do not modify Hollowed/Ashling, and do not use the rejected primitive clay wizard as an art base.

This file documents a blocking rejection, NOT a completed fix or a new playable GIF.
