# Boss warning fairness on 0.0.84

Base: e75405e (First Hunt release). Only warning durations change; radius, damage, cooldown and onboarding remain intact.

| Attack | Before | After |
| --- | ---: | ---: |
| Voidweaver phase I target burst | 0.74 s | 1.10 s |
| Voidweaver phase II target burst | 0.50 s | 1.35 s |
| Rimeclaw phase II target burst | 0.76 s | 1.10 s |
| Rimeclaw phase II player-centred pressure | 0.76 s | 1.15 s |

Validation: all 25 hunt tests passed, including four regression cases requiring base movement speed to clear the affected radius after a 0.25-second reaction and conservative 0.05-second tick rounding. Late reactions remain within the danger circle. Twelve fresh simulation probes reproduced the ordinary attack escape geometry on 0.0.84. Voidweaver phase II at 0.25 seconds clears the circle but takes 34 damage across the window from overlapping attacks; this is not a damage-free encounter guarantee. Pressure is covered by the escape-budget regression, not an isolated damage-source probe.

All 168 application tests also passed.

The reusable diagnostic harness comes from draft PR #64, temporarily restored for this validation; it is not duplicated in this PR. Build/test used the supplied .NET 10.0.400 SDK, single-process MSBuild, RunAnalyzers=false and EnableNETAnalyzers=false. Static analysis remains for CI. These values improve open-space fairness; walls, slows and overlapping attacks can still constrain escape. No broad spell buffs or mobile geometry changes are included.
