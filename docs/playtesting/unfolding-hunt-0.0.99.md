# The unfolding hunt — 0.0.99

## Presentation

The scrolling chart uses Wyrmforge’s plum/lavender controls with copper for completed travel. Simple SVG ridges, a river and landmark shapes replace the parchment circles. The initial camera shows the entry and reachable trails; the lair is beyond the viewport. Entry and completed-node changes focus the hunter, using smooth advancement unless reduced motion is requested. Selection does not reset manual scroll. The header and bottom reward panel are outside the scroll container. Future landmarks can be inspected without entering them; route availability remains authoritative.

## Campaign and pacing

Six trails replace four. Three opening choices expand to four intermediate destinations, then three final approaches to one lair. Alternating forks give every previous node at least two outgoing choices; intervening stretches keep routes separate, with rare-cache connections providing occasional additional crossovers. All nodes connect forward and all routes reach the lair.

Combat pressure progresses through the existing four profiles as 1, 2, 2, 3, 3, 4. The final sixth trail retains brute reinforcements. Four combat phase windows per trail are scaled by 4/6; three-second breathing rooms remain. Minimum full-campaign phase time is 166s versus 160s previously. Kill quotas scale by 4/6, rounded up: the Depth 1 campaign totals 66 versus 64 previously. Two regular relic-cache stages remain (2 and 6), plus the possible rare cache. More school rewards and two additional recovery opportunities are deliberate benefits of completing the expanded journey; this is not merely a visual reskin.

## Matched cohorts

Portrait 390×700, fresh four preferences × four heuristic personalities × seeds 9100–9103 (64), established 12 builds × four personalities × seeds 9100–9102 (144). Baseline is the isolated 0.0.98 commit; new samples use 0.0.99. The topology changes, so encounters differ even with matched seeds. Both 180s and extended 360s limits are recorded. Counts of trail clears are not directly equivalent between four- and six-trail campaigns.

| 360s cohort | Reach a Wyrm | Defeat at least one Wyrm | Time limits | Median first Wyrm arrival among arrivals |
|---|---:|---:|---:|---:|
| Fresh, 64 | 0 → 9 | 0 → 9 | 0 → 7 | n/a → 176.4s |
| Established, 144 | 83 → 101 | 81 → 98 | 53 → 63 | 160.7s → 167.3s |

At 180s, fresh Wyrm reaches are 0 → 9 and established reaches 83 → 100. No decision failures at either limit. Time limits are unfinished runs, not victories; some agents defeat a Wyrm and continue the run until the time limit. Fresh median survival is 45.0s → 44.6s: reaching a boss improves for a subset, not for every personality. Established extended median survival is 176.8s → 224.9s. The heuristic sample supports a fairer route to a first completed hunt but does not establish human comprehension or enjoyment.

## Validation

Generated-map checks cover 80 seeds, forward connectivity, six-stage completion, alternated forks and committed stretches. Simulation checks cover the pressure ramp, final brute assault and aggregate phase/kill budget. JavaScript checks cover camera bounds, advancement and reduced motion. Phone browser checks cover the off-screen lair, initial focus, fixed header/reward panel, touch targets, concrete reward preview and entry into a connected encounter. Full CI build, tests and publish precede merge. Rendered phone evidence is inspected before release.
