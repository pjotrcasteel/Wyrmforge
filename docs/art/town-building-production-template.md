# Refuge buildings — shared art and animation production template

**Status:** production template / proposed stage content; **not** approval of new artwork or gameplay changes.  
**Authority:** subordinate to `docs/design/WyrmForge_MASTER_DESIGN_FOR_CLAUDE_2026-10-18_v1.2.md`, approved in-game art and actual progression code.  
**Scope:** Wyrmforge, Arcane Nexus, Codex, Hall of Fame, and any future town building.  
**Delivery rule:** prepare isolated visuals/animations for user approval **before** changing the live game, hot spots or progression.

## 1. One town, one art language

Every building must feel built by the same people, in the same century, and painted by the same artist. **Shared quality, not cloned facades.**

- **Art direction:** grounded, human-scale Gothic dark fantasy; readable hand-authored painterly/pixel-textured 2.5D. Diablo I/II atmosphere, restrained color, worn slate and timber, iron brackets, damp stone, subtle signs of a fortified city repairing itself. Avoid AI-style microdetail, repeated glowing knots, meaningless spires, detached balconies, impossible structural supports, smeared props and busy outlines.
- **Canonical camera:** preserve the existing `2172 × 724`, 3:1 Refuge panorama and its exact fixed perspective. Three 724-pixel town slices. Buildings and roads never move, resize, drift or change silhouette as progression changes. World-anchored NPCs and effects share that same projection.
- **Shared world conditions:** one time of day, same wet paving, ambient sky, shadow softness, lens/brush resolution, light direction, weather, contrast, edge treatment and perceived pixel/detail density across every building. Never recolor a whole building with a black CSS curtain.
- **Material grammar:** wood must hold loads, chimneys need a real hearth, smoke exits actual vents, braziers illuminate their immediate surroundings, rune light belongs to engraved instruments, doors and paths must connect plausibly to the cobbled plaza.
- **Color discipline:** source color samples from the currently approved panorama. Neutral environment palette is shared; building-specific accent is *small and functional*: Wyrmforge ember/etched bronze, Nexus muted arcane blue, Codex candle/ink amber, Hall muted heraldic gold. No entire building glowing blue/purple.
- **NPC proportions:** one canonical human-height benchmark from the existing town scale. Matching feet/ground contact, consistent head-body proportions, shadow shape, clothing material, contour softness and shadow direction. No NPC invented at a different scale or rendered as a billboard.
- **Protect the source:** use the exact approved original as a reference, with asset checksums/versioning and per-building masks. Existing generated concepts are exploratory, **not** approved source art. Do not use image-to-image as a substitute for exact geometry or hand cleanup.

### Permanent scene anchors

- **World Gate** is its own central system. It is not one of the four vacant shop buildings; preserve its existing access rules and portal. Planned effects: real swirling within the ring, restrained inner radiance, rune pulse and drifting motes. Its animation never leaks light into a dormant building.
- Roads, mountain skyline, lake, banners, plaza, center statues and neighboring silhouettes never change during a building's stage transition. Buildings may gain *local* props and believable signs of maintenance, not a different architectural style.
- City-wide rain, wind and water are shared ambient layers, not duplicated in each building asset.

## 2. One four-stage contract

All ordinary town buildings use one underlying stage vocabulary; the names in the UI can differ.

| Shared stage | Meaning | Allowed occupancy / lighting | Gameplay requirement |
| --- | --- | --- | --- |
| **0 — Vacant** | Closed, genuinely unused | No working NPC, furnace fire, smoke, glowing wares, lit windows or entrance lamp. Ambient rain/wind only. | Current feature is locked |
| **1 — Stirring** | Reopening, minimal signs of work | One purposeful worker; *one* restrained local light or work effect | Existing, genuine feature unlock |
| **2 — Active** | Daily operation | Main worker plus optional second NPC; building-specific work loop, a few justified lights | Later, real domain milestone **TBD** |
| **3 — Advanced** | Established / masterwork service | Up to three purposeful workers, richer tools, controlled special effect during genuine events | Actual masteries/achievements **TBD** |

Do not invent or save a second progression economy to represent building appearance. Derive it from existing authoritative state. Stage 1 can follow an existing unlock today; Stage 2/3 must remain conceptual until concrete milestones are approved and implemented. No timer-based automatic upgrade, random visual escalation, or visual tier that claims an unavailable feature.

The **World Gate exception** may eventually have independent energy states (`Quiet → Awakening → Open → Empowered`) tied to real narrative/game state; the working portal remains operational wherever current gameplay needs it.

## 3. Building-by-building identity (all use the shared template)

