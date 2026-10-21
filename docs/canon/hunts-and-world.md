# Hunts, maps and living world

> **Canonical WyrmForge specification · updated 20 October 2026.** Connected geography and physically authoritative combat places, not decorative disconnected stage cards.
> [Canonical index](README.md) · Only explicitly marked **LOCKED/approved** requirements are commitments. Proposed values, old milestones and drafts are not evidence of shipped code. Verify current `main`, PRs and tests.

## 4. Region architecture, Wyrm hierarchy and Hunt Director

### 4.1 World regions, lineages and rank — LOCKED

- Scale to **dozens of human-history-rich regions**, each with **one dominant magic identity**, biome/ecology/materials/corruption, landmarks/roads and one or more Wyrm influences; secondary overlap justified by lore, encounter or Wyrm proximity. A Wyrm can affect multiple regions and not every region exclusively belongs to one Wyrm.
- Fundamental discipline/wyrm bloodlines grow beyond current **Fire/Ashfang, Frost/Rimeclaw, Storm/Stormcoil, Arcane/Voidweaver**; each actual major discipline has a Wyrm lineage. Variants may grow through **Ascendant → Elder → Primordial → Divine**, but the exact complete names/tier order are **not all finalized canon**. Do not ship proposed Divine content in first slices.
- **Hunt threat tier** and **current run depth** are different variables. Explicitly targeted known Wyrms/variants coexist with **emergent Wyrm resolution** (resonance/attraction near finale). Unknown Wyrm identity must not force the map to regenerate secretly: plan with a compatible regional threat envelope and reveal boss legitimately later.

### 4.2 Hunt length & pacing — LOCKED principle, TUNABLE values

Introductory hunts **shorter**, increasingly formidable Wyrms have longer, richer expeditions (more acts, hazards and meaningful branch decisions). Illustrative shortest-path **combat fights before boss**, not locked balance constants:

| Illustrative tier | Combat encounters | Intent |
|---|---:|---|
| Early/first Wyrm | 3–4 | One fork and understandable reward/lair |
| Established | 5–7 | More branches and rewarded dangers |
| Ascendant | 8–11 | Escalating regions, elites and ominous world events |
| Elder/Legendary | 12–16 | Serious multi-stretch expedition, substantial strategic choices |

Don't equate *all generated nodes* with fights in a chosen route, don't make every added encounter a major upgrade, and don't stretch length by multiplying mob health. Balance XP, refinements, reroll-charge rules, survival/recovery, extraction and build options together; reserve dramatic consequences for actually advanced hunts. Maintain existing story authorship and boss mechanics.

### 4.3 One geographical/topological truth — LOCKED

**First generate and validate world geography and a valid navigable directed Hunt graph, THEN illustrate and animate it.** A road advertised as reachable from the Ruined Chapel **must** actually lead onward to a Wyrm/valid continuation. It cannot end in the river, cross without a bridge or silently rely on invisible teleportation.

1. **RegionDefinition:** terrain, river direction, mountains/passages, roads, real settlements/bridges, magic identity, ecology, legal site archetypes and constraints.
2. **HuntRequest / HuntPacingProfile:** mode, seed/rules version, depth, intended threat tier, chosen/unknown target, combat-path budgets, detour/reward/rarity/extraction constraints, story anchors.
3. **GeneratedHuntPlan:** directed connected routes with actual geometry/path traversability, node identity, incoming/outgoing links, mandatory authored Chronicle sites, meaningful optional dead ends, eventual lair and exit.
4. **EncounterSiteProfile:** site's purpose and visual history (chapel, causeway, village, watchtower, sanctuary), region dominant magic, justified encounter influence, real enemies/objective/reward/clues.
5. **ArenaRecipe:** deterministic physically playable environment for the exact chosen site; see §5.

Rules: all playable starts/required selections have lawful continuation; branches **commit** the player and unchosen branches' rewards become unavailable; reconnections are actual walkable paths, not misleading screen lines. Optional dead-end excursions are permitted only if clearly marked and with a legal way to continue after their resolution. Roads intersect waterways only at a valid bridge/ford, actual in-world structure and tested navigation. A broken bridge removes that edge (or opens an authored safe alternative) in the SAME authoritative graph and drawing. Scouting/camera/labels cannot reveal hidden legal topologies before earned.

