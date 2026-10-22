# Pyromancer v1: phone acceptance evidence

Date: 23 October 2026. This is a **verification slice**, not a school feature, artwork redesign or game-wide milestone completion.

## Automated evidence

The separate `PyromancerVisualAcceptanceTests` suite drives the **real** WyrmForge UI at 320×568 and 390×844 pixels and captures eight images per browser CI pass:

| Build | Skill-map evidence | Equipped mutation inspector |
| --- | --- | --- |
| Advanced Conflagration: Crown of Ash + Detonation | `pyromancer-major-map-fire-spread-crown-{width}.png` | `pyromancer-major-socket-fire-spread-crown-{width}.png` |
| Advanced Immolation: Heart of the Furnace + Scorched Earth | `pyromancer-major-map-fire-ember-altar-{width}.png` | `pyromancer-major-socket-fire-ember-altar-{width}.png` |

The test starts with valid Fire Web node paths, a level-five core, and the corresponding researched and equipped mutation. It checks the selected major's inspector, a >=44px socket tap target, a valid slot option, a saved mutation binding, and persistence across real page reload. Existing browser checks independently test panning, wheel geometry/spacing and 320/390px UI layout.

All browser screenshots are retained in the normal `WYRMFORGE_BROWSER_ARTIFACTS` directory and uploaded by the existing browser-smoke workflow. **Successful CI proves behavior, not that the art feels grand.**

## Human iPhone pass

On a real iPhone (not merely a desktop-sized emulated viewport), inspect:
1. The two Fire regions' hierarchy at initial and overview zoom: minor, medium and major landmarks must be visually distinct and route lines not misleading.
2. Drag, pinch, recenter, scroll and switch between Fireball, Research and Web without lost touches or sticky scrolling.
3. Navigate to Crown of Ash and Heart of the Furnace using normal gestures; try assigning the mutation, closing/reopening, returning to Town, and relaunching.
4. Start a Hunt: compare Detonation's wider impact and Scorched Earth's persistent burning-ground threat. Core-level damage and Web power should be noticeable without reading numbers.
5. Verify the school-colored Nexus building remains distinct at low/high investment and never paints over NPCs or the Blacksmith.

Record pass/fail with phone model, iOS version, viewport dimensions, screenshots/video and the exact deployed game build. This pass remains **pending** until it actually happens.

## Completion boundary

This PR does **not** declare Pyromancer ready-for-now. Pair its phone evidence with PR #305's seeded Fire progression report; evaluate early/mid/advanced Hunts including death, Wyrm reach, survival and power feel. No new Frost, Storm, Arcane or Fire mutations are part of this verification slice.
