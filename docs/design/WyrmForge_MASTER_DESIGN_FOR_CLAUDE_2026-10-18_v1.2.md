# WyrmForge — Unified Authoritative Product & Technical Design

**Single-document Claude handover · four-source audit 18 October 2026 · Version 1.3 (20 October: six Divine archetypes, signature-mutation strategy and tier extensibility; 19 October: auto-aim override)**  
**Repository:** https://github.com/pjotrcasteel/Wyrmforge  
**Status:** User-approved product direction where labelled **LOCKED**; four-source detail audit and prioritized delivery plan consolidated 18 October 2026, amended 19 October with auto-aim plus optional player override. This document does **not** claim future features exist in code. **One Markdown file is the specification**; the optional map image is a visual reference, not a second requirements source.  
**Audience:** Claude continuing ongoing WyrmForge development.  
**Next-step navigation:** **§12 contains the P0–P9 priority order**. This document deliberately does not describe which milestone Claude last completed; the repository and development-status records answer that.
**Reading rule:** **THIS FILE IS THE ONLY DESIGN HANDOVER CLAUDE NEEDS.** It consolidates and replaces the four earlier overlapping handovers, resolves their contradictory instructions, and preserves their non-conflicting requirements. Do not apply the older documents as extra layers of authority or ask the user to choose priority between them.

> **Implementation instruction:** This is a **product/design specification and priority guide, not a progress handover**. Determine the actual current implementation state from GitHub commits, branches/PRs, CI, the existing development handover (including §39 where relevant), and the reconciliation document; do not expect this specification to tell you what you completed last. These status records are evidence of *implementation progress*, **not competing design authorities**. Preserve and safely complete any genuinely active work, then select the **highest-priority unimplemented, unblocked** vertical slice from §12. Do not abandon working code, restart the project, overwrite others' changes or reimplement completed milestones. Existing code is authority for **what is currently implemented**; this document is authority for **the intended product**. Concept art, illustrative names and tuning values are not claims of shipped features.

## 0. Authority, operating contract and conflict resolutions

### 0.1 How to use this file

- **LOCKED:** a user-approved product requirement. Do not reinterpret or silently override it. This includes the most recent decisions about Sanctuary saves, 4-week seasons, Eternal Hunt, route commitments and intelligent 3–4-spell endgame loadouts.
- **EXISTING / AUDITED:** a dated observation of GitHub. Recheck HEAD; never use it as proof a feature currently exists if the repo has moved.
- **PROPOSED / TUNABLE:** illustrative names, sample encounter ranges, prices, probabilities, formulas, duration, visual icon/color recipes, data-model names and rollout order. Measure, prototype and get product-owner confirmation when a decision materially changes the experience.
- **DEFERRED:** a later supported possibility, not permission to implement it now (e.g. Divine Wyrms, 800-node Web, major online creator services, monetary prizes).
- **No implicit supersession:** Within this document explicit LOCKED decisions win over examples. Current validated code may require migrations/adapters rather than immediate rewrites; it does not negate intended behavior.
- **No four-document priority problem:** Never ask Claude to read the October 15 base, October 17 amendment, October 18 procedural addendum and October 18 map/Endless document to infer precedence. The current rules are integrated here. Those originals are archival provenance only.

### 0.2 Definitive resolved conflicts — do not reintroduce old wording

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

### 0.3 Highest priority delivery rules

1. **Use real repository/history evidence to establish progress; never infer it from this document.** Maintain the existing active workstream/PR until a safe integration checkpoint. Thereafter implement the highest-priority eligible item in §12; skip items already delivered and verified. Do not cancel working PRs or do an all-at-once rewrite.
2. Protect current accepted art, lore, deterministic C# simulation, save data, Forge/Essence/SpellBook/Arcane Web, milestones, test suites and running PRs. Explicit versioned migration when needed.
3. Prefer **vertical slices: state/physics + screen + tests + real phone visual acceptance** rather than superficial demos or polished but nonfunctional mockups. Do not build standalone HTML concept pages as a substitute for in-game implementation.
3a. **Research before creative implementation:** for each materially new environment/art/UI/combat presentation, inspect approved WyrmForge in-repo art and code plus **at least two independent relevant external references** (prefer developer breakdowns, photographed real architecture/materials, usability analysis and original-game footage). Note what transferable principle was learned from each, what is *not* being copied, how the proposal conforms to the established Gothic/pixel/painterly 2.5D style, and how it was judged at actual mobile size. Sources must be real and attributable, not invented. A reference is not permission to replicate copyrighted assets or deviate from approved designs.
4. Never invent final balancing numbers or extra systems. Mark proposed/tunable details and ask only on meaningful unresolved product decisions.
5. **Single truth:** a road visible as traversable must really be traversable, a wall drawn as solid must match C# collision, a rank/reward must be permitted by the authoritative progression state, and client rendering never creates its own combat results.
6. Each completed slice: modified paths, actual tests and CI results, screenshots/phone acceptance, save compatibility, PR details, remaining risks and next work. Update project continuity documents in repo through the normal workflow, rather than maintaining parallel master product-spec files.

---

## 1. Core vision, art and player loops

### 1.1 Product identity — LOCKED

WyrmForge is an original, grounded **Gothic dark-fantasy, mobile-first 2.5D action roguelite** that grows into an expansive spellcraft RPG. Original Diablo I/II provide atmosphere, dread and meaningful architecture; Archero-like survival clarity informs low-control combat; Battlemage/Legion Breaker influences impactful pixel material, spell-local lighting and visible magical power; No Rest for the Wicked inspires deliberate painterly composition. **These are mood/reference studies, not assets, copied layouts or a different fixed-lane combat model.**

- Humans endure in fortified, repeatedly damaged cities; protective **runes are attached to battered walls** and failing. Ancient magical engines consume an increasingly scarce, concealed substance; Wyrms were sacred protectors and now threaten humanity. **Do not reveal or settle the engine–fuel–Wyrm mystery prematurely.**
- Wet forests, dark roads, abandoned settlements, coherent monastery cloisters/studies, real river valleys, old bridges, graveyards, forgeworks. Gothic undead/demons/cursed beasts. **Not** alien tentacles, arbitrary monoliths/spires, overornate AI details, generic fantasy glow, or disconnected architectural props.
- Canonical mage: muted **slate-blue hood/robe**, pale collar, shadowed face, **thin continuous wooden staff**, never a hammer; older grey-bearded appearance may be a default/customization option, not a mandatory immutable protagonist.
- Correct world-anchored 2.5D perspective and depth sorting. The player/enemies are readable against terrain. No camera-facing billboards as solid buildings; impassable visual objects correspond to real collision.
- Combat power manifests as different cast animations, shape/timing, actual light sources, impacts, authentic audio and responsive world effects. Maintain real authoritative hit/event semantics; avoid fake simultaneous spells and particle soup.
- On portrait mobile (390×844 reference; test narrower widths) the primary action and danger information are immediately understandable, with accessible ~44px touch targets and no hover-only critical information. Avoid a PowerPoint/webpage-like front end and wall-of-text tooltips. **Show effect first, decision second, explanation on demand.** Desktop remains supported.

### 1.2 Player loop — LOCKED

**Choose a goal → explore/prepare in town's Arcane Nexus → commit to a Hunt → fight and acquire temporary power → make route choices and discoveries → secure/extract where appropriate → research/invent/upgrade → pursue stronger Wyrms, story, seasonal challenges or the Eternal frontier.**

- Campaign, free exploration, ordinary Wyrm Hunts and advanced Hunts all use the shared underlying Hunt/gameplay engine and one coherent progression universe.
- **Normal roguelite Hunts:** temporary level/ranks/refinements reset at their established end/extraction, secured material and knowledge survive through their existing rules.
- **Seasonal Ranked Expedition:** fresh isolated seeded attempt with equal legal starting power; 4-week board.
- **Seasonal Ranked Arena:** fresh isolated seeded wave attempt without expedition map; different 4-week board.
- **Eternal Hunt:** same persistent expedition across deaths, sanctuaries, town visits, weeks/months and seasons; permanent, upgradeable power and independent all-time frontier.
- All major modes share legitimate C# combat, magic rules, enemy ecology, Wyrm identities and art pipelines, **not** identical persistence, reward, permission or leaderboard scoring semantics.

---

### 1.4 Creative initiative with mandatory research and style gate — LOCKED

Claude **may exercise creative freedom** in silhouettes, transitions, location-specific details, spell VFX, enemy encounters, arena challenges, composition and UI interaction where the product spec leaves room. It is **creative implementation within a fixed visual identity**, not authority to redesign the identity. Before making a visually significant addition:

1. **Look at existing WyrmForge artifacts first:** `art/README.md`, approved `art/world/*`, the playable game at actual mobile viewport, current CSS/Canvas renderer and dated art/backlog handovers. Reconfirm the actual approved mage palette and slender staff. No altering existing canonical art merely because a generator imagines an alternative.
2. **Research multiple sources (minimum two independent relevant ones):** at least one visual/form/function source, and another complementary reference such as real medieval architecture, river hydraulics/light, developer game-art breakdown, UX study, similar game with distinct strengths or mobile control usability. Do not rely on two near-identical reposts, AI-generated reference pictures, stock collages or unverifiable claims. The intended transfer must be stated precisely.
3. **Make a short written design justification:** intended place and history; material/structure/perspective; silhouette and read-distance; specific research inspirations and what is not copied; combat/navigation implications; performance and touch implications. Keep it concise in normal working docs; no approval theatre.
4. **Validate physical truth and craft:** e.g. a chapel has a connected entrance and onward road, its walls have supported planes and matching collision; a bridge spans a real river and joins roads; a furnace has a credible power/feed path; spell lighting originates at real casts. A picture that looks beautiful but has impossible geography or mechanical construction fails.
5. **Deliver and inspect in the real experience:** screenshot/video the live Blazor/Canvas view at a 390×844 portrait reference and 320px, test genuine touch interactions and iOS Safari when available, adjust bad perspective/repetition/overbusy forms before declaring art accepted. No huge AI-y fine-grain noise, tentacle/alien creatures, endless randomly placed arches/spires or glowing borders that overwhelm the world. Diabolic undead, cursed beasts and ruined human architecture take priority.
6. **Keep authorship honest:** draw inspiration from form, interaction and function; do not copy third-party sprites, trademarked interfaces, lore or sounds. Assets require suitable original/verified licensing. If an approved requirement conflicts with a creative idea, the approved requirement wins.