Avoid turning a region into identical circle nodes, fake road lines, too many arbitrary landmarks or unreadable maze of UI. Layout must work for 320–390px portrait and segmented longer regions. Use seeded **independent RNG streams** (regional map, arenas, encounters, rewards, simulation/combat) and versioned generation/replay; rendering is presentation only and must not consume battle randomness.

### 4.4 Encounter and reward semantics — LOCKED / future site palette PROPOSED

Current combat site/Wyrm duel remain valid. Future site kinds: rescue, elite/ambush, defense, archive/knowledge, ritual interruption, watchtower, cache, sanctuary, research event, optional extraction or Wyrm omen. **Do not add a node type without a gameplay consequence.** Map signs and previews truthfully communicate *partial* danger/reward known so far. Experienced scouts can identify more specific real threats, not invented rewards.

Normal Hunts, campaign and Eternal have distinct one-time reward/extraction/save lifecycles (§6–8). Rare optional objectives must yield **immediate** run benefit (relic, recovery, rare material, upgrade) **plus appropriate persistent world/knowledge benefits** (safe outpost, access/service, repaired road, discovered passage) when their premise supports it. Skipping remains a legitimate option; risk/reward makes commitment rational, not mandatory for equal endgame.

---

---

## 5. Arena Generator, procedural combat and transforms

### 5.1 Real locations, real physical rules — LOCKED

The **Arena Generator** creates believable 2.5D human-built/fallen locations, not random props or the same generic rectangle tinted to each school. Process:

`Region + site purpose → landform/ground plan → traversable arena graph → architecture and actual obstacles → enemy/hazard/exit constraints → elemental damage & weather → light/ambience → seeded C# validated scene → JS render`.

Examples of site variation: monastery with linked cloister and courtyard vs collapsed wing and crypt entrance; drowned village with changing street/bridge network; fortified volcanic forge with walls, central yard and lava boundary; cemetery with believable mausoleum and grave paths. Dark fantasy monsters are demons, undead, cursed beasts and Wyrm-associated enemies, not bizarre alien imports. The player sees an illustrated Chapel on the Hunt Map and actually enters a chapel-shaped arena.

**Decouple three magic concepts:**

- **Region dominant magic** determines land/material/long-distance identity.
- **Encounter/Wyrm influence** determines local corruption/environment/hazard themes.
- **Reward attunement** determines the offered magical upgrade and **must not arbitrarily recolor the physical arena**. A Storm region can offer Frost rewards.

School environmental signatures even without colored glow: Fire char/soot/collapsed timber/heat-scored rock; Frost frozen waterways and cracked ice/masonry; Storm lightning-branch damage, torn shelter and split trees; Arcane coherent ritual-site displacement and rift-warped masonry. Avoid a uniform color filter or indistinguishable procedural noise. Select architectural templates for function/history, then vary within logical constraints.

C# owns actual geometry/collision/barriers/phase gates, spawn/loot locations, safe paths, damage, event transitions, bosstelegraphs and reward accessibility. Renderer consumes **authoritative** snapshots, knows player depth sorting and doesn't depict impassable decor on walkable floor or fake damage. Locations must maintain real-world scale and correct camera projection; no spires that billboard to camera. Original mage silhouette and visibility remain intact.

### 5.2 Three cooperating directors — architecture proposal

- **Arena Generator:** physical floor, solid landmarks, real connected passages, dynamic phase-capable geometry, physical ingress/egress.
- **Challenge Director:** tactical enemy mix and constraints appropriate to actual topology, intended threat, objective and player attack/defense envelope. Do not always solve intensity by spawning more HP.
- **Wave Director:** repeatable event schedule, spawn safety, elite/miniboss/Wyrm escalation, transition into the next encounter/physical exit.

Precise C# classes/API are not mandated; may be services/state machines within current RunSimulation. Keep replay deterministic and prevent event/order races.

### 5.3 Dynamic transformations — LOCKED for Endless Arena; advanced Hunts when appropriate

Endless Arena fields can *physically change* during a battle: wall breach, actual opened gate, progressive flooding, expanding fire, falling masonry, Wyrm shock/erupting fissure, opening crypt. Change the tactical choices, not just VFX. An explicit visible/audio warning must precede the event with sufficient avoidance/reposition time; exact durations **tunable**. Every phase must pass **post-transition navigation and safety validation**: player reachable safe floor, functional exit (at exit stage), legal enemy spawn distances, no unavoidable kill under feet, no total loss of dodge room. If a mutation cannot be validated, generator selects a tested fallback.

