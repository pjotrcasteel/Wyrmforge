# Wyrmforge

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

The Forge remains locked until a player returns with a secured Wyrm Essence. The completed second run unlocks the **Hall of Fame** and a score comparison. Fictional starter names are prominently marked **LEGEND · DEMO** and live only in the browser; real opt-in scores are written to the separate Cloudflare D1 leaderboard table. Publishing a pseudonym requires express consent; scores are **COMMUNITY · UNVERIFIED** until we have server-authoritative run validation. No private feedback reports are exposed. In an outage, an explicitly published score can be retained on that device only and must be labeled local-only.

Existing WyrmForge accounts with progress migrate past onboarding with their prior access. Arcane build budget and allocated nodes now persist across refresh. The underlying combat still collects loose XP and removes remaining minions/projectiles when a trail finishes; a power burst/blackout now holds the transition before the next route map. Both animations honor reduced-motion preferences. Playtest feedback also guards against accidental duplicate sends and preserves retry identity without storing comment text in the receipt.

## Prototype 0.0.83 — Development Hunt Trials (no grind)

The existing public **[Balance Lab](https://pjotrcasteel.github.io/Wyrmforge/balance-lab)** now includes an isolated Wyrm encounter test bench for developers.

- Directly start any of the four ordinary Wyrms, or both implemented Ascendant encounters (Ashfang and Stormcoil), at Depth II without playing the earlier routes.
- Choose the opening phase, seed, existing Arcane build and heuristic agent. Every trial gets the associated school spell at Rank III with an actual base evolution, rather than artificially granting saved Forge or player power.
- Run the *actual combat simulation* headlessly in **portrait (390 × 844) and landscape (844 × 390)** with the same seed. The agent makes movement decisions. Report victory, death, phase-two reach, minimum HP, damage, simulated time, signature warning frames, player overlaps with pending/armed warnings and observed attack windows.
- A mobile-friendly, seeded attack-location preview shows the real signature planner's geometry. A **Watch autopilot cinematic** link launches a separate [Hunt Lab](https://pjotrcasteel.github.io/Wyrmforge/hunt-lab) using the **real canvas renderer, animated entrance, phase breaks and Wyrm AI** with agent-driven movement—without asking a human to play or risk a save. Invulnerable practice can help capture more attacks but must never be treated as fair survival evidence.
- Developer trials bypass persistent progression and never grant Great Hunt oaths, Essence, trophies, or playtest telemetry. All ordinary-game startup, achievements and saves remain untouched.
- This supports iteration on difficulty and mobile reachability without repeatedly losing a real run. It cannot objectively determine subjective fun, cinematic appeal or real-touch comfort; those remain complementary visual/playtest gates.

The original headless self-play and Combat Lab are retained. The remaining Rimeclaw/Voidweaver Ascendants and later Elder Wyrms can enter the same bench when their actual combat content is implemented.

## Prototype 0.0.82 — Ascendant Stormcoil: Stormbound Halo

**The next playable Great Hunt challenge** builds on the existing oath, Mastery and Ascendant architecture instead of adding a prestige currency.

- Seal the **Oath of the Unbroken Sky** to invoke **Ascendant Stormcoil** from the Run Hub; the Ashfang rite remains available and choosing either deselects the other. Ordinary runs and Depth I remain unchanged.
- At the Depth II gate, a chosen Ascendant forces its corresponding Wyrm once per run. Stormcoil receives an extended, school-colored cinematic reveal and a distinct **Skybreak Crossing** signature: a warning corridor of lightning runs horizontally, then vertically; phase two adds an angled third crossing. Telegraphs and strike radii are scaled for portrait and landscape movement.
- Winning permanently awards the **Stormbound Halo** trophy, celebrated post-run and displayed at the Great Hunt altar. Saved Ashfang crowns and sealed oaths remain compatible with the existing v1 save record.
- All four ordinary Wyrms retain their signatures. The other two Ascendants are **not** represented as playable yet; Rimeclaw, Voidweaver and Elder Wyrms remain future milestones.
- Deterministic attack geometry, exclusive rite selection, persistent reward semantics and mobile/browser coverage are included. Balance and actual player experience remain subject to feedback; no flat account stat bonuses are awarded.
- The existing consent-only 0.0.81 playtest collector stays live. Reports include game version; first-cohort feedback must be interpreted carefully if testers played different deployed versions.

**Next:** validate mobile readability and intensity in human testing while returning to the two remaining distinct Ascendant encounters, then Elder Wyrms. Keep Build Evolution open for future mechanical branches.

## Playtest feedback insights — scheduled aggregation

The external playtest collector can now produce an automatic, privacy-safe development summary without exposing individual tester records. A scheduled GitHub workflow queries aggregate counts, ratings and recent-run metrics through Cloudflare D1, excludes the owner's synthetic integration test, and publishes only aggregate data after a ten-report privacy threshold.

- [Automated insight pipeline and privacy boundaries](docs/playtesting/insights-automation.md)
- Once the first cohort reaches the threshold, review `playtest-insights/docs/playtesting/insights/latest.md` on the separate GitHub branch.
- The public report contains no verbatim comments or reproduction seeds. Access those only through the existing private Cloudflare owner tools when necessary.

## Prototype 0.0.81 — Private, consent-only feedback collector

- A separately deployable Cloudflare Worker + D1 database accepts **only reports sent via the explicit in-game consent checkbox**, validates/sanitizes the `wyrmforge.playtest.report.v1` schema and saves them for up to 30 days.
- Anonymous report intake uses exact-origin CORS, capped request bodies, an hourly HMAC rate limiter, no raw IP storage, idempotent report IDs and no analytics tracking SDK.
- Owner-only admin endpoints aggregate feedback and allow private export/deletion. The administrator token is never shipped with the game.
- The Send button appears only once `WYRMFORGE_FEEDBACK_ENDPOINT` is set for GitHub Pages. Share/download JSON remains usable at all times and on failure.
- Deployment needs a Cloudflare account with a real D1 database and provisioned GitHub secrets. **Building this milestone does not automatically provision an external Cloudflare account or enable intake**. See [collector deployment guide](docs/playtesting/collector-deployment.md).
- Shared C# gameplay and planned native iOS/Android adapters are unaffected.

### 0.0.80 — Community playtesting and evidence

Before another Wyrm chapter, WyrmForge now has a built-in, mobile-first playtest loop.

- Run Hub and post-run screens offer a one-minute feedback survey for external testers (enjoyment, clarity, replay intent, trouble area and optional comments).
- The browser keeps **local-only** anonymized run and funnel evidence: recent run outcomes and seeds, trail/Wyrm gates, depth, Essence, evolved spells and sparse frame-performance samples.
- Testers decide whether to include run data and explicitly **share a JSON report** through the native phone share sheet, or download it to send to the playtest organizer. No server-side telemetry or automatic uploading is represented as enabled.
- Reports can be deduplicated and summarized offline with `python3 tools/playtesting/analyze.py playtest-reports/`. Reports are ignored by Git.
- `docs/playtesting/community-round-1.md` sets the first external testing protocol and pass/fail gates.
- `docs/design/mobile-platform-roadmap.md` establishes iOS and Android releases as explicit future goals without forking deterministic C# gameplay.

**Next release depends on feedback evidence.** Keep Ascendant/Elder Wyrms, Build Evolution expansion and native packaging on the roadmap, but prioritize blockers revealed by testers.

### 0.0.79 — The First Ascendant: Crown of Embers

The first playable Great Hunt rite begins after the Oath of the First Flame is sealed. The Run Hub exposes an opt-in Ascendant Ashfang encounter; regular hunts and early progression remain unchanged.

- Invoke the rite in the Run Hub to guarantee **Ascendant Ashfang at the Depth II Wyrm encounter**. The Depth I fight remains ordinary, so building/evolving a spell and reaching the second depth are part of the challenge.
- Crownfall is a distinct signature: sequential rows of warning circles leave one shifting safe lane; the second phase adds a third wave. Distinct gold telegraphs, crowned Wyrm silhouette, longer entrance and phase-break presentation communicate the upgrade.
- Victory earns the **permanent Crown of Embers trophy** in the Great Hunt altar. It saves within the existing v1 Great Hunt record as an optional field, with no new currency or power inflation. The rite remains replayable.
- Existing Ashfang Essence and Spell Mastery systems continue to work. Defeats are captured in the run summary at kill time and credited once, with abandoned runs excluded from persistent progress.
- Normal runs do not opt into the challenge and retain their original seeded combat behavior. Portrait and landscape Crownfall safe-lane tests and a mobile unlocked-rite browser check protect accessibility.

The three remaining Ascendant encounters and Elder Wyrms are intentionally not misrepresented as implemented. Build Evolution remains expandable.

### 0.0.78 — Mobile combat HUD and post-run clarity

- The score, health, experience and spells now share one responsive HUD surface alongside the current trail objective. Encounter progress stays live; there are no overlapping floating blocks.
- The Exit text button becomes an accessible running/retreat icon with a 44px mobile touch target. The action still abandons the run.
- Post-run results lead with score, build, journey, earned Mastery and cinematic unlocks; Replay and Return are visible without first scrolling on a typical phone.
- Spell/relic/synergy inventory and the three long-term pursuit goals remain available in optional expandable report sections rather than filling the entire initial results screen.
- Mobile browser coverage checks aligned HUD sections, retreat affordance, immediately visible results actions, expanded report access and return to Forge.

### 0.0.77 — The Great Hunt: Four Ancient Oaths

The Forge now holds a living Great Hunt altar. Its four permanent, Wyrm-specific oaths connect ordinary hunts and existing Spell Mastery to long-term aspirational seals. No new currency, flat account-stat inflation or disconnected prestige loop is introduced.

- Each Wyrm demands four **independent deeds**: slay it, secure any of its Essences, defeat it at Depth II+ with a matching-school Rank III evolved spell **already evolved at kill time**, and awaken its associated Wyrmforged Spell Lineage.
- Deeds persist across meaningful runs in `wyrmforge.greatHunt.v1`. Existing Forge discoveries backfill historical kills and secured Essence; unreconstructable evolved duels are never fabricated.
- One Great Hunt pursuit now appears alongside a Forge goal and a Spell Mastery goal in the three-horizon hunt board. The Codex and a collapsible Forge sanctum altar let hunters inspect every oath, its exact conditions and the next actionable step.
- Completing an oath earns a permanent illuminated ceremonial seal, with a post-run discovery reveal and an enduring Forge/Codex trophy. The progression unlocks the **preparation** for its Ascendant route; it does **not** pretend an Ascendant boss is playable yet.
- Deep evolved duels are captured at the exact Wyrm defeat moment, maintaining deterministic simulation and preventing retroactive Rank III/evolution credit.
- Mobile-friendly selectable sigils, concise altar stage and reduced-motion treatment; no combat viewport overlays.
- The next combat milestone turns prepared Ascendant seals into **distinct mechanically new encounters**, then progresses toward Elder Wyrms. Build Evolution remains extensible.

### 0.0.76 — Spell Mastery & Wyrmforged Lineages

Persistent spell growth now gives the next few hunts a specific purpose. Repeated **meaningful** use of a spell and a matching Wyrm feat awaken a rare new evolution that enters future Rank III crossroads. This is a new *possibility*, never a flat permanent damage bonus.

- **Four new Wyrmforged evolutions:** Fire Bolt → Wyrmfire (Ashfang); Frost Shard → Glacial Requiem (Rimeclaw); Chain Lightning → Tempest Ascendant (Stormcoil); Arcane Orb → Void Constellation (Voidweaver).
- Each lineage requires **four meaningful hunts** featuring its spell at Rank II+ and **defeating its associated Wyrm with that spell at Rank III**. Both objectives can progress in any order.
- A meaningful hunt must clear at least one trail; abandoned runs and instant restarts award no mastery. A run awards mastery at most once, with duplicate game-over notifications guarded.
- Spell mastery survives reloads using a versioned local save key and can be restored independently of existing Forge and Codex data.
- The Codex shows evocative clues, progress toward both requirements and only reveals the evolved form once earned.
- The Run Hub, Forge's Hunt Ledger and post-run results now mix Forge objectives with long-term spell mastery goals instead of showing only Essence tasks.
- An earned lineage receives a large post-run discovery moment and immediately becomes eligible for future evolution choices. The normal two-base-branch choice remains intact for fresh players.
- Great Hunt / Ascendant Wyrms and mastery coverage for additional spells remain later content/endgame work; this milestone establishes the proven long-term unlock loop.

### 0.0.75 — Forge 2.0

The Forge now provides **three actionable next hunts** before and after a run, and within the Forge itself. Goals are based on actual discovered Wyrm lineages, required secured Essence, and unfinished masteries—not daily chores or flat account-stat rewards.

- Completing one of the four Wyrm masterwork lines permanently unlocks a third evolution for its spell: **Ember Tempest** (Cinder Needle), **Thunder Crown** (Ball Lightning), **Crystal Divide** (Ice Lance), or **Mirror Choir** (Aether Dart).
- The new branches are excluded from runs until forged. The Codex hints at locked Forge blueprints, while the Forge previews the exact new possibilities.
- Each Forge mastery gets a clear celebration showing what was unlocked.
- The Run Hub, Forge and post-run report expose up to three immediate hunt/Essence/Forge targets, with a clear ready-to-forge state.
- Existing saved Forge masterworks automatically confer their new evolution blueprints; no save migration is necessary.
- Spell Mastery, hidden Wyrmforged Lineages and the Great Hunt remain future layers in the established roadmap. Build Evolution stays open for more mechanical depth.

### 0.0.74 — Build Evolution

0.0.74 turns Rank III from the end of a spell's run progression into a crossroads. Every current spell now has two mutually exclusive evolutions that change how it behaves for the rest of the run.

### Spell evolution

- Reaching Rank III immediately opens a dedicated **Spell Evolution** choice instead of consuming another level or waiting for a random future draft.
- The two branches are shown together; choosing one closes the other for that run.
- All 8 current spells have two base branches, creating 16 distinct evolved forms.
- Evolutions are spell-scoped and stack with global runes, Atlas passives, relics, Synergies and Essence instead of replacing those systems.
- Evolutions can alter damage, cadence, projectile count, speed, radius, pierce, chain count/falloff, splash, Frost nova radius and status behavior.
- The HUD uses the evolved icon, the run report records the evolved form, and choosing an evolution now gets its own skippable, school-themed transformation and confirmation.
- Balance Lab records evolution activation and per-evolution outcomes so sister branches can be compared instead of balanced by intuition alone.

### Base evolution branches

- **Arcane Orb:** Rift Spear / Star Swarm
- **Fire Bolt:** Meteor Heart / Phoenix Volley
- **Frost Shard:** Shatterglass / Winter Bloom
- **Chain Lightning:** Tempest Web / Thunderhead
- **Cinder Needle:** Wildfire Needles / Ashstorm
- **Ice Lance:** Permafrost Spear / Hailbreaker
- **Ball Lightning:** Storm Core / Overcharge
- **Aether Dart:** Phase Barrage / Markstorm

These sixteen are the always-available base evolution vocabulary. Future **Wyrmforged Lineages** can add new branches into the same crossroads without changing the run flow.

### Long-term motivation contract

WyrmForge's persistent progression must create **new possibilities, discoveries and aspirational goals**, not a mandatory account-level stat treadmill. The target experience is:

**Goal → Run → Progress → Achievement → Celebration → New possibility → New build idea → Goal**

After the meta-game is complete, a player returning from a run should normally be able to name at least three meaningful things they want to pursue next. The existing roadmap builds toward that:

- **0.0.74 Build Evolution** establishes meaningful run-level transformations and the branch system future Lineages can extend.
- **0.0.75 Forge 2.0** should make secured Essence unlock possibilities and visible goals: evolution branches, spell/relic pools, offerings, challenge access and discovery—not permanent flat damage.
- Later existing content/endgame work should layer spell Mastery history, hidden Wyrmforged Lineage requirements, Codex hints, Wyrm feats, Ascendant/Elder hunts and Great Hunt-style objectives on the same progression model.
- Major discoveries should be celebrated loudly and immediately create a new thing the player wants to try.

The detailed contract is documented in `docs/design/long-term-progression.md`.

### 0.0.73 — Wyrm Hunt 2.0

0.0.73 makes the Wyrm at the end of a depth a distinct encounter rather than a larger enemy with different numbers. Existing entrances, arenas, movement styles, attacks and protected 50% phase breaks remain, but every Wyrm now adds a signature movement puzzle that escalates in phase two.

### Signature hunts

- **Ashfang — Cinder Sweep:** captures the hunter's position and erupts a delayed line of fire through it. The answer is lateral movement; phase two adds another eruption and tightens the cadence.
- **Stormcoil — Tempest Cage:** forms a ring of lightning around the captured position. Phase two closes the pattern with more strikes and shorter recovery.
- **Rimeclaw — Glacial Wall:** cuts across the arena's short axis with one deliberate escape gap. Segment radius adapts to the arena shape so the gap remains fair on mobile and desktop.
- **Voidweaver — Rift Echo:** strikes the captured position and its mirrored point; phase two adds a delayed center echo.
- Signature schedules are deterministic for seeded runs and coexist with each Wyrm's existing movement, normal attack and environmental pressure.
- Phase two increases signature damage, radius, strike count and/or cadence without replacing the Wyrm's original identity.

### Hunt readability and evidence

- Signature telegraphs have distinct visual languages instead of reusing one generic warning circle.
- The boss bar names the active signature mechanic.
- Entrances introduce the signature and each Wyrm has its own phase-two callout.
- Balance Lab now separates **Wyrm reach** from **conditional Wyrm win rate** and reports first-Wyrm outcomes individually, so pre-hunt failures and specific hunt problems can be analyzed independently.
- Signature profiles, phase timing and all four deterministic pattern planners are unit-tested.

### Future Build Evolution direction — not part of 0.0.73

The planned Build Evolution / Forge work keeps **Spell Lineages / Wyrmforged Evolutions** alive as a future system. Repeated meaningful use of a spell plus thematic Wyrm achievements may unlock new evolutionary possibilities for future runs rather than permanent flat-stat power. Example direction: mastering Fireball across many runs and defeating a Fire Wyrm with a Fireball-centered build could unlock a Wyrmfire lineage. This is deliberately postponed until the Build Evolution milestone.

### 0.0.72 Combat Director

0.0.72 turns route combat from a continuous spawn timer into deliberate, deterministic encounter pacing. Each combat trail now advances through **Pressure → Escalation → Breathing Room → Surge → Climax** according to kill-objective progress rather than elapsed run time.

### Combat Director

- Encounter phases are driven by objective progress, so slow/control builds are never punished merely for taking longer.
- Pressure begins slightly restrained, Escalation tightens cadence, Breathing Room pauses new spawns briefly, Surge raises pressure and Climax closes the trail decisively.
- Swarm preserves its mass identity with larger late batches; from Depth 2 its climax may add a Brute.
- Stalker Pressure inserts deliberate Rift Stalker complications during escalation/surge instead of becoming a generic faster spawn stream.
- Mixed pressure combines the normal roster with late complications, using Brutes only when they are depth-eligible.
- Existing route modifiers, stage/depth scaling, active-enemy caps and threat-budget composition remain authoritative.
- Enemy health, damage and school values are intentionally unchanged in this milestone.
- The combat HUD exposes the active encounter phase so pacing transitions are readable during play.

### Balance and browser evidence

- Self-play now records Wyrms reached, first-Wyrm timing, breathing rooms and climaxes.
- Balance reports expose Wyrm reach separately from extraction, distinguishing pre-hunt encounter failures from Wyrm-fight failures.
- The browser smoke suite now captures active combat on both 390×844 mobile and 1440×900 desktop viewports in addition to the Arcane Atlas.
- Director phase transitions and pattern-specific complications are unit-tested and remain deterministic.

### 0.0.71 encounter pacing fairness

0.0.71 removed a hidden anti-control feedback loop from encounter scaling. Enemy health, speed and spawn cadence previously increased with total elapsed run time, so slower/control builds faced stronger and faster enemies precisely because they took longer to clear a kill objective. Pressure now scales with route stage and depth instead.

### Encounter pacing fairness

- Enemy health no longer scales continuously with elapsed run time.
- Enemy speed no longer scales continuously with elapsed run time.
- Spawn cadence no longer accelerates merely because the player took longer to clear a route.
- Within a depth, route stages 1–4 now deliberately ramp health, speed and spawn cadence.
- Depth multipliers, route modifiers, encounter archetypes, active-enemy caps and horde batch sizes remain intact.
- This preserves the horde feel while removing the positive feedback loop that punished slower Frost/control builds.
- Stage-pressure rules are explicit and unit-tested so future balance work can reason about them independently of simulation time.

### School identity balance

- **Arcane Reservoir** now adds +1 projectile pierce alongside ×1.20 projectile speed.
- **Prismatic Volley** seeks separate nearby enemies instead of fanning all projectiles around one target.
- **Astral Barrage** uses the same seeking behavior with five projectiles.
- **Arcane Echo** now triggers every 4th cast instead of every 6th; its normal echo remains 60% damage and Echo Chamber still produces two full-damage echoes.
- **Deep Freeze** now triggers every 3rd hit and freezes for 1.75 seconds.
- **Absolute Zero** converts that control into ×2.5 damage against Frozen enemies.
- **Winter Shell** prevents damage for 0.65 seconds when the ward triggers, so continuous contact damage is treated as one meaningful hit window rather than dozens of 50ms ticks.
- Fire and Storm passive values are intentionally unchanged in this pass. Balance Lab measures whether identity improvements close the gap before any ceiling nerfs are considered.

### Passive fidelity fixes

- **Detonation** now creates an actual area explosion every 4th hit instead of only multiplying the direct target's damage.
- **Volcanic Heart** upgrades that Detonation explosion to a larger radius and ×2.5 damage.
- **Ice Armor** now grants a real 1.35-second barrier that reduces incoming damage by 40%; previously its barrier flag was visual only.
- **Winter Shell** now begins charged, absorbs one full hit, and independently recharges after 5 seconds instead of accidentally interacting with Ice Armor's short barrier.
- **Arcane Echo** explicitly fires one 60%-damage echo every 6th cast.
- **Echo Chamber** now fulfills its Keystone promise by firing two full-damage echoes on the Arcane Echo trigger.
- Shared passive-effect resolution is unit-tested, while Winter Shell readiness and Detonation splash are covered through the live simulation.
- No Fire/Storm/Frost/Arcane travel-node percentages are changed yet; Balance Lab reruns after these correctness fixes decide whether number tuning is still required.

### Baseline integrity

- **KeystoneRoute** compares eight single-school Keystone routes at exactly **10 Arcane points** each.
- **FullBuild** compares four adjacent two-school hybrid plans at exactly **20 Arcane points** each.
- Reports include cohort and spent Arcane points so unequal-budget comparisons are visible instead of implicit.
- Tests fail if a cohort drifts to mixed budgets.
- Balance interpretation now explicitly requires comparing builds within the same cohort and agent.
- The first 0.0.67 data remains useful as instrumentation validation, but is not used to nerf/buff builds.

### Self-play and balance instrumentation

- A public `IRunAgent` contract receives player-visible run observations and makes movement, route, draft, relic, Essence and Refuge decisions.
- Four deterministic heuristics model different play styles: Casual, Kiter, Greedy and BuildFocused.
- Six representative Arcane builds cover single-school and hybrid Keystone goals.
- `RunSelfPlayDriver` executes the real `RunSimulation` without renderer shortcuts and records kills/min, XP/min, health pressure, damage taken, level cadence, peak enemies, routes, Wyrms, Essence and decisions.
- `Wyrmforge.BalanceLab` runs build × agent × seed batches and exports JSON, CSV and Markdown summaries with medians, P90 depth and outcome rates.
- Pull-request validation produces a small balance artifact; main builds can produce a larger baseline matrix through the Balance Lab workflow.
- Playwright browser smoke runs the published Blazor app at phone and desktop sizes, checks mobile overflow, captures the Arcane Atlas and route preview, and uploads screenshots plus traces.
- A developer-only `/balance-lab` screen can run a deterministic headless trial interactively next to Combat Lab.
- 0.0.67 intentionally makes **no gameplay balance changes**; it establishes the baseline first.

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