Research **must precede the work**, not be appended afterward as justification. Multiple sources is a minimum evidence standard, not a mandate to delay trivial bug fixes or existing approved-asset adjustments.

## 2. Campaign, free exploration, Chronicles and world lore

### 2.1 Optional campaign and equal access — LOCKED

From the start, players can choose **Begin Campaign** or **Free Exploration** (with suitable onboarding). A free explorer may first master Frost/Fire/Storm/Arcane in an eligible region and start Book I at its authentic beginning much later, retaining research, build options, earned materials and Legacy. Story dialogue can acknowledge existing power where reasonable; no multiverse/time-travel explanation is needed. Skipping story does not grant immediate endgame eligibility: equivalent access must be **earned** via a distinct exploration/knowledge/Wyrm-achievement path.

- The campaign introduces all four current elements, but their exact introductory order is **not fixed**.
- Story-only relationships, cinematic events, identities and consequences can depend on a Chronicle. **No story branch, origin, death, location loss, final ending or free story expansion may create an exclusive shared-ranked gameplay power/access advantage.**
- Targeted repeatable rare-material farming belongs in endgame systems, not repeated narrative chapters. One-time discoveries, critical Essences and rare narrative rewards cannot be multiplied by replaying a Chronicle.
- Future **free** additional story content (“FLC”) may be independent Side Chronicles, direct sequel Books with continuity prerequisites inside one Chronicle, and World Expansions. No mandatory later book grind to enter shared ranked modes.

### 2.2 Book I — *The Broken Covenant* (working title, story architecture retained)

Humans hide behind wards powered by mysterious engines; fuel is scarce and Wyrms changed. Central question: **When the world cannot be protected as before, what will you change to save it?**

| Proposed chapter | Story / gameplay role |
|---|---|
| Prologue — *The Night of the Breach* | Ward collapse, survival and spell introduction. The previously proposed mandatory onboarding is **superseded** by optional campaign / suitable free-exploration onboarding. |
| Act I — *Beyond the Last Ward* | Wet frontier, threatened settlements, first hunts and decision who receives protection. |
| Act II — *The Forbidden Testament* | Forbidden records, morally credible factions, useful research and choice over knowledge. |
| Act III — *The Hollow Crown* | Monumental regional catastrophe / Wyrm confrontation, consequences and ending. Boss title is a working idea, not implemented canon. |

Three **major decisions**: (1) reinforce central city **or** protect exposed settlement (*Cost of Protection*); (2) restrict/release/entrust dangerous knowledge (*Price of Knowledge*); (3) decide use of recovered protective power (*Future of Humanity*). Real NPC deaths and settlement outcomes matter in that Chronicle, with foreshadowing and consequences, never as simplistic good/evil scores.

Three **distinct story resolutions**, all reaching **mechanically equivalent endgame**:

- **The Last Bastion — Preservation:** central wards stabilized; humanity still dependent on unclear engines.
- **The Open Roads — Rebuilding:** redistribute protection and reconnect settlements, increasing hope and exposure.
- **The Unbound Dawn — Transformation:** attempt a different protection paradigm under uncertain research, safeguarding the immediate present.

NPC archetypes: **Ward Commander, Archivist, Enginekeeper, Outlands Scout**. Sympathetic but conflicting motives. None may be the only provider of a required permanent gameplay/endgame service if they could die. *Echoes Beneath the Ash*, *The Silent Thrones* and other book names remain working examples. Book I settles an immediate crisis, not the universe's Wyrm/fuel origin.

### 2.3 Independent story histories, shared non-narrative progress — LOCKED

- **Player Legacy:** permanent account discoveries, Nexus knowledge, researched components, unlocked options, achievements, cosmetics, appropriate challenge access.
- **Chronicle:** an independent narrative history of origin, decisions, relationships, deaths, settlement variations, Book progress and endings; multiple Chronicles never overwrite one another.
- **Persona:** appearance/name/portrait and narrative identity from a completed Chronicle; selectable for shared endgame representation, **not** a new mechanical character or second competitive account. Origins (Warden, Scholar, Exile, Survivor) are narrative only.
- **Hall of Legends:** personal Chronicle archive; rename, pin, archive, deliberately delete with confirmation, never accidentally delete Legacy.
- **Champion's Archive:** separate verified account-level competitive results, season-specific history and optional publication; story choices/persona selection do not change points or legality.
- No mandatory “true” Chronicle or forced time-travel/multiverse canon. Direct sequels may require the relevant earlier Book **in that Chronicle only**; independent stories remain independently available.
- Story-specific destroyed villages/NPC deaths persist in that Chronicle. Shared free-exploration world and Eternal persistence must be represented without leaking mutually exclusive Chronicle variants or unapproved story advantages across saves. The *exact world-state intersection rules* need careful design, not default mirroring of every story choice.

---

## 3. Arcane Nexus, spellcraft, progression and sharing

### 3.0 Divine magical archetypes, signatures, mutations and tiers — LOCKED (20 October 2026)

**Six schools, no filler:** The six primary archetypes are **Pyromancer (Fire)**, **Cryomancer (Frost)**, **Stormcaller (Storm)**, **Arcanist (Arcane/Aether)**, **Necromancer (Death)** and **Summoner (Binding/Dominion)**. Every school originates from **its own Divine Wyrm**. Lesser Wyrms belong to that Divine lineage. The four currently established lesser anchors remain **Ashfang, Rimeclaw, Stormcoil and Voidweaver**; Divine identities and the Death/Binding lesser Wyrms have **no approved names yet**. The source of magic is Divine, but this does **not** mean Divine Wyrm encounters or Divine spells are available. Combat fantasy comes first, world/environment interactions are supportive, not substitutes for viable archetype mechanics.

**Character choice, not Hunt choice:** At **character creation** the player chooses one Divine school and receives that school's signature foundation. Fireball is the Pyromancer's signature, **never the mandatory starting spell of the other five schools**. Starting anchors currently in code are Fire Bolt (future Fireball identity), Frost Shard, Chain Lightning and Arcane Orb. Necromancer and Summoner signatures require their own deliberate design; a corpse-based reanimator must not play like a generic ranged projectile or an always-on Summoner. A later **full school respec is supported in principle, with timing, cost and prerequisites explicitly TBD**. Free reallocation of eligible ordinary-Hunt Web/loadout choices is **not** full-school respec. School selection belongs to the character, while World Gate lineage/region and Hunt tier are **encounter choices**, independent of the character's school. A Frost character can enter the Fire region.

**Current release gate — LOCKED (20 October):** Character creation shows all six Divine schools, but **only Pyromancer/Fire is selectable until the Tier-I Fire mutation/spell experience has been fully implemented and accepted**. The other five remain visible and clearly locked, regardless of whether older combat prototypes already contain their spells. This is a gate for **new characters**, not a destructive migration: existing saved non-Fire affinities and their progress are preserved, and Hunt region choices remain independent. The player-facing screen uses direct copy such as **"Choose your magic"**, without abstract or lengthy Divine-affinity explanation. Unlock other schools only after explicit readiness approval; do not automatically unlock them from a code-found signature.

**One mutable signature, not twenty unrelated spells:** Each school has one strong recognizable signature ability; initial design target **ten distinct, meaningful Tier-I mutations per school**, extended by future tier mutations, transformations and compatible hybrid combinations. A mutation changes behavior/role or structure, not simply icon color or a meaningless +X% stat. School-specific grammar is essential: Pyromancer mutates Fireball ignition/explosion/projectiles; Cryomancer freezing/shatter/protection; Stormcaller chaining/tempo; Arcanist echo/manipulation; Necromancer corpse/curse/reanimation economy; Summoner bonded unit behavior, roles and commands. Shared contracts/validation may be reused but **not** a universal Fireball-style projectile template.

**Five separate Wyrm/Hunt tiers are already represented by World Gate Tier 1–5 and WyrmTier {Wyrm, Ascendant, Elder, Primordial, Divine}:** Tier I is currently the **only selectable World Gate tier**; the rest are reserved gameplay. Distinguish at all times:
1. **Hunt/Wyrm tier** = threat level and availability of the chosen encounter. It cannot automatically unlock magic.
2. **Magical progression/required tier** = the prerequisites for researching/equipping a mutation (independent from Hunt tier); higher Wyrm encounters may provide prerequisite evidence/materials.
3. **In-Hunt spell rank** = temporary Rank I/II/III and refinements earned in an attempt, subject to existing level-5/10/15+ rules.

**Five-tier extensibility (LOCKED) does not lock the exact unlock ladder (TUNABLE):** Tier I starts with ten mutation design targets per school as that school becomes available; Tier II specialization, Tier III transformation, Tier IV Wyrmcraft and Tier V Divine-scale magic are **working labels and directions**, not promised gameplay or approved balance. Higher tiers should introduce new mechanics and choices instead of merely multiplying damage. Tier-I recipes remain usable in advanced Hunts. Do not pretend that one Tier-I launch must ship all six schools at once.

**Acquisition ownership:** character creation supplies the signature. Arcane Web owns specialization and mutation access/gates; Forge earns permanent forms, lineage catalysts and components via existing Essences; Spellcraft validates researched combinations, infusion order and blueprint compatibility; Mastery/Wyrm feats unlock rare properties; the Hunt rolls only legal temporary ranks, minor refinements and evolutions. Preserve the already shipped Fire Bolt/Cinder Needle, Frost Shard/Ice Lance, Storm and Arcane gameplay during an incremental migration: Fire Bolt's Fireball rebranding and Cinder Needle becoming a **Fireball form mutation** are product intent, not completed changes. Never silently delete old SpellId data or saves.