Early Arena waves mostly stable; later progress enables more consequential transformations. World-map-level abrupt bridge/route changes in active **normal Hunts** are reserved for **advanced** tiers with foreshadowing and legitimate alternate progress; don't suddenly collapse paths in first introductory hunts.

### 5.4 Endless Arena traversal — LOCKED

**No Living Hunt Map in Endless Arena.** Waves intensify in a series of **different procedurally generated atmospheric battlegrounds**. After a wave/major milestone, a **real gate, path or physical exit opens**; player moves through to a new playable environment. No forced generic menu teleport and no identical square arenas with altered textures. Carry valid within-attempt build, wave, resources and score across transitions, with fair recovery/upgrade opportunities as designed. Arena sequence/transition milestone counts remain tunable. Its art and enemy roster vary meaningfully while sharing the common C# combat/safety system.

---

---

## 6. Living Hunter's Chart: art, controls, discovery and evolution

### 6.1 Hand-painted map grammar — LOCKED

Working title **The Living Hunter's Chart**. The screen should look like an original, deliberate painting of a **real, inhabited, injured place**, not a node diagram laid on a detailed AI panorama. Art reference: portrait “Ashen Caldera” route composition approved as *direction*, with journey from camp/crossing through Burnt Causeway vs Ruined Chapel to watchtower/ridge, mountain pass and Wyrm Lair. **The directional concept PNG is not a mechanically verified map/tileset.** This document is sufficient for Claude; no reliance on external files to understand layout or validity.

- High-level visual hierarchy: region name / Hunt phase, landscape/roads, unobtrusive local landmark glyphs, obvious present position, threatening distant territory, compact selected-site bottom sheet with meaningful Enter Trail/Arena button.
- Remove AI-busy repetitive buildings, micro-details, fake intricate bridges and widespread decorative lava. Render meaningful human-scale monastery, causeway, village, bridge, ruins, forest and watershed with deliberate atmospheric negative space.
- **Integrated landmarks + subtle small handcrafted cartographic markers**, no icon forest. Road must be physically visible and truly continuous. Marker states include available, selected, current, completed, bypassed/unavailable, previously known and stale; distinguish shapes/labels, not hue alone.
- Highlight **the exact actual connected route** on selection (not a visually plausible but unconnected spline). Preview risk/reward from canonical knowledge; disabled Enter action for not-yet-reachable destination.
- **Committed route choices:** after choosing Chapel, Burnt Causeway rewards cannot be reclaimed by backtracking. A travel network can still cross geographic space where logically permitted, but does not reset expedition decision/reward state.

### 6.2 Camera, touch and ambient movement — LOCKED

- **Hybrid camera:** gentle follow and reveal after the player finishes an encounter, **free drag/pinch-zoom** on demand that immediately interrupts follow, and clear **recenter-to-hunter** compass. Never auto-steal viewport while manually exploring. Camera idle = stable.
- **World animation:** *large structures stay still; small physically motivated things move*. Fire tongues flutter irregularly at genuine fire spots; orange light flickers onto nearby wet stone, trees/roads/ruins; river current travels **downstream** (with rapids/waterfalls foam); water and wet paving have **broken, light-source-correct reflections**; smoke rises from fires, mist drifts in valleys and rain/embers respond subtly to weather/corruption. These are not blanket particle spam or modern pulsing UI.
- **Elemental environmental damage:** Fire, Frost, Storm and Arcane have unique material/geometric signatures, not just hue. Intensity generally grows toward Wyrm domains; giant structures and route markers remain readable.
- **Performance:** seed stable art/animation phase independently from combat state; layer/cull/batch; cap expensive effects and resolution on low-end devices; pause offscreen work; reduced-motion setting; mobile Safari touch, frame stability, memory and battery measurement. Art acceptance includes real iPhone screenshots and active visual review, not only tests.

### 6.3 Progressive discovery and earned scouting — LOCKED

