# Focused magic: progression and mobile hunt comparison

Date: 2026-10-15. Draft PR #107. This is a diagnostic of the single-primary design, not release approval or a human playtest.

## Changes assessed

Combination definitions now declare compatible primary spells. Frostfire supports Fire Bolt or Frost Shard; Stormglass requires Chain Lightning; Arcane Conduit requires Arcane Orb. Drafts omit unusable combinations and reject stale combination choices after an incompatible focus change. Learning a prerequisite no longer promises a combination on the next draft if the newly focused spell cannot host it.

A normal three-card route draft retains its guaranteed school reward and can offer a ready combination in its Venture slot. An unattuned draft can offer it in Converge. Single-card route rewards preserve the school guarantee. Previously, route attunement could crowd out a ready combination.

The heuristic agents now distinguish the target spell's actual school from the name of the primary its card replaces. They value an active primary upgrade and account for rank loss when considering a pivot. Personality and seeded tie-breaking remain. New JSON metrics record the primary sequence, switch count and peak active-primary count.

## Method

All runs use a 390 × 700 arena, 0.05-second simulation ticks, seeds 9300 and 9301 and all four existing agent personalities. Fresh runs use four school preferences, no passive nodes, fresh Forge progression and a 240-second cap (32 runs per variant). Established runs use all 12 catalog builds with existing 10- or 20-point passive budgets, the factory's default content availability and a 720-second cap (96 runs per variant).

`main` control: f21577e9badc1151677fd7ea3de5c7a0aecf3cfe, including its original multi-spell scheduler and original agent. `focused-initial`: 857c473ba9c91290a2e7c215bb22b4ce81c1730c. `focused-current`: the progression/agent fixes in this report's commit. The control and current variants differ in both scheduler behavior and agent scoring; this comparison does not isolate either variable. The initial/current fresh comparison isolates this progression/agent patch from the initial focused scheduler. Two seeds per build/agent are a small diagnostic sample, not independent estimates of player win rates.

## Results

| Variant | Runs | Mean kills | Mean completed routes | Runs reaching a Wyrm | Wyrms slain | Runs selecting a combination | Extracted | Time capped |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| main-fresh | 32 | 193.97 | 3.50 | 0 | 0 | 10 | 0 | 8 |
| focused-initial-fresh | 32 | 39.50 | 1.53 | 0 | 0 | 2 | 0 | 1 |
| focused-current-fresh | 32 | 84.38 | 2.38 | 0 | 0 | 0 | 0 | 0 |
| main-established | 96 | 762.45 | 8.45 | 33 | 38 | 68 | 13 | 5 |
| focused-current-established | 96 | 174.96 | 4.21 | 3 | 2 | 4 | 1 | 0 |

All 128 current focused runs reported exactly one active primary in every sampled HUD state, and none ended from a failed draft decision. Regression tests separately verify the scheduler with eight learned spells and one automatically cast base spell. Earned volleys, echoes and explicit procs remain possible.

Fresh progression improved from 1.53 to 2.38 completed routes on average after the progression/agent patch. It remains below the old multi-spell control's 3.50. The current fresh agents selected no combinations; the established agents selected one in only four runs. Making ready offers valid and visible does not yet make their acquisition sufficiently accessible.

Established focused builds reached a Wyrm in 3/96 runs versus 33/96 for the control, killed two Wyrms versus 38 and extracted once versus 13 times. This is a substantial regression in these probes. The single-primary ownership rule works, but removing independent spell streams without enough replacement power or coverage makes many builds collapse before a boss. No damage, cooldown, enemy or XP values were tuned in this patch to conceal that gap.

## Release consequence

Keep the gameplay PR in draft. Next balance work should improve the primary's earned impact/coverage and the path to a deliberate combination, then rerun both fresh and established cohorts. Preserve distinct school gestures, larger casts, one primary and visual-only injury. A repeated flood of independent base spells would undo the design goal. Human mobile review is still needed for perceived weight, readability and projectile density.

## Reproduction and evidence

Build `src/Wyrmforge.BalanceLab/Wyrmforge.BalanceLab.csproj` at each listed revision, then run:

```sh
dotnet run --project src/Wyrmforge.BalanceLab/Wyrmforge.BalanceLab.csproj --no-build -- --fresh-hunter --arena-width 390 --arena-height 700 --runs-per-combination 2 --seed-start 9300 --max-seconds 240 --output artifacts/focused-fresh
dotnet run --project src/Wyrmforge.BalanceLab/Wyrmforge.BalanceLab.csproj --no-build -- --arena-width 390 --arena-height 700 --runs-per-combination 2 --seed-start 9300 --max-seconds 720 --output artifacts/focused-established
```

[Compact evidence CSV](evidence/focused-magic-2026-10-15.csv) retains all 288 run rows, outcomes, progression, combination counts and decisions. New primary metrics are blank for older revisions that did not record them. A time-capped run is abandoned by the driver, not counted as a natural defeat or extraction.

Validation for this patch: 257 application tests and 131 domain tests passed; BalanceLab built without warnings. The preceding PR revision passed full CI build/test/publish and browser smoke (runs 38705635866 and 38705637293). Those runs validate the preceding revision; this patch needs its own CI checks. No human/browser gameplay session or deployment is claimed.
