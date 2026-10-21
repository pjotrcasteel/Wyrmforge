# Creatures and encounter ecology

> **Canonical WyrmForge specification · updated 20 October 2026.** Original grounded Gothic enemies; roster plans and implementation evidence remain distinct.
> [Canonical index](README.md) · Only explicitly marked **LOCKED/approved** requirements are commitments. Proposed values, old milestones and drafts are not evidence of shipped code. Verify current `main`, PRs and tests.

## Hard identity and acceptance rules

### Ashfang animation direction — owner request, 20 October 2026

**21 October body/head performance review:** owner accepts the V48 body appearance and rejects the head. Preserve the accepted body proportions, armour, tail and repaired wings while reworking the skull/face. Airborne wrists/ankles and claws must carry and curl organically rather than retain a straight standing-foot pose; toes open in preparation for landing. Use attributable animal/performance references, purposeful joint poses and delayed responses. Body acceptance does not approve the head, whole animation library or runtime integration.

**Five-tier scale clarification — owner direction, 20 October 2026:** every Wyrm lineage has five tiers. The Ashfang currently in production is **Tier I**, the smallest, with an approximate normal grounded silhouette width of **15–25% of the visible gameplay width**. Tier V is a **Divine Wyrm embodying its magic type**, approximately screen-wide. Tiers II–IV grow between these endpoints; their exact sizes and any unresolved names are not fixed by this clarification. Measure against the gameplay viewport, not atlas-cell padding or the entire browser window. **21 October owner clarification:** fit Ashfang and aerial paths to the current portrait Hunt camera/viewport and HUD, preserving the current player visual size even when that player model is replaced. **Owner fit correction:** the approximately 15% viewport fit was rejected as too small and butterfly-like. Aim toward the upper end of Tier-I size with a threatening, substantial body and lower folded wings; keep the player unchanged and review the actual silhouette again. Wingspan, breath and other action extensions may exceed the ordinary grounded footprint. This is an art/encounter direction; existing shipped stat/radius scaling is not silently changed to fit it.

Build a persistent, deformable Ashfang from the existing Cinder Wyrm concept card, with extra creative freedom inside its volcanic Gothic identity. Required performance scope: grounded walking, raised/sitting posture, fire breath, takeoff and flight/overflight; landing and coherent transitions connect those states. Preserve recognisable horns, heavy chest, separate wings, four walking limbs and long tail. This is an approved production direction, not evidence that the source model, animations or aerial gameplay are implemented.

**21 October fire-identity correction:** the owner rejects the subdued grey stone-only surface. Ashfang must visibly read as an epic, threatening fire wyrm: molten breaks beneath dark armour, living flames coming off the body/spine/tail, and strong heat at the chest and mouth. Preserve accepted anatomy and organic motion. Judge the combined surface and animated fire at native mobile size; emissive eyes alone do not satisfy the elemental identity. This is art direction, not a new damage aura or shipped encounter behavior.


**21 October owner addition:** Ashfang also needs a powerful high launch that takes him out of the gameplay viewport, followed by arena flyovers breathing fire downward onto the ground and a return/landing. **Owner clarification:** the launch pitches Ashfang nose-up toward the sky and accelerates exponentially while visible; during the flyover phase his body stays above the screen. Players see the ground indication, a moving dragon-shaped shadow and fire striking the arena, then his visible return. Preserve the approved Tier-I anatomy and immediate first wingbeat. This is required encounter/art scope; source previews do not establish implemented damage, hazard persistence, aerial targetability or collision rules. Those remain explicit C# integration work.

Current simulation still owns grounded pursuit, telegraphed cone breath and phase scaling. Aerial encounter integration must explicitly define altitude, ground projection/shadow, dangerous flyover paths, targetability/collision and transitions in C#; do not grant new immunity or damage through a visual-only change. Production research/evidence: `art/source/enemies/ashfang/design-brief.md` (repository root). The owner-approved Ashling release remains unchanged.

