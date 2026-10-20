# Modes, permanent progression and competition

> **Canonical WyrmForge specification · updated 20 October 2026.** Different persistence, fairness and lifetime contracts for ordinary, ranked and Eternal play.
> [Canonical index](README.md) · Only explicitly marked **LOCKED/approved** requirements are commitments. Proposed values, old milestones and drafts are not evidence of shipped code. Verify current `main`, PRs and tests.

## Permanent reward principle

Long-term progression should unlock **meaningful new possibilities** (mutation branches, research, relics, routes, higher Wyrm challenges, cosmetics and knowledge) rather than mainly stacking permanent flat damage. The post-Hunt Forge/Arcane Nexus/Codex should surface visible next goals without making advanced content dependent on starting a campaign. Historical balance and milestone evidence: [long-term progression record](../design/long-term-progression.md).

## 7. Eternal Hunt: persistent frontier, saves, refuges and connected travel

### 7.1 Mode identity — LOCKED

**The Eternal Hunt** is a persistent, player-owned expedition that **never resets at season boundaries**, lasts over many sessions and can become extraordinarily deep. It uses the Living Hunter's Chart, expandable/recognizable regions, earned knowledge, evolving settlements, Wyrm threats, actual route decisions, procedural arenas and long-term magic progression. No leaderboard normalization of earned power here: permanent seasonal spell/research/upgrade rewards and the Arcane Nexus explicitly support pushing to harder frontiers. The all-time board records the **deepest verified conquered frontier**, not visits/reclaim/grind.

**Distinguish**: “never resets” means the expedition/world/frontier and official historical achievements persist across seasons, app restarts and defeat. It does **not** mean that every individual combat/route stays conquered after death, or that recovery has no cost.

### 7.2 Guaranteed milestone refuges + earned outposts — LOCKED

- **Major refuges:** dependable, secure refuge/checkpoint after substantial milestones/regions, cannot be randomly erased by world events, preserve a legal recovery/forward route.
- **Optional outposts:** player discovers, clears, defends and develops existing locations (village, monastery, keep, watchtower), gaining closer checkpoint, merchants, research, supply, earned service access and occasional route shortcuts. Can suffer damage/change hands and be reclaimed; no forever-lost hard softlock.
- Visually reflect states (discovered → secured → developed) through physically appropriate warm lights, roofs, repaired fortification, recognizable signage, inhabitants. No infinite restock/heal loops or endlessly repeatable one-time rewards; terms/costs tunable.
- **Connected refuge travel:** player may fast travel among **previously discovered AND secured AND actually connected/currently valid** refuges, within permissible non-frontier territory. Never jump into unknown space, cross actually collapsed bridge, bypass a required newly dangerous frontier, rewind a committed fork, bypass quest flags or duplicate content. When route state changes, both map and travel permissions update from one graph.

### 7.3 Save-at-sanctuary → launch in town → Continue Eternal Hunt — LOCKED CRITICAL JOURNEY

1. Player reaches **a valid secured sanctuary** and the game atomically checkpoints the **same named/identified Eternal expedition** and its current sanctuary, resources, research state, route commitments, explored and stale knowledge, world event history, RNG/generator versions, flags, rewards and latest verified record.
2. Player **exits/suspends** the app while safely at sanctuary. That does **not** count as ending/extracting the Eternal Hunt, nor does it reset temporary in-expedition state beyond its separately established rules.
3. On the **next launch**, game starts on the usual **town / start screen**, **NOT inside combat, map or sanctuary**. City/Nexus and normal features remain usable.
4. Player chooses **Continue Eternal Hunt**; game safely loads the **same saved expedition at the same secured sanctuary**. Present a calm recovery/continue experience rather than automatic enemy contact.
5. No exploitable retries: reload/Continue repeated times cannot reroll generation, duplicate rewards, refund spent items, undo route commitments, increase leaderboard records or create a second expedition. Persist snapshots atomically/versioned with tested migration and interrupted-write recovery.
6. No real-time off-app world decay. Advancing the world's chronology comes from recorded gameplay events, not background clocks.
7. **Unresolved, not to guess:** leaving the game outside sanctuary; switching to/from town without a legitimate sanctuary save; how freely the player may change an active Eternal spell loadout at town/sanctuary while keeping encounter fairness; cloud conflict behavior. These require a separate explicit decision and safe UX rather than an invented permanent wipe/save exploit.

