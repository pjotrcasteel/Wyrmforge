# Opening balance — 0.0.91

The opening should give a hunter a chance to earn and use an upgrade before the crowd overwhelms them. This release changes only the first trail spawn pressure, Arcane Orb rank-II piercing, and Frost Shard damage/freeze duration. It does not investigate the parked sudden-death report.

## Matched experiment

352 runs before and 352 after; identical seeds, four existing agent personalities, 0.05s ticks, and a 180s cap. Established cohorts: 12 Atlas builds × four personalities × seeds 9100–9102, at 1280×720 and 390×700. Fresh cohort: four school preferences × four personalities × seeds 9100–9103, at 390×700, zero Atlas points and an empty Forge progression state. Every fresh run begins with the normal Arcane Orb I; school preference guides later choices, not a different starting spell.

| Cohort | Runs per version | Reached level II, before → after | Cleared a trail, before → after | Time limits, before → after |
|---|---:|---:|---:|---:|
| Established, landscape | 144 | 133 → 144 | 110 → 144 | 43 → 61 |
| Established, portrait | 144 | 70 → 137 | 23 → 126 | 9 → 15 |
| Fresh hunter, portrait | 64 | 0 → 28 | 0 → 12 | 0 → 0 |

No decision failures occurred. Time-limited runs are unfinished, not wins.

## School comparison

Established portrait builds, two builds per school, 24 runs per school per version. Values are mean completed route nodes and combat level, not win rates.

| School | Route nodes, before → after | Combat level, before → after |
|---|---:|---:|
| Fire | 0.29 → 1.71 | 3.58 → 8.50 |
| Frost | 0.00 → 0.75 | 1.00 → 2.62 |
| Storm | 0.00 → 1.38 | 1.42 → 6.54 |
| Arcane | 0.00 → 0.62 | 1.25 → 2.71 |

## Interpretation and limits

First-trail pressure was a shared bottleneck: crowd capacity was 22 at depth one regardless of screen size. This release caps only depth-one stage-one crowds at eight and multiplies the spawn interval by 1.75. The second trail resumes the normal cap and cadence. Arcane gains a tangible rank-II upgrade without changing its starting bolt; Frost gains stronger single-target control without granting early mastery novas.

The combined change improves progression in this sample. It does not isolate each buff's individual contribution. Fresh hunters still frequently lose before an upgrade, and established Frost/Arcane builds remain behind Fire/Storm. These agents are simple heuristics, do not reason about screen edges like humans, and cannot measure intuition, enjoyment, or perceived fairness. Results justify a limited first pass rather than a claim that balance is solved.

## Reproduce

Build BalanceLab, then run each command on main at 0.0.90 (with the same CLI additions) and at 0.0.91:

```sh
dotnet run --project src/Wyrmforge.BalanceLab --no-build -- --runs-per-combination 3 --seed-start 9100 --max-seconds 180 --output artifacts/opening-landscape
dotnet run --project src/Wyrmforge.BalanceLab --no-build -- --runs-per-combination 3 --seed-start 9100 --max-seconds 180 --arena-width 390 --arena-height 700 --output artifacts/opening-portrait
dotnet run --project src/Wyrmforge.BalanceLab --no-build -- --runs-per-combination 4 --seed-start 9100 --max-seconds 180 --arena-width 390 --arena-height 700 --fresh-hunter --output artifacts/opening-fresh
```

Regression tests exercise real projectile collision/consumption, rank-I isolation, Frost freeze expiry without freezing neighbours, and restoration of the normal cap on the second trail. Existing encounter tests cover phase gates and route rewards.

Discuss milestones with the user before starting 0.0.92.