- Four elemental creature families are currently established for expansion: **Fire, Frost, Storm/Electric and Arcane**. Build out an existing family rather than inventing arbitrary new elemental taxonomies. Demons, undead and cursed beasts suit the dark Gothic setting; avoid generic aliens, tentacles and disconnected high-fantasy art.
- Existing game enemies must retain compatible `EnemyKind` identities and saved contracts. Encounter spawning, collision, hit results and reward legitimacy remain C# authority; animation is visual.
- A rendered monster needs legible silhouette, physical feet/contact, real attack timing, hit reaction and recognizable death. Do not claim the whole roster has animated sprites because the Hollow works. [Sprite proof](../art/hollow-runtime-integration-2026-10-20.md); [layering](../art/shared-sprite-animation-layers-2026-10-20.md).
- The following two dated roster documents are preserved *in full* for creature names, habitat recipes and proposed future compositions. Their old build/status statements must be verified against HEAD and do not imply all entries have shipped.

## Fire and first-Hunt ecology

Status: **Step 1 of 7 shipped** (habitats, renamed roster, safe spawns). Source brief:
`user_handover_files/WyrmForge_First_Hunt_Encounter_Design.md` (§2 roster, §4 habitats, §5 beats, §6 spawns, §10 order).

### 1. Why habitats first

Every later roster step (Hound flanks, Slinger lobs, Priest revives, Wraith water, elites, the Reliquary,
the Bell Warden) needs to know *where* a fight takes place. Today a depth has one macro biome and every
node draws from the same three role-weighted patterns, so a forest trail and a burnt meadow play the same.

Successful references:
- **Monster Hunter** — a monster's habitat is part of its identity; you learn where Jagras packs live.
- **Hades** — each biome has its own roster, so the route itself teaches what is coming next.
- **Slay the Spire** — the act's encounter pool, not raw numbers, sets difficulty; elites are a visible route choice.
- **Vampire Survivors / Brotato** — the spawn direction is a readable rule, never a surprise on top of the player.

### 2. Roster renames (same `EnemyKind` ints, so saved data and sprite atlases stay valid)

| Old | New | Why it maps |
|---|---|---|
| `Chaser` (0) | **Hollow** | Baseline shambler, threat 1 |
| `RiftStalker` (1) | **Mire Hound** | Its windup → lunge is already the Hound's flank-and-pounce |
| `Skitter` (2) | **Ashling** | Fast, fragile swarm demon |
| `Brute` (3) | **Penitent** | Slow, heavy, high contact damage; the shield arrives in step 3 |

Sprites still show the legacy silhouettes until step 2 redraws them.

### 3. Habitats

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

### 4. Composition

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

### 5. Spawn origins and safety

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

#### Balance check (BalanceLab, 25 runs × 48 combinations)

| Build | Damage taken | Min HP | Defeats | Extracted | Wyrms reached |
|---|---:|---:|---:|---:|---:|
| Before (HEAD `1be0fcd`) | 280 | 0.43 | 158 | 299 | 1.24 |
| Safe spawns only | 148 | 0.59 | 85 | 294 | 1.29 |
| Habitats + safe spawns (this step) | 144 | 0.60 | 62 | 293 | 1.30 |

The old fallback put 6.3% of spawns on top of the hunter or within 150 px. That accounted for roughly half of all damage taken, which is exactly the "fake difficulty" the brief forbids. Habitats themselves are close to neutral.

**Decision:** keep the fair spawns, and don't paper over the gap with hidden HP or budget inflation. Steps 2–4 restore pressure through readable threats: Slinger lobs, Hound flanks, Priest revives and Wraith ambushes. That is how Hades and Vampire Survivors earn difficulty.

**Target:** by the end of step 4, BalanceLab damage taken returns to 220–280 with defeats concentrated in the Greedy agent.

### 6. Presentation

- The C# environment snapshot carries `habitat`.
- `arena-environment.js` applies a restrained full-field wash per habitat (alpha ≤ .15, so telegraphs stay readable).
- The landmark text is now the habitat name.
- The full tile and prop redesign is still deferred to the story phase.

### 7. Tests

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

### 8. Step 2: Hound pounce, Ash Slinger, new silhouettes

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

### 9. Step 3: Ash Priest, Ashling morale, Penitent shield

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

### 10. Step 4: Drowned Wraith, pack recipes, director events

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

### 11. Step 5: Ordinary elites

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

### 12. Step 6: The Reliquary

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

### 13. Step 7: The Bell Warden and first-hunt Ashfang

References: Monster Hunter's arena entrance (the monster is marked before it can act), Hades' Asterius (lane charges previewed on the floor), Hollow Knight's mid-bosses (a short readable kit and a mid-fight change), and Hades' phase thresholds (a burst never skips the second phase).

