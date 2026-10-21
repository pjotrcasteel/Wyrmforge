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
- The former small landscape room image has been replaced **in the live Razor component** by a separately authored 480×440 Gothic stone chamber SVG (`wwwroot/art/arcane-nexus/ritual-chamber.svg`). The room intentionally contains no baked-in labels, buttons, Fireball, or sockets.
- Five actual state-driven socket buttons use a reusable metal-rim SVG. Three implemented mutations now have **distinct art assets** (`meteor-heart.svg`, `detonation.svg`, `scorched-earth.svg`) both in the slots and in the research selector; seven planned/non-playable mutations keep their generic icons instead of falsely implying complete art or functionality.
- The approved central Fireball sprite and canonical Fire-school emblem remain unchanged. The art is restrained: one architectural arch, worn stone, two banners, sparse candlelight and one altar. It does not copy the previously generated flattened UI image.
- Art-direction references consulted: [GDC Diablo II: Resurrected art-direction session](https://www.gdcvault.com/play/1027883/-Diablo-2-Resurrected-The) for preserving identity/materials without excessive ornament, and [Godot pixel/viewport scaling guidance](https://docs.godotengine.org/en/4.6/tutorials/rendering/multiple_resolutions.html) for mobile legibility and pixel-sampling. No external art assets were copied.
- Confirm the focused inspector on iOS Safari and examine a true mobile capture before visual acceptance; Chromium Playwright alone is insufficient.
- The functional art layer shipped in PR #188; further visual work remains independent of gameplay controls.

## Validation

- Initial `Validate Wyrmforge` run at commit `c9a4cf6b` passed.
- Browser smoke captures `arcane-nexus-fireball-390.png` as evidence and asserts the room background path, all three mutation assets, and real Fireball upgrading. Latest CI is re-running for the new art; inspect the PR checks before merging.

## Follow-up: locked socket clarity and saved-school access (2026-10-21)

[PR #196](https://github.com/pjotrcasteel/Wyrmforge/pull/196) implements **only step 2** of the follow-up UX series plus the reported disabled-tab repair.

- A sealed socket remains locked, but now moves focus to the existing core-upgrade panel and shows **"Socket N is sealed — Unlocks at Fireball Lv N"** and the need to research the mutation separately. Clicking the core clears that hint.
- The first Nexus tab now shows the character's **own signature spell**, not a disabled Fireball tab or a Fireball preview. Fireball/Pyromancer retains its functional upgrade screen; existing saved Cryomancers get Frost Shard, Stormcallers Chain Lightning and Arcanists Arcane Orb, using the canonical DivineArchetypeCatalog/SpellCatalog spell names and icons. Unshipped school mutation progression is clearly not yet available and does not spend secured materials. Application callbacks still reject other schools spending on or equipping Fireball. Saved school selection is never changed.
- Gameplay costs, level thresholds, save schema, artwork and the other UX ideas (steps 3–6) are unchanged.
- Browser regression covers 390px sealed Lv.3 guidance and the correct signature for legacy Cryomancer, Stormcaller and Arcanist saves, with no Fireball controls or secured-resource spending. Run `Validate Wyrmforge` and `Browser smoke` before merging.

This is a status checkpoint, not a replacement for the canonical gameplay design in `docs/canon/magic-and-combat.md`.
