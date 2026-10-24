# WyrmForge — L3 Gothic night, wet materials, atmosphere and a moving Fireball

Date: 23 October 2026. Builds on merged [L2 PR #324](https://github.com/pjotrcasteel/Wyrmforge/pull/324).
The global near-black night renderer from [PR #325](https://github.com/pjotrcasteel/Wyrmforge/pull/325)
is **carried forward** into this integration, preserving L2 tree registration and contact shadows.
The original [Step-3 tree candidate source PR #307](https://github.com/pjotrcasteel/Wyrmforge/pull/307)
remains unapproved, unchanged and separately editable.

## L3 result / expected behavior

- All live Hunts continue at night, with a shared view-sized darkness mask, a small neutral player visibility allowance and **actual C#-sourced** Fireball/cast/impact, dragon-breath and existing burning-tree lights. Never invent permanent decorative flame sources in live worlds.
- The Lighting Lab at `/arena-lighting` now has an **animated mid-air Fireball** and a separate static torch. These are *review-only calibration sources*. Defaults: **Fireball on, torch off, flight animation on**, darkness 90%, optional wet highlights and local mist on.
- Freeze flight, then scrub the Fireball between its original world-space path endpoints. Airborne sprite, trail and offset ground shadow are visible, and its warm light pool moves with it. Neither sprite nor shadow changes gameplay or collision.
- Toggle independently: Night, original L2 shadows, root anchors, Fireball, torch, flight animation, L3 wet-material response, source-lit mist, and the existing ground seed. Both tree PNGs may be selected locally (nothing uploaded).
- Wet highlights sample the exact `groundFoundationBoard(seed,'trails')` using original **mud (1), paving (2), marsh (5)** material IDs. Only illuminated cells may get restrained, deterministic subpixel-scale glints, capped at 48 per frame. No global colored filter, no alteration to approved material atlas, transitions, or cell content, and no synthetic props.
- Atmospheric haze is **source-local**, faint and bounded; nonilluminated black remains black. Both effects are presentation-only and may be disabled for small-screen comparisons.

## Evidence and acceptance

The dedicated GitHub Action runs actual Blazor/Playwright at **320×568 and 390×844**, saves screenshots for:
1. Night + frozen airborne Fireball only.
2. Night + Fireball + torch.
3. Night + torch only.
4. Night, no emitter (truly near black).
5. Original approved ground with Night Off.
6. Optional original oak/elm PNGs lit by the Fireball and the L2 root-anchor overlay (if the source-art artifact is available).

Assertions include dark ground maximum ≤28/255 without emitters, a >45/255 peak increase with Fireball,
deterministic restoration of frozen frames and approved ground, no legacy assets or physical game objects.
JS tests cover deterministic fireball world positions and bounded wet-material plans.

**Not yet claimed:** Owner acceptance of the exact darkness, corrected individual tree assets, actual native iOS/Android battery and frame pacing, new C# environment-light contracts, or material normals. A passing CI screenshot is a technical gate, not final art approval. The L3 material response currently uses the source-approved board in the Lighting Lab; the live Hunt is on the shared Gothic-night mask but does not have an authoritative wet-cell material contract to add these same glints yet. Do not try to infer that contract from unrelated art masks.

## Next engineering step

Review the six screenshot states on a physical iPhone/Android-sized screen. Tune light falloff and wet highlights without making daylight, then design the **C# portable material/occlusion snapshot** before porting L3-specific glints to live Hunts. Keep all live Hunt gameplay, collision and the ground painter unchanged.
