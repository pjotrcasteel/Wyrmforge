Warning: truncated output (original token count: 11852)
Total output lines: 525

# Wyrmforge

## Prototype 0.0.97 — Earlier opening upgrades

- The first two run-level upgrades cost 6 and 10 collected XP, previously 10 and 15. Level three onward keeps its existing costs. Opening reinforcement arrives sooner without adding XP or changing enemy pressure.
- Collected XP still counts in full toward Hunter progression, including XP spent on run levels.
- [Matched portrait samples](docs/playtesting/opening-xp-0.0.97.md): fresh first upgrades rise from 47/64 to 57/64, second upgrades from 25/64 to 47/64. CI records these cohorts for gameplay PRs. The first-hunt milestone remains open.

## Prototype 0.0.96 — Useful opening reinforcement

- The first two normal upgrade drafts prioritise an existing spell upgrade in the Reinforce slot. If route attunement already took that upgrade, immediate damage or cast speed takes its place. Later drafts retain their broader rune pool.
- Chosen-school guarantees, content unlocks, crowd pressure, spell stats and evolution drafts remain intact.
- [Matched portrait simulations](docs/playtesting/opening-drafts-0.0.96.md): fresh second-trail clears rise from 1/64 to 4/64; no fresh agent reaches a Wyrm yet. The first-hunt milestone remains open.

## Prototype 0.0.95 — Compact nickname and side-by-side combat HUD

- The player nickname is a small top-left label with a pencil button. Its editor opens on demand; the nickname persists in a one-year SameSite cookie, migrating the previous local save.
- Shared client/server nickname validation rejects common Dutch/English profanity and simple digit/separator disguises while allowing ordinary names. Existing flagged leaderboard rows are hidden.
- The trail panel sits to the right of player vitals again. Compact spell badges wrap within their own panel, and phase cues follow the actual HUD height.

## Prototype 0.0.94 — Player identity and clean overlays

- Edit the saved player nickname on the main screen. Completed hunts save locally and submit scores automatically with the actual release version; failed submissions retry with their original ID. The board refreshes while open.
- Eight distinct vector spell icons have separate rank badges; evolved spells retain a highlighted border and accessible lineage name.
- Enemy status badges stay inside the arena and clear while paused or ended, preventing them from appearing above upgrade choices. Run depth now renders correctly.
- Leaderboard retry tests and mobile browser checks cover name persistence, vector badges and paused status rendering.

## Prototype 0.0.93 — Use the first reward before the crowd surges

- Depth-one crowds ramp through 8 / 10 / 14 / 22 enemies. Spawn interval multipliers taper through 1.75 / 1.60 / 1.30 / 1.00. Deeper hunts, phase gates, kill quotas and the final trail retain their pressure.
- Upgrade cards lead with the behaviour gained: piercing, a wider bolt, impact blast, freezing nova, forked lightning or the actual freeze duration / chain target count.
- Ordinary upgrades use a compact icon-and-effect confirmation, replacing generic new-spell copy. It appears below the combat HUD, passes touches through, and respects reduced motion. Evolution retains its existing ceremony.
- [Matched simulation results and first-hunt limitations](docs/playtesting/first-reward-payoff-0.0.93.md).

## Prototype 0.0.92 — Time to escape a stacked hit

- Actual health loss grants 0.35s of damage protection. Simultaneous damage uses the strongest source, so overlapping enemies cannot add their contact hits together and a weak hit cannot hide a heavier attack.
- Enemy and Wyrm contact damage is delivered in spaced hits at the existing single-source damage-per-second rate. Contact still kills if the hunter stays inside danger; the grace period freezes during menus.
- Existing wards and reductions remain in the damage path. No text or input-blocking overlay is added; the existing hurt and health-ring feedback responds to each actual health loss.
- [First-hunt survival evidence and limitations](docs/playtesting/first-hunt-survival-0.0.92.md).

## Prototype 0.0.91 — A foothold before the first reward

- The first trail at depth one caps its crowd at eight and spaces spawn batches 75% further apart. Phase timing, kill quotas and later trail pressure remain intact.
- Arcane Orb II now pierces one extra target; rank III retains its wider bolt. Frost Shard hits for 16 instead of 12, with a 0.70s base freeze instead of 0.53s.
- BalanceLab accepts portrait arena dimensions and a fresh-hunter mode with zero Atlas points and the actual base unlock pool.
- [Matched before/after simulation results](docs/playtesting/opening-balance-0.0.91.md) show improvement while retaining the limitations of heuristic agents.

## Prototype 0.0.90 — Damage and critical-health awareness

