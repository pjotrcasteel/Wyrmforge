# Arena roster v1 — habitats and the first-hunt ecology

Status: **Step 1 of 7 shipped** (habitats, renamed roster, safe spawns). Source brief:
`user_handover_files/WyrmForge_First_Hunt_Encounter_Design.md` (§2 roster, §4 habitats, §5 beats, §6 spawns, §10 order).

## 1. Why habitats first

Every later roster step (Hound flanks, Slinger lobs, Priest revives, Wraith water, elites, the Reliquary,
the Bell Warden) needs to know *where* a fight takes place. Today a depth has one macro biome and every
node draws from the same three role-weighted patterns, so a forest trail and a burnt meadow play the same.

Successful references:
- **Monster Hunter** — a monster's habitat is part of its identity; you learn where Jagras packs live.
- **Hades** — each biome has its own roster, so the route itself teaches what is coming next.
- **Slay the Spire** — the act's encounter pool, not raw numbers, sets difficulty; elites are a visible route choice.
- **Vampire Survivors / Brotato** — the spawn direction is a readable rule, never a surprise on top of the player.

## 2. Roster renames (same `EnemyKind` ints, so saved data and sprite atlases stay valid)

| Old | New | Why it maps |
|---|---|---|
| `Chaser` (0) | **Hollow** | Baseline shambler, threat 1 |
| `RiftStalker` (1) | **Mire Hound** | Its windup → lunge is already the Hound's flank-and-pounce |
| `Skitter` (2) | **Ashling** | Fast, fragile swarm demon |
| `Brute` (3) | **Penitent** | Slow, heavy, high contact damage; the shield arrives in step 3 |

Sprites still show the legacy silhouettes until step 2 redraws them.

## 3. Habitats

`WyrmrealmHabitat` lives on each `WyrmrealmMapNode`, separate from `Territory.Name` (macro biome) and the
attunement school. It is derived from the layout and a seed hash. **It never draws from the layout RNG**,
so every existing seed still produces the same map.

| Beat | Node | Habitat |
|---|---|---|
| Opening | `opening-1` | Outskirts (abandoned road) |
| Early | `opening-2` | Wet forest |
| First fork | sector-0 roads | Forest trail **or** open field; middle roads are a dead hamlet. A seed bit picks which side is which. |
| Confluence | `clearing` | Deserted village |
| Second fork | sector-1 roads | Monastery grounds **or** flooded cloister (seed bit); stop 4+ of a long road climbs into the scorched approach |
| Late approach | `approach` | Scorched approach |
| Final | `wyrm` | Lair |

Route-map nodes show a short habitat label (Old road, Forest, Field, Village, Monastery, Cloister, Scorched), and road labels name the habitat, so the fork choice visibly changes the fight.
The node sheet reads "Wet forest · Ambush", and the arena HUD reads "TRAIL n · WET FOREST".

## 4. Composition

Map encounters use `EnemyHabitatProfile` weights, which hold the brief's §4 table verbatim. Kinds that have not shipped yet lend their weight to a stand-in with the same role:
- Priest goes to Hollow (until step 3, which shipped the Ash Priest).
- Slinger and Wraith (telegraphed harassers) go to Mire Hound.

Without the stand-ins, the late cloister roads would lose their harassment pressure. The effective weights at step 1 (since step 4 every kind holds its own §4 weight and no stand-ins remain):

| Habitat | Hollow | Ashling | Hound | Penitent |
|---|---:|---:|---:|---:|
| Outskirts | 100 | – | – | – |
| Wet forest | 22 | 15 | **63** | – |
| Open field | 20 | **48** | 32 | – |
| Deserted village | **53** | 22 | 15 | 10 |
| Monastery grounds | 31 | 15 | 18 | **36** |
| Flooded cloister | 24 | 5 | **51** | 20 |
| Scorched approach / Lair | 26 | **33** | 27 | 14 |