**Combination and combat invariants:** Fire+Frost Frostfire, Stormglass and Arcane Conduit are already authored mechanics and must not duplicate effects when translated to signature mutations. Cross-school infusion does not grant the second school's full specialization; the active character retains a primary Divine school. Versioned recipes and compatibility/complexity budgets guard chain depth, explosion propagation, mobile VFX and CPU load. **One reliable signature plus at most three contextual techniques** is the eventual loadout model; contextual actions share the existing cast budget rather than adding independent free DPS, with auto-aim/manual-override precedence unchanged.

**Design reference principles:** Last Epoch: specialize a known spell; Path of Exile: behavior-changing typed support combinations; Noita: fascinating order-dependent chains but enforce strict recursion limits; Mages of Mystralia: visual readable experimentation; Hades: meaningful temporary Hunt upgrades. Transfer the principles only; do not reproduce assets or lore.

**Tier-I Pyromancer candidate set — PROPOSED, not all implemented:** Cinder Needle (rapid form), Phoenix Volley (multicast form), Meteor Heart (heavy form), Piercing Ember, Seeker Ember, Scorched Earth, Wildfire, Detonation, Ash Harvest and Ember Recall (returning projectile). These are **ten Tier-I mutation design candidates**, not ten free simultaneous passives or ten already-shipped mutations. Several names map to existing mechanics; their initial accessibility, access routes, mutual exclusions and balance require validation. **Wyrmfire is deliberately separate from the ten**: it remains a rare Wyrm mastery/awakening, with its existing progression gate unchanged, and may grow into higher tiers later. Do not unlock mastery-based spells just because a user selected a higher Hunt tier. No unshipped spell or variant should appear as playable until implemented, tested and visually reviewed.

**Acceptance/rollout:** Treat code as authority for currently implemented content. Keep legacy saves and old SpellIds compatible via explicit migration; check builds from the existing Forge/Web/Mastery/Spellcraft, all six Divine labels, inaccessible Tiers II–V, seeded playtests and real 320/390px UI. Integrate character-creation visuals only with the parallel character work. Expand one school at a time, Fire then Frost, design cross-school reactions only after each base school is meaningful.


### 3.1 One integrated city feature — LOCKED

The **Arcane Nexus** is the ONE coherent player-facing progression/spellcraft experience; internally retain modular domains. It combines:

- **Arcane Web:** large navigable network of disciplines, interconnected branches, the central Wyrmheart, specialization paths, meaningful keystones and compatible mutations.
- **Contextual research/experiments:** selecting a node exposes what it unlocks, missing secured materials, research hypotheses, immediate impact and a one-step experiment/awaken action without changing to an unrelated UI.
- **Blueprint inventor/library:** build typed compositions, preview actual effects, save/version researched blueprints and inspect incomplete imported schematics.
- **Loadout/preparation:** one identifiable primary, up to three contextual prepared spells eventually, visible budget/behavior constraints and saved builds.
- **Forge, Mastery, Codex, Essence Vault:** reuse current progression and strong in-world Forge rituals as integrated faces/capabilities; **do not delete working services or create duplicate currencies/wallets**.

Node classes: **Specialization** (earned points/role/compatibility), **Research** (knowledge + secured materials; permanent discovery), **Awakening / Wyrmcraft** (rare matching Essence/mastery/deeper mastery). Wyrmheart development tiers and exact node topology/point count are **proposals**. Existing 24-point Web budget is the **audited baseline** to revisit deliberately, not silently inflate.

The long-term ambition is hundreds of mechanically distinct legal builds and a large extensible Web. **“800+ nodes” is an aspiration, not a milestone.** Four initial schools are implemented or partly implemented. Necromancy and Summoning are now **approved fifth/sixth Divine archetypes**, not merely candidate cross-disciplines; secondary practices such as Warding, Spatial, Ritualism, Blood and Metamagic remain unapproved taxonomy. The six-school progression and mutation-tier rule in §3.0 overrides outdated four-school scope examples.

### 3.2 Typed, bounded spell grammar — LOCKED

A blueprint is catalogue-backed **data**, never executable user-provided scripts:

1. **Foundation / elemental discipline** — principal behavior and visual identity.
2. **Form/delivery** — one primary form such as projectile, pulse, beam or controlled chain.
3. **Infusion/property** — researched specific Essence/Wyrm/rare monster trait.
4. **Conditional reaction / trigger** — shatter, propagation, echo, ignition etc., with explicit event limits.
5. Optional researched catalyst / Wyrm property and socket/node synergy, subject to compatible tags and complexity limits.

Initially implemented foundations: **Fire** (burn/ignition/area denial); **Frost** (chill/control/shatter); **Storm** (conductivity/chain/tempo); **Arcane** (marking/energy/redirect/echo). Divine **Death** and **Binding** schools are committed future archetypes (§3.0), pending authored contracts. Two-element cross-schools form meaningful interactions; element **order matters** to delivery/role. Existing `Frostfire`, `Stormglass`, `Arcane Conduit` logic must be **reused or migrated, never double-applied**.

| Two-school interaction | Meaning (working name, only shipped mechanics are code-truth) |
|---|---|
| Fire + Frost | Frostfire: burn/freeze/conditional thermal shatter |
| Fire + Storm | Flashpoint: charged ignition/limited explosive propagation |
| Fire + Arcane | Riftbrand: spatially controlled ignition |
| Frost + Storm | Stormglass: conductive ice/chain-shatter |
| Frost + Arcane | Glacial Echo: delayed chill/echo/displacement |
| Storm + Arcane | Arcane Conduit: bounded discharge/echo transfer |

A **third elemental role** can modify the *first* reaction under advanced prerequisites; it is **not** a free third autonomously firing attack stream. Initial grammar forbids unrestricted all-four element super-spells. Later four-element rituals require fresh explicit product approval. Limits apply to complexity, socket availability, reaction depth, target searches, projectile counts, VFX work, cooldowns and statuses. Named hard-invalid combinations must be rejected **before** a Hunt, with a usable reason; full builds (blueprint + Web + temporary rank/relic/evolution) are the balancing unit.

Existing Web hybrid branches, points connectivity, mastery exclusion and generic component tags (`Impact`, `Projectile`, `AppliesChill`, `Chain`, etc.) should be reused. Possible mutation sockets: one midgame, two late-game active; **numbers proposed**. No free all-branch keystone stacking. Free respec between standard Hunts should safely unequip incompatible sockets without erasing recipes. Exact rules for adjusting an *active saved Eternal Hunt* build at town/sanctuary must obey save validity and await tuning.

### 3.3 Intelligent automatic multi-spell combat — LOCKED (supersedes old one-spell-only rule)

The long-term prepared loadout supports **three or four equipped spells MAX**, with **one reliable primary** and up to three contextual active spells, unlocked gradually. **Players move/dodge with auto-aim by default and optionally take over aiming; prepared magic casts intelligently without adding an action bar of manual spell buttons.**

- C# owns deterministic cast eligibility, **automatic acquisition/manual-override aim geometry** and threat perception, target count within legal delivery rules, actual telegraphs, existing status, resource/cooldown budget and shared **cast arbitration**. Fire Burst/defensive Frost/utility Arcane etc. are examples, not prescribed slots. Threat-awareness may decide *when* to cast and *which legal enemy* auto-aim selects; it must never override actively engaged manual aim.
- Contextual spells execute only when useful/eligible, with sensible defaults; optional Nexus trigger policies can fine-tune behavior without obliging players to program automation.
- Shared cast/action budget avoids fourfold free DPS, starvation of defensive spells, endless chain procs, fake on-screen damage, overload and unpredictable AI-agent decisions. Inputs, decisions and emitted gameplay events should be reproducible/inspectable.
- Existing one-primary `SpellBook` is a **valid transitional implementation** to extend by adapter and tested vertical slices. Do not remove it or existing spell evolutions when introducing contextual slots. One fused Fire+Frost spell remains a **single combined cast with bounded reactions**, even while the character can also equip distinct contextual spells.
- Player/enemy mobility, real input responsiveness, dodge windows and attack visibility outrank theatrical cast animation. Avoid slowdowns and giant particle halos masking hits.

### 3.3a Hybrid auto-aim with manual override — LOCKED user intent, implementation details PROPOSED

**Latest user-approved decision (19 October 2026; supersedes 18 October movement-facing default):** WyrmForge uses **automatic aiming at a valid nearby enemy by default**. The player can **temporarily take full control of aiming** at any time; automatic targeting cannot fight or snap away from that intent. When manual aim ends, **auto-aim resumes**. Auto-casting continues throughout. This is inspired by Enter the Gungeon's **controller auto-aim that can be overridden**, but WyrmForge retains its own automatically casting magic rather than manual gunfire.