- Damage briefly colors the player and reveals a nearby health ring. Sustained contact cannot create rapid repeated flashes.
- Below 35% health the amber ring and restrained edge tint persist; below 15% a red broken outer ring remains visible even with almost no health left.
- Critical tint breathes slowly, respects reduced-motion preferences, and leaves the arena centre clear. Paused/ended runs suppress the effects; recovery clears the low-health warning.
- All cues render on the existing arena canvas and cannot intercept pointer input. Regression tests cover damage, thresholds, healing, pause/death, health-cap changes and the shipped mobile renderer/input flow.

## Prototype 0.0.89 — Relic setup and payoff

- Emberheart turns burning kills into spreading explosions; Duelist Lens turns chilled/frozen kills into shattering, slowing bursts. Both scale with spell damage and their school upgrades, with distinct artless fire/frost feedback.
- Relic caches offer a school-relevant power option when unlocked and unowned, alongside survival/mobility alternatives. Route caches use the chosen school; other caches use the strongest learned school. Unlock gates remain intact.
- Results show the strongest burst relic's actual damage, kills and activations; detailed totals survive replacing a relic. These totals exclude passive stat bonuses and damage-over-time, rather than claiming total relic contribution.
- Lightning now triggers generic on-hit relic rules. Vitalstone heals its maximum-health increase only on acquisition, preventing checkpoint swap healing.
- Deterministic regression tests cover dense chains, overkill attribution, status/radius gating, unequipped relics and queued bursts crossing a Wyrm phase break. Simulated runs and agent critiques identify mechanical problems; they are not proof of human enjoyment.

Wyrmforge is an experimental C# action roguelite about shaping a mage, hunting Wyrms, stealing their Essence and deciding how deep to risk a run. Mechanics and architecture come before final art.

## Prototype 0.0.86 — Hunter progression and trail rewards

Collected hunt XP also advances a permanent **Hunter level**, separate from the temporary combat level. Quest claims grant Hunter XP and specific relic caches. Hunter levels unlock one Arcane point each, up to the current 24-point Atlas budget; levels 5, 10, 15 and 20 also grant a relic cache. Home shows the Hunter level and XP; results show XP earned and actual points gained; the quest screen names the next reward. Existing saves keep their Atlas budget and allocations without inventing historical XP. Claims, XP, point budget and unopened caches persist in a single save record.

Trail clears wait for **Continue**. Every cleared elemental trail gives an immediate upgrade draft with a guaranteed choice from that school, independently of the next XP level. Active trail level-ups also guarantee that school. When all school spells and supporting runes are maxed, a school damage attunement remains available. The four trails now progress through skirmish, horde, ambush and heavy assault, with different spawn directions and a final Brute insertion; trails two and four guarantee relic caches.

Relic drafts offer power, survival and mobility roles when the remaining unlocked pool permits it. Relics have concise, numeric effects, including burn, shock and echo rules. Full slots require an explicit replacement that equips immediately; the previous relic stays in the pack for Refuge. Earned XP survives retreat; quest progress banks on defeat or extraction. Developer hunts remain isolated from permanent progression.

[Progression and encounter research](docs/playtesting/hunter-progression-0.0.86.md)

## Prototype 0.0.85 — Mobile game menus

A compact main menu replaces the dashboard rail and mobile tab bar. Begin Hunt stays prominent; chapter gates, available Arcane points and secured Essence appear beside their destinations. WyrmForge uses a rune mark, restrained gold accents and serif headings without requiring artwork. Forge and Codex show one category at a time; preparation, offerings, Ascendant rites and goals remain available on dedicated screens.

The full connected Arcane Atlas and in-run route map are preserved. The Atlas uses the space freed by navigation, with 44-pixel zoom controls and a bottom inspector. Safe-area padding and short-portrait/landscape layouts support mobile browsers and future store wrappers. Native iOS/Android packaging is a later delivery; this release ships the web UI.

## Prototype 0.0.84 — First Hunt: chapter unlocks, route transitions and Hall of Fame

New accounts begin with an actual guided First Hunt rather than a menu full of unexplained systems. The Build/Arcane Atlas, Forge and Codex are initially padlocked, leaving the Run as the first action. A First Hunt ends when the player dies or slays their first Wyrm; manual abandonment does not complete the tutorial. The game fades to black, rumbles, says **IT DOESN'T END HERE**, returns to the Run Hub and opens the Atlas and Codex with a simple padlock animation. One Arcane point becomes available and is called out in the HUD and Run Hub.

The Forge remains locked until a …6852 tokens truncated… **no gameplay balance changes**; it establishes the baseline first.

### Arcane readability fixes