| Building / purpose | Stage 0 | Stage 1 | Stage 2 | Stage 3 | Existing feature unlock |
| --- | --- | --- | --- | --- | --- |
| **Wyrmforge** — bind Wyrm Essence into enduring spell/mastery unlocks | **Cold:** shut crucible, inert runes, abandoned tools, no smoke | **Rekindling:** one mage-smith checks tools and coaxes a weak ember | **Working:** forge ritual and engraving; mage-smith and one apprentice transporting essence vessels | **Masterwork:** master supervises a controlled binding; two or three workers; richer molds and restrained ceremonial effect | First secured Essence |
| **Arcane Nexus** — Arcane Web, research, spell design | **Dormant:** unlit study, sealed apparatus, no blue potion glow, empty desks | **Stirring:** one researcher brings in a book; one small working lamp | **Awakened:** researcher works at a fixed desk; assistant carries scrolls/specimens; only active device runes shimmer | **Ascendant:** mature spellcraft study, deliberate short magical demonstration, up to three scholars | First completed Hunt |
| **Codex** — bestiary and recovered knowledge | **Sealed:** shutters shut, cold lamp, empty lectern | **Reopened:** one keeper opens the archive and inspects a manuscript | **Studied:** keeper catalogs a sample; scribe carries papers between shelves | **Grand Archive:** restored archive/etched knowledge tablets, two or three knowledgeable workers, soft working candles | First completed Hunt |
| **Hall of Fame** — achievements and verified milestones | **Silent:** doors closed, unlit sconces, empty steps | **Honored:** one attendant tends trophies/banners, single modest lamp | **Celebrated:** visitors arrive, keeper records awards, active but restrained illumination | **Exalted:** engraved honors, ceremonial torchlight only during a real celebration, purposeful crowd max three | Two completed Hunts |

**Naming matters:** the "Blacksmith" hotspot is currently associated with the Forge in code, but the intended artistic identity is **Wyrmforge / rune-smiths**, not horseshoe or sword manufacturing. Rename player-facing labels only as a separate approved UI change. The design document explicitly keeps Forge/Mastery/Codex domains coherent with the integrated Arcane Nexus; no duplicated laboratory or extra wallet.

### NPC routines and loops

| Building | Resident roles | Purposeful routine (paths stay inside approved entrance and plaza) |
| --- | --- | --- |
| Wyrmforge | Mage-smith, essence-handling apprentice, master at advanced | Rack → crucible → engraving bench → rest; work uses held objects and actual contact |
| Nexus | Researcher, assistant, specialist | Door → books/apparatus → record findings → bookcase; short inspection gestures |
| Codex | Keeper, scribe, visiting scholar | Door → shelf → reading stand → catalog table; book physically opens/closes |
| Hall | Attendant, recordkeeper, occasional visitor | Door → trophy → memorial board → door; attend/inspect/leave, no aimless patrol |

No NPCs at Stage 0. Every routine has actual destinations, entry/exit, varying pauses and grounded walking. Pathfinding respects doorsteps; prevent clipping through signage, planters, props and braziers. Background visitors appear only when stage and context permit.

## 4. Copy this card for *any future building*

```yaml
buildingId: wyrmforge                   # stable unique ID; never rename lightly
displayName: Wyrmforge                 # player-facing, separately approved
purpose: Bind secured Wyrm Essence
featureOwner: Forge                    # existing authoritative game domain
sourceArtwork: refuge-town-panorama.png
sourcePanoramaPx: [2172, 724]          # do not invent camera or perspective
buildingBoundsPx: null                 # measure from approved panorama
entranceAnchorPx: null                 # inspect actual doorstep
npcFootScalePx: null                   # measured against approved human reference
states:
  vacant:                               # stage 0
    requiredGameState: featureLocked
    localArtwork: approval-pending
    npcRoles: []
    effects: []
  stirring:                             # stage 1
    requiredGameState: actualFeatureUnlocked
    localArtwork: approval-pending
    npcRoles: [mage-smith]
    effects: [weak-ember]
  active:                               # stage 2: gate not yet decided
    requiredGameState: TBD_APPROVAL
    localArtwork: approval-pending
    npcRoles: [mage-smith, apprentice]
    effects: [working-crucible, engraving, chimney-smoke]
  advanced:                             # stage 3: gate not yet decided
    requiredGameState: TBD_APPROVAL
    localArtwork: approval-pending
    npcRoles: [mage-smith, apprentice, master]
    effects: [ritual-on-actual-event, working-crucible, chimney-smoke]
npcs:
  - id: mage-smith
    atlas: approval-pending
    entryAnchorPx: null
    stopsPx: []                         # connected, geometry-validated
    behaviors: [walk, idle, inspect, work]
    groundShadow: true
effects:
  - id: working-crucible
    attachToPx: null                    # exact source location; no magic on bare walls
    activeStages: [active, advanced]
    respectsReducedMotion: true
review:
  fourIdenticalCameraCrops: false
  alignmentDifferenceChecked: false
  npcFootContactChecked: false
  mobile320And390Checked: false
  productOwnerApproved: false
```