**Where (`RunSimulation.BellWarden.cs`).**
- Every combat road that leads straight into the lair (`WyrmrealmMapNode.PreLair`, set from route-graph predecessors of the Wyrm node) is the Warden's road, on every hunt. That is a graph rule, not a stage number.
- The road has no horde, no elite and no Reliquary: one monumental threat at a time. The encounter director is not ticked there.
- After the entry grace the bell **tolls** for 1.6 s and a bronze sigil marks the spot where it will stand (260 px ahead, then the compass points; no randomness consumed). It then steps out and the fight begins.
- The road completes when the Warden falls and its adds are gone. Its fall also opens every courtyard gate, since the director that normally opens them never runs here.

**Kit** (HP 18× base, speed 0.5×, radius 30). The cycle is Smash → Toll → Smash → Rally, with a 1.4 s gap (1.0 s once cracked):

| Move | Tell | Effect | Counterplay |
|---|---|---|---|
| Smash | Crater mark (95 px) where it will land, 1.15 s | 26 damage in the crater, then a shockwave | Leave the crater |
| Shockwave | Crater charge sweep plus a dashed ring at 300 px, 0.55 s | A 26 px band rolls out from 95 to 300 px over 0.9 s; it hits once for 10 | Step *into* the crater, or stay beyond the dashed ring |
| Toll | Six hollow rings along the lane, filling, 1.0 s | Pulses ripple outward (70 + 74·i px, 40 px each, 15 damage) | Step out of the lane |
| Rally | Gilt ring on the Warden, 1.3 s | 2 adds (3 once cracked), alternating Hollow and Ashling; at most 4 live and 12 per fight | Kill them, or ignore them for the Warden |

- If the hunter is more than 230 px away, a Smash becomes a Toll. A Rally at the add cap becomes a Toll, never a wasted turn.
- **Crack** at 50% HP: a 1.8 s stagger that cancels any windup (a free damage window), a "THE BELL CRACKS" callout, then the toll fans into three lanes at ±25° and the gap shortens.
- **Phase gate.** Damage past half health is discarded until the crack begins, and reaching half health starts the crack from the blow itself, so a frozen or stunned Warden still cracks.
- **Payout.** Pays once: score ×8, a 24 XP shard and a typed `BellWardenDefeat`. Its adds crumble with it, and its tolls and shockwaves clear.

**First-hunt Ashfang (provisional).** The first hunt always climaxes with Ashfang (brief §5), after the Ascendant rule. Later hunts still roll their Wyrm. The Ashfang polish slice (telegraph and phase clarity, no new mechanics) is deferred to the story phase.

**Presentation.**
- Sprite: a skull-helmed, spiked bell-bearer with a lantern and a red tabard (atlas kind 9); the bell is raised overhead on its windup pose.
- `arena-bellwarden-vfx.js`: the tolling sigil and entrance fade, shockwave rings (crater, charge sweep, dashed max reach, the hurting band at its exact thickness) and a "THE BELL WARDEN" bar with a CRACKED state and a half-health notch.
- `arena-enemy-telegraphs.js`: `bell-smash`, `bell-toll`, `bell-toll-fan`, `bell-rally`, `bell-crack`, and the `toll` pulse mark.
- Callouts: "THE BELL WARDEN" with the hunt horn, "THE BELL CRACKS", and "THE BELL FALLS SILENT" with the reward cue.
- The Codex lists it as a ◆ Unique.

**Balance check (25 runs × 48 combinations).** The Warden road replaces a horde road, so kills drop (1219 → 1136). Danger is unchanged: damage 161.2 → 159.0, defeats 64 → 59, extracted 304 → 299, Wyrms reached 1.26 → 1.38.
- Fight length varies with build: about 1–6 s for burst Fire builds and 20–57 s for Frost kiters. Every hunter now sees the crack. If burst kills still feel too short in playtests, cap stagger damage before raising HP, because raising HP punishes slow builds.
- A first run of the lab found that the sealed courtyard trapped every hunter after the kill, and a phase gate without the damage-path crack stalled frozen Wardens. Both are fixed and covered by regression tests.

**Tests.**
- `BellWardenEncounterTests` (8): the pre-lair graph, the toll entrance with no horde/elite/Reliquary, the bounded rally, the smash and its safe crater, the shockwave hitting once, the phase gate, a single payout that opens the road and gates, and first-hunt Ashfang.
- `BellWardenBehaviorStateTests` (6).
- JS: `arena-bellwarden-vfx.test.mjs`, plus the kind 9 art.

