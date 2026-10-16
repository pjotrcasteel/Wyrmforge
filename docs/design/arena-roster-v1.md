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
- Priest goes to Hollow.
- Slinger and Wraith (telegraphed harassers) go to Mire Hound.

Without the stand-ins, the late cloister roads would lose their harassment pressure. The effective weights today:

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

## 9. Next steps (brief §10 order)

3. Ash Priest (revives at most 2) and the Penitent directional shield.
4. Drowned Wraith and pack recipes (Wandering Dead, Hunting Pack, Ashling Mob, Priest Warband, Bastion, Drowned Watch, Last Stand).
5. Ordinary elites: 10% per eligible node after node 2, at most 1 per node, +35–60% HP, 2–3× XP.
6. The Reliquary: 6% once per hunt, distinct from `WyrmrealmNodeRarity.Rare`.
7. Bell Warden on the pre-lair beat, and Ashfang on the first hunt only.