### 7.4 Death/recovery and score — LOCKED

Death causes **meaningful, bounded setbacks**: return to valid last secured refuge; lose some unsecured cargo or territory, retake endangered road/enemy occupation, absorb a manageable cost. Permanent earned knowledge, world history, safe major refuges, permitted magical upgrades and proven best frontier survive. Players can recover the SAME expedition with no forced restart; no repeated-one-time-loot farm or unrecoverable death spiral. Exact percentage/material/region penalties remain tunable.

**All-time frontier verification:** rank proven **conquered depth**, not briefly seen waypoints, total time, cumulative enemies killed, repeated reclimb of cleared areas, or repeated deaths. Historic verified peaks survive even if current position temporarily retreats. Optional milestones can resolve equal depths.

---

---

## 8. Ranked Seasonal Endless: Expedition and Arena, four-week cycles

### 8.1 The three distinct Endless modes — LOCKED

| Rule | **Seasonal Ranked Expedition** | **Seasonal Ranked Arena** | **Eternal Hunt** |
|---|---|---|---|
| Route/map | Living Hunter's Chart; committed roads, optional scouting, regional threats | No Hunt Map; consecutive arenas, physical exits | Living map, persistent worlds, sanctuaries and travel |
| Challenge | Strategy + survival + Wyrms | Combat adaptation + waves + dynamic arena hazards | Permanent magic power + deepest verified frontier |
| Reset | **Every 4 weeks: new season/board/seed** | **Every 4 weeks: new season/board/seed** | **Never seasonally resets** |
| Seed | **Shared frozen per-season Expedition seed** | **Shared frozen per-season Arena seed** | Persistent versioned world identity; no seasonal reseed |
| Attempts | Unlimited, **best VERIFIED** result counts | Unlimited, **best VERIFIED** result counts | Same ongoing expedition through sanctuary and death |
| Start power | Equal normalized approved catalogue/build/Web budgets | Same equality independently by Arena rules | Earned lifetime power permitted; not equalized |
| Rewards | Seasonal accomplishments → eligible Eternal upgrades/cosmetics | Same, different milestones | Lasting Legacy, research, world services, all-time recognition |
| Leaderboard | Separate season + archived boards | Separate season + archived boards | Separate immutable historic **all-time** board |

**4-week season, separate seeds and independent boards.** Freeze both modes' generator/rules/scoring/legal build catalogue/simulation version at season start; no mid-season FLC/balance mutation of standings. Replays remain reproducible from seed **plus mode + participant choices + frozen rules**, rather than requiring every branch to be literally identical. Players can repeat a seed and learn; content remains legitimate, generated and sufficiently varied through choices and progress. Unlimited official submissions/attempts; only best verified result per player/mode/season is visible as their current standing; weaker later runs cannot replace it.

### 8.2 Scoring philosophy — LOCKED principles, TUNABLE weights

- **Expedition rank** lexicographically by **highest completed region**, then **progress through current region**, then capped **Merit** for distinct meaningful risks: defeated elite Wyrms, optional defense/rescue, earned scouting, rare challenge and world intervention. One achievement per unique objective/run; no re-enter/exit or branch-farming points. Significant advancement outranks bonus-loot camping.
- **Arena rank** first by **waves completed**, then capped **Merit** for unique elite/boss/special combat challenge and safe transformation achievements. Raw enemy kill count, haste/speed and damage avoided must **not dominate**; avoid penalizing tank, control or deliberate defensive strategies. Enemy farming or repeatable hazard exploits award no extra Merit.
- **Eternal rank** first by **deepest genuinely verified conquered frontier**, then distinctive milestones if ties. Time played, briefly scouted depth, accumulated past defeated mobs or recovered/re-cleared route don't count as new frontier. Full-lifetime power is **intentionally legal** here; don't claim identical competitive starting equipment.
- Exact numeric score weights, caps, secondary and tertiary tie-break order, hidden integrity telemetry, UTC season turnover time and exploit remediation are **unresolved balancing/operations choices**. Present primary rank/progress clearly, never substitute a contradictory single arbitrary total.

