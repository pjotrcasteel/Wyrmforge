# First-hunt survival — 0.0.92

This is the second small step in the satisfying-first-hunt milestone. Version 0.0.91 reduced opening crowd pressure and strengthened early Arcane/Frost choices. Version 0.0.92 prevents simultaneous contact sources from adding together, then gives a hunter 0.35 seconds to escape after losing health.

## Damage contract

- Begin each active simulation frame by reducing the protection timer; menus and ended runs do not advance it.
- Collect the strongest raw damage request across enemies, Wyrm attacks and hazards; resolve it once before checking defeat.
- Contact sources produce periodic hits worth 0.35 seconds of their existing damage-per-second rate. A chaser therefore hits for 6.3 base damage. This avoids unintentionally dividing sustained contact damage by seven when adding protection. Brief contact is consequently more costly than one old 0.05-second tick.
- A simultaneous heavy attack remains the strongest hit regardless of source order. Attacks during an existing protection window are ignored and do not extend it.
- Winter Shell, Ice Armor, Charged Scale and build/encounter reductions remain in the damage path. Only actual health loss starts the new protection timer.
- A genuinely lethal single attack remains lethal; this is protection against stacked damage, not a minimum-health rescue.

## Matched simulations

The same 352 runs used for the 0.0.91 after sample were repeated with only the buffer change: seeds 9100–9102 for established builds and 9100–9103 for fresh hunters, four heuristic personalities, 0.05s ticks and a 180s cap. Fresh hunters have no Atlas points and the base Forge unlock pool. All begin with Arcane Orb I; school preference affects choices.

| Cohort | Runs per version | Reached level II, 0.0.91 → 0.0.92 | Cleared a trail, 0.0.91 → 0.0.92 | Time limits, 0.0.91 → 0.0.92 |
|---|---:|---:|---:|---:|
| Established landscape | 144 | 144 → 144 | 144 → 144 | 61 → 71 |
| Established portrait | 144 | 137 → 143 | 126 → 136 | 15 → 17 |
| Fresh portrait | 64 | 28 → 47 | 12 → 29 | 0 → 0 |

No decision failures. All 64 fresh-agent runs still ended in defeat eventually; 29 now reached at least one route reward. This is progress toward an opening that permits a build to start, not proof that the full first hunt is balanced. Time-limited runs are unfinished and do not count as wins. Agents lack human spatial reasoning and cannot establish fun, intuition or perceived fairness.

## Verification

Seven regression tests cover 50 overlapping enemies at 10 HP, zero-time contact safety, maximum damage regardless of iteration order, expiry without extension, single-source sustained damage at 0.05/0.025s ticks, paused timers, Winter Shell, and lethal-hit clamping. The overlap test uses the public simulation Tick path.

Repeat the commands documented in [0.0.91](opening-balance-0.0.91.md) on both versions for matching reports.

## Remaining milestone

The first-hunt milestone is complete when a fresh hunter can understand danger, make and use a meaningful early build choice, recognize a later payoff, and finish with a clear next goal. These releases improve survival; later encounter difficulty, comprehension and reward payoff still need focused passes. Preserve the map, Atlas web and artless mobile presentation.
