# Arcane Web v0.0.175 — Cryomancer specialization

## Purpose

Extend the first non-Fire school as a functional vertical slice. This is an expansion of the canonical Arcane Web, not a copy-pasted symmetrical Fire tree.

## Playable specializations

**Shattering Cold** grows from the existing *Deep Freeze* mastery. Six nodes progress from small Frost-specific freeze/chill-duration bonuses, to *Arctic Focus* (medium), to *Pale Silence* (major). The total control-duration scaling is capped at ×1.50. It affects only the originating Frost spell's Frozen/Chilled status, not Fire, Storm, Arcane or any hybrid infusion from a different source. Boss-specific status-duration rules continue to apply afterwards.

**Frozen Sanctuary** grows from the existing *Ice Armor* mastery. Six nodes build permanent vitality and damage resistance, ending in *Everwinter Citadel* (major). Its survivability bonuses remain learned when the mage follows another school.

The existing mutually exclusive mastery choice means that committing to Deep Freeze and Ice Armor cannot happen simultaneously. Minor / Medium / Major node costs remain 1 / 2 / 3 points. The 24-point Hunter atlas budget is not changed. Older node IDs and saved builds are untouched.

## Geometry and presentation

- Hand-authored unequal arcs; not symmetric spokes. Preserve six outer school emblems, current minimum node spacing, and existing point/zoom HUD.
- New positions and routed connections were checked against the authored complete wheel, including hybrid bridges. Minimum spacing is at least 90 world pixels, with no path running through a node or intersecting another connection except at shared endpoints.
- Region inscriptions use the same non-interactive engraved labeling as Pyromancer and do not block touch gestures.

## Ownership boundaries

- Main Spell owns base spell upgrades and mutation equipment.
- Research owns discovery and hybrid mutation crafting.
- The Web grants learned school-specific bonuses, without creating additional spell slots or mutations.
- Generic mutation-amplifier sockets remain in the earlier dedicated progression slice (#286). This PR does not grant Cryomancer mutations or pretend unimplemented Frost amplifiers are already playable.

## Verification

- Domain tests: real modifiers; Frost-only Frozen/Chilled status duration; ×1.50 cap; health/defense branch; reachability; mastery exclusivity; school ownership.
- Mobile browser smoke at 320×568 and 390×844: nodes of each tier present; four named Web regions; existing node spacing and clear path assertions still run.
- Full Validate, Browser smoke and WebKit CI should pass before merging. Physical iPhone visual acceptance remains separate.
- Merge dependency: #283 (grand Pyromancer Web) → #286 (working mutation amplifier sockets) → #288 (Immolation real burn damage) → this Cryomancer PR.