- Minor nodes show their effect directly inside the circle: e.g. cast speed, spell damage, vitality or projectile speed plus the value.
- Hybrid travel nodes show both minor effects as compact icon/value rows.
- Travel-node names and long descriptions no longer float over the graph, eliminating the overlap visible on mobile.
- Notables, Masteries and Keystones keep a short school icon + name on the Atlas and reveal their full effect on tap.
- Route preview now includes a **Minor bonuses on this path** aggregate before the defining landmarks.
- Intermediate Travel nodes are summarized instead of repeated as verbose route cards, making a planned Keystone path much easier to evaluate.

### Arcane planning fixes

- Tapping an Arcane node no longer spends a point.
- Any node, including distant Keystones, can be inspected before committing.
- The Atlas previews the cheapest valid connected route and its total point cost.
- Every node on the preview lists its actual effect and individual cost.
- Route allocation is explicit and atomic: either the whole planned route fits or nothing changes.
- Planned paths are highlighted separately from reachable and already-traversed paths.
- The mobile inspector is dismissible and no longer permanently covers the lower Atlas.
- Travel-node effects become visible when they are part of a planned route.
- Refuge Return/Descend comparison cards are now the actual actions, removing the duplicated choices below.

### Previous gate fix sequence

1. **Mobile Overlay Contract** — one iOS-safe scrolling model for Level Up, Relic Cache, Wyrm Harvest, Refuge and Run Summary.
2. **Experience Shards** — enemies drop physical XP that must be collected instead of granting XP directly on death.
3. **Horde Encounter Pacing** — larger encounter targets and composition-driven spawn batches.
4. **Combat Impact** — stronger kill, pickup and level-up feedback at horde density.
5. **Arcane Atlas** — bring the spatial/fantasy language of the Wyrmrealm map into the Arcane Web.
6. **Fun Ugly Gate** — repeated mobile/desktop playtests and a pass/fail decision.

The first fix establishes a shared overlay contract: the viewport layer owns scrolling, cards never create nested scroll traps, dynamic viewport height and safe-area insets are honored, and iOS momentum scrolling remains enabled.

The second fix moves XP into the battlefield. Enemy deaths now drop physical Experience Shards valued by enemy threat, shards magnetize toward the player within collection range, compact without losing XP when the loose-shard cap is reached, and remaining route XP is vacuumed before the next map decision. Level progression therefore follows **kill → collect → level → draft** instead of granting XP invisibly at death time.

The third fix replaces five-kill skirmishes with encounter-specific horde objectives. Depth-one Stalker, Mixed and Swarm trails require 12, 16 and 20 kills respectively and scale with depth. Spawning now happens in pattern-specific batches—largest for Swarm, smallest for Stalker pressure—behind a deterministic active-enemy cap that grows from 22 at Depth 1 to 52 at Depth 4. The XP curve is retuned around the larger kill volume so draft pacing does not explode with the new density.

The fourth fix strengthens combat impact without adding final art. Chasers, Rift Stalkers, Skitters and Brutes now have distinct battlefield silhouettes and colors, higher-threat enemies produce heavier death bursts, XP collection creates player-centered pickup pulses, loose shards visibly pulse, and the level-up draft has a stronger transition moment. The intent is to make pack clears and collection readable at horde density without filling the screen with damage numbers.

The fifth fix turns the Arcane Web into the **Arcane Atlas**. It borrows the Wyrmrealm map's spatial language: chart contours, elemental territories, travelled paths and landmark hierarchy. The Wyrmheart becomes the visual origin, Keystones read as destinations rather than large buttons, and mobile controls float over the Atlas instead of consuming a toolbar row. On phones the contextual node inspector becomes a compact bottom sheet above game navigation so the Web owns most of the viewport.

### Moment feedback

Short non-blocking callouts now mark the events that should matter during combat:

- entering a Rare trail;
- learning a new spell;
- reaching a spell mastery rank;
- awakening a Synergy;
- claiming a Rare rune;
- taking a relic;
- stealing Wyrm Essence;
- successfully securing Essence;
- healing at Refuge;
- descending into a deeper layer.

Common numerical upgrades remain quiet so the important moments keep their weight.

### Wyrm harvest and extraction

The Wyrm harvest flow now makes the risk sequence explicit:

**Wyrm slain → choose Essence → hold evacuation → Refuge secures the haul**

Selecting an Essence immediately starts evacuation and clearly marks that Essence as **at risk**. Completing the ritual changes the run HUD to **secured**, making the extraction rule visible without needing prior knowledge.

### Route and Refuge decisions

