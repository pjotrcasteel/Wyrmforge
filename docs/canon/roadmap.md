# Product roadmap and open decisions

> **Canonical WyrmForge specification · updated 20 October 2026.** Intent and dependency ordering, **not** an assertion that any feature is incomplete or deployed.
> [Canonical index](README.md) · Only explicitly marked **LOCKED/approved** requirements are commitments. Proposed values, old milestones and drafts are not evidence of shipped code. Verify current `main`, PRs and tests.

## How to choose the next slice

**25 October owner sequencing:** finish and merge the current Tier-I Ashfang gameplay/art integration before beginning the broader enemy-AI review; encounter balance tuning may continue afterward. Preserve the accepted dragon appearance/scale, live C# action decisions and warning/strike/recovery semantics. The subsequent AI review should build on species-specific behavior (direct Hollowed chase, pack surrounding/cooperation, boss predator policy) under shared deterministic movement/decision contracts. This sequencing does not waive the universal lighting G0–G5 or physical-device acceptance gates; remaining scene/material migration work stays explicitly tracked in that workstream.


**21 October owner checkpoint:** Seasons are deferred. Start P2 with a complete selected **Fire Tier-I** route/target/extraction/material loop, preserving Arena Lab as a design/test tool only. Build toward separate per-lineage Tier I–V ladders and persistent post-V frontiers. The next authored tier introduces an optional harder refuge-reclamation objective — Fire Tier II now implements it (post-refuge cargo is lost on a fall; before the refuge death ends the run). Tier-aligned loot (Common/Rare/Epic/Legendary, Rare Emberglass gating Fireball levels 4–5, graded Essences) is implemented on top of it. Fire Tier III (three forks, Elder Ashfang, an optional watchtower that earns scouting of the last fork, Epic Wyrmcinder Core for Fireball level 5) is implemented in draft. Next slices: Fire Tiers IV–V (Legendary drops, more advanced systems) and the Fire Endless frontier. Seasonal systems are not part of this ladder work.

Read current `main`, open PRs, CI and runtime before taking the next priority. Do not revive an already-implemented item, discard unfinished validated branch work, or convert a design candidate into a shipping claim. Ship vertical slices including state, UI, saves, automated checks and physical device review when visuals or input change.

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
| **P5 — generative arenas, wave challenge and changing ground** | Compose believable site-dependent arenas, elemental terrain, real C# collisions and exits; introduce physical Endless Arena traversal, wave/challenge directors and one foreshadowed fair terrain transformation. For the **entire game's world-rendering workstream**, build a **single generic scene-wide lighting engine** accepting declarative emitters from any current/future object and determining visibility of ALL in-world pixel art in Hunts, Town Square, interiors and future biomes (never merely brightening pre-lit images). Demonstrate Fireball, torch and spot/directional light on ground, **reflective water/puddles**, rock, the **existing Hollowed enemies**, and the original 3D oak, with true leaf-on-leaf self-shadowing, **before** producing/integrating more forest art. | Deterministic seeded geometry, navigation/telegraph/dodge-room validation, responsive mobile combat, research-backed architecture, real visual QA, and new emitter registration without renderer edits, multiple sources/receivers, reflective water and existing Hollowed receiving/casting genuine light/shadows, genuinely dark unlit actors, internal foliage shadows and device frame-time proof. | Current Arena authority; P2 geography/site contracts where linked; [lighting foundation gate](art-and-animation.md#arena-rebuild-v2--shared-lighting-before-further-forest-asset-production-locked-23-october-2026). |
| **P6 — persistent Eternal Hunt** | Guaranteed major refuges plus optional developed outposts, restricted connected fast travel, recoverable death setbacks, atomic sanctuary suspend, **launch into town and Continue Eternal Hunt at saved sanctuary**, permanent frontier records. | Quit/relaunch, save migration, reward replay/idempotency, no bypass of unvisited frontier and one-life-long-run preservation tests. | World/route persistence and authoritative save lifecycle. |
| **P7 — fair four-week competitive seasons** | Separate seasonal Expedition and Arena: shared immutable season seeds, equal legal starting pools, unlimited attempts, best verified per player, anti-farm Merit, privately validated records and archive. | Trusted verifier and frozen ruleset tests; never promote existing unverified Hall-of-Fame submissions to official. | Stable modes and scoring/event traces; identity and verification. |
| **P8 — season-to-Eternal power loop** | Seasonal achievements unlock substantial earned powers through the **integrated Arcane Nexus** for Eternal/casual play; provide eventual legitimate catch-up, keep ranked starts normalized. | Cross-mode isolation, persistence, reward entitlement and no season-reset on Eternal; privacy-safe verified all-time frontier. | P6–P7 and existing Nexus/research progression. |
| **P9 — expand depth, don't front-load scope** | Deeper Wyrm variants, region ecologies, authored Chronicle/story, private blueprint sharing and Conclave social polish in separate slices as each becomes a real playable journey. | Each feature has a use, real gameplay/state, migrations, tests, mobile acceptance and no contradictions to previously approved lore/art. | Proven earlier vertical slices. |

