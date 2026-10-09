# Reliable opening trail recovery — 0.0.98

Depth 1 common combat routes guarantee 10% maximum-health recovery on completion. Rare routes retain their existing 12%. Depth 2 onward keeps its existing random recovery rewards. The existing map badge and route preview display the recovery fraction. Recovery remains subject to existing realm modifiers, caps at maximum health and cannot revive a defeated player. No enemy, XP, draft, quota or phase changes.

The recovery floor is applied after the original random recovery roll, preserving random consumption and therefore the rest of the generated route content for a given seed.

Matched 0.0.97 → 0.0.98 samples use 390×700, 180 seconds, four heuristic personalities per build; fresh seeds 9100–9103 (64 runs), established seeds 9100–9102 (144 runs).

| Cohort | First trail | Second trail | Third trail | Reach a Wyrm | Time limits | Median survival |
|---|---:|---:|---:|---:|---:|---:|
| Fresh, 64 | 35 → 35 | 7 → 7 | 1 → 1 | 0 → 0 | 0 → 0 | 42.4s → 45.0s |
| Established, 144 | 139 → 139 | 102 → 104 | 95 → 97 | 77 → 83 | 50 → 58 | 176.0s → 176.8s |

No decision failures. Time limits are unfinished runs, not wins. Fresh progression does not improve in this sample, so this ships as a consistent completion reward rather than a claim that the first hunt is solved. Heuristic agents cannot establish human comprehension or fun. The first-hunt milestone remains open.

Tests cover generated common/rare recovery over 80 seeds, retained deeper recovery variety, actual healing against maximum health, the cap, no revival and preservation of XP/attunement behavior. Full build/test/publish and existing mobile browser checks run before merge.

Next inspect how players can respond to second-trail pressure and how useful their route-school rewards are there; avoid continuing to lower difficulty without identifying the bottleneck.
