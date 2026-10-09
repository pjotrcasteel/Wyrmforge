# First reward payoff — 0.0.93

A small continuation of the first-hunt milestone. Version 0.0.92 added a damage buffer. This release gives the first route reward more time to work before crowd pressure returns to full strength, and names concrete upgrade effects in the existing card/confirmation presentation. No new art, currency, tutorial text or blocking confirmation is added.

## Changes

- Depth one active enemy caps: 8, 10, 14, 22 by trail. Spawn interval multipliers: 1.75, 1.60, 1.30, 1.00. Depth two and beyond retain their original caps and cadence. The first trail is unchanged from 0.0.92; stage-four pressure, kill quotas and phase timing are also unchanged.
- Arcane Orb II leads with +1 pierce; rank III says wider bolt rather than implying another pierce. Fire III names its impact blast, Frost III its freezing nova, Storm III its fork. Earlier Frost choices use freeze durations from the actual ability profile; chain choices expose target counts. Damage and cast interval remain visible.
- Normal accepted upgrades show an icon, name and effect delta for 1.8s in the existing run-moment system. This replaces generic new-spell confirmation prose and also acknowledges ordinary runes/rank-II upgrades. It does not pause play or capture input. Mastery-to-evolution choices retain the existing ceremony.

## Matched mechanical sample

352 runs on 0.0.92 and 352 on 0.0.93, same options/seeds as [0.0.92](first-hunt-survival-0.0.92.md). Four heuristic personalities; established cohorts cover 12 Atlas builds at 1280×720 and 390×700, three seeds each. Fresh cohort covers four school preferences, zero Atlas points and the base unlock pool at 390×700, four seeds each. Maximum 180s; unfinished runs are not wins.

| Cohort | Runs per version | Clear second trail, 0.0.92 → 0.0.93 | Reach a Wyrm, 0.0.92 → 0.0.93 | Time limits, 0.0.92 → 0.0.93 |
|---|---:|---:|---:|---:|
| Established landscape | 144 | 124 → 142 | 90 → 119 | 71 → 101 |
| Established portrait | 144 | 41 → 90 | 26 → 60 | 17 → 42 |
| Fresh portrait | 64 | 0 → 1 | 0 → 0 | 0 → 0 |

No decision failures. Established portrait agents clear the second trail more often, but only one fresh agent does so; no fresh agent reaches a Wyrm. The opening remains too difficult or too poorly handled by these heuristics to declare the first-hunt milestone complete. Agents do not assess UI comprehension or human fun, and the confirmation changes cannot be evaluated by this simulation.

## Checks

The actual spawn path is tested across all four trails. Additional checks preserve deeper pressure and clamp out-of-range stages. Three readout tests compile the shipped presentation helper and check pierce versus wider bolt, profile-derived freeze duration, and mastery effects. Browser checks at 320×568 and 390×844 exercise shipped scoped CSS for HUD separation, bounds and pointer pass-through; they inject a sample confirmation to avoid combat RNG. Screenshots are retained by browser CI.

## Next question

Fresh hunters still rarely get through trail two. Investigate early draft usefulness and the amount of power available before reducing all combat difficulty further. The milestone still aims for understood danger, a meaningful early build choice, a recognizable later payoff and a clear next goal.
