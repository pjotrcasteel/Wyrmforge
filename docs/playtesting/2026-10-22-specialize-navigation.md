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

Local: 329 JavaScript tests pass, including gesture/camera behavior tests for pan from a node, pan at full overview, cancellation, pinch midpoint anchoring, cursor zoom and listener cleanup. Browser test project builds; full Web publish is blocked locally by the executor’s out-of-process WASM task host and must pass CI.

Pending: full build/regression CI; actual game captures at 320×568 and 390×844; trusted browser touch drags starting on real nodes, no accidental selection or document scroll; minimum node spacing, school orientation, saved reservations and refund warning regressions. Physical iPhone/Safari acceptance remains a separate owner playtest after deployment.
