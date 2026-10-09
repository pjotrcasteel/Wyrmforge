# Useful opening drafts — 0.0.96

## Change

The first two normal multi-option drafts offer immediate reinforcement: an upgrade to an already learned spell, or Potency/Quickening when the route-school slot has already removed that spell upgrade from the pool. The rule uses the existing Reinforce slot and existing effects; it neither adds a free reward nor changes spell/rune power.

After those two drafts, the normal mix of utility, defence, delayed rules and spell upgrades returns. Route-school rewards still guarantee the chosen school. Unlock filtering and evolution ceremonies retain their existing rules. Single-option rolls do not consume the opening window. No enemy caps, cadence, phase gates, kill quotas, HP, contact damage or XP requirements change.

## Matched sample

208 runs per version at 390×700 and a 180-second limit. Fresh cohort: four school preferences × four heuristic personalities × seeds 9100–9103 (64 runs), zero Atlas points and the base unlock pool. Established cohort: 12 Atlas builds × four personalities × seeds 9100–9102 (144 runs). Both baselines ran against the 0.0.95 gameplay binary before the change. Unfinished runs count as time limits, not wins.

| Cohort | First upgrade, before → after | First trail | Second trail | Reach a Wyrm | Time limits |
|---|---:|---:|---:|---:|---:|
| Fresh, 64 runs | 47 → 47 | 29 → 30 | 1 → 4 | 0 → 0 | 0 → 0 |
| Established, 144 runs | 143 → 143 | 136 → 138 | 90 → 97 | 60 → 70 | 42 → 49 |

No decision failures. Fresh median survival changes from 38.7s to 39.9s; established median survival changes from 113.4s to 146.1s. The fresh improvement is small and no fresh agent reaches a Wyrm. This supports shipping a more immediately useful opening option, not declaring the first hunt balanced or human engagement proven. The agents have limited movement/selection heuristics and cannot judge comprehension or fun.

## Validation and next step

Application tests check both opening drafts across all schools and 50 random fractions, actual application, unique choices, route guarantees and locked-spell exclusion. A separate check confirms that utility returns after the opening window. All 208 application checks pass locally; CI checks the full build, tests, publish and existing mobile browser regressions.

Next, investigate when fresh builds receive their second useful upgrade and what stops them between trail two and the Wyrm. Keep the first-hunt milestone open and use another bounded change rather than a general difficulty reduction.
