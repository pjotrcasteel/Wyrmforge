# WyrmForge — canonical documentation

**This directory is the single source of truth for intended game design and engineering rules.** One living document per major subject. Open here first; do not derive precedence by stacking dated handovers, design amendments or prototype notes.

| Topic | Canonical document | Covers |
| --- | --- | --- |
| Identity and story | [Vision & story](vision-and-story.md) | Mood, player journey, lore, campaign, Chronicles |
| Magic and combat | [Magic & combat](magic-and-combat.md) | Divine schools, mutations, Arcane Nexus, spellcraft, aim, progression inside Hunts |
| Creatures | [Creatures & encounters](creatures-and-encounters.md) | Enemy ecology, roles, Fire/Frost roster, Wyrms and encounter design |
| Hunts and world | [Hunts & world](hunts-and-world.md) | Connected regional map, scouting, arenas, world evolution, physical terrain |
| Modes and rewards | [Modes & progression](modes-and-progression.md) | Eternal, seasonal Expedition/Arena, rankings, permanent rewards |
| Refuge and screens | [Town & UX](town-and-ux.md) | Building unlocks, World Gate, character creation, phone navigation and day/night |
| Art and animation | [Art & animation](art-and-animation.md) | Approved identity, production algorithms, spritesheet validation, scene consistency |
| Sound | [Audio & haptics](audio-and-haptics.md) | Sound identity, mixing, licensed material, device feedback |
| Platform and engineering | [Architecture & quality](architecture-and-quality.md) | C# simulation ownership, platform ports, tests, saves, integration quality |
| Priorities | [Roadmap](roadmap.md) | Ordered product outcomes, open decisions and delivery gates |

## Authority and maintenance rules

1. **Game source code at current HEAD** is the truth about what exists. Canonical topic documents express intended behavior, including unimplemented features. An open PR is **not shipped**. Never silently promote proposals or dated statuses into accepted requirements.
2. Decisions explicitly marked **LOCKED** take priority within their subject. When the owner changes a rule, update that topic file **in the same PR**. Keep a short dated change note there. Do not create a second numbered RFC or design handover as a competing source.
3. **Historic material stays accessible**, including the [archived full master (18–20 October 2026)](../archive/2026-10-20-unified-master-design-v1.3.md), dated `docs/design/`, `docs/gameplay/`, `docs/art/`, `docs/handover/`, `docs/roadmap/`, `docs/playtesting/`, `art/` and `tools/` documents. These are references, production records, experiments, release evidence or attribution, **not newer product specs**. Never delete mandatory license attribution or original art sources.
4. Dated work receipts (PRs, CI runs, captures, device testing) stay with their implementation and **link back to the relevant canonical topic**. Do not overwrite evidence to make it look like a feature shipped.
5. Preserve approved original art, deterministic gameplay, accessible controls, migrations and existing player progress. Research original external references for new visuals; use real-game tests, not polished disconnected mockups.
6. Multiple active PRs may change game behavior: coordinate with them before declaring new rules implemented, and update canonical topics when those PRs actually merge.

## Resolved priority clashes