The rules:
- The encounter **pattern** (Swarm / Ambush / Mixed) still sets the threat budget, batch size and pacing.
- The **habitat** decides who lives there. Weights are rarity within the threat budget, not independent per-spawn rolls.
- A zero weight is the introduction policy. For example, no Penitent appears before the village.
- Director inserts go through `EnemyHabitatProfile.Admit`. A habitat that does not host the requested kind gets its signature resident instead, so there are no Hounds on the opening road.
- Priest, Slinger and Wraith take back their weight from the stand-ins as they ship.

## 5. Spawn origins and safety

- **Origin per habitat:**
  - Road (outskirts, village, monastery) means north/south.
  - Flanks (forest, flood) means east/west.
  - All sides (field, scorched approach).
- The arena edge cue uses the same rule, so the warning matches the arrival.
- **`AdjustSpawnPosition` no longer falls back to the hunter's position.** Instead:
  - It walks deterministic rings (up to 360 px, 12 spokes).
  - It needs ground that is unblocked, inside the region bounded by sealed gates, and at least `MinimumSpawnDistance` (150 px) plus the enemy's radius from the hunter.
  - If nothing qualifies, the spawn is **skipped**, never placed on the player.
- No randomness is consumed, so replays stay deterministic.

### Balance check (BalanceLab, 25 runs × 48 combinations)

| Build | Damage taken | Min HP | Defeats | Extracted | Wyrms reached |
|---|---:|---:|---:|---:|---:|
| Before (HEAD `1be0fcd`) | 280 | 0.43 | 158 | 299 | 1.24 |
| Safe spawns only | 148 | 0.59 | 85 | 294 | 1.29 |
| Habitats + safe spawns (this step) | 144 | 0.60 | 62 | 293 | 1.30 |

The old fallback put 6.3% of spawns on top of the hunter or within 150 px. That accounted for roughly half of all damage taken, which is exactly the "fake difficulty" the brief forbids. Habitats themselves are close to neutral.

**Decision:** keep the fair spawns, and don't paper over the gap with hidden HP or budget inflation. Steps 2–4 restore pressure through readable threats: Slinger lobs, Hound flanks, Priest revives and Wraith ambushes. That is how Hades and Vampire Survivors earn difficulty.

**Target:** by the end of step 4, BalanceLab damage taken returns to 220–280 with defeats concentrated in the Greedy agent.

## 6. Presentation

- The C# environment snapshot carries `habitat`.
- `arena-environment.js` applies a restrained full-field wash per habitat (alpha ≤ .15, so telegraphs stay readable).
- The landmark text is now the habitat name.
- The full tile and prop redesign is still deferred to the story phase.

## 7. Tests

- `WyrmrealmHabitatTests`:
  - Fixed beats.
  - Both forks are always offered.
  - Same seed gives the same habitats.
  - Fork sides vary across seeds.
  - Outskirts is Hollow-only.
  - Frequency ordering (forest > field in Hounds, field > forest in Ashlings, village is Hollow-led, monastery > village in Penitents).
  - Director substitution.
- `ArenaCrossingTests`: a request on the hunter never lands near them, no spawn behind a sealed gate, skip when there is no safe ground, deterministic.
- `HabitatSpawnTests`: three seeds walk all eight trails in a real `RunSimulation`. Every spawn is ≥150 px from the hunter and a legal resident of its habitat, and the hunt crosses at least 4 habitats.
- JS: the habitat tint is distinct and restrained.

## 8. Step 2: Hound pounce, Ash Slinger, new silhouettes

Brief §3 attack contracts, all owned by C#. JS only draws what the snapshot reports.

**Mire Hound (Ambusher, radius 13, 0.9× HP, 1.2× speed).**
- Stalks a flanking orbit point 140 px from the hunter, with the side set per hound.
- Inside 170 px it winds up for **0.50 s**. The lane direction locks at windup start and cannot re-aim.
- Then it pounces 150 px at 500 px/s. The first contact deals **15** (once), then it recovers for 0.65 s at a standstill and retreats.
- Rationale: commit and recover is the Hades / Monster Hunter punish window. The locked lane means a side-step always works.