#### Presence scale

Rare enemies must read as rare at a glance (Diablo champions, Hollow Knight bosses):
- Elites: body ×1.25 (`EnemyState.EliteSizeScale`).
- Reliquary: radius 22 → 27. Bell Warden: 30 → 38. Both outsize any elite.
- Wyrms: radius ~1.75× (Ashfang 60, Stormcoil 56, Rimeclaw 61, Voidweaver 54), and Ascendants another ×1.15 (`WyrmTierCatalog`).

The sprite follows the radius, so hit area and silhouette always match. BalanceLab (1,200 runs) is unchanged within noise: dragons slain 1.37 → 1.38, damage 159.0 → 157.1, per-element shifts ≤ 0.04.

### 14. Next steps

The encounter brief's order is complete. The next work follows the reconciliation record: Frost telemetry (Fateweave has shipped), the first Nexus journey, then a contextual second auto-cast.

---

## Frost-region ecology

- **Status:** F1, F2 and F3 shipped. The region is still **Planned**; the kinds are `HabitatOnly` and no habitat lists them yet, so no live run spawns them.
- **Sources:** amendment §11.5 (progressive world content), `user_handover_files/concepts/Frost/01–09`, owner direction (2026-10-18): "don't make an exact copy so it feels like a recoloring; make Ice feel different".

### Identity: Fire pressures, Frost boxes in

The Cinder kin threaten with damage over time and pressure: burning ground, embers, pounces. Frost threatens your **space and tempo**:

- **Chill** (hunter status) slows instead of burning. Each stack gives 8% slow, up to 5 stacks (40%). Stacks hold for 1.6 s, then thaw one every 0.5 s. A 0.2 s gate stops a single attack from stacking several times. Chill **never** fully freezes the hunter (control loss reads as unfair on mobile; Hades/Diablo IV use slows, not stuns, on the player).
- **Black ice** changes footing rather than dealing damage. On a patch, velocity eases toward input (grip 2.6/s), so you slide. It adds 1 Chill every 0.6 s.
- **Lanes, not blobs.** Frost attacks are ruler-straight lines and their end-points, so they box the hunter in. Fire attacks are circles and arcs.
- **Red edge rule.** Every attack keeps the shared red danger edge across realms. Black ice is a footing hazard, so it gets a cold edge.

### F1 kinds

| Kind | Role | Behaviour | Counterplay |
|---|---|---|---|
| **Frostling Packling** (10) | Pressure, cost 1 | Packs circle on a shared ring (r 92, slot by golden angle) instead of rushing. Each in turn telegraphs a short skitter-bite: 6 damage, ×1.75 against a chilled hunter, +1 Chill. Against a chilled hunter its cooldown runs twice as fast: the pack smells the slow. | Keep Chill off and the pack stays polite; break the ring with knockback. |
| **Shardcaster** (11) | Artillery, cost 2 | Planted caster that keeps 200–320 px away. It casts on a rhythm of Lance, Patch, Lance, Lance, Patch… then glides sideways. **Ice lance:** a long telegraphed lane (9 damage, +1 Chill) that stops at walls; a **splinter bloom** (r 40, 8 damage, +1 Chill) erupts 0.75 s later wherever the lance stopped. **Black ice:** a glaze mark that becomes a 7 s patch (at most 4 patches). A hit of 30% health during the aim interrupts the cast. | Step out of the lane *and* away from its end; burst it during the aim. |

### F2 kinds