- **Option B visibility:** nearby geography/choices automatically reveal as player progresses. The Wyrm's looming region/physical silhouette might be visible early, while precise future routes and encounters remain unknown; later tiers use stronger uncertainty/fog than short introductory Hunts.
- **Scouting is never a free gimmick.** Advantage comes from physical travel to watchtower/map library/cartographer camp/survivor, recovered record or **earned previous knowledge**. Risky detours make scouting a choice. No arbitrary “reveal map” button, instant paid reveal, invented scouting currency or repeated free scan.
- **Partial information**: recognizable enemy influence, approximate danger and reward indicators by environmental evidence; earned scouting confirms additional specifics such as elite presence, reward category and actual road condition. Some secrets remain unknown. **Confirmed intelligence never lies**; later stale intelligence is marked so because a real recorded event changed it.
- **Remember knowledge on failure:** physical geography, landmarks, witnessed roads and useful studies survive unsuccessful Hunts; separate geographic fact from current occupation/bridge passability/active reward pool. Recognition persists while current status may change.
- Suggested hand-drawn cartographic legend (shapes/icons/colors **illustrative**): remembered first-hand = aged gold bookmark; seen in current Hunt = muted sage eye; documented hearsay = pale manuscript; stale condition = subdued amber warning. No critical state conveyed by color alone or tooltips inaccessible to phones.

### 6.4 Independent yet player-influenced persistent evolution — LOCKED

- Regions evolve gradually with **in-game milestones/events**, not with real-world idle/offline hours. Corruption advances/retreats, villagers abandon/reclaim roads, defensive engines or wards weaken, enemies migrate and bridges can fail/repair due to *causal tracked events*. Geography IDs, mountains and rivers don't randomly regenerate across visits.
- Player actions matter: defend settlements, stop Wyrm strikes, recover knowledge, rebuild a bridge or allow a threat to advance. Major disasters occur due to significant events; players sometimes can avert/mitigate them and should earn **immediate + lasting rewards** proportional to risk. No mandatory rescue chores or irreversible dead game.
- **Major in-Hunt terrain/world events only on advanced hunts**, with credible telegraphs, no surprise removal of the only path and no deletion of accrued rewards; ordinary Hunts evolve principally between expeditions.
- Changes visible through painted world itself: intact/ruined chapel, new refugee campfire, collapsed/repaired stone crossing, spreading ice scar, city walls repaired. Marker can say *changed since last visit*; never force dense summary text.
- The world's state must allow different Chronicle outcomes yet preserve equal shared progression access. Event ordering, persistence, unique rewards, recoverability and valid routes are tested.

---

---

### 16.4 Living Hunter's Chart — fine-grain UX states

- **Three readable map layers:** geographic art (real terrain, meaningful bridges/roads/structures), *gameplay route state* (reachable/current/chosen/completed/bypassed) and *knowledge* (observed/remembered/from records/stale/unexplored). They must remain separated in data but visually coherent and legible on a phone. Color never carries meaning alone.
- Recommended cartographic micro-marks, art direction examples rather than fixed final glyphs: remembered site = weathered gold bookmark/stroke; seen this expedition = muted sage sign; archival-only report = faded ink manuscript mark; stale/conflicted intel = muted amber caution mark. A mark should complement a painted landmark and appear only when relevant. Do not cover every road with circular game badges.
- **Unscouted** location preview can reveal broad threat silhouettes, obvious geography, possible treasure and uncertain risk from actual environmental clues. **Scouted** information may identify real enemy families/elite signs, authentic road condition and likely rewards, never fabricated exact outcomes. Scouting is earned through *previous visits, physical access to lookouts, recovered maps, exploration and survivors*, not a free tap/currency-to-reveal gimmick; information age/source/certainty is retained.
- **Camera:** on entry or after completing encounter, a gentle scripted return toward the hunter and newly disclosed terrain is allowed; any manual pan/zoom immediately cancels automated follow. A recenter compass smoothly moves to hunter without selecting/entering combat. The camera stays stationary at idle while water/fire/mist subtly animate. Future fog does not let zoom cheat undiscovered routes. Pinch and drag need real iOS Safari interaction and screenreader/focus-friendly equivalent navigation.
- **Map route reveal:** a chosen reachable site's actual connected road is softly highlighted from current site; selecting displays a compact bottom sheet of **known** risk/reward. Completing a site stamps a subtle clear mark, reveals legally next accessible roads, and retains the one-way commitment to already bypassed choices. Tapping a nonreachable site may inspect known geography but never quietly invoke OnChoose/enter an arena.
- **Fire/light/water:** irregular low-amplitude flame motion, changing real light intensity and affected wet stone/water reflection; river always flows downstream, foam respects falls/crossings, drifting valley fog moves behind location labels. Stable large shapes (bridges, buildings, roads) never oscillate just to feel alive. Keep a static/reduced-motion mode and stop/offscreen animations for battery/thermal performance.
- **Player recognition:** an illustrated Chapel must remain a chapel at the arena entry; a painted bridge must be the same authoritative connected crossing in region state. Map is not a separate generator of fantasy props. The approved reference image demonstrates mood and composition **only** and itself can contain visual mistakes; connectivity and geometry are always generated/tested from the world model first.