**Ash Slinger (Artillery, radius 11, 0.75× HP, 0.95× speed, 0.5× contact).**
- Keeps 175–330 px of range: it back-pedals when crowded and strafes otherwise.
- Winds up for **0.65 s** with the landing spot locked at windup start. It then lobs an ember (0.6 s flight, 46 px arc).
- The ember hits only if the hunter's centre is inside the **34 px** mark on landing: **14** damage plus a Fire impact.
- Burst damage of 30% of its max HP during windup interrupts the throw (half cooldown). That is the brief's "gap-close or interrupt" answer.
- Rationale: Enter the Gungeon's grenade kin. The mark shown is exactly the hit area, no larger and no smaller.
- Only habitat plans spawn Slingers (forest 3, field 20, village 7, monastery 6, cloister 2, scorched 15). The `Artillery` role has zero weight in legacy role patterns.

**Pacing (§5).**
- At most **2 committed telegraphs** (Hound windup/pounce plus Slinger windup) at pressure stage ≤2, 3 at stage 3 and 4 after that. Extra enemies keep repositioning instead.
- No ranged windup in the first **10 s** of an encounter, and Slinger windups are staggered at least 0.9 s apart.
- Hounds never commit while the field is crossing to a gate (no pounces through walls).
- Damage values are fixed and do not scale with stage. Pressure comes from numbers and composition, as in Vampire Survivors and Slay the Spire acts, not from hidden multipliers.

**Presentation.**
- New generated sprites for all five kinds, from the concept sheets: the Hollow, the Mire Hound, the Ashling, the Penitent and the Ash Slinger.
- Each kind has walk poses 0–2 plus an attack pose 3, shown while C# reports a telegraph. The body is part of the warning: the hound crouches with spines bristling, the Slinger swings its ember overhead, the Hollow reaches out, and the Penitent thrusts its shield.
- `arena-enemy-telegraphs.js` draws three things:
  - The pounce lane (red, hound-width, with a charge fill and an arrowhead).
  - The lob mark (an ember-orange circle at the impact radius whose inner disc fills to the ring).
  - The ember's ground shadow, plus the airborne ember drawn above actors.

**Balance check (25 runs × 48 combinations)**

| Build | Damage taken | Min HP | Defeats | Extracted | Wyrms reached |
|---|---:|---:|---:|---:|---:|
| Step 1 | 144 | 0.60 | 62 | 293 | 1.30 |
| Step 2 | 161 | 0.57 | 73 | 298 | 1.28 |

- The extra pressure lands mostly on the Greedy agent, which does not dodge (defeats 40 → 50, damage 180 → 192). Casual defeats fell (8 → 6).
- Bots do not read telegraphs, so this is an upper bound for an attentive player.
- Kept below the 220–280 target on purpose: Priest revives, Wraith ambushes and elites (steps 3–5) still add pressure.

**Tests.**
- `MireHoundBehaviorStateTests` and `AshSlingerBehaviorStateTests` cover the phase cycles, locked aim, interrupts and range keeping.
- `EnemyTelegraphTests` runs inside a real simulation:
  - There is no lob during the 10 s grace.
  - The ember damages only inside its mark.
  - The hound bites once for 15, then recovers.
  - The committed cap is reached but never exceeded.
- JS: the telegraph geometry matches the C# sizes, and every kind/pose/state has an atlas frame.

## 9. Step 3: Ash Priest, Ashling morale, Penitent shield

The brief's support loop (§3): taking out one enemy should change the encounter. Two references set the rules:
- **Diablo shamans / Hades' Wretched Sneaks behind shields:** the healer is the priority target, its casts are visible and breakable, and killing it is rewarded.
- **Monster Hunter / Hades shield-bearers:** a shield covers its front only and turns slowly, so flanking, splash from behind or one heavy hit gets through.