| Kind | Role | Behaviour | Counterplay |
|---|---|---|---|
| **Whitefang Stalker** (12) | Ambusher, cost 2 | Prowls at ~190 px, then works toward the point **behind your heading**. A **Snowblind Feint** (0.3 s) dashes sideways and leaves a snow cloud (r 46, 2.4 s, drawn above actors so it hides things; standing in it adds 1 Chill every 0.8 s). The pounce lane locks when the feint ends, then a 0.5 s windup and a 170 px pounce: 10 damage and **Tendon Chill** (+2). No contact damage during the feint. | Keep turning to face it; sidestep the locked lane; knockback or a Warding Pulse defuses the windup. |
| **Cairn Sentinel** (13) | Pressure, cost 3, depth 2+ | Slow armoured march. Within 160 px it plants a **Frost Brace** (1.1 s): facing locks, frontal hits (±60°) take ×0.3 and it is immovable. It ends with an **Avalanche Step**: a frontal wave across the same ±60° arc out to 170 px (9 damage, +2 Chill, only the wave's edge hits, once). During the 1.1 s recovery every hit takes ×1.25. | Flank it: neither the brace nor the wave reaches its sides or back. Punish the recovery. |

### F3 kinds

| Kind | Role | Behaviour | Counterplay |
|---|---|---|---|
| **Hoarfrost Cantor** (14) | Support, cost 3 | Keeps 220–340 px back, near its pack. **It never heals and never shoots** (unlike the Ash Priest's single-target heal). Chants breakable rites: **Stillness Verse** (1.2 s, only if you are within 130 px: 4 damage, +3 Chill); **Reknit** (1.4 s: a fallen Frostling leaves a **rime husk** for 9 s, and the Cantor pulls it back up as a thrall at 50% health and 0.8 speed; at most 2 per Cantor; a thrall that falls again shatters for good); **Rime Hymn** (1.6 s, needs 2+ unarmoured allies in 200 px: each gains a **rime crust** of 35% max health for 10 s that soaks damage first; never the Cantor itself or other Cantors). Losing 15% health during a chant, a shove or a Warding Pulse **silences** it for 1.6 s. | Go for the Cantor first and break its chant with a burst. |
| **Mirror Wisp** (15) | Ambusher, cost 2 | Always visible but **veiled**: half opacity, and while drifting or shimmering it takes ×0.5 damage. Every ~4.2 s a **Glass Step**: it shimmers (0.55 s) at a reflective spot (a **black-ice patch** 60–320 px from you when one exists, else 56 px beside you), then steps through. It leaves a **reflection double** (16) where it stood (3.5 s, harmless, not a hostile, pays nothing). A 0.45 s windup locks the **Shiver Cut**, a ±50° arc out to 74 px (8 damage, +1 Chill); then it is **exposed** for 0.9 s (×1.4 damage). | Watch the landing diamond, step out of the arc, punish the exposed window, ignore the double. Black ice makes it more dangerous: Frost kin combine. |

The Wisp's step point was first 90 px from you, outside its own 74 px cut, so it could never hit; it now lands at 56 px, so the cut reaches you unless you move during the windup.

The Sentinel wave started as a full ring; a ring growing from the centre leaves no safe answer, so it became a frontal wave that rewards the same flank that beats the brace (For Honor guard stance, Dark Souls shield knights).

References: Diablo necromancer corpse use (husks), Hades' Satyr Cultist chants and Path of Exile totems (breakable support rites), Hollow Knight shade decoys and Nioh's Yuki-onna (Wisp), Hades' Wretched Witch / Gungeon lane tells (lanes), Risk of Rain and Hades pack orbiting (Packling ring), Celeste/Zelda ice physics (black ice slide).

### F4b set piece: the Bell of Winter (17)

The Frost lair road. It shares the Bell Warden's road semantics (entrance toll, no horde, no elite or Reliquary, the road opens when it falls) but fights the other way round: **it never calls reinforcements**; it closes the ground instead. Unique, radius 40, ×18 health, 0.42 speed; it only walks between moves. Its moves cycle **Slam → Toll → Slam → Recall**, and every move has a long tell and a long recovery: panic and greed are both punished.

| Move | Tell / recover | Effect | Counterplay |
|---|---|---|---|
| **Permafrost Slam** | 1.3 s / 2.2 s | A crater 60–140 px ahead (90 px radius: 24 damage, +2 Chill). It leaves 3 **permafrost scars** (230 px long, 15 px half-width, 10 s; at most 8, oldest first), fanned out with the first one toward you. A scar is black ice: no grip, and it chills. If you are beyond 260 px, it tolls instead. | Step out of the crater; plan your footing around the scars. |
| **Winter Toll** | 1.1 s / 1.6 s | 3 freezing rings from the bell, 0.45 s apart, each rolling from 50 to 360 px in 1.3 s (24 px band: 9 damage, +1 Chill, once per ring). Every ring has 3 **open lanes** (±17°). The first ring never opens straight at you, and each later ring turns by half a lane step. | Stand in a lane, then shift to the next one. |
| **Icicle Recall** | 1.4 s / 1.9 s | Marked icicles fall 0.85 s later (40 px: 14 damage, +2 Chill): one on your spot at the tell, plus one on the middle and one on the tip of every scar. **The scars are used up.** On an empty floor (or in Deep Winter) four more ring your spot. At most 10. | Leave the marks; the floor is clear again afterwards. |

**Rime (half health):** overflow damage stops at 50%. The bell rimes over for 2 s, a free window: it does not move or act, and hanging icicles melt. Then comes **Deep Winter**: 4 rings, 4 scars, recall always rings you, and 0.9 s between moves. Its fall thaws every scar, ring and icicle.

Why: the Fire Warden pressures you with lanes to outrun and a rally of adds; the winter bell **boxes you in** with ground that stays and walls you can only cross through their gaps (Hades' Asterius and Theseus lanes, Enter the Gungeon bullet-ring gaps, Dark Souls' Bell Gargoyles/Old Iron King for the bell set piece, Elden Ring's frost-ground persistence). The scars → recall loop makes the floor itself the rhythm: it fills up, then it is called down and cleared.

### F4c rare boss: the Reliquary of Glass (18), Crystal Ward (19), false form (20)

The Frost Reliquary. It shares the Fire Reliquary's encounter (the sigil, hush and emergence on a Frost Reliquary habitat: Mirror mere, Cairn barrows, Buried hamlet; the reward and the withdraw clock). Where the Fire Reliquary pressures with seals and corruption, the glass one **boxes you in**: it builds walls of light and cages and hides among copies of itself. Unique Support, radius 27, ×15 health, 0.5 speed, light contact damage; immovable by Warding Pulse; it keeps 220–340 px away. Rites run from a fixed order, **Ward → Prison → Veil → Prison** (after the shift **Ward → Veil → Prison → Prison → Veil → Prison**), with 1.2 / 1.0 / 0.9 s casts, a 1.2 s recovery and a 2.2 s gap (1.6 s after the shift). A Ward rite is skipped while 3 crystals stand; a Veil rite is skipped while already veiled.

| Rite | Effect | Counterplay |
|---|---|---|
| **Crystal Ward** | Raises a crystal pylon (kind 19, ×2.6 health, unmoving) 110 px from the caster; at most 3 standing and 9 per fight. While any crystal stands, the Reliquary takes ×0.35 damage. Each crystal **kindles a tether** to the Reliquary (0.9 s dashed thread), then it burns: crossing a lit tether (7 px half-width) deals 7 damage and +1 Chill, at most once a second per pylon. | Break the crystals first: they shield it and they wall the arena. |
| **Glacial Prison** | One cage gathers over **you** (tracking, 1.2 s), plus one per standing crystal, fanned 150 px ahead of you (where a retreat would run). A cage is 72 px; after it rises it stands for 4 s. Crossing its wall either way deals 10 damage and +2 Chill (0.6 s cooldown); standing inside chills. At most 6. | Keep moving while it gathers; don't fight from inside a cage. |
| **Refraction Veil** | Shatters into a ring of mirrored forms (kind 20; 2, or 3 after the shift) 120 px around a seeded true slot; the true body moves there. All of them move alike and look alike: only **the true body's lanterns are lit**, the false forms' are dead. A false form breaks in one hit. Hitting the true body **breaks the veil**: the forms shatter and it is **exposed** (1.8 s stagger, full damage). After 7 s the veil fades and every remaining false form closes a prison: the first on you, the others 150 px toward each form. | Find the lit lanterns; strike the true body fast, or the copies become cages. |

**Shatter (half health):** overflow stops at 50%; a 2 s shatter (it drops any veil), then the deeper rite order with shorter gaps and three false forms. Its death or withdrawal clears every crystal, tether, form and cage.

Why: the Fire Reliquary is a damage race through wards; the glass one turns the arena against you, as the concept asks (crystal wards, mirror deceptions, prison zones). References: Path of Exile totems and Diablo's Pylons (breakable empowering pylons), Hollow Knight's Soul Tyrant / Dark Souls' Pinwheel and Dancer clones with a tell (find the true body), Hades' Theseus walls and the Zelda/Elden Ring cage traps (prisons that punish standing still).

### Implementation

- Domain: `HunterChillState`, `FrostlingPacklingBehaviorState`, `ShardcasterBehaviorState`, `WhitefangStalkerBehaviorState`, `CairnSentinelBehaviorState`, `HoarfrostCantorBehaviorState`, `MirrorWispBehaviorState` (+ `MirrorDoubleState`); `EnemyRealm` on `EnemyDefinition`.
- Application: `RunSimulation.Frost.cs` (lances, blooms, patches, snow clouds, avalanche waves, Chill, slide, telegraphs, snapshots) and `RunSimulation.FrostRites.cs` (Cantor rites, rime husks and crust, Wisp step, doubles and cut). The brace multiplier only applies to projectiles and splashes (accepted limitation). Rime crust soaks all `DamageTarget` damage.
- Elites (F4a): six Frost affixes, one per non-unique kind. **Rimehowl** (Frostling: +2 Chill per bite), **Splinterwright** (Shardcaster: the lance blooms along its lane every 90 px), **Twinfang** (Whitefang: a second pounce after a 0.3 s recover), **Barrowlord** (Cairn Sentinel: a second avalanche ring 0.45 s later), **Choirwarden** (Cantor: hymn radius ×1.8), **Thousandface** (Mirror Wisp: a second double, 46 px aside). Mirror doubles never become elites.
- F4b: `BellOfWinterBehaviorState` (Domain); `RunSimulation.BellOfWinter.cs` (scars, rings, icicles, telegraphs, snapshots), with the bell road in `RunSimulation.BellWarden.cs` choosing its set piece per region school (`BellRoadKind`). Permafrost counts as black ice in `PlayerOnBlackIce`. Rendering: `arena-winterbell-vfx.js` (scars, laned rings, icicle marks and drops, winter telegraphs); the bar and entrance in `arena-bellwarden-vfx.js` follow the snapshot `variant` ("fire"/"winter"). Sprite: kind 17, a gaunt horned keeper dragging an icicle-fringed bell.
- F4c: `GlassReliquaryBehaviorState` (Domain; reuses `ReliquaryPhase`); `RunSimulation.GlassReliquary.cs` (crystals, tethers, false forms, prisons, telegraphs, snapshots). `RunSimulation.Reliquary.cs` now picks its Reliquary per habitat school (`ReliquaryKind`) and reports a snapshot `Variant` ("fire"/"glass") with `Veiled`/`Exposed`. Rendering: `arena-glass-reliquary-vfx.js` (tethers, prison floors and bars, the lantern tell, glass telegraphs); the sigil, hush, emergence and bar in `arena-reliquary-vfx.js` follow `RELIQUARY_THEMES`. Sprites: kind 18 (pale celebrant, gilt halo, a yoke of four crystal lanterns), 19 (crystal pylon), 20 (kind 18 with dead lanterns).
- Rendering: `arena-frost-vfx.js` (lane/skitter/glaze telegraphs, black ice, splinter bloom, lance, the chill rime with one crystal per stack, flank-pounce lane, avalanche front, avalanche wave, snow cloud, rime hymn / stillness rings, reknit thread, glass-step diamond, shiver-cut arc, rime husk, rime crust). Sprites: `tools/art/sprites/enemies.mjs` kinds 10–16. F3 also fixed `ENEMY_KIND_COUNT` in `arena-enemy-art.js` (was 10, which clamped every Frost kind to the Bell Warden sprite in-game).

### Plan

- ~~F2~~ and ~~F3~~ shipped (see above).
- ~~**F4a:**~~ Frost habitats (Frozen road, Snowbound pines, Whiteout plain, Buried hamlet, Cairn barrows, Mirror mere, Glacier approach, Glacier lair) and pack recipes (Packling litter, Whitefang hunt, Shard line, Cantor rite, Cairn wall, Wisp veil; last stand: Whiteout), Frost elite affixes, Frost territory names (Snowbound vale, Rimewall heights, Glacier basin), the snow biome (tiles, drifts, ice patches, snow pines, cairns, icefall, buried sledge, pale walls), `glacier-region` → Playable as **The Hoarfrost Reaches** (provisional: opens once Ashfang is slain; Ashfang is Absent there) and the World Gate region picker. A hunter's first hunt in a new region culminates in its home Wyrm but is a full hunt (`regionOpening`), unlike the tutorial First Hunt.
- ~~**F4b:**~~ Bell of Winter (the Frost lair road; see above).
- ~~**F4c:**~~ Reliquary of Glass (the Frost rare boss; see above). The Frost roster is complete.
- All numbers are provisional; balancing waits for the final pass (owner decision 2026-10-18).
