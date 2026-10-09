# Hunter progression and encounter pacing — 0.0.86

The playtest identified fast clear transitions, rewards disconnected from chosen schools, weak relic choices, repetitive trails and an Atlas budget that stopped after two chapter points. A permanent Hunter track connects combat XP, quests, Atlas points and milestone rewards.

## Research and adaptation

| Reference | Observed design | WyrmForge adaptation |
|---|---|---|
| [Brotato — developer description](https://store.steampowered.com/app/1942280/Brotato/) | Short waves with materials and build decisions between waves | Manual Continue after a clear, immediate reward draft, readable next encounter |
| [Halls of Torment — developer description](https://store.steampowered.com/app/2218750/Halls_of_Torment/) | Quest-based permanent progression, distinct worlds, items and ability synergies | Explicit objectives and rewards; relics with different combat jobs |
| [Deep Rock Galactic — Season 01](https://www.deeprockgalactic.com/season-01) | Missions and challenge bonuses contribute to a shared reward track | Hunt XP and quest XP feed one permanent Hunter track; no timed daily tasks |
| [Diablo IV — progression redesign](https://news.blizzard.com/en-gb/article/24140803/conquer-colossal-foes-in-season-of-hatred-rising) | Character and shared Paragon progression have separate roles; XP converts to build points | Separate temporary hunt levels and permanent Hunter levels; latter unlock Atlas budget |
| [Guild Wars 2 — Mastery system](https://www.guildwars2.com/en/news/reimagining-progression-the-mastery-system/) | Account progression opens capabilities and interaction options | A level-reward catalog allows later content unlocks, rather than unlimited flat stat growth |

These are design adaptations, not claims that the games use identical accounting or pacing. No season system, daily timer or extra spendable currency is introduced.

## Current reward rules

- One collected hunt XP becomes one Hunter XP, including XP swept up at a trail clear. Temporary upgrades and trail reward choices do not fabricate XP.
- Hunt XP is recorded once at death, extraction or retreat. Quests bank on death or extraction and reward actual recorded feats.
- Hunter level 1 starts with one Atlas point, accessible after the First Hunt. Levels 2–24 increase the available point budget. Existing higher budgets are retained; a level-up never falsely reports a point already held.
- Levels 5, 10, 15 and 20 each award one relic cache. Three quests also award one-time caches. One cache opens before the next normal hunt and is consumed once. Replay does not duplicate a consumed cache.
- Hunter XP, point allocations, claimed quests and cache balance share `wyrmforge.arcaneBuild.v1`; older saves without new fields remain valid. No historical XP is reconstructed from an older free point budget.
- The first Hunter level takes 40 XP, then thresholds increase by 5 XP per level. Level 24 needs 2,185 total XP. This is an initial testable curve, not a claim of proven fun or optimal grind length. XP beyond the current content cap is retained for future expansion.
- Quests give 30–60 bonus XP and targeted cache rewards. They are supplementary goals, not the sole way to earn Atlas points.

## Encounter identity

| Trail | Combat shape | Reward |
|---|---|---|
| 1 | Scattered skirmish | Guaranteed selected-school draft |
| 2 | Massed horde from opposite edges | School draft + relic cache |
| 3 | Stalkers from alternating flanks | School draft |
| 4 | Heavy mixed assault, led by a Brute | School draft + relic cache |

A three-second spawn lull separates escalation and surge. Existing school effects, route map, rare routes, depth scaling, boss telegraphs and full connected Atlas remain. The Brute insertion changes the fourth trail even at Depth I; direct composition plans still respect their normal depth eligibility.

## Validation boundary

Automated checks cover XP accounting, threshold crossing, unique quest claims, save restoration, maxed-school fallbacks, relic replacement and mobile layout. Seeded self-play checks reveal stalls and balance regressions. Human playtesting remains necessary for relic impact, encounter variety, touch feel and progression pace.