This is a **design manifest**, not a production parser, schema, or change to the current Razor implementation. For other buildings, fill in measured anchors, roles, real unlock predicates and local effects. Keep one shared renderer/animation controller; data should configure it, not create four bespoke CSS/JavaScript implementations.

## 5. Asset and animation production contract

Suggested package per building (names are a **future convention**, not files claimed to exist):

```text
town/buildings/<id>/
  building.manifest.yaml             # stages, anchors, roles, approved triggers
  art/
    00-vacant.webp
    01-stirring.webp
    02-active.webp
    03-advanced.webp
  npcs/
    <role>-atlas.webp
    <role>-animations.json          # rects, facing, foot anchor, durations
  fx/
    light-masks.webp
    effects.json                    # exact source anchors and stage flags
  qa/
    four-stage-contact-sheet.webp
    mobile-320.png
    mobile-390.png
```

- Each stage image must be **registered to the exact same original panorama**; keep native resolution, no position drift or newly invented arches/windows.
- Prefer a per-building transparent plate or exact crop with measured world coordinates over a full newly generated town per stage. Transparent pixels outside the local building region must not alter the adjacent building, public square or World Gate.
- Separate light emission masks and NPCs from painted building plates. Windows/lamps are physically present but ON/OFF depends on the state; no generic opaque dark wash.
- NPC animation data should provide frames, event markers (footfall, pickup, strike), direction, ground anchor and per-frame duration. Use the existing Sprite Lab to inspect atlases and catch floating feet/jitter before in-game integration. Art directions for opposite sides may be mirrored *only* when clothing, equipment and hands remain plausible.
- For working behavior, animate **anticipation → contact/impact → recovery → pause**, not an endless identical 4-frame bob. Do not have three villagers marching in synchrony; vary intervals deterministically and pause realistically.
- Light flicker is asynchronous and localized. Smoke rises from a genuinely working chimney, moves in wind, and is absent in Vacant. Portal swirl is a separate central effect, never bundled into a building sprite sheet.
- Reduce motion support and performance budgets are shared: pause offscreen actors/effects, keep visible character counts small, avoid always-running full-screen video/Canvas pipelines or expensive giant sprite swaps on mobile. Confirm actual iPhone frame pacing; do not claim a fixed FPS without measurements.

## 6. Acceptance checklist (mandatory for each building)

1. Research the existing approved WyrmForge art and **two independent real-world or developer-art references**; record the principle learned from each. Do not use another AI-generated image as the style source.
2. Submit **four static stage frames of the same building at the same coordinates**. Approve geometry, materials, contrast, lighting and key props. No runtime integration first.
3. Submit one NPC with walk + idle + task; inspect **silhouette and contact frames**, directional turns, carry/item continuity and plausible paths in Sprite Lab.
4. Submit brief stage-specific animated clips (one work loop, one light/smoke loop). Check realistic source of every effect, timing offsets and mobile-scale readability.
5. Validate the building inside all three existing town panorama slices (including stage mixes), at 320px and 390px portrait, landscape and desktop. Verify scrolling/hitbox alignment.
6. Existing building unlock and locked-tap explanation must continue to work. Source-of-truth progression controls visual stage, not independent local animation counters.
7. Preserve current main branch and existing art until **explicit user approval** of the new stills and animation. Only then add the in-game vertical slice, tests and deployment. No replacing approved art in production to try a speculative filter.

## 7. Pilot and rollout

First: Wyrmforge's four *static* states using its actual source building silhouette; then one well-animated mage-smith and the relevant effects. Get the owner's visual approval in-game or reviewed media without changing live gameplay. Once the pilot meets the style checks, apply **the same manifest, masks, atlas conventions, NPC movement/interaction controller and validation** to Nexus, Codex and Hall. Future buildings must pass the same checklist rather than inventing a new aesthetic.

**Not in scope of this template:** adding new crafting mechanics, inventing upgrade currencies, deciding Stage 2/3 unlock requirements, altering the current central portal progression, shipping new assets or modifying the current code/UI. Those are separate implementation tasks only after approval.
