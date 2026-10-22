# Ground Materials Lab — continuous touch painting (22 Oct 2026)

Reference: [canonical art & animation](../canon/art-and-animation.md) and [Hunts & world](../canon/hunts-and-world.md).

## Scope
- The existing ground-material brush now fills intermediate positions between pointer events. Fast finger or mouse movement no longer leaves a dashed/stamped path.
- Pointer release includes the final segment; pointer cancellation stops drawing and clears the drag state.
- Each drag still records one undo snapshot. All six approved painted materials, natural-ground seeds, blending, variation and reset tools are unchanged.
- Strictly isolated to `/arena-materials`: no structures, forced paths, props, lighting, collision, enemy logic or regular Hunt generator changes.

## Validation
- JavaScript regression: `node --test tests/javascript/arena-materials.test.mjs`. The new case covers a simulated long fast horizontal stroke without gaps and invalid coordinates.
- CI/test result and physical iPhone finger-drag inspection must be recorded after execution. No real-device acceptance is implied by a passing unit test.

## Follow-up
- Test a rapid diagonal finger drag at medium brush on an actual iPhone, undo once, and compare the approved ground textures under the seeded natural preview.
- Keep any further texture/edge refinements visual-only and incremental; don't import this Lab's standalone ground generator into live arena gameplay before acceptance.
