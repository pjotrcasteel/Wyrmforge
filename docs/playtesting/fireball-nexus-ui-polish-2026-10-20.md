# Fireball ritual — mobile readability checkpoint (2026-10-20)

This is implementation and validation evidence, **not a second design spec**. Canonical requirements remain in [Magic & combat](../canon/magic-and-combat.md), [Town & UX](../canon/town-and-ux.md), and [Art & animation](../canon/art-and-animation.md).

PR: [#188](https://github.com/pjotrcasteel/Wyrmforge/pull/188)
Base: `main` at `3dcd012` when started.

## Implemented in the actual game

- The core remains one authoritative, interactable Fireball sprite with five genuine slots; level, capacity, learned mutation and material counts remain C# owned.
- Upgrade preview uses consistent state-driven diamond pips and always labels the target level, including when the button is disabled.
- Core/socket clicks focus and scroll the live contextual action section into view, so selecting a mutator on a phone does not look like an unresponsive tap.
- Narrow phone composition and visual frames are polished: brighter sockets/connectors, more readable material counts, pixel-sampled existing room art and more consistent text hierarchy.
- The fixed-position build stamp no longer overlays the Fireball upgrade preview.
- The existing 390x844 browser integration case gains assertions for mobile inspector focus, ten next-level pips and build-stamp visibility.

## Integrity / remaining art work

- **No** fake level-3 state, free slot, invented currency or auto-unlocked mutator.
- This does **not** produce the reference's illustrated Gothic chamber. The repository still uses `wwwroot/art/spellcraft-study.jpg` (small landscape source) as the room background, `fireball-ritual-hero.png` as the approved central sprite and the existing common pixel icon atlas. A separately approved reusable background and socket-specific art are still needed.
- Confirm the focused inspector on iOS Safari and examine a true mobile capture before visual acceptance; Chromium Playwright alone is insufficient.
- Keep this PR draft until CI and visual acceptance. Do not describe it as a finished art replacement.

## Validation

- Initial `Validate Wyrmforge` run at commit `c9a4cf6b` passed.
- Latest browser smoke and validation checks for this workstream are pending; inspect the PR checks before merging.
