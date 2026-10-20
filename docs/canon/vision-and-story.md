# Vision, world and story

> **Canonical WyrmForge specification · updated 20 October 2026.** Product identity and narrative choices, including deliberately unresolved mysteries.
> [Canonical index](README.md) · Only explicitly marked **LOCKED/approved** requirements are commitments. Proposed values, old milestones and drafts are not evidence of shipped code. Verify current `main`, PRs and tests.

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

---

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

---

### 16.1 Story, Chronicle consequences and independent free exploration

- Working Book I title **The Broken Covenant** and illustrative endings **The Last Bastion**, **The Open Roads**, **The Unbound Dawn** remain useful authored narrative direction. The user's story choices must have real NPC, settlement and regional consequences; do not substitute a cosmetic dialogue choice, erase established character history or auto-import a different Chronicle's decisions. Exact Book names/dialogue and every plot beat are authored content to validate against existing GitHub before making canon.
- Each Chronicle is an **independent story record and selected persona**, not a second economic/player account. A named NPC lost in one Chronicle may remain alive in a different Chronicle; the player's permanent Nexus knowledge and legitimately earned generalized access may remain shared without making story causality leak between histories. A cosmetic identity swap must not rewrite verified ranked accomplishments or existing story events.
- Campaign may begin after substantial non-campaign knowledge and should acknowledge that proficiency when feasible. Story-exclusive scenes/relationships are fine; there must be an **equivalent non-campaign path** to gameplay endgame/Conclave, earned by meaningful world/lineage feats. FLC/story book releases should append authored content without degrading old saves or inventing incompatible magical lore.
- Campaign is a guided way to learn Fire, Frost, Storm and Arcane and understand the Wyrm/city conflict—not a permission to farm limited story resources indefinitely or to block free explorers from advanced spellcraft. Future story Books/FLCs should recognize earlier irreversible choices within the correct Chronicle identity.