- Rare route inspection explicitly calls out stronger enemies, doubled route score and the relic cache.
- Entering a Rare route gets a dedicated run moment.
- Refuge now compares **Safe Now** against **Risk Next** before the action cards:
  - return to the Forge with secured Essence;
  - or keep secured Essence safe while risking the next haul for deeper rewards.
- Descending gets a clear transition callout with the new depth.

### Run story

The end-run report now summarizes the run as a story rather than only a ledger:

- dominant build identity;
- depth reached;
- Wyrms slain;
- Synergies awakened;
- rare trails cleared;
- Essence secured.

The detailed spell, rune, relic and Wyrm sections remain available underneath.

## Current top-level flow

**Run → Build → Forge → Codex**

- **Run** is the home screen and entry point into the Wyrmrealm.
- **Build** is the 49-node Arcane Web used to define pre-run intent.
- **Forge** owns secured Essence, lineage discoveries, Forge Mastery and Wyrm Offerings.
- **Codex** owns discovery/reference information for Synergies, spells, relics and Wyrms.

## Current run loop

1. Allocate a connected path through the Arcane Web.
2. Optionally carry a forged Wyrm Offering.
3. Choose routes through the Wyrmrealm.
4. Draft Reinforce, Converge and Venture rewards.
5. Adapt the build around spells, runes, Synergies and relics actually offered.
6. Build Resonance and attract a Wyrm.
7. Kill the Wyrm and choose one Essence.
8. Survive evacuation to secure that Essence at Refuge.
9. Return safely or descend with the previous haul banked and the next haul at risk.
10. Bring secured Essence back to the Forge for horizontal progression.

## Current systems

- 49-node Arcane Web with 24 points, hybrid paths, Masteries and Keystones.
- Structured three-role roguelike level-up draft with rarity and build-aware weighting.
- 8 spells across Fire, Frost, Storm and Arcane, each with two base Rank III evolution branches.
- 16 spell evolutions plus 12 temporary run upgrades.
- 8 relics.
- Status/interactions including Burning, Frozen, Chilled, Shocked and Arcane Mark.
- Cross-spell Synergies and Resonance.
- Four enemy archetypes and threat-budget encounter composition.
- Branching Wyrmrealm routes, modifiers, hazards and Rare trails.
- Four difficulty depths with finite trials.
- Four Wyrms: Ashfang, Stormcoil, Rimeclaw and Voidweaver.
- Essence Vault, Arcane Codex, four Forge lineages and 12 Forge Masteries.
- Seeded runs, replay support, run summaries and Combat Lab tooling.

## Balance workflow

Quick validation:

```bash
dotnet run --project src/Wyrmforge.BalanceLab/Wyrmforge.BalanceLab.csproj -c Release -- \
  --runs-per-combination 10 \
  --max-seconds 720 \
  --output artifacts/balance
```

The report contains raw per-seed runs plus grouped build/agent summaries. Compare builds inside the same agent first, then inspect suspicious seeds individually; the agents intentionally value survival, tempo and risk differently.

## Gate target

The complete loop remains:

**Forge → Arcane Web → route choice → run draft → Wyrm hunt → Essence risk → Refuge → descend/extract → Forge**

The gate passes when the prototype is enjoyable enough that starting another run is an attractive choice despite placeholder visuals. If a pillar fails, the next milestone targets only that failing pillar instead of adding content to hide it.

## Technology

- .NET 10
- C#
- Blazor WebAssembly
- HTML5 Canvas through thin JavaScript rendering/input adapters
- MSTest
- GitHub Pages

Gameplay rules remain in C# Domain/Application code. JavaScript handles Canvas rendering, input, diagnostics, Arcane Web viewport interaction and browser storage only.

## Local development

```bash
dotnet restore Wyrmforge.slnx
dotnet build Wyrmforge.slnx
dotnet test Wyrmforge.slnx
dotnet run --project src/Wyrmforge.Presentation.Web/Wyrmforge.Presentation.Web.csproj
```

## Foundation rules

1. A mechanic must be fun before it becomes pretty.
2. Mobile input and responsive layout are first-class requirements.
3. New content must create decisions or combinations, not merely inflate a list.
4. Persistent progression widens future possibilities rather than creating a mandatory permanent-stat treadmill.
5. Pre-run power comes from connected Arcane Web pathing and opportunity cost.
6. Run drafts present competing intentions, not three equivalent random cards.
7. Route choices influence later decisions as well as the immediate encounter.
8. Important state changes deserve feedback; common noise should stay quiet.
9. Extraction converts survival into a decision; secured loot requires successful evacuation.
10. Stop at assessment milestones and improve cohesion before expanding the feature surface again.
