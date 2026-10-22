# Specialize navigation correction — 22 October 2026

Canonical authority: [Town & UX](../canon/town-and-ux.md#arcane-web-wheel--owner-decision-22-october-2026) and [magic/combat](../canon/magic-and-combat.md#six-school-arcane-web--owner-decision-22-october-2026). This receipt records implementation and evidence, not a second specification.

## Owner feedback and correction

The owner’s iPhone captures (IMG_6040–6042) show an unnecessary school strip, a crafted-spell panel taking space from Specialize, compressed nodes and a Web that cannot be panned usefully. The previous static-capture/DOM coverage did not validate that interaction. Do not call screenshot-only verification a touch acceptance test.

- Remove the strip and crafting/socket panel. Disconnect embedded research/equip actions; retain the separate Research facet and existing progression data.
- Use an independent 3200×3200 world with explicit cluster spacing, readable default camera and optional overview. Camera translation can move even when the entire world fits; it is not constrained by a fitted image’s scroll overflow.
- Dragging from a node works; distinguish taps from drags/pinches/cancellations. Coalesce camera writes per frame, preserve world position on resize, clean up listeners on disposal, and keep keyboard navigation.
- Keep six school landmarks, active school north, learned global bonuses, mutation effect requirements, school investment locks, reservations and once-per-visit refund warning. No school switching UI or new balancing/content.

## Reference inspection

- [Grinding Gear Games: Path of Exile overview, Passive Skill Tree](https://www.pathofexile.com/game): a large connected specialization world, recognizable major landmarks and meaningful class starting areas. Transfer hierarchy, cluster spacing and traversal; no copied assets, nodes or class mechanics. The official interactive tree response exceeded the retrieval size limit, so its behavior is not claimed as observed through that failed fetch.
- [MDN: touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action) and [pointer cancellation](https://developer.mozilla.org/en-US/docs/Web/API/Element/pointercancel_event): browser gesture ownership must be declared before input starts; pointer cancellation must never be interpreted as a tap. Use local map gesture ownership without disabling page scrolling outside it.
- In-game materials and sigils remain those of the approved Nexus/Fireball and Refuge. No generated or replacement artwork.

## Validation status

Implementation evidence is from `a1507c5691219b41968db9685255741ab27b14b2`. The subsequent test-only correction at `1ce287f2e6904dd3e19d4dcc7dcc04352af98b9a` awaits town diagnostic readiness in an evaluation; production game code is identical. Playwright’s polling helper treats a Promise returned by an async predicate as truthy, so the former async predicate could finish before its condition was true.

- [Validate #1002](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39763928882) passed: Release build with zero warnings/errors, Web publish, 357 Domain tests, 606 Application tests, 339 JavaScript tests, 7 collector checks and 19 Sprite Lab checks, atlas checks and balance/portrait samples.
- Four camera behavior tests pass locally: node/background dragging including the fitted overview, tap/drag/cancel separation, anchored pinch and wheel zoom, and listener cleanup. These execute the camera module rather than checking source strings.
- [Browser #1074](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39763928889): all Arcane Web cases passed, with 111/112 cases passing overall. The sole failure was a null diagnostic value in the separate TownV2 test, corrected by awaiting readiness and returning the qualifying diagnostic object in one browser evaluation. No town rendering source changed in this correction.
- Actual Chromium touch input at 320×568 and 390×844 starts on the real `fire-1` node, pans the camera without selecting the node or scrolling the document, then a subsequent tap opens details below the map. Minimum node center separation is at least 90 world pixels. The removed school/crafting panels are absent; camera controls retain 44px targets.
- Existing orientation, shared budget, saved reservations and inactive-school refund-warning/cancellation cases pass. Browsing a landmark never switches the school. Physical iPhone/Safari acceptance remains an owner playtest after deployment.
- Reviewed real game captures from the tested build: `specialize-readable-{320,390}.png`, `specialize-inspector-{320,390}.png`, `arcane-wheel-start-{320,390}.png` and `arcane-wheel-storm-sector-390.png`. Captures show the approved bronze/masonry materials, open map area and separated paths; they are not treated as proof of touch interaction.

Final full rerun at `1ce287f2e6904dd3e19d4dcc7dcc04352af98b9a`: [Validate #1015](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39766012017) and [Browser #1087](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39766012128) both passed. All 112 browser cases passed, including the two phone touch cases and the corrected town readiness test. The final documentation commit changes only this receipt; the tested game and tests remain identical.