**Ash Priest (new `EnemyKind` 5, `Support` role, threat 3).**
- Keeps 230–340 px from the hunter, drifting behind its pack's centre. Rooted while casting.
- **Heal:** 0.9 s cast on the single most wounded ally (< 70% HP) within 230 px. The target is locked at cast start and shown with a green tether that closes on it. Restores 45% of that ally's max HP. Cooldown 9–13 s, deterministic per priest.
- **Resurrection:** 1.5 s ritual circle over Ashling remains within 200 px. It takes precedence over healing. Raised Ashlings return at 50% HP.
  - At most **2 per encounter**, counted by the encounter rather than the priest, so two priests cannot raise four.
  - Remains are true corpse markers: only a first Ashling death leaves them, and they crumble after 8 s.
  - A raised Ashling drops no experience and does not count toward the node's kill target a second time.
- **Interrupt:** losing 20% of its health during a cast cancels it and returns it on half cooldown.
- **Morale:** when a priest dies, Ashlings within 260 px rout for 2.5 s, then re-engage. Bounded, so clear-all objectives never soft-lock.
- **Composition:** habitat plans only add a priest after at least 3 Ashlings are planned, with one priest per 5 allies. Plans spawn in order, so the priest arrives behind its pack. The §4 weights no longer lend Priest weight to Hollows.
- Priest casts do not count toward the committed-threat cap; they never hurt the hunter.

**Penitent directional shield.**
- The shield faces the hunter and turns at 1.6 rad/s. Hits arriving within ±60° of the facing deal 25%.
  - Projectiles are judged by the direction they flew in from; splash by its centre. Burning ground, statuses and chains are directionless and land in full.
  - A blocked hit worth at least 40% of the Penitent's max HP breaks the guard (the brief's "high-impact spells" counter).
- **Shield bash:** when the hunter is inside a 66 px frontal arc, a 0.65 s windup with the arc locked, then 16 damage only inside it. 0.9 s recovery with the shield down (full damage from any side), 2.6 s cooldown. It counts toward the committed-threat cap.
- **Guarding:** with an Ash Priest or Slinger within 300 px, the Penitent stands 46 px in front of it toward the hunter instead of advancing.
- Contact damage lowered from 1.8× to 1.2×: the bash is now its real threat, so the grind is not doubled.

**Presentation.**
- New Ash Priest sprite from `concepts/03-ash-priest.png`: horned skull under a red hood, bell-hung robes, a lantern staff. Pose 3 lifts the lantern during casts.
- `arena-enemy-telegraphs.js` adds the bash wedge (red, exact reach and arc), heal tether (green) and revive circle (violet). Support casts use non-danger hues because they never hurt the hunter.
- A thin bone-coloured arc marks each raised shield's blocking front; the Penitent sprite faces its shield. Remains draw as a fading ash pile.

**Balance check (25 runs × 48 combinations)**

| Build | Damage taken | Min HP | Defeats | Extracted | Wyrms reached |
|---|---:|---:|---:|---:|---:|
| Step 2 | 161 | 0.57 | 73 | 298 | 1.28 |
| Step 3 | 162 | 0.57 | 86 | 290 | 1.25 |

- Damage per run is unchanged; fights last slightly longer (kills 1247 → 1221, routes 15.3 → 15.1), which costs a few more runs at the margin.
- No stalls: run time and stop reasons are unchanged.
- Still below the 220–280 target; the Wraith, pack recipes and elites (steps 4–5) carry the remaining pressure.

**Tests.**
- `AshPriestBehaviorStateTests` and `PenitentBehaviorStateTests`: target lock, cooldown window, interrupt, revive priority, back-line movement, frontal-only block, turn rate, locked bash arc, guard break and guard point.
- `SupportPackTests` inside a real simulation:
  - The heal restores one ally only.
  - At most 2 revives per encounter, at half health, with no experience on the second death.
  - Rout then return.
  - Splash blocked from the front only.
  - The bash is telegraphed and counted against the cap.
  - Habitat plans never field a priest before three Ashlings.