### 8.3 Season rewards and progression — LOCKED

- Successful seasonal achievements can award **genuinely powerful** researchable/upgradeable mutations, spell options, catalysts, rare Wyrm components, Nexus branches or other permanent gameplay possibilities, not just cosmetic trophies. Players use and improve these in **Eternal Hunt and other eligible non-ranked PvE**.
- Seasonal ranked challenges start from the **same approved normalized power opportunity**: personal permanent stat investments, owned materials, lucky past rewards, origin/Chronicle and seasonal success **do not** buff official ranked starts. Legal build component pool, complexity/socket budgets and allowed passive points are season-defined and available equivalently to eligible competitors.
- Rank titles, seasonal trophies and cosmetic identities may be unique historical status items. **Proposed safety policy:** materially essential seasonal combat unlocks should have reasonable later rotation/achievement acquisition alternatives so new players never face irreversible year-old power exclusion. Whether alternative paths exist, and exactly which participation/performance milestones grant which rewards, need explicit approval.
- No premium shortcuts or FOMO timers forcing casual players to grind 4-week events for essential competitive legality. Repeatable personal learning of seasonal seed is fine; long-term power is Eternal, not Ranked.

### 8.4 Additional gameplay categories — NOT automatically promised

Normal Hunts/Great Hunts remain distinct from these rankings. Earlier Conclave proposals also include optional Artificer's creative challenges and potentially unranked/casual randomized Endless practice. These are **future possibilities**; do not show official tabs or award pools before implemented and agreed. Separate challenges/leaderboards can be designed if warranted later.

---

---

## 9. Conclave, blueprint privacy, official rankings and online integrity

### 9.1 Town-facing UI and recognition — LOCKED

The **Conclave / Hall of Champions** shows separate seasonal Expedition and seasonal Arena leaderboards and Eternal all-time leaderboard, with historic archived seasons. On-screen visuals show meaningful progress (region/depth vs waves), capped Merit, safe accomplishment summary and rank. Player may inspect appropriate run/build metadata but **must not be forced to expose unpublished spell recipes**. Champion's Archive preserves verified historical accomplishments and optional disclosed build versions; Hall of Legends keeps private narrative histories.

A person can select a completed Chronicle persona without changing combat eligibility or past records. Original player alias/consent policies apply, with restricted identity data storage and ability to handle anonymization where appropriate. Only one verified best run appears per seasonal player/mode, with historical attempts available privately if retained under agreed policy.

### 9.2 No client-trusted official scores — LOCKED

**EXISTING as of 2026-10-18 (recheck):** `LeaderboardView.razor` labels public data `COMMUNITY · UNVERIFIED`; `wwwroot/js/leaderboard.js` accepts client-calculated scores and local/pending sync; `services/playtest-collector/migrations/0002_leaderboard.sql` stores nickname, score and version. `RunSummary` exposes score/seed/depth/kills/route information but **not independently verified decision/input evidence**. This is NOT an official ranked verifier.

Official release requires trusted validation, not a relabel:

1. Versioned frozen season ruleset: allowed spell components/catalogue, passive point budgets, mutation/complexity, enemy/arena generator, seed, progression and scoring version.
2. Trusted private verification of full build legalities and no unfair account/story/item advantages.
3. Deterministic replay of player **inputs and authoritative state** on trusted host to recompute accomplishments/score **or** true authoritative online server simulation. Never trust claimed client hits, RNG outcomes, level gains or submitted total. If cross-platform numerical replay is unreliable, do not fake verification; choose a proven server-authoritative model.
4. Event ordering, independent RNG streams, tick/replay scheduling, FP determinism, interruption/continue evidence and replay log size tested at real long-run lengths.
5. Idempotent submissions and reward issuance, best-record replacement rules, anti-bot/rate limiting, retries, abuse reporting, moderation, appeals, consent, identity/retention and historical ruleset immutability.
6. Prize competitions (money) are **not approved** until legal eligibility, fraud controls, territory and official terms exist. Cosmetics/trophies/recognition first.

