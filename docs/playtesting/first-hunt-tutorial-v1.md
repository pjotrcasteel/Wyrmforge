# First Hunt tutorial v1 — first playable slice

## Scope

Extends the existing First Hunt. No separate tutorial arena, no progression or save changes, and no compulsory dialogue. This slice teaches movement, automatic attacks, the first temporary upgrade, and how to spend the first permanent Arcane point.

## Flow

1. The first Hunt enters normal arena/map flow. Once combat starts, an unobtrusive hint teaches touch dragging or keyboard movement.
2. After movement is observed, the hint clarifies that magic casts automatically while the player evades.
3. After the first combat kill, the hint announces that combat earns a Hunt power. As soon as the first upgrade choice opens, that hint disappears and the choice explains the difference between temporary Hunt power and permanent Arcane Web progress.
4. A successful first choice retires the combat tutorial hint for the rest of the introductory Hunt. Existing choice confirmations and all gameplay rules remain unchanged.
5. On first-Hunt defeat or victory (never abandonment), preserve the existing unlock cinematic. Its button now navigates directly to the Arcane Web.
6. The unspent-point guide explains how to select a reachable node and allocate its route. It vanishes as soon as any point is invested. The Web remains interactive underneath it.

## Manual acceptance (new browser profile / fresh save)

- iPhone Safari portrait: touch drag moves the mage and advances the hint; hint never captures input or conceals the health HUD.
- Desktop: WASD and arrow keys move the mage and advance the same hint.
- Witness an automatic cast, one Hollowed kill, and the first level-up. At the first upgrade choose one card and verify the chosen effect applies; the explanatory text must not reappear for later upgrades.
- Die or complete the first Hunt, then tap **Spend Your First Arcane Point**. The full Web opens on the active school, without visiting a menu dashboard first.
- Tap a reachable node, inspect the route, allocate it, and verify the first-point hint disappears while the allocation persists after reload.
- Abandon a new-profile first Hunt: it must **not** complete the chapter, unlock the Web, or award a point. Subsequent attempts retain first-Hunt guidance.
- Returning experienced profile: no first-Hunt combat hints, no forced Web tutorial, no changed saves.
- Respect 320×568, 390×844, desktop and reduced-motion settings. No new modal overlays or animation requirements.

## Test command

`node --test tests/javascript/first-hunt-tutorial.test.mjs`

This source-level regression test guards the feature wiring; manual/browser checks are still required to prove appearance and comprehension.
