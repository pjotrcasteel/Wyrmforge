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

## 8. Next steps (brief §10 order)

2. Hound flank + pounce tuning and the Ash Slinger lob, plus new pixel silhouettes for all kinds.
3. Ash Priest (revives at most 2) and the Penitent directional shield.
4. Drowned Wraith and pack recipes (Wandering Dead, Hunting Pack, Ashling Mob, Priest Warband, Bastion, Drowned Watch, Last Stand).
5. Ordinary elites: 10% per eligible node after node 2, at most 1 per node, +35–60% HP, 2–3× XP.
6. The Reliquary: 6% once per hunt, distinct from `WyrmrealmNodeRarity.Rare`.
7. Bell Warden on the pre-lair beat, and Ashfang on the first hunt only.