**Reference and intended transfer:** [Enter the Gungeon's controller auto-aim options](https://enterthegungeon.wiki.gg/wiki/Asset_strings) include nearest-enemy auto-targeting unless overridden; [its developer explains soft aim assist based on angle, distance and threat](https://steamcommunity.com/app/311690/discussions/0/412446292760718217/). Study the responsive manual-control handoff; do not copy game assets, code, prescribed targeting parameters or mandatory twin-stick gunplay.

**Target authority and priority — LOCKED:**

1. **Manual aim engaged: absolute precedence.** Independently chosen angle or explicitly selected target directs aimed spells, even if a closer enemy is elsewhere. Do not snap projectiles to auto-selected enemies, back-turn to threats, steal movement input or require taps to cast.
2. **No active manual aim: default auto-target.** C# picks a legal visible/reachable enemy, generally prioritizing nearby meaningful threats; movement direction does **not** determine spell direction. Avoid noisy target switching and consider occlusion, range, spell target rules, target death and attack readability.
3. **Override released or interrupted: restore auto-target.** Never leave a stuck manual-aim state after lifting a thumb, releasing a right stick, losing capture/focus, changing orientation, pausing or entering UI. Smoothness/debounce is tunable, but stale manual headings and double casts are not acceptable.
4. **No legal target: respect the spell's no-target behavior.** Do not conjure enemies, shoot through real barriers or guarantee false hits. Per-spell empty-space casting, manual aim forgiveness, auto-target scoring and reacquisition thresholds remain TUNABLE.

**Inputs — mobile-first, not a mandatory twin-stick game:**

- **One thumb:** left touch moves/dodges; the mage auto-aims and auto-casts even while running away, circling, stationary or strafing. Moving does not steer the default shot direction.
- **Optional second thumb:** press/drag in a responsive right-hand aiming area while continuing left-thumb movement. Manual aim takes effect immediately during engagement; releasing ends the override. Tap-to-aim may be supported as an explicit short-lived override only if its end is clear. Touch IDs never collide; test real iOS Safari cancellation and multi-pointer behavior.
- **Desktop/gamepad:** active mouse aiming and an actively deflected right stick temporarily override auto-aim while WASD/left stick controls movement. Mouse presence, idle pointer or controller deadzone cannot trap the player in manual mode. Exact gesture/timeout tuning remains PROPOSED.
- **Visual cue:** an unobtrusive in-world magical trace/target cue consistent with existing Gothic painterly/pixel 2.5D art distinguishes auto-selected and manually intended aim without giant arrows, busy reticles, hidden target hopping or lights obscuring projectiles/hazards. C# cast direction, mage/staff facing and VFX must match; no world/camera rotation to fake direction.

**Spell targeting and ability classification:**

- **Straight projectiles (Fire Bolt, Frost Shard, Arcane Orb):** in auto mode, launch toward a legal target through *actual* projectile geometry; in manual mode launch along the player's deliberately chosen angle/point, allowing genuine misses. Neither mode bypasses walls, projectile travel or collision.
- **Chain Lightning / acquired target abilities:** auto mode chooses a legal initial target; manual mode chooses an initial target aligned with the deliberate direction (subject to typed legal cone/range) or performs its specified no-target behavior. Subsequent chaining/forking uses its existing legitimate target acquisition; never override the first manually aimed hit.
- **Cones, area placement, dashes, defense, auras:** directional effects follow effective Auto/Manual aim as appropriate; self-centered or non-directional spells keep their own cast semantics. Contextual scheduling chooses *when/which spell*, manual input chooses direction only when engaged.
- **Combinations and evolutions:** use typed selection/delivery/line-of-sight/homing/chain/no-target rules. Do not turn fused Fire+Frost into two projectiles or create four independent free auto-cast streams.

**Integration and save authority (recheck live GitHub before editing):**

- The current C# `MovementInput(double X,double Y)` carried movement only, while `ArenaView.razor.cs` and `wwwroot/js/arena-input.js` carried movement gestures. Introduce **optional manual aim intent plus engagement lifecycle** and an effective **Auto / Manual targeting mode** in authoritative C# state/snapshots. Preserve existing movement, dodge, saves and deterministic replay.
- Existing `RunSimulation.Spells.cs` and `RunSimulation.Targeting.cs` use `NearestTarget` for multiple legitimate acquisition/chain mechanics. **Keep/refine valid auto-targeting**; add manual override precedence at the appropriate cast-acquisition seam, not a wholesale removal of nearest-target helpers.
- Publish C# effective target/direction for mage pose, VFX, actual projectile launch and verifier input trace. JS reads/captures gestures and renders snapshots; it does not independently choose enemies or damage. Version new inputs for backward-compatible replay.

**Acceptance — LOCKED behavior, TUNABLE sensitivity:**

1. Player moves north or runs away from a nearby west enemy: without manual aim the cast targets that **legal west enemy**, not north. Stationary players also auto-acquire.
2. Player manually aims east while the nearest legal enemy is west: straight projectiles fly **east**, may miss, and never snap west while the manual override is held.
3. Two-thumb movement/dodge and optional precision aiming remain simultaneous. On release or interruption the next legal aim returns to auto-target without a stuck angle, stolen touch or doubled cast.
4. Auto-acquisition excludes dead, blocked and out-of-range enemies, avoids target flicker and obeys true collision. Manual target choice is not silently changed by target scoring.
5. Chain Lightning initial acquisition respects Auto/Manual mode; valid subsequent chains, homing modifiers, defense, auras and fused combinations retain designed behavior.
6. Test mouse, keyboard, controller deadzones, 320–390px portrait, real iPhone Safari two touches, touch cancellation, resize, focus loss, camera transforms, 2.5D render, seed/replay and old saves.
7. Balance threat positioning and dodge windows for **higher default auto-aim uptime** without automatic guaranteed hits or removing positional skill. The responsive override must feel useful rather than mandatory.

**No new cast buttons:** prepared magic still casts automatically; the future 3–4 intelligently scheduled slots and shared cast economy in §3.3 remain unchanged. **Only the default aim/optional override rule changed.**

### 3.4 Hunt upgrades and Fateweave — LOCKED

- Crafted spells enter each ordinary/ranked attempt with their **identity but not their full high-rank strength**. Temporary rank, refinements, evolutions and many relic effects remain earned in that run. For persistent Eternal progression see §7: designed permanent power coexists with active expedition state but cannot bypass ranked equal-start rules.
- **Minor refinements between major breakthroughs** is intentional: earlier prototypes made heroes godlike after ~2–3 nodes. Existing level **5 Rank II**, **10 Rank III/synergy eligibility**, **15+ evolution eligibility** are code-audit baselines/tunable paths; rank and prerequisites actually govern offerings. More Hunt nodes do **not** automatically mean more major power.
- **Fateweave (working name):** in a normal 3-card upgrade draft, each displayed card can be rerolled **once individually**, up to three separate card replacements during that round, using a **shared finite reroll charge pool for the entire Hunt**. A new draft resets per-card flags, NOT shared charges. If no legal different replacement exists, prevent waste / explain clear fallback. Replace only selected card; other two stay untouched.
- **Rare Gilded/Golden opportunity:** one reroll *slot* occasionally has golden property pre-decided in C# seeded progression; **costs the same normal charge** and counts as that slot's once-per-round reroll. It can improve choices **only within the stage's legal rarity/power envelope**, not summon Rank III early. No separate golden currency or guaranteed every round.
- Potential earned reroll charges, rare pickups and Nexus nodes affect finite availability subject to caps (counts and probabilities **unresolved**). Never refill through UI redraw/save reload. Test no duplicate cards, eligibility, slot state, shared-charge exhaustion, persistence and replay.
- Balance diagnosis must distinguish **offer rates from player pick rates** (especially under-selected Frost), and measure *actual* control/shatter/survival against resistance, not just presumed numerical weakness. Human feel tests required.

### 3.5 Materials, Forge, Mastery and research — LOCKED

- Existing Wyrm families/material examples: **Ashfang** (`CinderHeart`, `MoltenFang`, `AshenWing`); **Rimeclaw** (`RimeHeart`, `GlacialScale`, `HoarfrostWing`); **Stormcoil** (`StormHeart`, `ChargedScale`, `TempestWing`); **Voidweaver** (`VoidHeart`, `NullScale`, `PhaseWing`). Exact component effects are design propositions unless existing code implements them. Rare non-Wyrm creatures provide alternative samples so experimentation is not exclusively boss-grinding.
- Rare Essence conveys creature **behavior and magical law**, not abstract interchangeable coins. Specific secured specimens unlock one-time research; never charge the same rare specimen for every cast/Hunt. No duplicate wallet next to Forge.
- Novel failed experiments **always produce a usable new observation or bounded progress**. No blind random destruction of irreplaceable materials. Viewing first sample should expose research clues rather than consume it; explicitly confirm any precious sample spend. The same item cannot be consumed concurrently by Forge and Nexus research.
- Known discoveries survive failed Hunts. Unsecured samples obey extraction/risk state; earned permanent progression persists. No real-world research timers, premium accelerators, pay-to-win, arbitrary gear treadmill or unbounded flat-stat inflation in standard progression.
- Existing Forge Masterworks, Wyrm Essences, Spell Mastery and Codex are enduring systems. Additional awakening/trophies create new options and challenging goals. Higher-tier Wyrms can supply advanced knowledge/materials.
- **Eternal Hunt exception (explicit latest rule):** Seasonal achievements unlock *meaningful permanent power* (upgradable mutations, components, spells/research branches, rare properties) usable in Eternal Hunt/eligible PvE via Arcane Nexus. This vertical growth is **intended** there, but cannot change official seasonal ranked starting capabilities.

### 3.6 Spell blueprints, community and privacy — LOCKED

- Ownership = personal blueprint copy, revisions and consent choices; not patent exclusivity over shared game-mechanical combinations. Two players can independently invent the same spell.
- **Private by default**; **Unlisted** unguessable link/code to an immutable published revision; **Published** opt-in searchable Spellwrights' Archive. Editing personal copy does not silently rewrite an already published revision. Withdrawal stops new distribution but not copies already independently imported; eventual account-deletion/moderation policy needs careful definition.
- Imported blueprint is a **schematic**, not a shortcut unlocking missing ordinary PvE research. Save incomplete designs with pinned missing steps. Optional explicit derivation/provenance for remixes; mechanically identical independent builds require no forced attribution.
- Versioned catalogue-backed validated import/export; never run arbitrary external code. Filters can include element/form/role/complexity/known components/verified competition history. No paid featured placement, follower power, artificial scarcity, popularity-based power or royalties/trading exclusive spell rights.
- Moderation, abuse/reporting, anti-spam, privacy/consent, authorization and rate limits are prerequisites before public creator services are official. Public publication must not be forced for competitive participation; §9 details verified private competition.

### 3.7 Illustrative complete spell — Rimebrand Spellwright (NOT shipped canon)

Fire Bolt projectile foundation with Rimeclaw cold infusion and conditional thermal shatter; Fire/Fire–Frost Web specialization, limited compatible thermal/control mutations. Endgame could conditionally add *either* bounded Storm discharge *or* Arcane delayed echo, **not both by default**. Level 1 shows prototype Fire/Frost identity; later legal Rank II, synergy/rank, then evolution; weaker immediate single-target burst/cast tempo offsets clustered control. Visuals: warm central projectile, restrained crystal edges, conditional accent *only on event*. In ranked Conclave approved components are available from the season pool regardless of personal Rimeclaw material wealth. Illustrative research loop: observe sample → form hypothesis → fail forward to useful note → stabilize viable blueprint with informed material spending → specialize in Nexus → test in a real Hunt.

---

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

## 10. Suggested architecture / repo touchpoints — implementation guidance, not new API orders

### 10.1 Separation of durable state lifetimes

| Conceptual state | Authority and lifecycle |
|---|---|
| `PlayerLegacy` + `PermanentArcaneNexusProgress` | Account knowledge, researched spells, unlocks, season-to-Eternal power, cosmetics, access. |
| `ChronicleState` / `StoryBookState` / `Persona` | Independent narrative events, endings and active story identity, versioned Books. |
| `PersistentRegionWorldState` | Stable IDs/geography/bridges/settlement history, causal events, in-game evolution and validated available topology. |
| `HunterGeographicKnowledge` | First-hand discoveries, books/maps, certainty/provenance, dated last-known condition, persistent across failure. |
| `GeneratedHuntPlan` / `ExpeditionState` | Correct graph, node/route commitments, current/candidate objectives, encounter rewards, run-local state and RNG streams. |
| `ArenaRecipe` / `ArenaEvolutionState` | Legal solid geometry, spawns, exits, phase hazards, mutation telegraph chronology and validated transition. |
| `EternalExpeditionSave` | Same expedition ID, secured refuge, frontier, route decisions, resources, world history, active build and atomic sanctuary checkpoint. |
| `SeasonRuleset` / `VerifiedSubmission` | Independent seasonal mode seed, catalogue/version/caps, replay evidence and verified best; immutable archive. |
| `SpellBlueprint` / `PreparedSpell` / `NexusLoadout` | Typed catalogued composition, per-revision ownership, resolved legal cast behavior + temporary run evolution. |
| `PlayerAimIntent` / `TargetingMode` / `EffectiveAimState` (conceptual) | Legal automatic enemy acquisition by default; active independent manual input overrides it and release restores auto mode. C# owns effective target/angle; snapshots and verifiable replays consume it. |
| `BlueprintPublication` / `ChampionArchiveRecord` | Visibility consent, immutable published version/provenance; authorized competitive historical reference. |

**All names are conceptual; use existing C# assemblies/class contracts where possible.** Existing saves and `SpellId` data must deserialize. Research, Rune/Arcane tree, Forge, Essence Vault, Codex and current quest/world state cannot be silently rebuilt or duplicated.

A useful causal shape:

```text
Versioned Region/World state + Hunter Knowledge
            -> HuntRequest (mode, target envelope, seed)
            -> validated GeneratedHuntPlan (directed graph and physical paths)
            -> selected EncounterSiteProfile / ArenaRecipe
            -> authoritative RunSimulation C# + authored waves/events
            -> deterministic visual snapshots (Blazor/JS/SVG/canvas)
            -> transactional results: run rewards, map knowledge, world consequences
            -> ordinary extraction OR season submission OR Eternal sanctuary checkpoint
```

### 10.2 Existing repository seams, observed Oct 2026 (verify before editing)

- `src/Wyrmforge.Domain/Spells/SpellBook.cs`, `SpellCatalog.cs`, `Synergies/SynergyCatalog.cs`, `Evolutions/*`; `src/Wyrmforge.Domain/Progression/PassiveTree/*`, current `TotalPoints = 24` baseline; `RunSimulation.*`; `LevelChoiceService.cs`, `PowerMilestoneProfile.cs`; Forge Masterworks, Dragon Essences/Vault, Spell Mastery.
- `src/Wyrmforge.Application/Runs/Navigation/WyrmrealmMapGenerator.cs`, `WyrmrealmRouteGenerator.cs`, `WyrmrealmMapState.cs` (`CombatStages = 8` at time of prior audit), `WyrmrealmStageCatalog.cs`, `WyrmrealmMapNode.cs` and tests: current seeded territory/roads, tier migration and possibility of late Wyrm attraction. **Do not patch the eight-stage constant alone**: stage budget, boss trigger, pressure, run progression and map UI must migrate together.
- `src/Wyrmforge.Presentation.Web/Features/Map/WyrmrealmMapView.razor` and `.razor.css`; `wwwroot/js/hunt-map.js` current scroll-to-hunter logic. Add pan/zoom/fog only with manual scroll accessibility and real touch validation.
- **Auto-target with manual override (19 Oct):** `MovementInput.cs`, `Movement/RunSimulation.Movement.cs`, `RunSimulation.cs`, `Spells/RunSimulation.Spells.cs`, `Combat/RunSimulation.Targeting.cs`, `ArenaView.razor.cs`, `wwwroot/js/arena-input.js`, `wwwroot/js/arena-mage.js`, snapshots and focused C#/JS tests. Preserve legal default nearest-target acquisition and existing chains; add active manual aim precedence, release/reacquisition and stable target feedback.
- `ArenaEnvironmentState.cs`, `RunSimulation.Navigation.cs`, `RunSimulation.Resonance.cs`, `RunSimulation.Dragons.cs`, `wwwroot/js/arena-environment.js`, `arena-territory-art.js`: existing simulation-driven local scene/region art, physical causeway/sanctuary/rift regions, barriers and gates. **Decouple reward school from environment school** when introducing region-wide corruption.
- `src/Wyrmforge.Presentation.Web/Features/Leaderboard/LeaderboardView.razor`, `wwwroot/js/leaderboard.js`, `services/playtest-collector/migrations/0002_leaderboard.sql`: not official ranked service.
- Relevant docs already in repo: `docs/design/long-term-progression.md`, `docs/design/visual-first-magic-ui-rfc.md`, `docs/design/living-territories-0.0.116.md`, `art/README.md`, `docs/handover/2026-10-15-project-art-and-backlog.md`. Treat GitHub code and approved art as current factual references; this unified file is product-direction source.

### 10.3 Migration and safety

- Adopt adapters/staged versioning for old `SpellBook`, recipes, story saves, current map generator/8-stage data, progression levels, leaderboard distinction and in-progress Eternal saves.
- Dynamic generated scene still requires **pre-phase and post-phase validity**. Deterministic generator retries bounded with proven fallback; visual render doesn't alter physics/rewards/RNG.
- Server verified seasonal records preserve historical build/ruleset version even if future updates change legal recipe/component IDs. Never rewrite archived champion's exact result while migrating current client data.
- Save-at-sanctuary is transactional and idempotent; no duplicative season rewards, side-quest caches or upgrades on retry/resume. Prevent two simultaneous conflicting active Eternal writes; exact sync conflicts unresolved.

---

## 11. Validation requirements — evidence, not visual claims

### 11.1 Map and world property tests

- Thousands of seeded layouts: every required route has valid continuation to lair/goal; all promised crossings possess physically traversable bridge/ford; Chapel branch **actually rejoins** and cannot dead-end falsely; chosen routes and skipped bonuses remain committed through save/restore; no accidental road over impassable ridge or hostile floodplain.
- Realistic landmark/road relationships, seed/version reproducibility, unique site IDs and reward-one-time flags. Random region variation does not overwrite recognized past geography.
- Fog/visibility respects distance, earnable scouting and real previous knowledge; confirmed facts cannot contradict world state, stale facts have recorded cause; failure retains geography and legitimate research.
- If bridge/outpost changes, both illustrated map and actual travel graph update; advanced Wyrm disruption always leaves a viable route/fallback/escape and fair warning. Character doesn't softlock after losing optional outpost.
- Map picture on real iPhone portrait: understandable road, current position, next reachable site, low clutter, subtle ambient light/water/wind, pan/zoom/recenter and reduced-motion usability. Do not declare design accepted merely because generated PNG looks attractive.

### 11.2 Combat and balance

- Every generated arena/topology/post-transformation phase satisfies real collision, player/enemy spawn safety, accessible objectives/loot and physical exit. C# visuals and game state agree, no billboards. Check portrait/landscape boss telegraphs.
- Challenge/wave compositions truly respond to topology and skill limits; no 4× default damage from contextual auto-casts, infinite chains, performance overload or defensive starvation. Enemy death/upgrade and hazards are deterministic and logged for replay.
- **Aiming regression matrix (19 Oct):** one-thumb auto-targeting irrespective of movement direction and while stationary; manual second-thumb/mouse/right-stick direction wins over a nearer enemy; releasing/cancelling returns to auto without double casts; visible/legal enemy acquisition (not through walls), non-flickering targets, real manual misses, first lightning target and subsequent chains, legible minimal Gothic cue, legal non-directional exceptions and exact cast/render/replay sync. Test genuine iPhone two pointers, cancellation, focus loss, camera/2.5D, save compatibility and controller deadzones.
- Minor/major upgrade eligibility intact at differing Hunt lengths, no early broken rare/golden, reused Frostfire exactly once. Reroll 1 card changes only that card and consumes exactly one shared charge. Golden remains same-charge and legal tier.
- Run outcomes and rare specimen acquisition correct; failing research advances valid knowledge; Forge/Nexus cannot double-spend rare material. Legacy inventory, Chronicles, persona and existing Wyrms remain valid after migrations.

### 11.3 Persistence, modes and competition

- **Sanctuary checkpoint → close app → town first → Continue Eternal Hunt → same sanctuary and expedition ID**, same map, region history, build, RNG state, spent rewards and committed route. Test offline/online, interrupted atomic writes, double-click Continue and old-save migration; no exploits or stale best-frontier inflation.
- Eternal death returns to legal recovery with bounded setback, remembers world and retains verified historic peak. Secured-refuge travel cannot bypass exploration, blocked bridges, Wyrm gate or mutually exclusive route rewards.
- Equal standardized season start despite different account research/story/cosmetics/seasonal permanent power. Each four-week board shared seed and immutably frozen rules. Unlimited attempts, one best **verified** per player/mode/season, no one-time seasonal payout duplication.
- Expedition rank orders region/progress/Merit; Arena rank orders waves/Merit; Eternal ranks genuine conquered frontier. No score gain through farming/looping/death or merely seeing unexplored depth. Rank recipes private and never reveal confidential blueprints to public.
- Human playtests and real mobile device reviews inform art, session duration and fair pressure. CI/build/test validation and PR review required before any real claim of completion.

---

## 12. Explicit next-step priorities — no invented progress status

**What Claude needs from this section:** *what to do next*, not *where you left off*. Determine the actual checkpoint from GitHub commits, open PRs, CI, the current development handover (including its §39 if applicable) and the reconciliation document. Those records establish **implementation status only**. This **single master specification** remains the sole authority for product/design requirements.

**Selection rule:** Keep any active safe milestone moving to its natural checkpoint. Then take the **highest-priority unimplemented, unblocked** vertical slice below. If it is already complete, confirm the acceptance evidence and skip it. If blocked by an unresolved product decision, record the blocker and proceed with the next safe slice without silently inventing canon. Do not rewrite completed work or force every priority into one PR.

| Priority | Next result to deliver | Required proof / acceptance gate | Depends on |
|---|---|---|---|
| **P0 — preserve current work** | Reconcile *remaining tasks* after the existing safe checkpoint. Protect current saves, accepted art, combat behavior that is not being intentionally changed, and active PRs. Do not write a speculative "work completed" report in this design file. | Branch/PR/CI status checked; regressions identified; smallest non-destructive integration chosen. | Actual repo and development-history evidence. |
| **P1 — auto-aim with manual override** | Retain/refine automatic legal enemy targeting as the default, then add **temporary fully authoritative independent aim** (mobile second thumb, active mouse/right stick) and seamless release to auto mode. Auto-cast remains; start with one primary projectile and first-target chain behavior, plus restrained in-world cue. | C# Auto/Manual arbitration, legal/visible targets, gesture priority/release, no stuck input, snapshot/projectile/render alignment, real mobile/desktop tests, old saves and deterministic replay. Do not combine with wholesale 3–4-spell scheduling rewrite. | Existing targeting, input and visual continuity. |
| **P2 — correct Hunt topology** | Generate connected, credible terrain and route network **before** illustrative scenery: real bridges, no false river crossings, chapel and every chosen branch reaches a legal forward route; commit choice and prevent duplicate optional rewards; shorter first Wyrm hunt with tier-scaled envelope. | Seed/property tests proving crossings, branch continuation, Wyrm reachability, reward uniqueness and save compatibility; an actual playable short Fire hunt. | Existing Hunt generator and transition model. |
| **P3 — Living Hunter's Chart, complete first visible slice** | Replace diagram-like surface with original, research-backed, grounded Gothic painterly/pixel-compatible map; physically motivated flame/lighting/reflections/river/mist; subtle location markers, preview, scroll/pinch, follow/free/recenter and mobile-safe controls. | Visual acceptance at iPhone portrait size **plus** rendered-to-graph topology check; no fake road or bridge; reduced-motion and frame-budget coverage. | P2 authoritative geography, approved visual references. |
| **P4 — discovery and persistent causal world** | Progressive fog, automatic local reveal, **earned** knowledge through visits/previous discoveries, remembered geography after failure, meaningful route commitments and optional objectives paying immediate + lasting rewards; slow regional changes with advanced-hunt-only major mid-run events. | Versioned persistent region/world states, credible event cause, valid fallback paths and replay/save tests; consequences visible in the map. | P2–P3 map contract and state migration. |
| **P5 — generative arenas, wave challenge and changing ground** | Compose believable site-dependent arenas, elemental terrain, real C# collisions and exits; introduce physical Endless Arena traversal, wave/challenge directors and one foreshadowed fair terrain transformation. | Deterministic seeded geometry, navigation/telegraph/dodge-room validation, responsive mobile combat, research-backed architecture, and real visual QA. | Current Arena authority; P2 geography/site contracts where linked. |
| **P6 — persistent Eternal Hunt** | Guaranteed major refuges plus optional developed outposts, restricted connected fast travel, recoverable death setbacks, atomic sanctuary suspend, **launch into town and Continue Eternal Hunt at saved sanctuary**, permanent frontier records. | Quit/relaunch, save migration, reward replay/idempotency, no bypass of unvisited frontier and one-life-long-run preservation tests. | World/route persistence and authoritative save lifecycle. |
| **P7 — fair four-week competitive seasons** | Separate seasonal Expedition and Arena: shared immutable season seeds, equal legal starting pools, unlimited attempts, best verified per player, anti-farm Merit, privately validated records and archive. | Trusted verifier and frozen ruleset tests; never promote existing unverified Hall-of-Fame submissions to official. | Stable modes and scoring/event traces; identity and verification. |
| **P8 — season-to-Eternal power loop** | Seasonal achievements unlock substantial earned powers through the **integrated Arcane Nexus** for Eternal/casual play; provide eventual legitimate catch-up, keep ranked starts normalized. | Cross-mode isolation, persistence, reward entitlement and no season-reset on Eternal; privacy-safe verified all-time frontier. | P6–P7 and existing Nexus/research progression. |
| **P9 — expand depth, don't front-load scope** | Deeper Wyrm variants, region ecologies, authored Chronicle/story, private blueprint sharing and Conclave social polish in separate slices as each becomes a real playable journey. | Each feature has a use, real gameplay/state, migrations, tests, mobile acceptance and no contradictions to previously approved lore/art. | Proven earlier vertical slices. |

**Continuing compatible work in parallel:** The unified Arcane Nexus, minor/major upgrade pacing, Fateweave card-by-card reroll, research-to-spell proof and the future **3–4 intelligent spell scheduler** remain binding. If one of these is the active workstream, do not pause it merely to force P1; finish a safe checkpoint first. Otherwise plan them as **small dependency-conscious slices alongside P1–P5**, not as a massive replacement of the working Forge/Web/SpellBook system. Expand spell loadouts only after the auto-target/manual-override arbitration and shared cast scheduling are reliably tested.

**Critical dependency order:** Real routes before painted roads; physical obstacles/telegraphs before VFX; aim authority before presentation indicator; persistent save/identity before published ranked records; independently verified evidence before leaderboards and prize/season claims. For every creative area or combat presentation, research **at least two relevant independent external sources and approved internal art**, explaining the transferable principles and why the result remains within established WyrmForge style; no copied layouts/assets or unreviewed high-fantasy redesign. At no point should a polished concept illustration substitute for playable, mobile-tested functionality.

---

## 13. Known open decisions — do not treat as finalized

**Already decided; do not ask again:** **Gungeon-inspired auto-aim with manual override** (default legal nearby enemy selection independent of movement; active second thumb/mouse/right stick overrides; release returns to auto; prepared spells still auto-cast; no giant arrows), **multi-source research-first creative freedom within approved WyrmForge style**, one unified Nexus; up-to-four intelligent spells (no spam); optional campaign with equal endgame path; per-card Fateweave; small upgrades before big; evolving regions; geography-first and tier-scaled Hunts; committed forks; hand-painted live map; progressive discovery + paid-through-risk scouting; knowledge persists; world changes gradually and through consequential events; major mid-Hunt events advanced only; useful optional objectives with immediate + world rewards; hybrid follow/free/recenter; two different Endless seasonal modes; physically connected generated arenas and fair dynamic changes; shared 4-week seasonal seed; unlimited best verified ranked attempts; meaningful seasonal power usable in Eternal but never normalized Ranked; Eternal same-persistent-hunt across season/death; guaranteed major/optional earned refuges; fast travel only connected secured; sanctuary quit → launch town → Continue Eternal at saved sanctuary.

**Truly open:** final Wyrm tier labels, catalogue/800-node ambition pacing, element taxonomy, definitive Book I narrative names/dialogue, desired session length, exact encounter tier counts, one-time reward amounts and rare drop costs, spell complexity/socket/point budgets, casting arbitration tuning and 1→4 loadout unlock cadence, **exact override gesture/deadzone feel, indicator artwork, auto-target scoring/stability, manual aim forgiveness and no-target spell classification**, Fateweave charges/caps/golden odds, Arena wave/change cadence/telegraph times, healing/recovery limits, world-change event probabilities and repair economics, map material pipeline/marker glyph design and performance budgets, whether optional casual/randomized Endless exists, 4-week seasons' UTC start/end boundaries and exception policy for critical fixes, ranked Merit constants/tie-breaks and legal challenge verification architecture, participation/achievement requirements for seasonal powers and later catchup routes, Eternal death penalty and sanctuary density, save behavior outside safe sanctuaries, exact multi-profile/cloud sync behavior, permanent loadout application into already saved Eternal Hunt and town visits without checkpoint.

**When a truly open decision blocks a slice:** present 1–2 practical recommendations grounded in current implementation and balance evidence; request specific approval rather than inventing a contradictory final product rule. Continue unblocked work.

---

## 14. Definition of success and Claude kickoff

An ordinary first-time player can start either the optional story or free exploration, see readable Gothic map/environment, learn an initial school, **auto-aim and auto-cast at legal enemies by default with optional fully manual aiming whenever desired**, survive a short coherent Wyrm Hunt, extract genuine material, research a real mutation without destructive RNG, use the unified Nexus to prepare a meaningful build and visibly improve it in a real combat run. They eventually meet equivalent shared endgame eligibility regardless of story choices, while their private spells remain private unless published with consent.

A competitive player can run **Seasonal Expedition** (routes/knowledge/strategy) or **Seasonal Arena** (generated wave survival) under the same frozen four-week rules, retry freely, have the best **independently verified** result placed on distinct boards, and use earned powerful permanent rewards through the Nexus to push further in their **Eternal Hunt**.

An Eternal player can save at a **secured refuge**, quit, relaunch the **town** (not a battle), use **Continue Eternal Hunt**, return to the **same refuge, same world, same committed routes**, suffer recoverable death setbacks and build a lifelong verified frontier without arbitrary seasonal wipe.

**Exact instruction for Claude:**

> This is the **one authoritative WyrmForge product-design specification**, superseding the four previous overlapping design documents. **You do not need me to identify your current implementation checkpoint**: determine it yourself from GitHub commits, branches/PRs, CI, the existing development handover (§39 where applicable) and the reconciliation document; those are *status evidence*, not alternative product specifications. Protect in-progress work. Then apply the **explicit P0–P9 next-step priorities in §12**, selecting the highest-priority unimplemented, unblocked, small playable/tested slice rather than restarting already delivered features. New requirements include **automatic targeting plus full temporary manual-aim override (updated 19 October)** and **creative freedom only after multi-source research within the approved WyrmForge art style**. Preserve C# simulation authority, connected geography, honest collision/VFX, save compatibility, real mobile acceptance and verifiable competitive results. Never claim future systems are shipped until demonstrated.

**Final principle:** Narrative remembers *who* you became. Nexus remembers *what magic* you discovered. The Hunter's Chart remembers *where you went and how the world changed*. Each Hunt tests *what you can survive now*. Seasonal Conclave tests *what everyone can do under equal rules*. Eternal Hunt tests *how far a lifetime of earned power and learning can take you*. **These experiences must reinforce one another rather than contradicting each other.**

---

## 15. Provenance coverage index (archive only, NOT additional reading instructions)

The following list records **where the substance of the four former documents has been merged**. A detail-level audit also recovered specific UX, story, spellcraft, generated world, progression, security and regression requirements in §16. This is the editorial merge, not permission to read or obey superseded source text. It does NOT create a dependency on those original files, and any older contradictory statement is resolved by §0.2 above.

| Previous source | Retained themes now located in this document | Conflict resolution |
|---|---|---|
| *WyrmForge Claude Game Design and Spellcraft Handover* — 15 Oct 2026 | Product identity/art (§1), Book I/Chronicles/FLCs (§2), foundational spellcraft/Web/research/materials/blueprints (§3), Conclave/privacy (§8–9), legacy & repo touchpoints (§10), tests/roadmap (§11–14). | Legacy one-equipped-spell-only language replaced by intelligent 3–4-spell target; mandatory Book I progression gate replaced by optional campaign and equivalent routes; separate Lab/Web UX replaced by integrated Nexus. |
| *WyrmForge Design Amendment* — 17 Oct 2026 | The no-interruption/precedence rules (§0), unified Nexus and flexible scale (§3), contextual cast arbitration (§3.3), independent campaigns and non-campaign eligibility (§2), level-up pacing/Fateweave (§3.4), future Wyrms (§4), migration safety (§10–12). | Already incorporated as the **canonical current rules**, not retained as an overlay. |
| *WyrmForge Procedural Hunts & Elemental Arenas Addendum* — 18 Oct 2026 | Tier-scaled hunts (§4.2), versioned geography-first graph and emerging target (§4.1–4.3), arena region/encounter/reward split (§5.1), physics/telegraph requirements (§5), RNG/balance and migration (§10–11), tested staged delivery (§12). | Fixed eight-stage combat treated as **audited legacy to migrate**, not new normative length. |
| *WyrmForge Living Hunter's Chart, Endless Modes & Eternal Hunt Design* — 18 Oct 2026 | Hand-painted animated map, fog/earned scouting and persistent geography (§6), one-way route commitments (§4, §6), world evolution (§6.4), guaranteed refuges/fast travel/atomic sanctuary save and town resume (§7), two seeded 4-week ranked Endless modes + unresetting Eternal (§8), rewarding optional objectives, score/privacy/verification (§8–9). | Latest user decisions incorporated directly as the **single normative specification**, no other layer needed. |

**Single-document handover policy:** Supply *this document* to Claude. If optional art reference is sent, the image supports **visual direction only**, not program logic, connectivity or final asset approval. Claude need not ask which older file wins. The former documents may be kept separately as historical audit artifacts, not as active implementation instructions.

---

## 16. Recovered detailed requirements and source-coverage audit — AUTHORITATIVE DETAILS, NOT A FIFTH HANDOVER

The first shorter consolidation preserved large themes but compressed a number of fine-grain behaviors and implementation edge cases. This section integrates **currently compatible details** recovered while rereading all four source documents. It is part of this same authoritative specification. These details remain subordinate to explicitly LOCKED current behavior above; source-era contradictions (one equipped spell forever; separate Web/Lab screens; Book I required for ranked entry; permanent one-eight-stage Hunts; official client scores) have **not** been reintroduced. The 18 October prohibition on default auto-aim is expressly superseded by the 19 October auto-target-plus-override rule in §3.3a.

### 16.1 Story, Chronicle consequences and independent free exploration

- Working Book I title **The Broken Covenant** and illustrative endings **The Last Bastion**, **The Open Roads**, **The Unbound Dawn** remain useful authored narrative direction. The user's story choices must have real NPC, settlement and regional consequences; do not substitute a cosmetic dialogue choice, erase established character history or auto-import a different Chronicle's decisions. Exact Book names/dialogue and every plot beat are authored content to validate against existing GitHub before making canon.
- Each Chronicle is an **independent story record and selected persona**, not a second economic/player account. A named NPC lost in one Chronicle may remain alive in a different Chronicle; the player's permanent Nexus knowledge and legitimately earned generalized access may remain shared without making story causality leak between histories. A cosmetic identity swap must not rewrite verified ranked accomplishments or existing story events.
- Campaign may begin after substantial non-campaign knowledge and should acknowledge that proficiency when feasible. Story-exclusive scenes/relationships are fine; there must be an **equivalent non-campaign path** to gameplay endgame/Conclave, earned by meaningful world/lineage feats. FLC/story book releases should append authored content without degrading old saves or inventing incompatible magical lore.
- Campaign is a guided way to learn Fire, Frost, Storm and Arcane and understand the Wyrm/city conflict—not a permission to farm limited story resources indefinitely or to block free explorers from advanced spellcraft. Future story Books/FLCs should recognize earlier irreversible choices within the correct Chronicle identity.

### 16.2 Arcane Nexus: concrete research, socket and specialization behaviors

- The Nexus is **one discoverable player-facing place** reached through town, with visually understandable sub-activities: research materials → observe/testing → resolve failure/knowledge → mutate a known spell → choose legal Web specializations/sockets → prepare loadout → try it in an actual Hunt. A visually coherent internal navigation system may have specialized panels; it must not become multiple unrelated top-level destinations with duplicated economy.
- Initial player should discover an understandable real spell mutation before confronting a wall of hundreds of abstract nodes. Planned long-term breadth is not permission to manufacture empty branches: every added node should change legal gameplay/knowledge, unlock a combination, create a meaningful tradeoff or lead to another goal.
- Spell components need **typed stable catalogue identities** and compatibility rules for element, delivery, applied statuses, conditional triggers, catalysts and complexity. Do not force the same socket behavior onto Fire's burst, Frost control, Storm chain and Arcane delayed/geometry mechanics. Element order and applied effect order can matter, but uncontrolled recursion or stacked all-element effects must be rejected/bounded.
- Research sample events are recorded once with provenance; nonconsuming observation can reveal conditions and clues. First meaningful failure produces a useful note, precise missing ingredient/condition or bounded progress rather than silently destroying irreplaceable specimens. Explicitly confirm actual consuming operations. Later copy/paste of a blueprint never fakes possession of missing prerequisites or illegally imports unavailable high-tier spells.
- Showcase accessible **short previews driven by legal resolved simulation behavior** for mutation/evolution/rank changes rather than static icon-only claims or unverified particles. A preview must not emit effects that the equipped configuration would not really produce.
- Example Nexus specializations from earlier exploration (all PROPOSED, not automatic shipped nodes): *Thermal Fracture* trades burst for conditional shatter, *Conductive Frost* supports bounded lightning-on-chill chains, *Lingering Embers* trades burst for duration, *Stable Conduit* improves complex-spell consistency for meaningful Web point cost. Preserve and honor actual existing tree point limits and mutually exclusive choices. Resetting points cannot discard permanent discovered knowledge.
- Separate *offer frequency* from *pick rate* when diagnosing Frost or other underused schools. Measure crowd control preventing attacks, safe repositioning, elite resistance, shatter synergy and situational role, not damage alone. Do not force a particular school as mandatory early content or ensure a strong hybrid can only be built by tedious farming.

### 16.3 Spell evolution pacing, Fateweave and combat economy details

- Three cards may each have one individually usable **Reroll** action during a draft; a card that has been rerolled is exhausted for that draft even if the player dislikes the replacement. A new round replenishes *card* eligibility but not shared across-Hunt charge count. Reroll only the selected card, not all three; prefer no duplicate offerings across currently visible cards when the legal pool permits.
- **Gilded Fateweave** is a possible flavorful visual label, but the player's action should still say **Reroll** clearly. A golden opportunity is an uncommon precommitted slot property, not a new banked currency or free infinite upgrade source. It consumes the same charge; cannot offer unmet rank/level/story/element prerequisites; cannot regenerate on re-render/reload. Pickup capacity, cap, odds and Nexus investment are tuning—not copied demonstration figures.
- A new mutation/combination gives the spell a distinct visible identity at low rank, while **the run still earns its rank, minor refinements and breakthroughs**. Major rank/evolution availability is gated by real milestones/eligibility; longer Elder Hunts need many interesting minor decisions, not high-tier powers three nodes into a run.
- Up to four contextual spells share a cast economy. Scheduler input/decision traces must reveal whether offensive cooldowns starved defensive utility, whether chain procs grew exponentially, and why a contextual spell fired. Actively engaged manual intent is authoritative on where aimed offensive casts go; without it, legal auto-targeting may aim behind movement direction. Automated threat recognition still determines legal timing and cannot override active manual aiming.
- Spell blueprint ownership does not give patent rights; export/import remain typed data, never executable scripts; unpublished/unfinished recipes remain private even in ranked sessions. Publishing a revision is a deliberate independent consent operation; withdrawing future availability does not silently delete legitimate previously imported copies.

### 16.4 Living Hunter's Chart — fine-grain UX states

- **Three readable map layers:** geographic art (real terrain, meaningful bridges/roads/structures), *gameplay route state* (reachable/current/chosen/completed/bypassed) and *knowledge* (observed/remembered/from records/stale/unexplored). They must remain separated in data but visually coherent and legible on a phone. Color never carries meaning alone.
- Recommended cartographic micro-marks, art direction examples rather than fixed final glyphs: remembered site = weathered gold bookmark/stroke; seen this expedition = muted sage sign; archival-only report = faded ink manuscript mark; stale/conflicted intel = muted amber caution mark. A mark should complement a painted landmark and appear only when relevant. Do not cover every road with circular game badges.
- **Unscouted** location preview can reveal broad threat silhouettes, obvious geography, possible treasure and uncertain risk from actual environmental clues. **Scouted** information may identify real enemy families/elite signs, authentic road condition and likely rewards, never fabricated exact outcomes. Scouting is earned through *previous visits, physical access to lookouts, recovered maps, exploration and survivors*, not a free tap/currency-to-reveal gimmick; information age/source/certainty is retained.
- **Camera:** on entry or after completing encounter, a gentle scripted return toward the hunter and newly disclosed terrain is allowed; any manual pan/zoom immediately cancels automated follow. A recenter compass smoothly moves to hunter without selecting/entering combat. The camera stays stationary at idle while water/fire/mist subtly animate. Future fog does not let zoom cheat undiscovered routes. Pinch and drag need real iOS Safari interaction and screenreader/focus-friendly equivalent navigation.
- **Map route reveal:** a chosen reachable site's actual connected road is softly highlighted from current site; selecting displays a compact bottom sheet of **known** risk/reward. Completing a site stamps a subtle clear mark, reveals legally next accessible roads, and retains the one-way commitment to already bypassed choices. Tapping a nonreachable site may inspect known geography but never quietly invoke OnChoose/enter an arena.
- **Fire/light/water:** irregular low-amplitude flame motion, changing real light intensity and affected wet stone/water reflection; river always flows downstream, foam respects falls/crossings, drifting valley fog moves behind location labels. Stable large shapes (bridges, buildings, roads) never oscillate just to feel alive. Keep a static/reduced-motion mode and stop/offscreen animations for battery/thermal performance.
- **Player recognition:** an illustrated Chapel must remain a chapel at the arena entry; a painted bridge must be the same authoritative connected crossing in region state. Map is not a separate generator of fantasy props. The approved reference image demonstrates mood and composition **only** and itself can contain visual mistakes; connectivity and geometry are always generated/tested from the world model first.

### 16.5 World changes, route commitment and long-form Hunt generation

- Real regions use stable region IDs and recognizable river/mountain/road topology across visits. Changes apply as **causal events** to current conditions and actual traversability; old knowledge remembers original position and last-known state. Real-world offline time is not a hidden corruption punishment; changes advance primarily through intentional game milestones/expedition progress.
- Ordinary evolution between hunts: slow environmental degradation/recovery, settlement effort, migration, ward strain, road deterioration; significant state changes result from explicit Wyrm actions, credible regional events or player decisions. **Mid-hunt structural disasters occur only in advanced Hunts**, with fair foreshadowing and valid remaining progress. Intro Hunts do not arbitrarily remove an already selected safe road.
- Optional world-rescue objectives have real immediate rewards *and* plausible lasting effects (repaired passage, refuge, merchant/research, friendly camp or retained knowledge). Saving people purely for story flavor is not enough to motivate high-risk diversion; skipping must remain valid. Do not clone optional reward grants after a reload, return from city or saved world revisit.
- Hunts should validate *minimum/maximum reachable combats on chosen paths*, all branch joins, bridge/ford connectivity, actual lair/exit reachability and rare detour possibility over large seed samples. A route can be geographically traversable yet **committed against collecting rewards from bypassed branches**: distinguish road existence from legal expedition state.
- Generated encounter scene uses site identity, regional Wyrm influence and reward school as independent sources; don't confuse upgrade attunement with local architecture/corruption. Higher Wyrms demand qualitatively distinct events, navigation/warning patterns and multi-region identity, not just multiplied HP. Keep late-emerging Wyrm resonance target from unintentionally regenerating already-seen roads.

### 16.6 Arena director constraints, morphs and mobile fighting

- Semantic arena generation must start from *function and history*: e.g. cloister has linked walkways, chapels have physical doors and courtyard routes, flood villages follow real street and water networks, fortresses contain defensible walls, forges have sensible firing/material paths. Choose authored-composition recipes then vary meaningful connectivity rather than decorating a square with random impassable props.
- Interactions such as bridge collapse, rising water and breached walls have **actual simulation phases**: warning → safety evacuation window → altered collision/nav/hazards → new wave routes/exit state. An animation alone cannot change damage or blocking. Every intermediate stage must not trap the player, spawn lethal enemies on top of the player or remove all feasible evasion routes. Provide validated fallbacks for invalid seeds.
- Threat mixes should use the room, not just its wallpaper. Open courtyards invite coordinated ranged pressure, narrow cloisters invite flanks/chokepoints, flooded roads invite elevated routes, destroyed walls invite new enemy approach angles. Do not repeat just 10 enemy variants endlessly or turn every fight into the same broad empty arena.
- In Endless Arena, physically walk through the opened passage to a **different generated arena** after milestone waves. The player retains actual active build/health/resources; the mode has **no Hunt Map**. Boss and elite encounters demand new pressure patterns and readable telegraphs, including the new directional cast system; layout mutations have fair audio/visual cause.

### 16.7 Eternal Hunt safety, save/return flow and verification

- Eternal stays the **same persistent expedition** even after death, season rollover and safe town visits. Guaranteed major sanctuaries are nondestructible recovery anchors; optional earned outposts can be threatened or developed, but losing them does not softlock recovery. Travel between secured refuges requires a real previously discovered, currently connected authorized path and cannot skip Wyrm locks/frontiers.
- **Town startup contract:** at a secured sanctuary the player can suspend the active expedition; save atomically with region/world state, discovered geography, causal events, route commitments, active build/loadout, spent pickups, one-time rewards, boss progress, RNG streams, player recovery point and verified frontier. When reopening the game they see town, **not combat**. Pressing **Continue Eternal Hunt** returns to the saved sanctuary with the same persistent expedition ID; the town is not a second extraction that resets the expedition.
- The death setback is meaningful and recoverable (risk unsecured loot, enemies retaking nonsecured territory, danger increasing) but must not destroy hard-earned permanent research/season rewards or the deepest legitimate frontier already verified. Do not gain leaderboard points from reclaiming already conquered depth, looping cleared roads, rescues or repeatable hazards.
- The exact design of unsafe quit handling, competing writes from multiple devices and applying town-modified loadout to an active checkpoint remains **open**: implement conservative versioned checkpoint policy and ask before shipping undocumented semantics. No inferred real-world elapsed-time punishments.

### 16.8 Ranked equality, archival records and privacy edge cases

- Shared 4-week rulesets freeze mode-specific seed, generator, score algorithm, combat legality, available spell components and Web/complexity budgets. Official seasonal comparisons assume **equal opportunity**, not identical player choices. Unlimited retries; display only each person's highest independently verified result; weaker later results don't replace it. Archive each season without retroactive balance edits.
- Expedition ranking = conquered regions then actual current-region progress then capped Merit; Arena = completed waves then capped Merit; Eternal = genuinely conquered frontier then meaningful verified milestones. Damage avoidance and speed are not leading rank axes, so tanks/control and careful play are valid. Farmed kills, forced idle hazards and repeated optional rewards never create infinite score.
- Official service does not trust `RunSummary.Score`, display nickname, localStorage or unverified collector entries. The verifier receives necessary full private build/input/evidence; public only receives consented identity/rank/safe stats. Never publish full unpublished blueprint as a rank condition, and never expose a dictionary-attackable raw small-recipe hash. Tie-breaking, challenge validity, cheating/moderation, replay retention and official critical-fix policy need future explicit implementation decisions.
- Seasonal rewards provide meaningful researched/upgradable powers for Eternal and eligible unranked PvE; they cannot improve *Ranked* initial attributes or selectively restrict the seasonal legal component pool to historic high-performing accounts. Seasonal exclusivity may apply to names/cosmetics/historic titles, not irreversible competitive advantages. Concrete catch-up policy and detailed drop rates are still open.

### 16.9 Source-to-current-section coverage checklist (editorial audit; no old document needed)

This checklist is for a **single source of truth** and to make compression visible; no old document is required to use the spec. Editorial source counts, not a claim of mathematically provable sentence-for-sentence preservation:

| Source in former four-document package | Full topic groups recovered | Where authoritative now |
|---|---|---|
| 15 Oct foundational design (19 sections) | Core identity, lore, Book I/Chronicles/FLC, spell component model, Arcane Web/Laboratory (merged Nexus), run evolution, research/materials, Rimebrand worked example, visual-first previews, community blueprint privacy, Conclave/Champion's Archive, architecture, migration/testing | §1–3, §9–12, §16.1–16.3, §16.8 |
| 17 Oct compatibility amendment (16 sections) | No-interruption policy, unlocked optional campaign, fully integrated Nexus, future 3–4 intelligent spells, world regions/Wyrm ranks, opportunity cost of minor upgrades, per-card Fateweave and golden slot, transition roadmap, testing and open balance | §0, §2–4, §10–13, §16.2–16.3 |
| 18 Oct procedural Hunts/Arenas addendum (7 major headings) | Wyrm tier-scaled Hunt graph, known/emergent target, geography-valid forks and bridges, elemental arenas with separate region/encounter/reward magic, C# physical authority, RNG isolation, acceptance gates and staged rollout | §4–5, §10–12, §16.5–16.6 |
| 18 Oct Living Map/Endless handover (16 headings) | Illustrated/animated map, previous knowledge, fog, earned scouting, route commitment, world changes, immediate+permanent optional objectives, sanctuaries/town resume/connected travel, Expedition/Arena/Eternal, shared 4-week seed, verification, rewards and all-time history | §4, §6–9, §10–13, §16.4–16.8 |
| Additional approved changes, 18–19 Oct | **Mandatory multi-source research before creative freedom**, style preservation; **19 Oct change supersedes movement-facing default with auto-aim plus fully prioritised temporary manual override**, and restrained target/direction cue | §0–1, §3.3a, §10–13 |

**Handover rule:** This single file holds the agreed product rules and detailed retained specifications. The optional concept image remains only a look-and-feel example. Claude should not consult old overlapping instructions to choose precedence; inspect the **current GitHub code and accepted art** to decide migration boundaries, then implement after completing the active safe slice.