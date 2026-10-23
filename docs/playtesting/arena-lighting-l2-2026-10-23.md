# Arena Rebuild V2 — Lighting L2 grounding and depth (23 October 2026)

**Canonical intent:** [Art & Animation / shared lighting foundation](../canon/art-and-animation.md#arena-rebuild-v2--shared-lighting-before-further-forest-asset-production-locked-23-october-2026).
**Predecessor:** [L0/L1 isolated Lighting Lab](arena-lighting-l0-l1-2026-10-23.md), merged via [PR #323](https://github.com/pjotrcasteel/Wyrmforge/pull/323).
**Asset source:** [original Blender/RGBA Step-3 candidates (PR #307)](https://github.com/pjotrcasteel/Wyrmforge/pull/307). Unapproved original art remains separate.

## What L2 adds

- Soft **directional projected shadow**, independent of the tight root-contact/AO shadow. Both are bounded in world units and derive from authored tree height/trunk width and the shared environmental light direction, never canopy alpha or hidden collision. Neither paints into the six approved ground material assets.
- Explicit render order: **actual approved ground → all projected shadows → all root contacts → sprites sorted by world-space foot Y → shared lighting → optional debug guide**. A shadow from a later tree cannot paint over an earlier tree's visible silhouette.
- A toggle to reveal each sprite's root/foot anchor and intended trunk footprint, distinct from its transparent image edges. Use it to review pivot/scale/sorting mismatches; do not cover defects with environmental filters.
- A source-candidate browser test at 320×568 and 390×844. The dedicated lighting CI workflow attempts to download **the exact original art artifact** from Step-3 run `39959218973` (two generated transparent PNGs) and uses local file pickers to compose the real images over the actual game ground. Tests capture both lit trees and foot-anchor overlay.
- When the external review artifact expires after retention, **the baseline lighting tests remain valid** and the CI logs an explicit warning/skip for the optional tree-art visual test. No original tree image is bundled into the release. Do not mistake a green ground-only test for tree approval.

## Acceptance and remaining work

- On/off comparison restores the original approved material ground **and the original candidate RGBA tree images**, with no blurred precolored underlays.
- Direction of soft cast shadows follows the shared world light direction, while root contact remains near the foot; disable shadow toggle to remove both without affecting materials/collision.
- The debug overlay displays two root pivots at their authored foot Y; the sprite order uses these anchors, **not** image top-left, bottom-left or canopy height.
- **Visual art review still required:** owner must inspect real 320/390px screenshots of both trees against their exact material blends, check root registration/camera perspective and accept/reject individual assets. This is not acceptance of a production lighting engine.
- Native iOS/Android performance, actual C# gameplay state, weather/fog/material-aware shading and fire/Ashfang emitter lighting are future steps. No live Hunt modifications, no old environment assets, no collisions and no changes to `/arena-lab` ground-only behavior.

## Visual QA checklist for reviewer

1. Compare **ground only** with L1 and **trees loaded** with L2, all at the same seed and camera.
2. Check contact shadows at roots and the cast shadow opposite the light; look for overdark ellipses, floating roots, painted rectangles or obvious doubled shadows.
3. Enable root anchors to find exact feet and verify that the lower tree visually occludes upper tree branches when their images overlap, without using invisible physical obstacles.
4. Inspect 320px, 390px portrait screenshots. Are tree silhouettes, exposed roots and spells/actor clearances readable without sacrificing large open combat areas?
5. Reject geometry/alpha problems independently of lighting. More foliage production stays gated until this visual acceptance.

**Implementation status:** L2 is an isolated experiment on a feature branch. Passing CI proves technical functioning only; no claim of physical-device or owner art approval.