---

### 16.5 World changes, route commitment and long-form Hunt generation

- Real regions use stable region IDs and recognizable river/mountain/road topology across visits. Changes apply as **causal events** to current conditions and actual traversability; old knowledge remembers original position and last-known state. Real-world offline time is not a hidden corruption punishment; changes advance primarily through intentional game milestones/expedition progress.
- Ordinary evolution between hunts: slow environmental degradation/recovery, settlement effort, migration, ward strain, road deterioration; significant state changes result from explicit Wyrm actions, credible regional events or player decisions. **Mid-hunt structural disasters occur only in advanced Hunts**, with fair foreshadowing and valid remaining progress. Intro Hunts do not arbitrarily remove an already selected safe road.
- Optional world-rescue objectives have real immediate rewards *and* plausible lasting effects (repaired passage, refuge, merchant/research, friendly camp or retained knowledge). Saving people purely for story flavor is not enough to motivate high-risk diversion; skipping must remain valid. Do not clone optional reward grants after a reload, return from city or saved world revisit.
- Hunts should validate *minimum/maximum reachable combats on chosen paths*, all branch joins, bridge/ford connectivity, actual lair/exit reachability and rare detour possibility over large seed samples. A route can be geographically traversable yet **committed against collecting rewards from bypassed branches**: distinguish road existence from legal expedition state.
- Generated encounter scene uses site identity, regional Wyrm influence and reward school as independent sources; don't confuse upgrade attunement with local architecture/corruption. Higher Wyrms demand qualitatively distinct events, navigation/warning patterns and multi-region identity, not just multiplied HP. Keep late-emerging Wyrm resonance target from unintentionally regenerating already-seen roads.

---

### 16.6 Arena director constraints, morphs and mobile fighting

- Semantic arena generation must start from *function and history*: e.g. cloister has linked walkways, chapels have physical doors and courtyard routes, flood villages follow real street and water networks, fortresses contain defensible walls, forges have sensible firing/material paths. Choose authored-composition recipes then vary meaningful connectivity rather than decorating a square with random impassable props.
- Interactions such as bridge collapse, rising water and breached walls have **actual simulation phases**: warning → safety evacuation window → altered collision/nav/hazards → new wave routes/exit state. An animation alone cannot change damage or blocking. Every intermediate stage must not trap the player, spawn lethal enemies on top of the player or remove all feasible evasion routes. Provide validated fallbacks for invalid seeds.
- Threat mixes should use the room, not just its wallpaper. Open courtyards invite coordinated ranged pressure, narrow cloisters invite flanks/chokepoints, flooded roads invite elevated routes, destroyed walls invite new enemy approach angles. Do not repeat just 10 enemy variants endlessly or turn every fight into the same broad empty arena.
- In Endless Arena, physically walk through the opened passage to a **different generated arena** after milestone waves. The player retains actual active build/health/resources; the mode has **no Hunt Map**. Boss and elite encounters demand new pressure patterns and readable telegraphs, including the new directional cast system; layout mutations have fair audio/visual cause.


## Wet Forest Arena Lab — natural generation (21 October 2026)

PR #192 introduced an opt-in Arena Lab and C# breakables. That initial field was still too generic.
This Wet Forest-only iteration generates meandering tracks, named human traces, shallow wetlands,
clusters of real collidable objects and reachable open woodland. Normal Hunts remain untouched.

- `HuntArenaGenerator` supplies independently seeded forest geography, story-site identity and
  natural prop clusters. **No compulsory cross-shaped clearing, central combat strip, artificial
  wave-locked fence or horizontal barrier belongs in Wet Forest.** Traversability is validated
  with flood-fill instead of hardcoded bands.
- Habitat-derived elemental influence (Fire/Frost) replaces the previous reward-attunement-derived
  ground coloring. Corruption increases from early roads to the Wyrm approach. Corrupted breakables
  appear more frequently as influence grows. Other lineages require authored ecology before enabling.
- C# owns props, collision, projectile and AoE/splash damage, durability, destruction and health/XP drops. Drops
  use the existing one-time physical pickup mechanism and do not fabricate enemy-kill rewards.
  The enemy AI now has deterministic local prop detours, with a movement-progress regression test.
