# Wyrm extraction defense — bounded endgame encounter

## Confirmed gap
The previous run simulation returned to the general-purpose endless enemy scheduler after a Wyrm died. The ritual therefore inherited ordinary enemy arrivals (potentially 22 active at depth one) throughout its ten-second countdown, rather than a deliberate final encounter.

## Implementation
- Wyrm victory transitions to an authored, bounded **ritual defense**. Only an active extraction may spawn enemies after the dragon fight; no hidden spawns during essence selection, at checkpoints, or after the ritual completes.
- At depth one, enemies arrive individually after a 1.6-second grace, at 2.35-second intervals, capped at four living enemies. Depth increases pressure gradually (hard cap eight).
- No new wave starts in the last two seconds. Existing enemies still pursue and damage the mage. Leaving the circle pauses progress and can extend the fight.
- No changes to player health, damage, cooldown, movement, loot, or magic. Normal trail encounters are unaffected. The renderer communicates the finale as **HOLD THE RITUAL**.
- This is a designed last stand, not a guaranteed extraction or invulnerability window.

## Validation
Application regressions cover absent spawns before the ritual, bounded active pressure, no last-second spawns and no ambient restart afterward. Matched fresh and established seeds should be compared to Focus Surge head `02966d0`, with dragon kills distinguished from actual extracted runs. Human readability and perceived challenge on phone are still necessary. Keep draft PR #107 unmerged until confirmed.
