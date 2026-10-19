# Refuge buildings: remove the black-wash regression (19 October 2026)

## Regression and correction

PR #131 used transparent black rectangles with `backdrop-filter: grayscale(1) brightness(.15)` and an elliptical mask over unopened Arcane Nexus, Codex and Hall of Fame. The effect clouds the surrounding painting and does not match the blacksmith's deliberately repainted vacant state.

In 0.0.126 the overlays are gone. The unchanged vacant blacksmith asset remains the base panorama. Arcane Nexus, Codex and Hall of Fame now use geometry-clipped copies of the existing painted panorama with mild saturation/brightness adjustment, restricted to their architecture. The World Gate, roads, sky and neighboring buildings must not be obscured. Clickability still follows existing unlock flags.

## Artwork still required before final acceptance

This is a visual regression correction, **not** the final handcrafted vacant-art implementation. The current closed versions still originate from occupied paintings: window light and people may remain faintly visible, rather than being genuinely painted out. Do not mistake a CSS art treatment for the approved blacksmith workflow.

The required final production follow-up is to create individual, same-dimension (2172×724) *vacant* and *occupied* building art variants for Nexus, Codex and Hall of Fame, with:

- All inhabitants actually removed from closed buildings (including surrounding doorways).
- Window, torch and furnace lighting painted off in the closed image, not filtered by CSS.
- Architecture and adjacent ground pixel-aligned with `refuge-town-vacant.webp`, with no artificial borders or black veil.
- Open variants show the intended warm lights and people, but only when the matching location is unlocked.
- The World Gate remains usable and unchanged, and the existing vacant/open Forge transition stays intact.
- Full-screen portrait iPhone crop and left/center/right swipe reviewed in Safari before calling this art milestone done.

## Validation

Browser tests assert the three initially locked art layers, no old black-overlay elements, accessible disabled hotspots, and restoration when unlocked. CI and real-phone visual acceptance remain separate gates.