- JS: bash, heal and revive geometry, the shield guard arc and remains fading.

## 10. Step 4: Drowned Wraith, pack recipes, director events

References: Hades' burrowing Wretched Sneaks and Monster Hunter's Jyuratodus (the tell is the threat, the recovery is the opening), Diablo's named monster packs (a group has a purpose), and Left 4 Dead's director (phases trigger events, not just faster timers).

**Drowned Wraith (new `EnemyKind` 6, `Ambusher`, threat 2, 0.85× HP, habitat-only).**
- **Submerged:** kept out of the enemy list entirely, so no spell, aura, chain or essence can touch it and it cannot touch the hunter. Shown only as a faint drifting ripple. It glides along walkable ground (never through walls) to an ambush point on a 50 px ring around the hunter, on its own side so pairs flank.
- **Emerging (0.8 s):** a bright ring closes onto the exact spot it will rise; still untargetable. If the hunter steps into the ripple (< 17 px) it sinks and picks another spot. It never rises on the hunter.
- **Windup (0.4 s):** materialized and targetable, the claw direction locked; red-edged cold wedge, 60 px reach, ±60°. **Strike:** 14 damage only inside the wedge.
- **Exposed (1.5 s):** slow (0.55×) and solid: the punish window. **Fading (0.45 s):** still targetable, then it sinks for 2.1 s and repeats.
- Emerging and windup count toward the committed-threat cap. After 6 s underwater it surfaces wherever it is (cap full or hunter kiting), so it can never hold a slot or stall a clear. Submerged wraiths count toward the active cap and node completion.
- Habitat-only: legacy pattern plans never field it; it lives in the Flooded Cloister and the Monastery Grounds.

**Pack recipes (brief §6, `EnemyPackRecipeCatalog`).**

| Recipe | Members | Home habitats |
|---|---|---|
| Wandering Dead | 5–11 Hollows | Outskirts (only), Village, Monastery |
| Hunting Pack | 3–6 Hounds, arriving in pairs from different sides | Wet Forest |
| Ashling Mob | 7–12 Ashlings | Open Field, Approach |
| Priest Warband | 5–8 Ashlings, then 1 Priest, 0–2 Slingers | Open Field, Village, Approach |
| Bastion | 1–3 Penitents + Hollows + a Slinger, or 1–2 Penitents + Ashlings + a Priest | Monastery |
| Drowned Watch | 4–8 Hollows with 1–2 Wraiths staggered between them | Flooded Cloister |
| Last Stand | 12–22 mixed, every role | Director climax only |

- A habitat plan opens with one weighted pack, then spends any leftover budget on the §4 fillers. Sizes are rolled, then the group with the most slack is trimmed until the pack fits the budget; a pack the habitat does not host (introduction policy) or cannot afford is skipped.
- **Director events:** entering Surge replaces the queue with the habitat's signature pack (Forest → Hunting Pack, Field → Ashling Mob, Monastery → Bastion, Cloister → Drowned Watch, Approach/Lair → Priest Warband). The Approach and Lair climax sends a Last Stand at 1.8× budget. The Outskirts tutorial never gets events.

**Presentation.** New wraith sprite from `concepts/07-drowned-wraith.png`: a drowned woman in cold blue-grey, soaked hair, rusted chain and cross, a shredded hem dissolving into droplets; pose 3 thrusts both claws forward. C# reports body opacity so the rise and sink fade match their windows.

**Balance check (25 runs × 48 combinations)**

| Build | Damage taken | Min HP | Defeats | Extracted | Wyrms reached |
|---|---:|---:|---:|---:|---:|
| Step 3 | 162 | 0.57 | 86 | 290 | 1.25 |
| Step 4 | 161 | 0.58 | 65 | 297 | 1.26 |

