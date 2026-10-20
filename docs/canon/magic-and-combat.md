# Magic, spellcraft and combat

> **Canonical WyrmForge specification · updated 20 October 2026.** Current six-school intent and combat authority; changes from 19–20 October supersede older movement-facing and single-equipped-spell proposals.
> [Canonical index](README.md) · Only explicitly marked **LOCKED/approved** requirements are commitments. Proposed values, old milestones and drafts are not evidence of shipped code. Verify current `main`, PRs and tests.

## 20 October integration boundary

- **Approved target:** Fire is the only selectable character school until its foundation and mutations are complete. The other school icons remain as clearly disabled previews; this is implemented for **new character creation** in main v0.0.138 via [PR #172](https://github.com/pjotrcasteel/Wyrmforge/pull/172); existing non-Fire characters are preserved, while deeper Fire mutations are still future work.
- The persistent Divine school is selected **once during character creation**, not in the World Gate. Fire/Frost can still denote a **Hunt lineage**, separately from character school and Wyrm tier. Legacy characters and spell IDs require migrations, not resets.
- The canonical six-school pixel emblem set is **Fire (orange-red), Frost (cyan), Storm (yellow), Arcane (violet), Necromancy (green skull), Summoner (bear)**. The existing 192×128 atlas is derived from accepted owner artwork; do not regenerate unapproved icons. [Implementation evidence](../art/divine-lineage-pixel-icons-2026-10-20.md).
- Auto-aim is the default. Deliberate independent aiming temporarily overrides it (mouse/touch/right stick) without cancelling auto-cast. **Current implementation details**: [hybrid aim evidence](../playtesting/hybrid-aim-2026-10-19.md); the movement direction must never silently steer shots.
- Tier I mutation candidates are design targets, not implemented inventory. Higher tiers and incomplete schools must remain disabled; do not unlock content on visual appearance alone.

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
4. **Signature spell level** = the level of the character's persistent base spell (e.g. Fireball Lv.1–5), determining how many earned mutators can be simultaneously slotted. It is not the Hunt level, Wyrm/Hunt tier, magical research tier or temporary In-Hunt Rank.

**Five-tier extensibility (LOCKED) does not lock the exact unlock ladder (TUNABLE):** Tier I starts with ten mutation design targets per school as that school becomes available; Tier II specialization, Tier III transformation, Tier IV Wyrmcraft and Tier V Divine-scale magic are **working labels and directions**, not promised gameplay or approved balance. Higher tiers should introduce new mechanics and choices instead of merely multiplying damage. Tier-I recipes remain usable in advanced Hunts. Do not pretend that one Tier-I launch must ship all six schools at once.

**Acquisition ownership:** character creation supplies the signature. Arcane Web owns specialization and mutation access/gates; Forge earns permanent forms, lineage catalysts and components via existing Essences; Spellcraft validates researched combinations, infusion order and blueprint compatibility; Mastery/Wyrm feats unlock rare properties; the Hunt rolls only legal temporary ranks, minor refinements and evolutions. Preserve the already shipped Fire Bolt/Cinder Needle, Frost Shard/Ice Lance, Storm and Arcane gameplay during an incremental migration: Fire Bolt's Fireball rebranding and Cinder Needle becoming a **Fireball form mutation** are product intent, not completed changes. Never silently delete old SpellId data or saves.

**Combination and combat invariants:** Fire+Frost Frostfire, Stormglass and Arcane Conduit are already authored mechanics and must not duplicate effects when translated to signature mutations. Cross-school infusion does not grant the second school's full specialization; the active character retains a primary Divine school. Versioned recipes and compatibility/complexity budgets guard chain depth, explosion propagation, mobile VFX and CPU load. **One reliable signature plus at most three contextual techniques** is the eventual loadout model; contextual actions share the existing cast budget rather than adding independent free DPS, with auto-aim/manual-override precedence unchanged.

**Design reference principles:** Last Epoch: specialize a known spell; Path of Exile: behavior-changing typed support combinations; Noita: fascinating order-dependent chains but enforce strict recursion limits; Mages of Mystralia: visual readable experimentation; Hades: meaningful temporary Hunt upgrades. Transfer the principles only; do not reproduce assets or lore.

**Tier-I Pyromancer candidate set — PROPOSED, not all implemented:** Cinder Needle (rapid form), Phoenix Volley (multicast form), Meteor Heart (heavy form), Piercing Ember, Seeker Ember, Scorched Earth, Wildfire, Detonation, Ash Harvest and Ember Recall (returning projectile). These are **ten Tier-I mutation design candidates**, not ten free simultaneous passives or ten already-shipped mutations. Several names map to existing mechanics; their initial accessibility, access routes, mutual exclusions and balance require validation. **Wyrmfire is deliberately separate from the ten**: it remains a rare Wyrm mastery/awakening, with its existing progression gate unchanged, and may grow into higher tiers later. Do not unlock mastery-based spells just because a user selected a higher Hunt tier. No unshipped spell or variant should appear as playable until implemented, tested and visually reviewed.

**Acceptance/rollout:** Treat code as authority for currently implemented content. Keep legacy saves and old SpellIds compatible via explicit migration; check builds from the existing Forge/Web/Mastery/Spellcraft, all six Divine labels, inaccessible Tiers II–V, seeded playtests and real 320/390px UI. Integrate character-creation visuals only with the parallel character work. Expand one school at a time, Fire then Frost, design cross-school reactions only after each base school is meaningful.



### 3.0a Organic mutation synthesis and Arcane Nexus editor — LOCKED design direction (20 October 2026)

**Owner decision:** Fireball is an **editable signature spell** within the existing **Arcane Nexus**. Choosing a mutation must alter **both actual combat behavior and the spell's visible anatomy**, and compatible mutations must synthesize **one organic, recognizable result**, not disconnected prefab overlays or mere color changes. Fire is the first vertical slice; the editing framework supports **all six** schools without forcing them to use Fireball-style projectiles. These are **design requirements, not claims of implementation**.

#### One centerpiece, five earned mutator sockets — LOCKED (20 October 2026)

**The Fireball is the centerpiece:** it is a single persistent signature spell, represented as a large evolving magical core at the center of the **existing Arcane Nexus** spellcraft view. Mutators are separate researched/unlocked catalogue entries that the player deliberately chooses and places into the Fireball's **actual sockets**. Selecting a mutator changes the *same* spell's visual morphology and gameplay behavior. Mutators are not individual castable spells, and the player cannot equip unearned ones.

**Exact capacity rule approved by owner:**

| Fireball signature level | Actual available mutator sockets |
| --- | --- |
| **1** | **1** |
| **2** | **2** |
| **3** | **3** |
| **4** | **4** |
| **5** | **5** |

This is the **number of simultaneously equipped mutators**, not five predefined kinds of mutations. The level's sockets may be empty. At Lv.1, visually show exactly one available socket and four sealed slots; at Lv.5 show five available slots. All five positions belong to one Fireball, not to five separately autofiring spells. The player can inspect all learned mutators in a scrollable, expandable research collection and choose which ones to place into the available sockets, subject to catalogue compatibility. Show unlearned/discovered-but-locked candidates separately, never as equippable.

**Combined appearance:** The central Fireball renders the composite of all currently chosen compatible mutators **as one evolving body**. Previewing a new mutator morphs the already-composed Fireball (not a standalone spell thumbnail) and previews its genuine cast, travel/engage, impact/trigger and aftermath. Socket removal reverts the affected layers while preserving the rest. For example, at **Fireball Lv.3 or above**, the player may slot *Meteor Heart*, *Detonation* and *Scorched Earth* if all three are learned and legal: the compact Fireball grows a cracked molten heart, bursts from its own fragments at impact, and those fragments settle into the actual persistent burning ground. A Lv.1 Fireball can only slot one of those; it cannot run that three-mutator composition.

**Level mechanics:** How persistent Fireball levels 2–5 are earned, whether levels 6+ exist, simultaneous facet/exclusion rules, and the detailed numerical balancing remain TBD. Do not equate Fireball Lv.5 with the **Magic Tier V/Divine** Wyrm tier or with **Rank III** temporary combat strength. A socket never bypasses researching a mutation, compatibility rules, Wyrm mastery or ranked equality. Future signature spells for the other five Divine archetypes should use this same **progressive signature-socket pattern** when authored, with school-native creatures/rituals/chains rather than forced Fireball projectile effects. Distinguish mutator sockets from any future catalyst/essence slots.

#### Five semantic visual facets — NOT the sockets

| Facet | What it edits | Native visual responsibility |
| --- | --- | --- |
| **Form** | Principal manifestation and role | Dominant silhouette, core/anatomy, scale, number of primary bodies |
| **Delivery** | How the effect reaches/engages the world | Path, tempo, trail, tether, emergence or command |
| **Resolution** | What happens on collision or a legal trigger | Explosion, branching, shatter, echo, curse or creature action |
| **Persistence** | What remains or continues afterward | Ground hazard, field, status trace, corpse state or living bonded unit |
| **Mastery** | Rare acquired Wyrm/lineage property | Authored awakened transformation or restrained accent |

These five facets describe **how visuals behave**, while the **actual five level-earned slots above** determine how many unlocked mutators can be equipped. A player is **not** assigned one Form slot, one Delivery slot, etc.; legal mutators may contribute to multiple visual facets, and certain authored major forms can be mutually exclusive. The canonical typed grammar in §3.2, researched mutations, Web/Forge/Mastery progression, complexity budgets, explicit exclusions, infusion order and In-Hunt ranks still govern legality. **One dominant Form** establishes the principal visual read. The signature-level socket capacity is **LOCKED at 1–5**; level acquisition, prerequisites, costs, pairwise compatibility and balance remain **TUNABLE**. Wyrmfire is rare mastery, not an eleventh Tier-I mutation.

#### Visual-morphology engine — LOCKED invariants

1. **One authoritative recipe:** A validated, versioned C# spell composition owns school, signature, order-sensitive mutation IDs, gameplay effects and event phases. Preview and Hunt consume **the same resolved recipe** and presentation descriptors. Client pixels never invent projectiles, targeting, hit results or damage.
2. **Composable descriptors:** Each mutation contributes school-specific structured art directions for **cast, travel/engage, resolution, persistence/decay**: core shape, material/shell, trail, optional fragments, events, motion, lighting, residue. Data is catalogue-backed; no untrusted executable scripts or arbitrary player shaders.
3. **Transformation, not stacking:** Form establishes recognizable structure; Delivery deforms movement/engagement; Resolution remakes the same material into the hit/trigger event; Persistence inherits visible fragments/debris from that event; Mastery may accent or explicitly author a higher-tier transformation. Maintain continuity of shape, emission, direction, energy and timing. A Meteor Heart cracks into Detonation fragments which settle into Scorched Earth; three unrelated particle effects are **not acceptable**.
4. **Single visual priority:** If two traits contend for a silhouette/phase, use authored adapters, a documented priority, or return a clear validation error. **Never silently ignore an equipped mutation.** Mutually exclusive major forms require explicit catalogue tags; other facets may coexist **only if** research/socket/complexity/trigger constraints permit.
5. **Real interaction and bounded cost:** Actual trajectory, walls, legitimate targets, chain depth, projectile counts, impact radius, persistent fields, cooldown/rank and resource economy must agree with C# gameplay. Cap dynamic offspring and overdraw for mobile; avoid hiding enemies/telegraphs; support reduced motion and legible 320px/390px presentation.
6. **Stable identity and saves:** Fireball stays the underlying signature even if a build is displayed as *Falling Star*. Display names may be curated or player-defined; no accidental new SpellId for every combination. Preserve existing Fire Bolt and Cinder Needle SpellIds, recorded Web/Forge/Mastery unlocks and recipe version migrations. Do not unlock another Divine school, bypass mastery or double-apply Frostfire, Stormglass or Arcane Conduit.

**Base Fireball visual vocabulary — PROPOSED art reference:** a compact molten core with a hot white-gold center, red/orange licking flame sheath, sparse ash sparks, short ember wake, modest impact flare and cosmetic scorch. No lingering *damaging* fire without an actual authorized persistent effect. Grounded Gothic pixel-compatible art and controlled light, not glowing sci-fi geometry.

#### Ten Fireball Tier-I mutation candidates — PROPOSED visuals, not implemented inventory

| Mutation | Primary facet | Organic visible change | Required mechanical contract |
| --- | --- | --- | --- |
| **Cinder Needle** | Form | Orb compresses to a hot thin ember spine; short cutting sparks | Rapid-form identity, legacy migration |
| **Phoenix Volley** | Form | One core buds into a few smaller fire bodies with related flame trails | Capped multiple projectiles |
| **Meteor Heart** | Form | Dense cracked magma body, heavy rotating fragments and turbulent shell | Heavy cast/travel behavior |
| **Piercing Ember** | Delivery | Front sharpens into a lance; wake stays focused through targets | Genuine piercing collision rules |
| **Seeker Ember** | Delivery | Fire body leans into turns; actual curved path leaves a readable ribbon | Bounded seeking, preserve manual-aim intent |
| **Ember Recall** | Delivery | Outbound wake curls into a return arc; the embers visibly reverse | Legal returning geometry and repeat hits |
| **Detonation** | Resolution | Shell bursts into a single pressure ring and molten debris | Bounded AoE and event depth |
| **Wildfire** | Resolution | Real impact branches into flame tongues toward eligible ignition points | No unbounded spreading/double procs |
| **Ash Harvest** | Resolution trigger | On an eligible death, ember material collapses into gathered grave-ash wisps | Real kill attribution and reward accounting |
| **Scorched Earth** | Persistence | Falling fragments become burning cracks and faint smoke | Rendered zone matches actual hazard and expiry |

**Wyrmfire** remains separate rare Wyrm Mastery. Its awakened visuals must preserve the legibility of Form, Delivery and Resolution; selecting a high Hunt tier cannot grant it.

**Illustrative combined identities — NOT approved unlocks or playable content:**

| Composed Fireball | What one continuous animation should communicate |
| --- | --- |
| Cinder Needle + Piercing Ember + Ash Harvest | A narrow cutting ember passes through valid bodies; an actual kill draws ash inward |
| Meteor Heart + Detonation + Scorched Earth | A cracked molten body impacts, expands into a coherent hot shockwave and settles into burning fractures |
| Phoenix Volley + Seeker Ember + Wildfire | Split small fire bodies curve on validated tracks, then ignite a *bounded* chain |
| Fireball + Ember Recall + Detonation | The familiar orb travels out and back, with a precisely defined legal detonation trigger |

#### Arcane Nexus screen — LOCKED interaction, PROPOSED layout

- **One destination and centerpiece:** Arcane Nexus → Spellcraft → Fireball. A large **single living Fireball** hovers above the actual ritual focus with **five physical mutator sockets** arranged around it. Available sockets increase from one at Lv.1 to five at Lv.5; filled sockets display the player's equipped mutators, unfilled slots are clearly empty, and level-locked slots are visibly sealed. Branching research runes beyond the core may expand indefinitely as content grows: these are discoveries, **not extra equipped sockets**. Form/Delivery/Resolution/Persistence/Mastery remain *presentation grammar*, not five mandatory socket labels. Do not duplicate the Web, Forge, Mastery, Codex or wallets.
- **Choose and slot:** tap an available socket and an **unlocked mutation** from the nearby research web; preview the cumulative Fireball change before confirming equip. A locked/unearned mutation cannot be slotted. Allow undo/removal and recomposition. Replay **Cast → Travel/Engage → Resolution → Aftermath → Full loop** from the single combined recipe; nonprojectile schools use native phases. Invalid combinations explain exactly why; no silent replacement of existing mutations.
- **Mobile-first:** readable portrait hero preview above a contextual **bottom sheet** with concise mutation choice, icon, gameplay difference, short animation, prerequisites and compatibility; wide screens use a side inspector. Prioritize the resulting spell at 320px and 390px; minimum safe touch targets, useful focus/keyboard paths and reduced-motion states.
- **Real actions:** Reset restores the last saved draft; Save validates socket/recipe/mastery costs and versioning; Test exercises the **actual deterministic gameplay sandbox** with targets/walls, not a fake visual sandbox. Avoid invented stats, fake cooldown values, fixed 3/5 complexity meters or unapproved mastery unlocks in player-facing concept art.
- **Visual framing:** restrained Gothic pixel/painterly dark-fantasy art, weathered iron and stone, selective firelight; use existing approved character/environment language and immutable six-school pixel emblems. Visual polish must not replace playable tests and device acceptance.

#### All-six-school morphological scaling — LOCKED shared editor, individually authored content

| Divine archetype | Native material / body language | How shared facets adapt |
| --- | --- | --- |
| **Pyromancer (Fire)** | Molten core, pressured flame, embers, ash and cracked scorched ground | Form = Fireball shape; Delivery = flight; Resolution = ignite/explode; Persistence = burning terrain |
| **Cryomancer (Frost)** | Crystalline mass, icy fissures, refracted cyan glow, frost dust | Form = shard/spear/cluster; Delivery = shard path/placement; Resolution = freeze or shatter; Persistence = protective ice/terrain |
| **Stormcaller (Storm)** | Yellow branched filaments, lightning fork rhythm, charge nodes and static residue | Form = bolt/chain seed; Delivery = conductivity and jumps; Resolution = discharge; Persistence = electrified field |
| **Arcanist (Arcane)** | Violet ordered sigils, spatial folds, controlled echo traces | Form = orb/glyph/mark; Delivery = phase/redirect; Resolution = echo/rupture; Persistence = spatial mark |
| **Necromancer (Death)** | Bone, decay, corpse/soul traces, grave-ash and reserved death-green accents | Form = curse/corpse construct; Delivery = bind/haunt/reanimate; Resolution = curse/death economy; Persistence = blight or existing undead. **Never simply a green Fireball.** |
| **Summoner (Binding)** | Real recognizable bonded-creature anatomy, grounded summoning marks and living tethers | Form = bonded unit/role; Delivery = summon/command/pounce; Resolution = unit action; Persistence = companion and orders. **Never a bear-shaped projectile.** |

Necromancer and Summoner signatures are **still TBD**; these are visual-domain boundaries, not invented final spells. Existing Frost Shard, Chain Lightning and Arcane Orb code does not automatically make those schools available in new character creation. Cross-school reactions remain order-sensitive, typed, limited and owned by §3.2.

**Concept-art acceptance for the first Fire prototype:** Present a **portrait-phone Arcane Nexus screen** and, optionally, a desktop adaptation. Show standard Fireball transitioning to **Meteor Heart + Detonation + Scorched Earth** with unmistakable shared physical material, plus small Cinder Needle/Phoenix Volley comparisons. Distinguish locked/researched/equipped without showing unapproved resource totals. Preserve approved icon and WyrmForge art identity; artwork is a **design concept**, not proof of implementation.

**Research principles (do not copy source art):** [Last Epoch skill specialization](https://support.lastepoch.com/hc/en-us/articles/46363203944859-Skill-Specialization) demonstrates editing one recognizable signature; [Path of Exile 2 support-gem grammar](https://www.poe2wiki.net/wiki/Support_skill_gem) demonstrates typed support compatibility; [Diablo II: Resurrected UI/accessibility improvements](https://news.blizzard.com/en-gb/article/23695734/technical-alpha-learnings) favor readable, restrained fantasy presentation. [Approved WyrmForge art rules](art-and-animation.md) take precedence.

**Change note — 20 October 2026:** Owner approved a living central Fireball with **one real mutator socket per persistent Fireball level (Lv.1=1 through Lv.5=5)** and deliberate equipping of unlocked mutators. This replaces the older speculative 1–2-socket model and clarifies that the five visual facets are not the five equip positions. Other Fire candidate effects, their unlocks, compatibility, acquisition/level-up mechanics and reserved signatures remain **PROPOSED / not shipped**.


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

Existing Web hybrid branches, points connectivity, mastery exclusion and generic component tags (`Impact`, `Projectile`, `AppliesChill`, `Chain`, etc.) should be reused. **The owner's current slot rule supersedes the obsolete one-midgame/two-late-game proposal: persistent signature levels 1–5 grant exactly 1–5 mutator slots (§3.0a).** No free all-branch keystone stacking. Free respec between standard Hunts should safely unequip incompatible sockets without erasing recipes. Exact rules for adjusting an *active saved Eternal Hunt* build at town/sanctuary must obey save validity and await tuning.

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

---

### 16.2 Arcane Nexus: concrete research, socket and specialization behaviors

- The Nexus is **one discoverable player-facing place** reached through town, with visually understandable sub-activities: research materials → observe/testing → resolve failure/knowledge → mutate a known spell → choose legal Web specializations/sockets → prepare loadout → try it in an actual Hunt. A visually coherent internal navigation system may have specialized panels; it must not become multiple unrelated top-level destinations with duplicated economy.
- Initial player should discover an understandable real spell mutation before confronting a wall of hundreds of abstract nodes. Planned long-term breadth is not permission to manufacture empty branches: every added node should change legal gameplay/knowledge, unlock a combination, create a meaningful tradeoff or lead to another goal.
- Spell components need **typed stable catalogue identities** and compatibility rules for element, delivery, applied statuses, conditional triggers, catalysts and complexity. Do not force the same socket behavior onto Fire's burst, Frost control, Storm chain and Arcane delayed/geometry mechanics. Element order and applied effect order can matter, but uncontrolled recursion or stacked all-element effects must be rejected/bounded.
- Research sample events are recorded once with provenance; nonconsuming observation can reveal conditions and clues. First meaningful failure produces a useful note, precise missing ingredient/condition or bounded progress rather than silently destroying irreplaceable specimens. Explicitly confirm actual consuming operations. Later copy/paste of a blueprint never fakes possession of missing prerequisites or illegally imports unavailable high-tier spells.
- Showcase accessible **short previews driven by legal resolved simulation behavior** for mutation/evolution/rank changes rather than static icon-only claims or unverified particles. A preview must not emit effects that the equipped configuration would not really produce.
- Example Nexus specializations from earlier exploration (all PROPOSED, not automatic shipped nodes): *Thermal Fracture* trades burst for conditional shatter, *Conductive Frost* supports bounded lightning-on-chill chains, *Lingering Embers* trades burst for duration, *Stable Conduit* improves complex-spell consistency for meaningful Web point cost. Preserve and honor actual existing tree point limits and mutually exclusive choices. Resetting points cannot discard permanent discovered knowledge.
- Separate *offer frequency* from *pick rate* when diagnosing Frost or other underused schools. Measure crowd control preventing attacks, safe repositioning, elite resistance, shatter synergy and situational role, not damage alone. Do not force a particular school as mandatory early content or ensure a strong hybrid can only be built by tedious farming.

---

### 16.3 Spell evolution pacing, Fateweave and combat economy details

- Three cards may each have one individually usable **Reroll** action during a draft; a card that has been rerolled is exhausted for that draft even if the player dislikes the replacement. A new round replenishes *card* eligibility but not shared across-Hunt charge count. Reroll only the selected card, not all three; prefer no duplicate offerings across currently visible cards when the legal pool permits.
- **Gilded Fateweave** is a possible flavorful visual label, but the player's action should still say **Reroll** clearly. A golden opportunity is an uncommon precommitted slot property, not a new banked currency or free infinite upgrade source. It consumes the same charge; cannot offer unmet rank/level/story/element prerequisites; cannot regenerate on re-render/reload. Pickup capacity, cap, odds and Nexus investment are tuning—not copied demonstration figures.
- A new mutation/combination gives the spell a distinct visible identity at low rank, while **the run still earns its rank, minor refinements and breakthroughs**. Major rank/evolution availability is gated by real milestones/eligibility; longer Elder Hunts need many interesting minor decisions, not high-tier powers three nodes into a run.
- Up to four contextual spells share a cast economy. Scheduler input/decision traces must reveal whether offensive cooldowns starved defensive utility, whether chain procs grew exponentially, and why a contextual spell fired. Actively engaged manual intent is authoritative on where aimed offensive casts go; without it, legal auto-targeting may aim behind movement direction. Automated threat recognition still determines legal timing and cannot override active manual aiming.
- Spell blueprint ownership does not give patent rights; export/import remain typed data, never executable scripts; unpublished/unfinished recipes remain private even in ranked sessions. Publishing a revision is a deliberate independent consent operation; withdrawing future availability does not silently delete legitimate previously imported copies.
