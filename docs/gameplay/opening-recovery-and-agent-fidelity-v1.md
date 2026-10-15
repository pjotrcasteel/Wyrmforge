# Opening recovery and headless-agent fidelity

## Evidence behind the change
The 240-second fresh seeded cohort had 29 natural deaths and three timeouts, with 0/32 Wyrms reached. Increasing the **same 32 seeds** to 600 seconds yielded 32 natural deaths and 1/32 Wyrms reached, average 4.38 route completions, and minimum health of zero. The root cause is survival attrition, not a short benchmark horizon.

## Game change
- Each actual, unlocked health cache in the opening depth restores **16% of maximum health**, increased from 8%. It remains 8% at depth two and beyond. This is **not passive regeneration**: the mage must survive until the Surge phase opens the cache and physically reach its location; only one pickup is possible.
- Existing route rewards, Wyrm fights, enemy health and attack damage, barrier logic, movement speed and spell schedulers remain untouched.
- The automated hunter previously ignored available environment supplies, even when severely wounded. It now sometimes deliberately heads toward the nearest **opened** health cache when below 75% health, with avoidance still active. The bot gets no special heal, bypass, or extra information not already in the render snapshot.
- The existing cache already has a location, a visible HEAL glyph/label, and actual collision/open mechanics. This slice makes that affordance meaningful without adding a floating HUD instruction.

## Verification
- Application tests verify no remote collection, no repeated pickup, 16% depth-one recovery, and fallback to 8% on deeper levels.
- Agent tests verify damaged hunters seek unlocked caches but ignore sealed caches and refuse unnecessary healing detours at high health.
- Reuse the 240-second and 600-second matching seeded cohorts, but note that a single small 32-run cohort cannot validate broad balance. Compare to prior green diagnostic commit `b8d8970` and check established 96-run regressions as well.
- Do not merge PR #107 or deploy to main until fresh-hunter feel, real mobile readability and Wyrm balance are reviewed.

## Controlled potency sweep (32 fresh / 96 established matched self-play)

The 240s-versus-600s diagnostic on original mechanics showed 29 natural deaths and 3 timeouts at 240s, and 32 natural deaths at 600s; Wyrm reach was 0/32 and 1/32 respectively. This was a survival gap, not the horizon alone.

With the agent physically pursuing the existing, unlockable recovery cache:

| Initial-depth recovery | Fresh Wyrms at 600s | Fresh extracts | Established Wyrms at 720s | Established extracts |
| --- | ---: | ---: | ---: | ---: |
| Original 8% | 11/32 | 5 | 41/96 | 18 |
| 16% | 16/32 | 6 | 58/96 | 18 |

The dramatic benefit is largely due to honoring in-world recovery. To avoid promoting the top value without balance evidence, a **12% intermediate** is now under matched testing. The change to 8% at depth two and beyond is intentional; enemy damage, run length, Wyrm stats and permanent progression are unchanged.