- The first version only emerged inside its ring; kiting bots kept wraiths underwater, holding cap slots and stalling clears (kills −31%). Forced surfacing after 6 s fixed it: kills 1221 → 1220, routes 15.1 → 15.2.
- Recipes alone left pace unchanged and made fights slightly more readable; damage is still under the 220–280 target, which elites (step 5) and the Reliquary are meant to lift.

**Tests.** `DrownedWraithBehaviorStateTests` (loop timing, ring band, forced rise, abort on the hunter, wedge, flank sides); `DrownedWraithTests` in a live simulation (untargetable and harmless while submerged, claw telegraph and cap, hit in front, miss after a dodge, sinks again, counts for clearing); `EnemyPackRecipeTests` (budget, habitat residents, priest order, wraith stagger, determinism, habitat identity); director events per habitat and none in the Outskirts; JS claw wedge and ripples.

## 11. Step 5: Ordinary elites

References: Diablo champions and Hades armored foes (one sharpened rule on a familiar silhouette), and Monster Hunter tempered monsters (same counterplay, less margin).

**Roll (`RunSimulation.Elites.cs`).** One roll per node, made in `ChooseMapNode`, never per spawn:
- 10% from stage 3 onwards. Never on the two introductory stages, never on the Outskirts tutorial road.
- At most one per node and two per hunt map. Nothing is guaranteed: about 45% of hunts meet one.
- The roll uses its own FNV hash of map seed, depth and node id, so it never shifts the spawn stream.
- A hit picks spawn 4–10 of that node. That ordinary spawn is promoted, whatever its kind; if the node ends sooner, there is no elite.

**Stats.** +35–60% HP and +10–25% attack impact (bites, bashes, embers, claws, contact), with no cadence change. Each elite drops one shard worth 2.5× its threat cost. The payout is recorded once as a typed `EliteDefeat(Kind, Affix, ExperienceAwarded)`; that is the hook for future loot. An elite Ashling leaves no remains, so it can never be raised.

| Affix | Base | HP / impact | Power | Counterplay |
|---|---|---|---|---|
| Gravebound | Hollow | 1.5 / 1.15 | On death, a 60 px ground blast after 0.9 s (16 damage) | Step out of the violet ring |
| Packblood | Ashling | 1.6 / 1.1 | Ashlings within 150 px run 15% faster and ignore the priest-death rout | Kill it first |
| Ember Anointer | Ash Priest | 1.4 / 1.1 | Heal restores 70% instead of 45%, same tether | Interrupt the cast |
| Cinder Marksman | Ash Slinger | 1.4 / 1.15 | A second ember 52 px to the side, landing at 0.9 s | One sidestep clears both marks |
| Thornrunner | Mire Hound | 1.45 / 1.2 | Switches flank once (0.4 s) before every pounce | Wait for the lane |
| Oathshield | Penitent | 1.35 / 1.1 | Shield blocks 90% instead of 75% | Flank it or land a heavy hit |
| Drowncaller | Drowned Wraith | 1.45 / 1.2 | Its strike leaves a 40 px echo that bursts after 0.7 s | Leave the ripple |

**Presentation.**
- A dashed sigil and a small diamond crest in the affix colour; no boss bar.
- A compact low-screen callout names the elite and its counterplay. "ELITE SLAIN +N XP" confirms the payout.
- The grave and echo blasts are ground marks only: a red danger edge, filled with the affix hue.

**Balance check (25 runs × 48 combinations).** Elites are rare enough to leave pace intact: kills 1220 → 1219, damage 161.2 → 161.0, defeats 65 → 63, extracted 297 → 304.

**Tests.** `EliteEncounterTests`:
- Distribution over 2000 seeded hunts, and roll determinism.
- Promotion of the k-th spawn, the stat bands, and a single payout.
- Each of the seven powers, plus no remains from an elite Ashling.

JS tests cover the sigil, the crest and the grave/echo marks.

## 12. Step 6: The Reliquary