### 9.3 Privacy and spell originality — LOCKED

- Full unpublished configuration may be submitted **privately** to trusted verifier but is **never required** to be published for placement, prize eligibility or Hall of Champions.
- Public can see opted-in display name/persona, season, rank, mode, progress and chosen *non-sensitive* score metadata. More detailed loadout/blueprint/replay publication requires explicit separate consent/policy.
- Winner may later publish the precise **immutable historic** spell revision, or keep it private forever. A subsequent balance change or blueprint edit does not mutate historic verified record.
- Never expose an enumerable public raw hash of small undisclosed recipe space (dictionary attacks); use opaque identifiers/keyed commitments under restricted storage as necessary. Observable spell behavior can give tactical clues, but private component configuration must be protected.
- Shared identical mechanic composition doesn't grant monopolistic player “patent” rights. Respect published derivative attribution only where legitimate provenance exists. Withdrawal or privacy/account changes should be handled without secretly invalidating past legitimate victories.

---

---

### 16.7 Eternal Hunt safety, save/return flow and verification

- Eternal stays the **same persistent expedition** even after death, season rollover and safe town visits. Guaranteed major sanctuaries are nondestructible recovery anchors; optional earned outposts can be threatened or developed, but losing them does not softlock recovery. Travel between secured refuges requires a real previously discovered, currently connected authorized path and cannot skip Wyrm locks/frontiers.
- **Town startup contract:** at a secured sanctuary the player can suspend the active expedition; save atomically with region/world state, discovered geography, causal events, route commitments, active build/loadout, spent pickups, one-time rewards, boss progress, RNG streams, player recovery point and verified frontier. When reopening the game they see town, **not combat**. Pressing **Continue Eternal Hunt** returns to the saved sanctuary with the same persistent expedition ID; the town is not a second extraction that resets the expedition.
- The death setback is meaningful and recoverable (risk unsecured loot, enemies retaking nonsecured territory, danger increasing) but must not destroy hard-earned permanent research/season rewards or the deepest legitimate frontier already verified. Do not gain leaderboard points from reclaiming already conquered depth, looping cleared roads, rescues or repeatable hazards.
- The exact design of unsafe quit handling, competing writes from multiple devices and applying town-modified loadout to an active checkpoint remains **open**: implement conservative versioned checkpoint policy and ask before shipping undocumented semantics. No inferred real-world elapsed-time punishments.

---

### 16.8 Ranked equality, archival records and privacy edge cases

- Shared 4-week rulesets freeze mode-specific seed, generator, score algorithm, combat legality, available spell components and Web/complexity budgets. Official seasonal comparisons assume **equal opportunity**, not identical player choices. Unlimited retries; display only each person's highest independently verified result; weaker later results don't replace it. Archive each season without retroactive balance edits.
- Expedition ranking = conquered regions then actual current-region progress then capped Merit; Arena = completed waves then capped Merit; Eternal = genuinely conquered frontier then meaningful verified milestones. Damage avoidance and speed are not leading rank axes, so tanks/control and careful play are valid. Farmed kills, forced idle hazards and repeated optional rewards never create infinite score.
- Official service does not trust `RunSummary.Score`, display nickname, localStorage or unverified collector entries. The verifier receives necessary full private build/input/evidence; public only receives consented identity/rank/safe stats. Never publish full unpublished blueprint as a rank condition, and never expose a dictionary-attackable raw small-recipe hash. Tie-breaking, challenge validity, cheating/moderation, replay retention and official critical-fix policy need future explicit implementation decisions.
- Seasonal rewards provide meaningful researched/upgradable powers for Eternal and eligible unranked PvE; they cannot improve *Ranked* initial attributes or selectively restrict the seasonal legal component pool to historic high-performing accounts. Seasonal exclusivity may apply to names/cosmetics/historic titles, not irreversible competitive advantages. Concrete catch-up policy and detailed drop rates are still open.
