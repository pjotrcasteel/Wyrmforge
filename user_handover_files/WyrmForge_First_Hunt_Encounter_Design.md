# WyrmForge — The Perfect First Hunt
## Monster ecology, randomized encounters, elites, the rare Reliquary and Ashfang

**Status:** Proposed design / Claude implementation handoff — **not implemented**.  
**Game:** WyrmForge (https://github.com/pjotrcasteel/Wyrmforge)  
**Design baseline:** 16 October 2026.  
**Creative direction:** Original dark, grounded gothic fantasy inspired by the mood and tactical monster relationships of Diablo I/II. Maintain the established slate-blue mage, credible architecture, world-anchored 2.5D depth, and strong combat readability on mobile. All artwork in the accompanying `concepts/` directory is **reference art**, NOT production-ready sprites.

## 1. Desired first-hunt experience

The player starts by easily incinerating mindless undead, learns to recognize increasingly specialized enemies, discovers that monsters cooperate, chooses terrain and routes with recognizable ecological differences, is periodically overwhelmed by *fair* large packs, meets the monstrous Bell Warden, and ultimately faces **Ashfang, the Cinder Wyrm**. On a very small fraction of complete hunts a truly extraordinary enemy, **the Reliquary**, manifests as an optional miniboss. The player should think: **"What on earth IS that?"**

This is an explorable action-RPG hunt, **not** an endless survival arena with random mobs appearing uniformly near the camera. Preserve a guided dramatic arc while randomizing routes, geography, packs, reinforcement directions, and elite encounters. Winning should reward target prioritization, spell evolution, terrain awareness and movement, not simply raw DPS.

Key invariants:
- **Ecology before RNG:** habitat, architecture and Wyrm influence strongly constrain what appears.
- **Tactical enemies:** some are stupid, some coordinate. Do not make every monster equally intelligent.
- **Power fantasy plus danger:** a fire spell should slaughter clusters of Hollows/Ashlings; protected priests, flankers and rare elites interrupt autopilot.
- **Readable danger:** no unavoidable teleports/hits, invisible hitboxes, fake perspective obstacles, excessive particle clouds or multiple stacked unintelligible warning circles.
- **No AI-generated image as a spritesheet:** reference art informs original hand-authored pixel actors and mechanically accurate animation frames.
- **No silent story retcon:** Wyrms formerly protected the world; what changed them is *deliberately unresolved*. Ashfang's influence is apparent, but the cosmic cause remains mysterious.

## 2. First-hunt roster (approved proposal for discussion)

| Monster | Tier / role | Core behavior | Counterplay | Habitat affinity | Concept art |
|---|---|---|---|---|---|
| **The Hollow** | Common; mindless chaser | Shambles directly at mage, simple reach/grasp, dangerous in crowds | Kiting, AoE and crowd control | Village, road, graveyard, monastery | `concepts/01-the-hollow.png` |
| **Ashling** | Common; coordinated swarmer | Circles, darts/leaps and packs under priest command; breaks formation when commander dies | Area burst, split pack, kill commander | Open field, scorched road | `concepts/02-ashlings.png` |
| **Ash Priest** | Common support; healer/commander | Heals pack, channels limited resurrection from nearby Ashling remains, rallies terrified Ashlings; avoids front line | Interrupt ritual, isolate and prioritize | Open field, demonic warbands, village edge | `concepts/03-ash-priest.png` |
| **Ash Slinger** | Common ranged harasser | Throws visible arc ember shots, kites, uses protected back line | Dodge slow projectile; gap-close or interrupt | Open field, scorched approach | `concepts/04-ash-slinger.png` |
| **Mire Hound** | Common; fast flanker | Stalks, circles, lunges from side, disengages and repositions | Observe body posture, evade lunge, punish recovery | Wet forest, overgrown village | `concepts/05-mire-hound.png` |
| **The Penitent** | Common heavy guardian | Shields priest/slinger, blocks frontal attacks, shield-bashes | Flank, stagger, high-impact spells | Village chapel, monastery | `concepts/06-the-penitent.png` |
| **Drowned Wraith** | Uncommon ambusher | Ripples/mist signal arrival, brief spectral strike, fades/repositions | Read visible and audible warning, attack exposed recovery | Flooded cloister, drowned crypt | `concepts/07-drowned-wraith.png` |
| **Bell Warden** | Named, fixed set-piece elite | Crushing bell, expanding ground wave, rallied adds; long recovery windows | Learn slam and ring tells; use openings after committed attacks | Ruined monastery / approach | `concepts/08-bell-warden.png` |
| **The Reliquary** | **Extremely rare unique miniboss** | Plants dangerous wards, buffs nearby enemies, corruption zones, delayed burst; 2-phase duel | Break wards, separate from mobs, handle timed explosions | Monastery, ruined altar, scorched sanctuary only | `concepts/09-the-reliquary.png` |
| **Ashfang** | Final Wyrm boss | Fire cone, cinder sweep, aerial pass, changing scorched ground, stronger phase 2 | Learn tells, reposition, punish phase openings | Wyrm's lair | `concepts/10-ashfang-the-cinder-wyrm.png` |

Visual/spec notes:
- Make The Hollow a weak, gray skeletal silhouette; Ashlings small russet, hunched, horned, crouching; priests taller with distinctive glowing staff; Slingers carry an instantly identifiable swinging ember.
- Hounds are wide, low-to-ground and quick; Penitents tall with a single shield facing; Wraiths are cool-toned, ethereal with a directional water ripple.
- Bell Warden is huge, bell-shaped silhouette and weighted swing. **Reliquary must NEVER look like a mere recolored Ash Priest**: oversized spoked relic-crown, paired suspended censers, long rigid ceremonial robes and anchored sigils. His entrance should be unmistakable even at 390px portrait.
- Ashfang is colossal. Avoid designing him as a humanoid demon or as another elite with a boss healthbar.

## 3. Gameplay attacks: minimal implementable contract

Every threat must define: wind-up tell, target geometry, committed attack, recovery duration, interruption policy, cooldown, and presentation snapshot. Values below are **starting tuning targets** to verify with real playtests; not universal balance constants.

| Attack / unit | Telegraph | Behavior | Important limit |
|---|---:|---|---|
| Hollow grasp | 0.35s | Short cone/arc melee | No undodgeable sudden hit |
| Ashling dart | 0.30s | Short targeted leap; brief post-leap recovery | Pack attacks staggered, not synchronized instakill |
| Priest heal | 0.9s | Restores one allied demon (not all nearby) | Cast can be interrupted; cooldown 9–13s |
| Priest resurrection | 1.5s | Raises **at most 2** eligible fallen Ashlings per encounter, within local range | Never resurrect full-HP endlessly; true physical corpse marker |
| Slinger ember lob | 0.65s | Visible ground-marked arcing projectile | Projectile collision/hit owned by C#, not JS |
| Hound pounce | 0.50s | Lock direction then lunge | Cannot instantly re-aim after committing |
| Penitent shield bash | 0.65s | Short frontal arc and push/stagger if available | Exposed flank; block only frontal geometry |
| Wraith emergence | 0.8s | Ground water ripples -> materialize -> strike | Cannot damage while fully invisible; no spawn on hunter |
| Bell smash | 1.0–1.3s | Large marked impact and delayed shockwave | Major recovery; optional adds bounded |
| Reliquary ward | 1.1s | Plants one breakable ward that empowers nearby mobs | Max 2 live wards; ward explosion always indicated |
| Reliquary phase shift | 2s staged warning | Changes ritual patterns at ~50% HP | Give player moment to recognize phase change |
| Ashfang attacks | Existing profiles first | Use existing Ashfang `CinderSweep`/cone phases where possible; add distinctive moves as separate validated slices | No gratuitous unavoidable attacks or bullet-hell spam |

**Support interaction loop:** An Ash Priest + ~5 Ashlings + one Slinger is a tactical squad. Ashlings rush, Slinger keeps mage moving, Priest raises two fallen followers. When Priest dies, Ashlings break and retreat for a short time, then re-engage as disorganized fighters; they must not run off forever and soft-lock clear-all objectives. Penitent provides directional protection in advanced squads. The mage learns that taking out one enemy changes the encounter.

## 4. Habitat-driven ecology

Use a **local node `Habitat`**, separate from the overarching `Territory.Name` and separate from the elemental `AttunementSchool`. The current generator chooses one macro biome for a depth, and the same enemy composition can appear anywhere. Change that. A single *territory* should contain forest, open fields, ruined settlements, monastery districts and the scorched approach in a credible geographic sequence. Elemental scars intensify near Ashfang but do not turn every road into the same visually colored floor.

Suggested normalized **selection weights** for ordinary fillers (not guaranteed pack recipes, and not final DPS proportions):

| Habitat | Hollow | Ashling | Priest | Slinger | Hound | Penitent | Wraith |
|---|---:|---:|---:|---:|---:|---:|---:|
| Wet Forest | 20 | 15 | 2 | 3 | **55** | 0 | 5 |
| Open Field | 12 | **48** | 8 | 20 | 12 | 0 | 0 |
| Deserted Village | **45** | 22 | 8 | 7 | 8 | 10 | 0 |
| Monastery Grounds | 22 | 15 | 9 | 6 | 2 | **36** | 10 |
| Flooded Cloister | 20 | 5 | 4 | 2 | 4 | 20 | **45** |
| Scorched Approach | 15 | **33** | 11 | 15 | 9 | 14 | 3 |

These are **relative rarity weights conditioned on role/budget**, not per-enemy independent random spawn probabilities. E.g. a priest cannot be selected alone as a nonsensical healer with no companions; pack recipes define relationships, and weights add texture within those constraints.

Habitats should also alter:
- **Spawn origins:** Hollows emerge from roads/houses/graves; Ashlings rush from burnt fields and side approaches; hounds from woodland edges; Wraiths from shallow water; Penitents guard thresholds; rare Reliquary appears at a credible ruined ritual site.
- **Movement:** forest hounds use safe flank paths; shield groups protect narrow gates; wraiths use puddles but may not phase through canonical closed collision to create unreachable encounters.
- **Arena affordance:** forests give lateral cover but preserve combat corridors; fields permit big swarms; village has house corner ambushes; monastery features sightlines, chokepoints and flooded flanks. Every depicted blocking structure corresponds to real C# geometry.
- **Ambient foreshadowing:** ash traces, broken bells, unsettling footprints, whispering Wraith calls, one overgrown relic shrine. Never rely on lengthy text labels for a player to understand danger.

## 5. Randomized first-hunt route: fixed dramatic beats, variable content

**Do not hardcode eight identical combat rooms.** The current map has `WyrmrealmMapState.CombatStages = 8`, with branching roads that may contain more fights. The table describes *hunting beats* and eligibility windows, not an instruction to replace the whole route generator.

| Progress / route beat | Expected local location | Allowed introductions | Typical fighting composition | Experience |
|---|---|---|---|---|
| **Opening:** first node | Outskirts / abandoned road | Hollow | 4–8 weak Hollows, escalating with a few reinforcements | Immediate spell power; learn navigation and pick-ups |
| **Early:** second node | Wet forest or forest edge | Hound + Hollow | 2–4 Hounds stalking 5–8 Hollows | Must move, not just stand still |
| **First route fork** | **Forest trail** OR **open field** | Forest: Hounds/Ashlings; field: Ashlings/Slinger | Forest = layered hound flanks; field = large Ashling pack and an introduced ranged shot | Route choice visibly changes combat |
| **Next road encounter(s)** | Forest/dead hamlet/field | Ash Priest and/or Slinger | One supported Ashling warband; first resurrection should be clearly legible | Learn target prioritization |
| **Mid-hunt confluence** | Deserted village / graveyard | Penitent | Hollow crowds plus first guardian protecting ranged threat | Learn shield angle and positioning |
| **Second route fork** | **Monastery grounds** OR **flooded cloister** | Wraith (flooded), Penitent (grounds) | Grounds = controlled shield formation; flood = 1–2 telegraphed wraiths with slow undead | Dramatically different threats |
| **Late-hunt approach** | Burnt chapel / broken causeway | All introduced common enemies | Coordinated mix; occasional elite variant; manageable high-density surge | Combine lessons; showcase upgraded magic |
| **Pre-Wyrm climax** | Ruined monastery / old bell arch | **Bell Warden**, named set-piece | Warden plus bounded weak reinforcement groups; never mix with Reliquary | First learnable monumental encounter |
| **Final** | Ashfang's charred lair | **Ashfang** | Wyrm-focused phases, optional few clearly signaled adds | Recognizable final boss and big payoff |

Routing specifics:
- Two hunts must be able to take different habitat mixes, enemy pack types, reinforcement directions and elite outcomes while still building toward the same clear story climax.
- Keep an **introduction policy** on a profile: a unit only becomes eligible after its tutorial beat is encountered or deliberately authored as an accessible advanced-path surprise. Ranged harassment should not bombard the first 10 seconds.
- On longer routes, repeat already introduced archetypes in **new compositions**, not an identical encounter loop. Tie notable rewards, longer routes and risk to the current map economy without removing choice.
- Avoid a precise stage-8 Warden spawn if a long road means the narrative has already passed the preboss point. Attach the Warden to the **pre-lair beat** using route graph semantics, not an arbitrary `stage == 8` check alone.
- The Wyrm encounter may currently be selected from multiple Wyrms through the existing attraction system. If the **first-ever hunt** is intended to culminate in Ashfang, implement that as explicit first-hunt story qualification, with later runs keeping the existing variety; do not silently force all runs to Ashfang.

### Example seeded outcomes (illustrative, not scripted fixed outputs)

**Hunt A:** Road Hollows -> wet forest Hounds -> sheltered forest pack -> deserted village Priest/ Ashlings -> flood cloister Wraith -> monastery shield formation -> Bell Warden -> Ashfang. One normal elite Hollow appeared in the village. No Reliquary.

**Hunt B:** Road Hollows -> woodland Hounds -> exposed meadow demon rush -> Ash Slingers/ Ash Priest -> village Penitents -> monastery outer court -> fierce pre-lair warband -> Bell Warden -> Ashfang. No ordinary elite. **Very rarely** a Reliquary may replace a suitable optional late-hunt encounter, never the Warden or Ashfang.

## 6. Director, pack recipes and density

Use **structured group recipes** and independent seed-driven composition rather than uniform `EnemyKind` rolls. Suggested recipes:

| Pack | Initial group and response | Preferred habitat |
|---|---|---|
| Wandering Dead | 5–11 Hollows, slow approach, staggered emergence | Village, road, cemetery |
| Hunting Pack | 3–6 Hounds, approach in pairs from different angles | Forest |
| Ashling Mob | 7–12 Ashlings, rush then regroup | Open field, scorched approach |
| Priest Warband | 1 Priest + 5–8 Ashlings + 0–2 Slingers | Field / village |
| Bastion | 1–3 Penitents + 1 Slinger or Priest + light melee pack | Monastery |
| Drowned Watch | 1–2 Wraiths + 4–8 Hollows, staggered manifestations | Flooded cloister |
| Last Stand | 12–22 mixed common units including recognizable roles, not all rushing simultaneously | Scorched approach |

**Suggested initial targets, subject to playtesting and device performance:** opening 6–10 active; early 8–14; mid 12–20; late 16–26; rare pressure spikes up to ~30 active **mostly weak** monsters. Tune using a **threat budget** and damage opportunity budget, not `EnemyCount` alone. Keep no more than ~2 concurrent *high-danger committed* telegraphs in the opening, and carefully stagger ranged shots. No fake difficulty via invisible health scaling, on-player spawning, impossible chokepoints or bullet spam.

The encounter director may still have pressure/escalation/breathing/surge/climax phases, but these should trigger **new events**: hounds flank on a crossing, priest retreats behind a protector, waves enter from a ruined gate, wraiths rise from actual water, Bell Warden rings and reinforcements answer. Do not simply change spawn intervals and batch sizes.

Provide a brief natural breathing room after a challenging phase; let the player collect XP and see the effect of their spell upgrades. Stop spawning before the transition only when the fight objective permits it; ensure completion cannot soft-lock on unreachable enemies or fleeing pack members.

### Spawn placement requirements

- Pre-place dormant/patrolling enemies or spawn well outside camera view and approach visibly. Ambushes require ground/audio tells and fair response time.
- Never spawn on or immediately beside the player. Current `ArenaEnvironmentState.AdjustSpawnPosition` may fall back to the player's coordinates if blocked. Replace that unsafe fallback with a deterministic valid-location search or skip/defer insertion.
- Spawn origin and navigation must respect actual C# barriers, unlocked gates, boss arena limits and viable paths; do not let enemies appear behind sealed gates then prevent `clear enemies` completion.
- Maintain a bounded shared spawn pool and deterministic update cost, and benchmark 390px iPhone Safari. Keep rules the same across platforms where possible; optimize renderer rather than secretly lowering difficulty on mobile.

## 7. Ordinary elite variants — occasional and meaningful

**Elite is a modifier on each ordinary monster archetype, not a separate copy-pasted catalog of monsters.** Any common kind (Hollow, Ashling, Priest, Slinger, Hound, Penitent, Wraith) may get an elite variant, subject to its local eligibility. Give the variant one readable power and a visual signature consistent with the base silhouette.

- Initial roll: **~10% per eligible encounter node** after the first two introductory nodes; **maximum 1 normal elite in that node** and target **0–2 normal elites per first hunt**. Roll on node encounter creation, **NOT per individual spawned enemy**. No guaranteed elite in every hunt.
- Elite mutation examples: Hollow **Gravebound** (slow shockwave on death); Ashling **Packblood** (rallies close Ashlings); Priest **Ember Anointer** (larger but interruptible healing); Slinger **Cinder Marksman** (two distinctly telegraphed alternate arcs); Hound **Thornrunner** (second flank change before one lunge); Penitent **Oathshield** (guard break requires a clear heavy hit); Wraith **Drowncaller** (one delayed ripple echo).
- Initial tuning: **+35–60% HP**, **+10–25% attack impact**, not raw attack cadence inflation; **2–3× the normal XP** and a visible, restrained XP payout. Keep threat budget and cooldowns sensible.
- On first version, optionally grant **extra XP only**. Leave a typed extensible reward hook to award item/loot drops later; do not fabricate unavailable inventory systems or rewards in UI.
- Notify via sprite silhouette detail, a small unique title and a short non-obscuring callout, not an enormous permanent HP UI for every elite.

## 8. **THE RELIQUARY** — true ultra-rare miniboss

This is **NOT** an ordinary elite, **NOT** an existing `WyrmrealmNodeRarity.Rare` route reward and **NOT** the obligatory Bell Warden. It is a separate rare **world encounter event** with a deliberately shocking reveal.

**Frequency:** roll **once per entire eligible first hunt**, e.g. a starting **6% chance per hunt** (~1 in 17), not 6% per node/pack/kill; choose at most one valid encounter slot **only if the hunt was selected**. Eligible only after sufficient progression, within destroyed monastery/ritual/sanctuary or scorched approach sites; never in opening two beats, never inside Warden or Wyrm boss arenas. No forced pity spawn during the introductory story. Seed it per run.

**Diegetic reveal:** a deep unnatural chime, nearby background activity stopping for a beat, a glowing ritual sigil, then an unnervingly tall crowned silhouette emerging from the ruins. Brief callout `THE RELIQUARY` and a uniquely styled miniboss HP bar; avoid interrupting player controls with a long cutscene. Use positional cues before damage. The mage must be able to escape or engage depending on the encounter objective; no mandatory unwinnable surprise.

**Fight:** a two-phase, optional-feeling miniboss with an intelligent battlefield. Creates up to **two destructible wards** that amplify nearby minions; places clearly warned corruption fields; marks a delayed seal explosion; around half HP enters a second ritual phase with stronger ward patterns. Avoid infinite add generation and overlapping unavoidable danger. The player learns **destroy the ward -> break support -> punish the caster**.

**Reward:** ~8–12x one ordinary monster's XP as a starting tuning target, unique defeat record/Codex entry and a visually meaningful celebration. Later allow a rare item/blueprint/drop through a typed reward contract, without displaying promised unimplemented loot. Never imply a rare monster drops a rare item until that system exists.

**Important:** the codebase already has `WyrmrealmNodeRarity.Rare` associated with routes/relics. This must remain a **distinct** concept from a rare spawned unique monster and cannot be reused as a 65%-chance Reliquary roll.

## 9. The Bell Warden and Ashfang

**Bell Warden** is the deliberately authored **pre-Wyrm set piece**, not something players wait 17 hunts to see. Its anatomy, giant bell, armored bulk and ritual link to the monastery should be obvious. Three distinctive patterns: sweeping bell strike, reverberating ground line/wave, ringing rally call. The fight should have modest reinforcements but stay below high-density horde peak so it is readable. A boss-style recovery window is required after every large commitment.

**Ashfang** is the final Wyrm boss and source of the region's visible cinder influence, without revealing the unexplained origin of Wyrm transformation. He should *feel* much larger than every minion and elite: big silhouette, readable breath direction, wing motion and coherent arena scorches. Use existing `DragonCatalog.Ashfang`, `DragonHuntCatalog.Ashfang` and `CinderSweep` signatures as the mechanical baseline. Build the climax in validated slices: telegraphs/phase clarity first, then staged environmental changes, then optional secondary moves. Differentiate him from the Warden by movement, elemental terrain and attacking from changing positions — not just larger damage numbers.

## 10. Implementation architecture: guidance to Claude

Start by inspecting current main, associated handover/design docs, the existing `feat/arena-monster-ecology-20261016` branch if it exists, current open PRs, and CI. **Do not assume this design has shipped or auto-merge a PR.** Develop tested vertical slices against the live WyrmForge solution.

Relevant current code (names verified against repo as of handoff):
- `src/Wyrmforge.Domain/Combat/Enemies/{EnemyKind,EnemyRole,EnemyCatalog,EnemyState}.cs`
- `src/Wyrmforge.Application/Runs/Simulation/Enemies/{EnemyEncounterComposition,EncounterDirector,RunSimulation.Enemies}.cs`
- `src/Wyrmforge.Application/Runs/Simulation/Environment/ArenaEnvironmentState.cs`
- `src/Wyrmforge.Application/Runs/Navigation/{WyrmrealmMapGenerator,WyrmrealmRouteGenerator,WyrmrealmMapState,WyrmrealmMapNode}.cs`
- `src/Wyrmforge.Application/Runs/Simulation/Snapshots/EnemyRenderSnapshot.cs`
- `src/Wyrmforge.Presentation.Web/wwwroot/js/{arena.js,arena-enemy-art.js,arena-environment.js,arena-territory-art.js}`
- `src/Wyrmforge.Domain/Combat/Dragons/DragonCatalog.cs`; `src/Wyrmforge.Application/Runs/Hunts/DragonHuntCatalog.cs`
- `tests/Wyrmforge.Application.Tests/Runs/Simulation/Enemies/`, `tests/javascript/arena-enemy-art.test.mjs` and mobile browser smoke.

The domain must own true enemy state, roles, attack/cooldown/status, aggression/retreat/guard, and pack membership. Application must own seeded encounter planning, geography, objectives, pacing, rewards, path-safe spawns and boss/rare event state. C# snapshots drive all JS rendering; JS should never invent mechanical projectiles, collision, attack timing, enemy spawns, loot or revives. Preserve existing save compatibility where reasonable; migrate safely where new state needs persistence. Do not build a generic behavior-tree framework unless needed for tested reuse; prefer explicit, composable tactics/attack contracts.

**Vertical implementation order** (each with functional art and tests, not only model files):
1. Habitat identity on individual map nodes, distinct world-space enemy spawn sites, and tested no-on-player / no-behind-gate spawns. Make opening two nodes visibly and mechanically distinct.
2. A meaningful new common enemy behavior: Hound flank+pounce, then Slinger ranged attack; add reliable C# telegraphs and original pixel silhouettes.
3. Ashling + Priest pack AI (including interruption-limited heal/revive, morale and safe retreat) and Penitent guardian. Test priority-target combat.
4. Wraith ambush with real water tells; authored forest/field/village/monastery/flooded compositions and encounter director integration.
5. Ordinary elite variants via per-encounter roll, truthful extra XP payout and typed future loot contract.
6. Reliquary rare single-roll, visual reveal, boss-class behavior and verifiable rarity distribution across seeds.
7. Bell Warden/ Ashfang spectacle and gameplay refinement; performance, audiovisual, mobile legibility and playtest tuning. Preserve existing functioning Wyrm mechanics.

Do not change production code merely to make unit tests pass. Adapt obsolete hardcoded test assumptions with explicit explanation and new assertions. If first-hunt story needs Ashfang guaranteed, preserve later Wyrm variation. Maintain proper collision/depth sorting, roaming space and physical exits.

### Must-have tests and acceptance

- Same run seed, same route and same actions -> same encounter schedule, pack composition, rare selection and outcomes. Cosmetic terrain RNG must not perturb gameplay RNG.
- In 10,000 seeded first-hunt simulations, at most **one Reliquary per hunt**, and observed chance approximately matches configured 6% (choose a defensible statistical tolerance); never in prohibited early/boss habitats.
- No ordinary elite on tutorial nodes; no >1 elite in one node; no forced elite every run; modifiers preserve distinctive AI.
- Forest fights have observably more Hounds than open fields; open fields more Ashlings/Slingers; villages more Hollows; monastery more Penitents; flooded cloister more Wraiths.
- Priest cannot resurrect infinite allies, cannot revive impossible/unreachable actors, and safely resolves retreat/clear-all encounter completion.
- High-density swarms remain readable at 390px iPhone portrait, enemies do not blend into terrain, frame time remains within the approved browser smoke/benchmark budget, and no actor is drawn in front of/behind walls incorrectly.
- Every hit is backed by a telegraph, canonical C# collision and correct damage; pausing for level-up freezes wind-ups and cooldown consistently.
- Warden and Reliquary never co-spawn as overlapping boss encounters; Ashfang always remains beat-climax when he is the first-hunt target.
- XP bonus and future loot hooks cannot duplicate on resurrection, despawn/reconnect or multiple death callbacks.

## 11. Suggested Claude request

> Read `WyrmForge_First_Hunt_Encounter_Design.md` and all ten matching creature concept sheets in `concepts/`. Audit the current WyrmForge main branch and existing first-hunt mechanics, then implement the first-hunt roster and biome-driven randomized encounters in cohesive, testable vertical slices. Start with habitat selection, sensible spatial spawning and the Hound/Slinger behaviors; continue through pack coordination, elite and Reliquary rarity, and boss/visual polish while preserving C# authoritative simulation, seeded replay, current architecture, progression and iPhone combat clarity. Use the references as art direction, create actual 2.5D pixel assets (do not embed the concept-sheet images as runtime sprites), run MSTest/JS/browser tests where possible, and open a PR with explicit testing and remaining gaps; do not merge it without review.

---

**Design intent:** An area has a history, its monsters belong there, packs fight with purpose, an elite is a nice surprise, the Reliquary is a once-in-a-while *WHAT IS THAT?* event, and Ashfang feels like the apex of everything you learned.