References: the Diablo treasure goblin and Hollow Knight's hidden fights (rare, never guaranteed), Hades' Elysium champions (a duel with a readable rite kit), and Monster Hunter's tempered monsters (the arena turns against you, but every hit is telegraphed).

**Rarity (`RunSimulation.Reliquary.cs`).**
- One 6% roll per hunt (`IsReliquaryHunt`), on its own FNV seed, so it never shifts the spawn or elite streams. It is separate from `WyrmrealmNodeRarity.Rare`.
- It appears at most once, on the first eligible node walked: a Combat node at stages 4–7 in Monastery Grounds, Flooded Cloister or Scorched Approach. A node with the Reliquary never also gets an elite.
- No reveal happens during mop-up: once the node objective is met, the chance passes silently.

**Reveal.**
- After 8 s on the node, the hunt **hushes** for 1.2 s. Enemies, embers and timers freeze; your spells still run.
- A gilt sigil draws itself on one of 8 seeded compass spots, at least 240 px away and pushed off walls.
- It **emerges** over 1.4 s exactly where it will fight. A "THE RELIQUARY" callout and the hunt horn mark it.

**Duel kit** (HP 15× base, slow, weak contact). Its rites cycle Ward → Corruption → Seal with readable casts:

| Rite | Tell | Effect | Counterplay |
|---|---|---|---|
| Ward | Gilt ring on the Reliquary, 1.1 s | Plants a ward (HP 2.4×) 70 px away; at most 2 live, 8 per fight | Kill the wards: while any stands, the Reliquary takes 40% damage and the chain shows which ward |
| Ward power | Crimson ring at minion feet | Minions within 150 px of a ward move 20% faster and hit 25% harder | Fight away from wards |
| Ward fuse | Red landing mark for the last 3 s of its 13 s life | Bursts for 14 in 70 px | Leave the ring, or break it early |
| Corruption | Dashed outline at the pool, 0.9 s | A 64 px pool arms over 1 s, then burns 9 dps for 4.5 s; at most 3 | Step off; pools never spawn on a seal |
| Seal | Dashed gilt outline at your position, 0.8 s, then a 1.8 s mark | A 90 px blast for 24 | One dash clears it |

- **Deepening** at 50% HP: a 2 s gilt ring, a "THE RITUAL DEEPENS" callout, wider seals (110 px) and shorter gaps between rites.
- **Fairness.** Wards and the Reliquary never count toward the node objective, so clearing the road is always possible. A frozen Reliquary pauses its rites and ward fuses.
- **Payout.** Wards pay nothing. The Reliquary pays once: score, a 20 XP shard and a typed `ReliquaryDefeat` (the hook for C.2 reagents). Its death ends every rite.
- **Withdrawal.** If the road is cleared first, it withdraws ("THE RELIQUARY WITHDRAWS") and is gone for the hunt.

**Presentation.**
- Sprites: a crimson-robed bearer with a censer crown, and a gilt ward lantern (atlas kinds 7 and 8).
- A screen-edge hush veil, a distinct duel bar ("THE RELIQUARY", a WARDED state and a half-health notch), ward chains and corruption pools (`arena-reliquary-vfx.js`).
- The Codex shows it as a ◆ Unique: one kill reveals the full entry, and it has no elite form.

**Balance check (25 runs × 48 combinations).** At 6% on late nodes it barely moves pace: kills 1219 → 1219, damage 161.0 → 161.2, defeats 63 → 64, extracted 304 → 304.

**Tests.**
- `ReliquaryEncounterTests` (9): seeded rate, once-per-hunt and eligibility, hush, phase shift and ward cap, wards, the ward burst, a single payout, withdrawal, and rite marks.
- `ReliquaryBehaviorStateTests` (7).
- JS: `arena-reliquary-vfx.test.mjs`, plus the rite telegraphs and seal/ward marks.

## 13. Next steps (brief §10 order)

7. Bell Warden on the pre-lair beat, and Ashfang on the first hunt only.
