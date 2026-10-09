# Earlier opening upgrades — 0.0.97

The first two run-level XP requirements are 6 and 10 (previously 10 and 15). Level three onward retains 20, 25, 30, etc. No free XP is granted: all collected XP continues to count toward Hunter progression, including XP spent on run levels. Enemy pressure, damage, route rewards and spell stats are unchanged.

Matched portrait samples compare 0.0.96 with this change: 390×700, 180 seconds, seeds 9100–9103 for 64 fresh hunters and seeds 9100–9102 for 144 established builds. Four heuristic personalities per build. CI now runs these same samples for gameplay PR validation.

| Cohort | First upgrade | Second upgrade | First trail | Second trail | Reach a Wyrm | Time limits |
|---|---:|---:|---:|---:|---:|---:|
| Fresh, 64 | 47 → 57 | 25 → 47 | 30 → 35 | 4 → 7 | 0 → 0 | 0 → 0 |
| Established, 144 | 143 → 144 | 138 → 144 | 138 → 139 | 97 → 102 | 70 → 77 | 49 → 50 |

Fresh median first-upgrade time among receivers drops from 26.2s to 16.8s; second-upgrade time from 42.2s to 28.9s. These are conditional medians over differing survivors, not a paired timing effect. Median survival rises from 39.9s to 42.4s. Established median survival rises from 146.1s to 176.0s. No decision failures. Time limits are unfinished runs, not wins.

The sample supports earlier access to useful choices. It does not prove human enjoyment or first-hunt completion: no fresh agent reaches a Wyrm, so that milestone remains open. Next investigate the pressure and build gaps after the first trail, keeping changes bounded.

Curve boundary checks cover both opening requirements and the unchanged later curve. The application regression verifies that spending 16 of 35 collected XP leaves 19 in the run bar while Hunter progression still receives all 35. Full CI build, tests and web publish pass; mobile browser regressions are required before merge.