- Wet Forest ground is composed from the C# road and ground recipe; abandoned camps, forgotten
  graves, wayside ruins and broken wagons are actual identifiable landscape traces with matching
  physical C# props. Other habitats are out of scope for this iteration.
- Visual scenery is **not** authoritative and must never invent colliders or spawn collectibles.
  The first prop silhouettes are temporary code-authored pixels, not finalized art assets.
- Not yet included: persistent destructible state across sessions, all enemy attack forms (e.g. melee and
  ongoing ground burns), actual resource/material economy drops, full graph-based pathfinding across obstacles,
  terrain topology variation beyond road/scenery, infinite chunk streaming or seamless region travel, and
  visual art acceptance on a real iPhone. Legacy encounter crossings still exist in normal Hunts
  but are not templates or intended constraints for new outdoor maps.
  This slice is not the final Vampire Survivors-scale open-world generator.
- Acceptance before merge: .NET simulation tests, JavaScript tests, browser smoke, real iPhone
  combat checks including targeting/retreat and stable save/seed replays. Do not bypass this gate.

### Arena Generator Lab — sandbox acceptance (21 October 2026)

The developer-only `/arena-lab` route was published via [PR #192](https://github.com/pjotrcasteel/Wyrmforge/pull/192).
It is the evaluation surface for this Wet Forest vertical slice before production Hunts change.

- Seed, habitat and Wyrm-proximity stage select a deterministic Hunt node and create a new environment from the real C# generator; the selected seed is represented in the shareable URL.
- Move the mage using WASD/arrows or touch-drag, with collision applied through `RestrictMovement`. Toggle collision overlays for exact prop and wall footprints.
- Hit individual props or use area blasts; both call the C# destruction methods and expose genuine one-time supply drops for collection. Toggle two lightweight pathing probes that use `EnemyNavigationTarget`—not full AI encounters.
- Reuse the actual Web pixel-art terrain, tree, mage and enemy art modules, camera and depth sorting. The lab never edits account progression or player saves.
- QA targets 320px and 390px portrait layouts, different seeds, early/late Wyrm influence, prop destruction, one-time pickups and collision-aligned depth rendering. This lab is **not** final production art acceptance: full dynamic combat/loot and pathfinding remain the authoritative-game acceptance gates.

**Decision:** The earlier forced-crossing and reserved-central-lane proposal has been rejected for
new Wet Forest generation. Its only remaining presence is historical/current production legacy,
not canonical future world geometry. Maintain validated paths and safe spawn distance without
forcing a map silhouette. Inspiration: Diablo I's layout/set-piece separation and tile detail,
Diablo II's Act I roads, woods and side landmarks, plus unrestricted roaming where appropriate.

### Research continuation — recognisable procedural places (Wet Forest)

Useful comparative evidence: Diablo I lays out traversable space, then tile details and
site-specific setpieces, with connectivity checks; Diablo II Act I wilderness gives
orientation through human roads, but its off-road terrain has readable independent
features (graves, camps, ruins, forests), not mandatory geometric divider fences.
*Death Must Die* publicly described its earlier infinite flat map with sparse objects
as lacking exploration and moved toward larger authored-feeling spaces, winding routes
and procedural generation tools (November 2025 roadmap). WyrmForge should avoid the same trap
without losing Vampire Survivors-style kiting space.

References:
- https://www.boristhebrave.com/2019/07/14/dungeon-generation-in-diablo-1/
- https://classic.battle.net/diablo2exp/maps/
- https://steamcommunity.com/app/2334730/announcements/

**Do not revive the old cross-shaped safe lanes or mandatory wave-gated fences** as a Wet
Forest requirement. Keep navigation testing, region discovery, and authored landmarks
independent of any specific encounter arena shape.


### Wet Forest presentation integration, October 21, 2026

The procedural Wet Forest grammar and absence of forced geometric bands remain canonical.
World-anchored dirt/litter/ground roots and character contact marks are visual only and read
from the same forest world-space seed and C# prop coordinates. Approved monster silhouettes
are not repainted; motion is distance-driven rather than a clock-driven treadmill. Keep the
forest and its residents within one muted material/value system without burying the player,
attack telegraphs or drops. The Arena Lab tests **Hollow (kind 0)** and **Ashling (kind 2)**,
not the unrelated Mire Hound kind 1. Production roster ecology remains C# owned.
See [art and animation](art-and-animation.md) for source references and QA gates.
