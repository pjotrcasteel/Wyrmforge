# Wizard walking staff v019 — visual review only

**NOT APPROVED — do not merge, import, or replace game sprites.**

This candidate continues v016B on a separate preview branch.

- Keeps the existing shared 64×80 2.5D Wizard master and painterly cloth/head UV.
- Replaces the far-outside grip with a closer, chest-height right-hand hold.
- Solves the right elbow below/behind the grip and links both sleeve segments.
- Renders a single *straight* rigid staff shaft, rather than bending the upper segment.
- Gives the staff a planted support interval and a modest lifted forward swing in the 16-frame gait.
- Preserves the body, hat, robe damage, leg gait, lighting-independent sprite dimensions, and all eight directional cameras.

## Verification

- 21/21 focused Python tests passed on the candidate source.
- All 16 frames rendered in eight directions at native 64×80 with no image clipping.
- The flame remains visible from all eight directions.
- **Known issue:** from the far-side W camera the robe can fully occlude the shaft for some frames. No camera-specific hand flipping or staff teleporting was introduced to conceal that. This is not approved until the owner accepts or rejects the trade-off.
- The older v018 overly sideways-leaning staff experiment was discarded during visual review and is not part of this preview.

## Real asset previews

- [Four key poses in S, SE, E, W](review-v019-staff-grip-4poses-NOT-APPROVED.png)
- [16-frame animated S, SE, E, W review](review-v019-staff-grip-motion-NOT-APPROVED.gif)

The visual gate remains with Pjotr. Draft PR #471 and the live game are unchanged.