### Universal lighting engine and Town Square relighting — P5 dependency, 23 October 2026 (LOCKED)

**Updated owner direction:** The single engine must determine the
visibility/shading of **every world-space pixel** across Town, Hunts
and all future gameplay scenes. Trees/leaf self-shadowing, actor
lighting, wet reflections, town buildings and real fixtures use
the SAME light/material/shadow registry. Normal maps alone do not
cast geometry shadows. A 2D/3D sprite may not remain full-bright
because its source image is bright. A zero-light test (ambient,
all fixtures, all emission = off) yields black **world art**;
UI/menus/explicit combat telegraphs have separate readable passes.

1. **G0 — whole-repo lighting audit:** reconcile \`main\`,
   source-only Blender [#307](https://github.com/pjotrcasteel/Wyrmforge/pull/307),
   experimental [#327](https://github.com/pjotrcasteel/Wyrmforge/pull/327),
   and **all drawing paths**: Hunt ground/scene actors, enemy/mage
   sprite and VFX, Town panorama and building overlays, NPCs,
   foreground, water, future interiors/biomes. Choose renderer and
   document coordinate/depth/light/material/scene contracts,
   world versus screen-space exceptions and sRGB↔linear conversion.
2. **G1 — universal GPU engine NEXT:** point/spot/directional/
   scene ambient, multiple independent emitters, roughness/normal/
   specular/reflection materials, occluders/real shadows and source
   lifecycle. Demonstrate one source illuminating approved terrain,
   puddle, rock/wall, original oak with leaf-on-leaf shadowing,
   real Hollowed and Ashling receivers, and a **small Town corner**
   (lantern, paving, wall/roof, NPC and foreground). Add a new
   light/object with descriptors only. Use a zero-light black-world
   preset and a visibly distinct, fair near-black night preset.
3. **G1 actor pipeline:** Hollowed and Ashling are existing rigged-
   sprite references; the current mage sprite is **temporary**
   and will be replaced **with the same sprite/animation setup**,
   not custom lighting. Ensure their common LitSprite/pose material
   can cast and receive via authored per-pose depth/occluders.
4. **G2 — authoritative snapshot/lifecycle:** actual
   C# events/states control Fireball, Wyrm breath, burning entity,
   real town windows/Nexus/forge/lantern fixtures and scene profiles.
   All emitters share registry/units/shadow budget across scenes.
   No independent town, character or arena light simulators.
5. **G3 — richer material response:** water/reflection quality,
   roughness, AO/indirect and two-sided foliage, smoke/transparent
   depth, atmospheric effects, pixel-stable light grids.
   Reflections and emissive surfaces are explicit, not pasted
   bright spots or duplicated baked direct fire.
6. **G4 — optimize & 2.5D Town relighting (owner revision 26 October 2026):** select/measure
   native mobile renderer and light/LOD budgets, and produce
   a **non-destructive relightable 2.5D Town material/depth/occluder layer
   set** derived faithfully from preserved approved paintings, **without**
   a full-3D Town rebuild. Follow [Town T0–T6](../design/town-2p5d-relighting-milestones.md) and require screenshot approval at T2. Town's existing
   building states, six Nexus variants/mastery, pedestrian paths,
   depth masking, unlocks, well/board and three-district
   composition are NOT redesigned. Town Auto/Day/Night settings
   become environment profiles in same engine, while Hunts
   remain night-only.
7. **G5 — scene cutover with actual QA:** migrate Town, Hunts,
   actors and environmental/FX paths to the one renderer;
   delete legacy per-scene brightness/darkness hacks at approved
   cutover, keep gameplay/collisions/navigation intact, test
   zero-light + dynamic-light + normal daylight/near-black-night
   and UI/accessibility at 320/390px, desktop and physical
   iOS/Android. Do not claim **all art uses one engine** until
   no world renderer bypass remains.

#### Once G5 has merged — integrate Hollowed injuries and future appearances (25 October 2026)

**Explicit post-G5 dependency, not work for G1–G4:** After the universal GPU lighting engine's final **G5 scene-cutover milestone is merged into `main`**, follow it with an actor-art/material integration PR. This must **not block ongoing enemy art or gameplay now**, and must not introduce Hollowed-specific light/shader paths.

- **Live source:** [#343](https://github.com/pjotrcasteel/Wyrmforge/pull/343) merged the approved `broken-leg-left` even-cadence walk into Hunts. The active atlas is `wwwroot/art/enemies/hollow-rigged/injuries/broken-leg-left-walk.png` with a no-cape reach `attack` and the existing legacy `death` fallback. The editable source and further Hollowed variants are maintained separately in [#333](https://github.com/pjotrcasteel/Wyrmforge/pull/333).
- **Repair:** regenerate **true pose-derived, aligned** albedo/normal/depth/caster (and applicable roughness/emissive) material data for *each* approved actor variant, direction, frame and `walk/attack/death` clip. Never pair the injured gait with standard-pose normals/depth, invent normals from RGB or add a full-bright Canvas escape hatch. Enforce source hashes, synchronized frame/anchor geometry and atomic material/atlas loading.
- **Coverage:** the current `standard` and `broken-leg-left` and subsequently approved broken-arm, one-arm and other Hollowed appearances must all use the same LitSprite/light/shadow contracts, with no variant-specific lighting engine and no changes to authoritative C# AI, speed, combat, collision or saves.
- **Acceptance:** test all 8 facings, limp/contact timing with no unnatural rapid step, walk-to-attack and death transitions, dynamic illumination and true cast/receive shadows, zero-light black-world, moving lights and occlusion at 320/390px and on physical iOS/Android hardware. Fallback to a **valid lit asset pair**, never accidentally full-bright or mismatched materials.

**Scope boundary:** G5 itself must not leave an unlit bypass for any active world actor. This **source-specific material refresh follows G5's merge**, and is only complete after its own build, mobile QA and visual acceptance. As more approved variants enter Hunts, they inherit this same requirement.

**Stop rule:** G1 doesn't pass merely because one tree looks
3D, a pre-lit panorama is masked, a Hollowed receives an orange
tint, or a puddle has a pasted specular highlight. The same
scene engine must light arbitrary registered objects and actually
determine which world-space surfaces are visible. The full
Town Square visual rebuild is a **subsequent gated asset/scene
migration**, not an excuse to discard its accepted architecture
or rewrite current gameplay before the engine exists.

[Universal lighting-engine implementation and scene inventory](../design/arena-real-geometry-light-engine.md) ·
[Canonical art and visibility](art-and-animation.md#one-engine-controls-visibility-in-every-world-scene--locked-23-october-2026) ·
[Town Square preservation and relighting migration](town-and-ux.md#future-town-square-presentation-migration--one-universal-lighting-engine-locked-23-october-2026).

**Continuing compatible work in parallel:** The unified Arcane Nexus, minor/major upgrade pacing, Fateweave card-by-card reroll, research-to-spell proof and the future **3–4 intelligent spell scheduler** remain binding. If one of these is the active workstream, do not pause it merely to force P1; finish a safe checkpoint first. Otherwise plan them as **small dependency-conscious slices alongside P1–P5**, not as a massive replacement of the working Forge/Web/SpellBook system. Expand spell loadouts only after the auto-target/manual-override arbitration and shared cast scheduling are reliably tested.

**Critical dependency order:** Real routes before painted roads; physical obstacles/telegraphs before VFX; aim authority before presentation indicator; persistent save/identity before published ranked records; independently verified evidence before leaderboards and prize/season claims. For every creative area or combat presentation, research **at least two relevant independent external sources and approved internal art**, explaining the transferable principles and why the result remains within established WyrmForge style; no copied layouts/assets or unreviewed high-fantasy redesign. At no point should a polished concept illustration substitute for playable, mobile-tested functionality.

---

---

## 13. Known open decisions — do not treat as finalized

**Already decided; do not ask again:** **Gungeon-inspired auto-aim with manual override** (default legal nearby enemy selection independent of movement; active second thumb/mouse/right stick overrides; release returns to auto; prepared spells still auto-cast; no giant arrows), **multi-source research-first creative freedom within approved WyrmForge style**, one unified Nexus; up-to-four intelligent spells (no spam); optional campaign with equal endgame path; per-card Fateweave; small upgrades before big; evolving regions; geography-first and tier-scaled Hunts; committed forks; hand-painted live map; progressive discovery + paid-through-risk scouting; knowledge persists; world changes gradually and through consequential events; major mid-Hunt events advanced only; useful optional objectives with immediate + world rewards; hybrid follow/free/recenter; two different Endless seasonal modes; physically connected generated arenas and fair dynamic changes; shared 4-week seasonal seed; unlimited best verified ranked attempts; meaningful seasonal power usable in Eternal but never normalized Ranked; Eternal same-persistent-hunt across season/death; guaranteed major/optional earned refuges; fast travel only connected secured; sanctuary quit → launch town → Continue Eternal at saved sanctuary.

**Truly open:** final Wyrm tier labels, catalogue/800-node ambition pacing, element taxonomy, definitive Book I narrative names/dialogue, desired session length, exact encounter tier counts, one-time reward amounts and rare drop costs, spell complexity/socket/point budgets, casting arbitration tuning and 1→4 loadout unlock cadence, **exact override gesture/deadzone feel, indicator artwork, auto-target scoring/stability, manual aim forgiveness and no-target spell classification**, Fateweave charges/caps/golden odds, Arena wave/change cadence/telegraph times, healing/recovery limits, world-change event probabilities and repair economics, map material pipeline/marker glyph design and performance budgets, whether optional casual/randomized Endless exists, 4-week seasons' UTC start/end boundaries and exception policy for critical fixes, ranked Merit constants/tie-breaks and legal challenge verification architecture, participation/achievement requirements for seasonal powers and later catchup routes, Eternal death penalty and sanctuary density, save behavior outside safe sanctuaries, exact multi-profile/cloud sync behavior, permanent loadout application into already saved Eternal Hunt and town visits without checkpoint.

**When a truly open decision blocks a slice:** present 1–2 practical recommendations grounded in current implementation and balance evidence; request specific approval rather than inventing a contradictory final product rule. Continue unblocked work.

---

---

## 14. Definition of success and Claude kickoff

An ordinary first-time player can start either the optional story or free exploration, see readable Gothic map/environment, learn an initial school, **auto-aim and auto-cast at legal enemies by default with optional fully manual aiming whenever desired**, survive a short coherent Wyrm Hunt, extract genuine material, research a real mutation without destructive RNG, use the unified Nexus to prepare a meaningful build and visibly improve it in a real combat run. They eventually meet equivalent shared endgame eligibility regardless of story choices, while their private spells remain private unless published with consent.

A competitive player can run **Seasonal Expedition** (routes/knowledge/strategy) or **Seasonal Arena** (generated wave survival) under the same frozen four-week rules, retry freely, have the best **independently verified** result placed on distinct boards, and use earned powerful permanent rewards through the Nexus to push further in their **Eternal Hunt**.

An Eternal player can save at a **secured refuge**, quit, relaunch the **town** (not a battle), use **Continue Eternal Hunt**, return to the **same refuge, same world, same committed routes**, suffer recoverable death setbacks and build a lifelong verified frontier without arbitrary seasonal wipe.

**Exact instruction for Claude:**

> This is the **one authoritative WyrmForge product-design specification**, superseding the four previous overlapping design documents. **You do not need me to identify your current implementation checkpoint**: determine it yourself from GitHub commits, branches/PRs, CI, the existing development handover (§39 where applicable) and the reconciliation document; those are *status evidence*, not alternative product specifications. Protect in-progress work. Then apply the **explicit P0–P9 next-step priorities in §12**, selecting the highest-priority unimplemented, unblocked, small playable/tested slice rather than restarting already delivered features. New requirements include **automatic targeting plus full temporary manual-aim override (updated 19 October)** and **creative freedom only after multi-source research within the approved WyrmForge art style**. Preserve C# simulation authority, connected geography, honest collision/VFX, save compatibility, real mobile acceptance and verifiable competitive results. Never claim future systems are shipped until demonstrated.

**Final principle:** Narrative remembers *who* you became. Nexus remembers *what magic* you discovered. The Hunter's Chart remembers *where you went and how the world changed*. Each Hunt tests *what you can survive now*. Seasonal Conclave tests *what everyone can do under equal rules*. Eternal Hunt tests *how far a lifetime of earned power and learning can take you*. **These experiences must reinforce one another rather than contradicting each other.**

---

## Dated legacy roadmaps

The [earlier gameplay opportunity plan](../roadmap/wyrmforge-gameplay-next-level.md) and [October handover](../handover/2026-10-15-project-art-and-backlog.md) remain milestone evidence. Their dated step/status claims do **not** override this topic or current code.