| Area | **Current single authoritative direction** | Rejected / obsolete reading |
|---|---|---|
| Combat loadout | **Eventually up to 3–4 equipped prepared spells**, one reliable designated primary and up to three intelligently scheduled contextual spells. Shared casting/action economy, deterministic C# authority; initial one-primary gameplay migrates gradually. | Permanently **one equipped spell total**; or four independent autofiring streams / four manual buttons. |
| **Combat targeting (updated 19 Oct, LOCKED)** | **Auto-aim at a valid nearby enemy by default**, regardless of movement or standing still. Optional independent second-thumb/mouse/right-stick aim **fully overrides** automatic selection while actively engaged; release restores auto-aim. Spells continue auto-casting. | Movement-facing as the default firing direction, a required second stick, manual fire buttons, or auto-targeting that steals deliberate player aim. |
| **Creative freedom (new, LOCKED)** | Claude may invent within the approved game identity **after researching multiple independent relevant sources and checking the proposal against established WyrmForge style and approved artwork**. | Unresearched redesigns, random AI-fantasy ornamentation, or copying reference assets/content. |
| Magic interface | **One integrated Arcane Nexus**: Web + research/lab + spell construction + loadouts + Mastery/Forge facets in a coherent city experience. Maintain separate internal domain boundaries. | Permanent separate Laboratory versus Arcane Web player-facing destinations or duplicate progression systems. |
| Campaign access | **Campaign optional from the beginning**; free exploration first is legitimate; campaign can begin/resume later. Equivalent, earnable non-campaign route to full gameplay endgame / Conclave. | Complete Book I as the **exclusive gameplay prerequisite** for Conclave or advanced research. |
| **Magic scope (20 Oct, LOCKED)** | **Exactly six primary Divine Wyrm archetypes**: Pyromancer/Fire, Cryomancer/Frost, Stormcaller/Storm, Arcanist/Arcane, Necromancer/Death and Summoner/Binding. One distinctive signature ability per school, deeply mutable; target ten Tier-I mutations per school at introduction and expand across five tiers. Only four schools have existing combat implementations. | Twelve shallow elemental classes, forcing every character to start with Fireball, or declaring reserved higher tiers implemented. |
| Run pacing | Frequent **minor, tactical improvements**; scarce major rank/evolution breakthroughs, with legitimate eligibility around existing levels 5/10/15+ baseline. | Godlike power after 2–3 nodes; mandatory major upgrade every node. |
| Fateweave | Each draft card individually rerollable **once per round**, using shared per-Hunt charges. Rare **golden opportunity** applies to a single card, costs the same normal charge and obeys tier eligibility. | Reroll every card; separate golden currency; golden means free illegal top-tier evolution. |
| Hunts | Geography-first, connected, **Wyrm-tier-scaled** branching adventures. Known target or late-emergent Wyrm. | Every run permanently eight combat stages; disconnected diagram roads; arbitrary arena wallpaper. |
| Living map | Hand-painted, valid roads/bridges and landmarks, living fire/water/fog, progressive discovery, earned knowledge, persistent region history and **committed routes**. | Decorative AI-busy visual with phantom bridges, dead-end Chapel falsely shown as continuation, arbitrary scouting-for-free. |
| Normal / seasonal / Eternal | Distinct lifecycles: normal Hunts; **two separate four-week ranked Endless modes**; **one persistent never-seasonally-resetting Eternal Hunt** with all-time board. | A single mode/board with shared persistence and balance rules. |
| Season competitive rules | Shared frozen seeds per mode/season, normalized starts, unlimited attempts, **best verified** attempt, archived past seasons. | Every player gets random incomparable official seed, limited retries or unverified client scores as official. |
| Seasonal rewards | Meaningful earned powers/upgrades can be researched and used in **Eternal Hunt and eligible PvE**, **never as an unfair ranked seasonal starting advantage**. | Pure cosmetics only; or seasonal power automatically buffs ranked competition. |
| Eternal death | Meaningful recoverable setback to secured refuge; **same expedition continues**; best verified conquered frontier survives. | Permadeath restarting whole Eternal journey; or risk-free checkpoint death with no loss. |
| Refuge & travel | Guaranteed secure major refuges plus optional earnable/developable outposts; fast travel only along **previously secured, actually connected** refuge network, never bypassing frontier or choices. | All checkpoints randomly destructible; arbitrary map teleport to unvisited locations. |
| Eternal application startup | Sanctuary secure/save → may exit → **game relaunches to town** → **Continue Eternal Hunt** → returns to **same saved sanctuary** with same expedition/history. | Auto-resume inside combat, silently start a new Eternal expedition, or convert town visits to ordinary Hunt extraction. |
| Score privacy | Official Conclave verifies full evidence/build privately; public blueprint disclosure entirely opt-in. | Current Hall of Fame client score becomes official, or ranking forces disclosure of unreleased spell recipe. |

## Implementation and verification rules

1. **Use real repository/history evidence to establish progress; never infer it from this document.** Maintain the existing active workstream/PR until a safe integration checkpoint. Thereafter implement the highest-priority eligible item in §12; skip items already delivered and verified. Do not cancel working PRs or do an all-at-once rewrite.
2. Protect current accepted art, lore, deterministic C# simulation, save data, Forge/Essence/SpellBook/Arcane Web, milestones, test suites and running PRs. Explicit versioned migration when needed.
3. Prefer **vertical slices: state/physics + screen + tests + real phone visual acceptance** rather than superficial demos or polished but nonfunctional mockups. Do not build standalone HTML concept pages as a substitute for in-game implementation.
3a. **Research before creative implementation:** for each materially new environment/art/UI/combat presentation, inspect approved WyrmForge in-repo art and code plus **at least two independent relevant external references** (prefer developer breakdowns, photographed real architecture/materials, usability analysis and original-game footage). Note what transferable principle was learned from each, what is *not* being copied, how the proposal conforms to the established Gothic/pixel/painterly 2.5D style, and how it was judged at actual mobile size. Sources must be real and attributable, not invented. A reference is not permission to replicate copyrighted assets or deviate from approved designs.
4. Never invent final balancing numbers or extra systems. Mark proposed/tunable details and ask only on meaningful unresolved product decisions.
5. **Single truth:** a road visible as traversable must really be traversable, a wall drawn as solid must match C# collision, a rank/reward must be permitted by the authoritative progression state, and client rendering never creates its own combat results.
6. Each completed slice: modified paths, actual tests and CI results, screenshots/phone acceptance, save compatibility, PR details, remaining risks and next work. Update project continuity documents in repo through the normal workflow, rather than maintaining parallel master product-spec files.

---

## Migrated source sections

The original master had numbered chapters: **§1–2 and §16.1 → Vision; §3 and §16.2–3 → Magic; §4–6 and §16.4–6 → Hunts; §7–9 and §16.7–8 → Modes; §10–11 → Architecture; §12–14 → Roadmap**. This migration retains their wording, including the **LOCKED/PROPOSED** distinction, rather than silently rewriting design history. Art, town, audio and creature rules draw on separately dated accepted work; release/status records remain outside the canonical set.

**Concurrent work as of 20 October 2026:** Fire-only character creation from [PR #172](https://github.com/pjotrcasteel/Wyrmforge/pull/172) is on `main` (v0.0.138); device-local town lighting (Auto/Day/Night) from [PR #173](https://github.com/pjotrcasteel/Wyrmforge/pull/173) is also merged on `main`. Other open work includes [PR #168 — Ashling sprites](https://github.com/pjotrcasteel/Wyrmforge/pull/168), [PR #136 — Fire/Frost animation recovery](https://github.com/pjotrcasteel/Wyrmforge/pull/136), [PR #128 — menu Foley](https://github.com/pjotrcasteel/Wyrmforge/pull/128). Confirm current states afresh before implementing or claiming completion.
