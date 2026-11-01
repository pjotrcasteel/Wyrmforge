# WyrmForge — Claude Opus execution map for a solid playable alpha

> **Status:** execution/handoff plan, 31 October 2026. This is a *work plan and evidence index*, not a second design canon, a blanket approval to merge drafts, or a claim that all milestones are complete. The canonical topic files in [docs/canon/README.md](../canon/README.md) always determine intended game rules. Current main/code, PRs, CI and owner reviews determine actual delivery status. Verify all heads again before implementing.

## 0. Direct instruction to Claude Opus

You are implementing a **cohesive, playable WyrmForge alpha**, not restarting the game or blindly clearing a giant feature list. First inspect current main, AGENTS.md, canonical topics, remote branches, open/stacked PRs and CI. Preserve every authorized concurrent branch and approved asset. Build the smallest strong end-to-end slice from the *existing game*: Forge/Arcane Nexus preparation → selected connected Hunter's Chart route → actual 2.5D Hunt/exploration → automatic combat with temporary manual control → meaningful encounter and Wyrm victory → Essence/material extraction → permanent upgrade/research → save/relaunch → visibly stronger next Hunt. An optional story must not block free exploration. Use an already implemented Fire Tier-I route as the initial proving ground; do not invent new lore, systems, assets, numbers or higher tier unlocks to fill gaps.

**Non-negotiables:** C# RunSimulation owns deterministic game/AI decisions, physical collisions, RNG, routes, rewards and save state; presentation is event-driven. One reusable engine per lighting, agent AI, sprite animation, cosmetic physics, VFX and audio. Mobile-first native-pixel 32px reference world with correctly proportioned variable-size actors and props, world-space 2.5D perspective, stable feet/depth/occlusion; no runtime 3D default. The painted 2D Town stays live. Preserve Canvas and opt-in fallbacks, approved art, saves and unchanged gameplay. Research original visual directions from two independent relevant sources before *new* material art. Commit and push every coherent validated slice, verify remote SHA, keep draft PRs current, continue unblocked work without asking to "continue" each commit. Stop at explicit **owner visual/physical-device approvals**, a meaningful missing product decision, permissions/blockers or unresolvable conflict; never silently force-merge owner-gated artwork.

**Release naming:** **G5 = Lighting Engine 0.1 composition baseline**; **G6–G10 = stages toward Lighting Engine 1.0**. G5 can have imperfect/documented shadows, approximate reflections and a reduced or disabled shadow tier, provided the real Hunt is coherent, no giant incorrect wedges/tearing, and fallback works. G5 does *not* approve default GPU cutover. G10, not G5, owns height-aware true shadows/reflections, sustained physical mobile budgets, all-world parity and default production cutover. AR4/AR5/WF32 can work before G10; AR0–AR3 already did so. Do not block the alpha on G10.

## 1. Evidence snapshot — do not equate "merged" with "accepted"

| Capability / milestone | 31 Oct repository evidence | Unfinished acceptance or action |
|---|---|---|
| C# baseline, Fire Tier-I and extraction | Tier-I selected Hunt and short connected route merged via [#205](https://github.com/pjotrcasteel/Wyrmforge/pull/205); normal gameplay and saves exist | Prove the **entire** player loop, save/relaunch, economy progression and no dead-end routes with current main |
| P1 auto-target/manual override/sigil | Implemented, owner-approved 28 Oct; [#392–#396](https://github.com/pjotrcasteel/Wyrmforge/pull/396) and real iPhone evidence | P1b deliberate breakable-prop and non-breakable chest interaction still separate; playtest control-feel |
| P2/AR0–AR3 geography | AR0/AR1 approved + merged [#404](https://github.com/pjotrcasteel/Wyrmforge/pull/404); AR2 approved + merged [#457](https://github.com/pjotrcasteel/Wyrmforge/pull/457); AR3 continuous C# height/slope/material weights approved foundation + merged [#458](https://github.com/pjotrcasteel/Wyrmforge/pull/458) | Normal Hunts may still use old ground by default. Winding monastery-road curvature, destination logic and AR4 material binding remain refinements |
| AR4 + WF32 | Opt-in AR4-A material geography draft [#459](https://github.com/pjotrcasteel/Wyrmforge/pull/459); source-art/ecology draft [#429](https://github.com/pjotrcasteel/Wyrmforge/pull/429) | Owner material review, native scale, live 320/390px proof, real-world integration and merged status **not yet established** |
| Lighting G1–G3 | Shared GPU foundation merged [#332](https://github.com/pjotrcasteel/Wyrmforge/pull/332), [#344](https://github.com/pjotrcasteel/Wyrmforge/pull/344), [#345](https://github.com/pjotrcasteel/Wyrmforge/pull/345) | Existing renderer is not proof of correctly lit real painted Hunts |
| Lighting G4/G5 | Live GPU adapter remains draft [#381](https://github.com/pjotrcasteel/Wyrmforge/pull/381); stacked G4 repair candidates [#441](https://github.com/pjotrcasteel/Wyrmforge/pull/441) → [#449](https://github.com/pjotrcasteel/Wyrmforge/pull/449) → [#456](https://github.com/pjotrcasteel/Wyrmforge/pull/456) | Actual iPhone painted-Hunt shadow failures; correct the current stacked chain and pass a minimal honest G5 0.1 composition gate before claiming available |
| AI0–AI6 | Deterministic AI0 [#348](https://github.com/pjotrcasteel/Wyrmforge/pull/348), earned sight AI1 [#362](https://github.com/pjotrcasteel/Wyrmforge/pull/362), AI2–AI6 opt-in implementations [#364](https://github.com/pjotrcasteel/Wyrmforge/pull/364) **merged** | Physical-device, human fair-pressure, fallback, and real gameplay validation still open; [AI6 frame timing #400](https://github.com/pjotrcasteel/Wyrmforge/pull/400) is an open draft |
| Shared sprite animation | Shared directional sprite controller/compositor already merged [#165](https://github.com/pjotrcasteel/Wyrmforge/pull/165) | Hollowed V2 art [#399](https://github.com/pjotrcasteel/Wyrmforge/pull/399) and other variants need owner visual approval; advanced AN0–AN6 [#387](https://github.com/pjotrcasteel/Wyrmforge/pull/387) is **closed unmerged/deferred**, not an alpha dependency |
| Combat feedback | CF1 truthful C# damage-number feed merged [#398](https://github.com/pjotrcasteel/Wyrmforge/pull/398) | CV1–CV5/FXP remain future polish; [#374](https://github.com/pjotrcasteel/Wyrmforge/pull/374) is open and not validated as production |
| Fire Tier II, rarity and XP | Tier-II draft [#209](https://github.com/pjotrcasteel/Wyrmforge/pull/209) stacked on merged #205, loot/Essence rarity draft [#218](https://github.com/pjotrcasteel/Wyrmforge/pull/218) stacked on #209, XP duplicate-award correction [#118](https://github.com/pjotrcasteel/Wyrmforge/pull/118) open | **Do not call Tier II/rarity shipped or merge stacked PRs out of order.** Re-evaluate current saves and progression before alpha economy sign-off |
| Audio | Original Worn Vellum/Wet Forest/Fireball work [#128](https://github.com/pjotrcasteel/Wyrmforge/pull/128) in draft | Listening/volume/latency/mobile browser unlock approval remains separate |
| Town | Current owner-approved **painted 2D Town** is the baseline; relighting [#368](https://github.com/pjotrcasteel/Wyrmforge/pull/368) paused | No T3–T6 implementation, 3D Town rebuild or mandatory lighting migration |
| G6–G10, AR6/AR7, FXP and seasons | Requirements recorded in canon | **Planned**, not production-complete and not all necessary for first alpha |

This status table is a **dated snapshot**. Recheck every PR number, base/head, draft flag, latest SHA, review, status check and active competing work before acting.

## 2. Alpha contract: "solid alpha" means one finished vertical journey

**Must function on the alpha candidate:**

1. Character/Forge/Nexus → prepare an initial legal school spell/build → start the actual Fire Tier-I Hunt; no blank/demo-only buttons.
2. Hunter's Chart selection → one *real*, connected seeded route → matching C# arena sites, encounter progression, blocking terrain, plausible exits and a reached Wyrm; no false paths or reward duplication.
3. Move/dodge, default auto-target/auto-cast, deliberate independent touch/mouse/right-stick override, fair enemies and telegraphs, readable targeting and truthful C# damage feedback.
4. At least one meaningful optional detour or discovery, a real elite/normal encounter, a real Wyrm fight with earned victory or honest failure, then legal extraction/Essence/material allocation.
5. Return to existing painted Town/Forge/Nexus; apply an actual saved mutation/unlock and show a gameplay difference on a second Hunt. Verify save/quit/relaunch, migration from representative older saves, duplicate rewards and death/retry.
6. Appropriate art and minimal audio across the actual journey; stable 32px-reference native-pixel 2.5D appearance on 320/390px cameras; usable touch and desktop/controller behavior. GPU 0.1 is **opt-in** if accepted; keep Canvas normal path otherwise.
7. Automated deterministic route/combat/save/UI smoke and measured real device build, input, framing, dark-Hunt readability and performance. No unplayable regression on default app paths, no false CI sign-offs.

**Explicitly not alpha-blocking unless regression prevents this loop:** complete G6–G10 Lighting 1.0; AR6 mud simulation/FXP7–8; all 5 Fire tiers; complete six-school mutation catalogues; P3's full animated painted Chart; all P4 region evolution; advanced Wave/Endless, Eternal, seasonal competitions, verified Conclave/leaderboards; perfect per-pose Hollowed materials, full Ashfang action library, CV3–CV5 broad variety, all VFX/audio, Town relighting. These remain real roadmap promises, not cancellations. If existing shipped gameplay depends on any one, repair the dependency in the smallest bounded slice.

## 3. Complete numbered milestone inventory

Read the canonical roadmap for **full requirement/acceptance text**. Below each code is explicitly enumerated; statuses refer only to known 31 Oct evidence, not blanket test completion.

### Product and progression: P0–P9, P1b

| ID | Work/result | Alpha relation |
|---|---|---|
| **P0** | Preserve work, reconcile main/PRs/CI/saves/approved art; one source of truth | **Mandatory, continuous** |
| **P1** | Hybrid auto aim, manual right-stick/touch/mouse, V3 grounded sigil | **Implemented/owner approved**; regression check |
| **P1b** | Typed enemy/prop/cache target IDs; breakables only auto when no hostile; tap-focus survives cooldown; chests interact, not shot; once-only drops | **Alpha-targeted small slice**, not P1 rework |
| **P2** | Connected legal Hunt routes, real banks/bridges/monastery/lair, reward commitment and short Tier-I | **Mandatory** on selected route; broader coverage later |
| **P3** | Living Hunter's Chart: original visual grammar, valid geography, touch pan/zoom/recenter, readable markers and scene | **Usable existing Chart mandatory**; full visual polish later |
| **P4** | Earned scouting/fog, persistent knowledge and regional history/causal changes | **AR2 small discovery proof mandatory**; full simulation later |
| **P5** | Site-specific generated arenas, meaningful terrain and encounters, unified scene lighting, eventual wave/transform content | **AR0–AR5 + G5 composition target**; wave/endless/G10 later |
| **P6** | Persistent Eternal Hunt, secured refuges, leave/relaunch Town/Continue, death setback, frontier | **Post-alpha** |
| **P7** | Fair four-week seeded Expedition and Arena seasons, trusted attempts and ranked archival | **Post-alpha** |
| **P8** | Earned seasonal powers through Nexus into Eternal without ranked advantage | **Post-alpha** |
| **P9** | Deeper Wyrm tiers, regions, Chronicles, private blueprints and Conclave social depth | **Post-alpha**, selected existing content only |

**Noncoded progression gates to preserve:** Fire Tier I (merged #205) → Fire Tier II optional Emberwatch refuge (#209 open) → Tier-III watchtower/forks/Elder Ashfang (verify actual implementation; do not infer from old audit prose) → Fire IV–V and Endless frontier later. Loot/rarity Common/Rare/Epic/Legendary, Emberglass and graded Essences (#218 open) may be integrated **only after** their base and save/economy tests. XP-earned permanent Arcane points remain the single source (#118 pending fix). The one integrated Arcane Nexus includes Web, research, spells, Forge and Mastery rather than duplicate front-end cities. Future loadouts grow from a reliable primary toward three/four intelligently scheduled spells; current single-primary alpha is legitimate. Fateweave is per-card/per-round bounded, with earned charges, no unbounded free rerolls. Exactly six primary Divine schools are design canon; existing implemented spell set is not equivalent to six fully produced classes.

### One-engine architecture and AI: ENG0–ENG4, AI0–AI6

| ID | Work/result | Current action |
|---|---|---|
| **ENG0** | Source/PR duplicate-owner inventory and migration map | Do after ongoing Hollowed owner gate per canon for *feature-engine consolidation*; P0 audit proceeds independently |
| **ENG1** | Minimal shared C# event IDs, lifecycle, coordinates, snapshots, pause/reset and ownership contracts | Add only proven missing contracts; no rewrite |
| **ENG2** | Incrementally move sprite, audio, VFX and light consumers to one reusable path | Adapter-by-adapter, preserve visual parity |
| **ENG3** | Cross-engine integration, native-pixel/material/foot contracts and mobile/replay budgets | Integration acceptance, not just compiler |
| **ENG4** | Reconcile latest PRs/CI/canon; document what actually shipped | End checkpoint |
| **AI0** | Deterministic unified C# agent decision baseline | Merged #348; protect |
| **AI1** | Earned perception/sight/memory rather than omniscience | Merged #362; protect |
| **AI2** | Seeded Town resident schedule/work/social/rest and bounded 2D navigation | Merged opt-in #364; device/behavior review remains |
| **AI3** | Species capabilities: chase/retreat/strafe, cooldowns, target-loss and uninterruptible fair warnings | Merged opt-in #364; behavior validation remains |
| **AI4** | Coordinated packs, pressure slots and bounded LOS/navigation queries | Merged opt-in #364; mobile stress/fairness remains |
| **AI5** | Boss observations/capabilities/phase constraints, no illegal learning | Merged opt-in #364; Ashfang acceptance remains |
| **AI6** | Shared lab, inspectors, trace metrics, stress profile, opt-in rollout and fallback | Merged base; #400 frame-stutter measurement follow-up open |

### Lighting: G0–G10

| ID | Work/result | Status/alpha gate |
|---|---|---|
| **G0** | Repository-wide scene/draw/material/depth/color-space inventory | Foundation/audit, reconcile scope of painted Town |
| **G1** | One data-driven point/spot/directional/ambient GPU light registry with eligible actor, terrain, foliage, water casters/receivers; generic actor adapter | Foundation merged #332; not full Hunt quality |
| **G2** | Stable C#-owned light snapshots/events/identity/lifecycle for torches, Fireball, Wyrm and fixtures | Merged #344 |
| **G3** | Shared albedo/normal/roughness/specular/alpha/occlusion material and lighting response | Foundation merged #345; not genuine scenery reflection |
| **G4** | Native-pixel/mobile WebGL budget, real painted-Hunt integration and current shadow regression fixes | **Draft/unaccepted** #381 + stacked #441/#449/#456; owner real-device review |
| **G5 — Lighting 0.1** | **Opt-in AR4/AR5 composition backend**; fixed/moving colored C# lights, intensity/range/enable, basic material/cast/receive, 320/390px real Wet Forest playable Hunt, intact fallback and no catastrophic wedges/tearing | **Pre-alpha composition target**, not asserted complete; imperfect/shadow-off tier acceptable when disclosed |
| **G6 — 1.0 track** | One 32px-reference world/metre/camera/foot/material coordinate contract; AR3 physical elevation into GPU receiver/occluders; visual height separate | Post-alpha refinement unless a blocker |
| **G7 — 1.0 track** | Universal per-pose/tree/prop/cliff elevation-aware cast/receive, 360° direction, foliage self-shadowing, stable static caching/budgets | Post-alpha |
| **G8 — 1.0 track** | Coherent dry/wet/stone/leaf albedo/normal/AO/roughness; direct specular vs environment probes vs *real reflected scenery* in puddles/water | Post-alpha |
| **G9 — 1.0 track** | Native 32px sampling/pixel clusters/atlases, iOS/Android sustained GPU memory/battery/thermal/fallback budgets | Post-alpha, but **basic alpha mobile viability still required** |
| **G10 — Lighting 1.0** | Default non-Town GPU production cutover with height shadows/reflections, true black-world invariant, A/B captures, device sign-off and owner approval | **Not an alpha prerequisite**, sole 1.0 declaration |

Lighting acceptance details: static and dynamic emitter position/height/type/color/intensity/falloff/enable/duration; zero light+zero emission should black out *world pixels* while HUD/telegraphs remain legible; debug near-black Gothic night must be fair to play. Material normal/bump maps cannot independently occlude a cliff/tree. Specular light blobs are *not* reflected scenery. Never hardcode Fireball/tree/scene exceptions in a purported generic engine.

### World and authored art: AR0–AR7, WF32

| ID | Work/result | Status/alpha relation |
|---|---|---|
| **AR0** | One authoritative Chart-node → SiteId → ArenaRecipe C# geometry/material debug path | Owner-approved, merged #404 foundation |
| **AR1** | Forest/mountain monastery/Wyrm lair shape, real passable gates and blocked cliffs, legal exits | Owner-approved, merged #404 |
| **AR2** | Optional reachable detours/discoveries/once-only rewards tied to site history | Owner-approved sufficient foundation, merged #457 |
| **AR3** | Continuous C# physical elevation/grade/slope/drainage/material weights, deterministic preview and C# traversal | **Owner-approved and merged #458**; natural road curvature deferred |
| **AR4-A** | AR3 material-ID/weight lookup and native authored WF32 terrain bank with fallback | Draft #459, opt-in; integrate/review carefully |
| **AR4 remainder** | Original physically scaled 32px world surfaces, repeat-resistant atlas/weight blending, albedo/optional normal/roughness/visual-height, live renderer parity | **Alpha visual track**, owner material approval |
| **AR5** | Rooted static grass, stone, trees, monastery/ruins, correct scale, feet/canopy depth/occlusion and legal C# landmarks | **Alpha visual target**, owner art approval |
| **AR6** | Bendable grass, localized mud/foot/debris/elemental surface response using FXP7–8 and C# event facts | **Post-alpha polish** unless minimal static marks suffice |
| **AR7** | Several-seed/chart/arena gameplay, exact-physical-device/performance/art acceptance for full world production | Full sign-off later; **basic alpha device validation now** |
| **WF32-P1i** | Original native-scale source soil/grass/mud, stone integration and boundary blending; preserve owner-reviewed source | Art source workstream, verify actual approved manifests |
| **WF32-P1j** | Contextual ecology grammar: moss/mushroom/twig/leaf/pebble/root/rubble, moisture/shelter/wear placement, source-only #429 | No new C# ecology authority; integration requires AR material contract |
| **WF32 further** | Compatible normal/roughness/visual-depth, 12 grass/rock variations, larger rooted set dressing and pixel/perspective proof | Source-art reviews are *not* game acceptance; no 900px stretched stamp, no repeat wall |

**Remaining AR3 polish**: less ruler-straight monastery ascent, justified ruins/caches destinations, geological 1–3 m ledges and no radial orphan roads. Do not delay AR4 merely to polish these; schedule if real playtest/exits demand it.

### Combat, feedback, physics, animation, VFX and audio

| ID | Required slice | Alpha sequencing |
|---|---|---|
| **CF1** | Truthful C# damage floats, elemental ticks, critical/finishing feedback controls | Merged #398; verify real Hunt |
| **CV1** | Authored Hollowed/Ashling/Mire Hound/Penitent stagger, recoil and distinctive death; no fake damage | Small bounded first-combat-feel slice **if owner-approved art available** |
| **CV2** | Destructible barrels/carts/trees/bushes, real typed health/drops, warned chain fire, environmental tactics | Start with existing barrels/crates and P1b; expanding assets later |
| **CV3** | Actual source-derived enemy anatomy/role variants, not recolors/HP inflation | Later |
| **CV4** | Different encounter director beats: lull/surge, flank Hounds, destroyable cursed bell and readable counters | Later or one small alpha trial if existing code supports it |
| **CV5** | Tactical Fireball chain, area denial and heavy direct-hit evolution through existing mutations | Later, do not unbalance initial loop |
| **FXP1** | Real source-derived detachable anatomy/material/rotational sprites | Deferred; no random bones |
| **FXP2** | One deterministic fixed-step cosmetic 2.5D debris solver | Deferred; C# still owns combat |
| **FXP3** | Typed confirmed lethal damage → once-only visual debris event | Deferred; draft #374 needs reconciliation |
| **FXP4** | Extensible Fire+Explosive, conditionally brittle Frost and electric Storm trait-response profiles | Deferred; no element-specific physics forks |
| **FXP5** | Shared light, shadows, pixels, VFX/audio and floor contacts for debris | Deferred |
| **FXP6** | Actual iOS/Android clips, performance caps/LOD and owner sign-off for each damage profile | Deferred |
| **FXP7** | General actor/grass/prop soft-contact bent surfaces and bounded visual displacement | Needed before full AR6, not AR4 |
| **FXP8** | Typed mud/splash/ejection/floor-landing and footprints across common FXP engine | Needed before full AR6, not AR4 |
| **VFX1** | Existing arena/spell/boss VFX inventory and owner contracts | Later, minimal current effects suffice |
| **VFX2** | Shared C# event-driven profile registry, spawn/update/expire/pause/reset and pooling | Later |
| **VFX3** | Elemental composition with shared lighting, material, physics, audio and culling | Later |
| **VFX4** | Real Hunt iOS/Android Fire/Frost/Storm/hybrid reduced-effects acceptance | Later |
| **AUD1** | Inventory current audio mixer/events and draft #128 source/provenance | Alpha QA / partial |
| **AUD2** | Reuse one event mixer for balanced varied Foley, spatial/ambient/haptic adapters | Alpha minimum audible feedback, full later |
| **AUD3** | Real iPhone/Android sound listening, cooldown fatigue, mute, accessibility | **Alpha minimal pass** on shipped cues, full later |

**Sprite-first minor animation delivery**: (1) owner-approved native-scale eight-facing silhouettes/art; (2) authored idle, walk, attack, hit/recovery, death with correct C# state and priority; (3) shared player/compositor grounded roots, pause/interruption and occlusion; (4) genuine 320/390px in-Hunt/video + device playtest. No duplicate new animation engine. Hollowed V2 [#399](https://github.com/pjotrcasteel/Wyrmforge/pull/399), other Hollowed drafts [#385](https://github.com/pjotrcasteel/Wyrmforge/pull/385)/[#391](https://github.com/pjotrcasteel/Wyrmforge/pull/391), wizard [#439](https://github.com/pjotrcasteel/Wyrmforge/pull/439) and Ashfang source studies are **separate**, visual approval gated.

**AN0, AN1, AN2, AN3, AN4, AN5, AN6:** all seven advanced source-skin/IK/3D research milestones from closed-unmerged [#387](https://github.com/pjotrcasteel/Wyrmforge/pull/387) are **ARCHIVED/DEFERRED, not finished**, and have *zero* default-alpha dependency. Preserve the work, never restart it without explicit approval.

### Town, platform and other noncoded gates

| ID | Requirement | Authorization |
|---|---|---|
| **T0** | Original painted 2D Town baseline/screenshots | Paused |
| **T1** | Non-destructive Town scene/light/material contracts | Paused |
| **T2** | Optional central-square GPU lantern/shadows visual proof | Paused, owner gate |
| **T3** | Foreground depth/NPC integration | **Not authorized** |
| **T4** | Buildings/Nexus selective materials | **Not authorized** |
| **T5** | Town districts/nav parity | **Not authorized** |
| **T6** | Town 2.5D cutover/device sign-off | **Not authorized without new approval** |

**Other major systems, preserved rather than silently re-scoped:** Forge/Web/Nexus research and per-lineage mutation/power costs; saved loot/Essence/XP and Fateweave; grounded Town navigation/screens; actual Wyrm boss telegraphs and encounter ecology; physical device iOS/Android port architecture [issue #55](https://github.com/pjotrcasteel/Wyrmforge/issues/55); Fire v1 balancing [#303](https://github.com/pjotrcasteel/Wyrmforge/issues/303); school hue parity [#314](https://github.com/pjotrcasteel/Wyrmforge/issues/314); Hall-of-Fame verification [#66](https://github.com/pjotrcasteel/Wyrmforge/issues/66); cloud collector reliability [#60](https://github.com/pjotrcasteel/Wyrmforge/issues/60). Causal regional events, Endless Arena, true Eternal suspended at sanctuary, two equal-seed season modes and Conclave verification remain **P4–P9 later scope**. The Arcane Laboratory issue [#108](https://github.com/pjotrcasteel/Wyrmforge/issues/108) is a future integrated Nexus facet, **not permission to build a second destination**.

## 4. Recommended alpha execution train — ordered critical path

The ALPHA codes below are **delivery packages for this handoff**, not competing design requirements or a replacement of P/G/AR codes.

| Package | Implement/verify in this order | Exit proof / merge requirement | Parallelizable |
|---|---|---|---|
| **ALPHA0 — baseline and branch safety** | Snapshot remote main/head, all 36 open PRs and stacked bases; run existing C#/JS/browser baseline; inventory real journey and saves; mark defects, owners, mergeability and device holes. Keep approved look and baseline video. | Evidence matrix of implemented vs draft vs approved; green starting checks or precise known failures. One work branch per owner. | World source art, lighting investigation |
| **ALPHA1 — functional journey** | Prove/repair Tier-I selected route → correct encounters/Wyrm → material/Essence extraction → Forge/Nexus earned research → new build effective in second route; old/new save versioning, failure/retry; fix duplicated Arcane XP #118 if reproduced. Add one automated seeded journey. | A real screen-recorded twice-playable journey and deterministic seeded integration assertions; absolutely no duplicate rewards. | AR4, G4, audio source review |
| **ALPHA2 — topology + input integrity** | Verify merged AR0–AR3 chart↔site and real collision/ports/detours; defer optional road cosmetics. Add small P1b typed prop-focus/chest behavior if it fits without input conflict. Regression on 320/390px movement/right-stick/aim/cooldowns. | Tested path reachability, prop/enemy priority, guaranteed Wyrm access, zero phantom exits/loot; current approved P1 remains intact. | Lighting, materials |
| **ALPHA3 — composed world** | Consume #459/#429 only after review/rebase; deliver approved scale-consistent AR4 surfaces with neutral-light and moving camera; then AR5 grounded trees/grass/monastery props and depth. On lighting side, repair G4 stacked chain safely, pass bounded G5 0.1 opt-in and fall back if not safe. | Genuine real Hunt 320/390px, stable camera/feet/native pixels, source-pixel clarity, useful world composition, no repeat stamp; owner art gate. **World can ship on Canvas if G5 not accepted**. | C# loop and AI QA; AR4 art independent of G4 |
| **ALPHA4 — readable combat and AI validation** | Test merged AI3–AI6 opt-ins: sight loss, pack pressure, Ashfang fair warnings, stutter frames (#400), 64-agent pressure, reduced quality. Refine existing hit feedback/one CV1–CV2 loop if source art and time permit; no FXP rebuild. | Actual current-Hunt frame/time and fair-combat clips, real damage/loot sources, accessible telegraphs. Any unapproved opt-in stays off in alpha. | AR5 placement, sound |
| **ALPHA5 — interface, audio, content consistency** | Verify loading/World Gate/Nexus/Forge, reward wording/unlock legitimacy, pause/resume/death/retry, controller/touch, reduced motion, mute and original ambience/impact mix. Do not force draft #128 wholesale. | Actual journey has no dead end; phone sound/listening check on included cues; localization/text issues tracked. | AI, visuals |
| **ALPHA6 — merge and regression train** | Merge only validated, owner-accepted independent PRs in dependency order below. Run seed/replay save matrix, C# tests, JS/browser smoke, screenshots and comparison versus baseline *after each risky merge*. | Main green with remote SHA receipt and CI; normal Town/Hunt preserved, opt-in flags default-safe. | Device test prep |
| **ALPHA7 — real device alpha gate** | Actual iOS Safari/WebKit and Android Chrome/native-shell where available, 320/390px mobile frame pacing, heat/memory, audio unlock, multi-touch/second thumb, telegraphs and boss. Owner plays normal two-run journey and inspects art. | Owner-approved **alpha candidate** or precise blocker list; no phone proof = "device gate pending", not green. | Fix-only branches |
| **ALPHA8 — alpha freeze and release** | Fix blocker severity only, pin asset/save/schema and migration compatibility, release notes: scope, fallback, known G5 shadow limitations, exact commit, screenshots and next backlog. | Reproducible alpha build/commit, truthful known limitations, no unresolved save corruption or critical playability fault. | Post-alpha G6–10 may continue separately |

**Single recommended first sprint**: ALPHA0 → ALPHA1 + AR4 material-source review in parallel → ALPHA2 → ALPHA3 minimum; run ALPHA4/5 checks as those features become playable. This avoids building attractive terrain over a broken extract/research/save loop. The explicitly approved AR world-first continuation is not frozen by unrelated Hollowed, ENG, AI or G4 approvals.

## 5. Parallel work lanes: one owner, one branch family, minimal shared-file contention

| Lane | Assigned area | Can proceed at same time as | Does **not** change | Merge gate |
|---|---|---|---|---|
| **A — C# core loop** | ALPHA1–2, P0/P1b/P2, rewards, XP #118, saves, tests | B,C,D,E | Lighting shaders, artwork, animation code | Seeded full journey/save tests |
| **B — world generator + art composition** | AR4-A #459, AR4/AR5, WF32 #429, AR3 polish after primary material gate | A,C,D,E | C# game authority except reviewed adapter, GPU engine internals, cosmetic physics | AR3 typed inputs, owner 320/390px material/perspective review |
| **C — lighting engine** | G4 repairs #381/#441/#449/#456 → G5 opt-in; later G6–10 | A,B,D,E | AR authored textures, AI/FXP, painted Town | Actual painted-Hunt GPU A/B, zero light/fallback and owner G4 review; production cutover ONLY G10 |
| **D — AI and combat QA** | AI6 #400, actual AI2–AI6 device behavior; small CV1/2 if unblocked | A,B,C,E | Separate AI engine, owner-unapproved art, VFX-local HP | Seed/replay/fair pressure/real-Hunt evidence |
| **E — UI/audio/device** | World Gate/Forge/Nexus/readability, #128 audition as separate safe audio slices, cross-device and tests | A,B,C,D | C# reward/damage authority, core sound mixer rewrite | Integrated phone/listening checks |
| **F — protected external visual work** | Hollowed #399 and related actor art; wizard/Ashfang source reviews | All lanes when non-conflicting | Gameplay state, default renderer or forced actor asset replacement | Source authenticity + explicit owner visual acceptance |
| **I — integrator** | Dependency registry, CI/rebase/migration, release candidate, rollback flags | All lanes (serializes actual merges) | Unilateral design changes; unapproved draft merging | Main CI + owner gates + remote SHA and tags |

These are *parallelizable responsibilities*, not a request to spawn agents automatically. If multiple Claude sessions are used, assign exclusive write ownership for shared C# RunSimulation files, WebGL compositor and canon docs; coordinate interface changes by small versioned PRs. Put one integrator in charge of main and cross-lane conflict resolution. Prefer separate branches and PRs even if a single Claude Opus executes the plan serially.

## 6. Merge graph and safe integration protocol

**Never interpret "open" as "ready".** Check draft flags, head SHA, branch ancestry, conflicts, latest CI, in-Hunt captures, author/owner approval and dependent PRs immediately before each merge.

1. **Freeze evidence on main**, not branches: current main + AGENTS/canon + screenshot of working default Hunt/Town; run baseline and save backups. Do not rebase or force-push someone else's branch. Use fresh integration branches or ask branch owner to rebase.
2. **Independent low-risk fixes**: #118 XP award duplication (if still reproducing); ALPHA1/2 tests and small P1b PRs. Keep each atomic. For C# schema changes require save migration + replay/idempotency evidence.
3. **Fire-tier stack**: #205 is already merged. Open #209 (Tier II) → #218 (rarity) remain **stacked**: validate/update #209 against latest main, owner/CI accept it, merge; rebase/update #218 onto the resulting main, validate save/economy once-only cases, then merge only if alpha scope demands that extra content. Do **not** merge #218 first or call either shipped while draft/open.
4. **World stack**: AR0/AR1 #404 → AR2 #457 → AR3 #458 are merged. Review #429 source-bank provenance/materials and #459 AR4-A material binding (which already consumes referenced original art); reconcile source hashes and any conflicts; merge as **separate tested slices** after owner AR4 review; then AR5 presentation. Do not merge rejected/archived ground #338/#340 as production. G5 is not a required condition to author WF32 sources or prove AR4 on a safe existing adapter.
5. **Lighting stack (preserve exact ancestry)**: #381 (main-based live Hunt adapter) → #441 (base on #381 head) → #449 (base on #441 head) → #456 (base on #449 head). This is a **stack of dependent draft branches**, not four independent merge-ready patches. Integrator/branch owner should verify current base/head status, reconcile older shadow fixes, rebase or restack safely, validate each cumulative head and reduce to one approved coherent G4/G5 integration series. Do not blindly merge the tips into main or reverse-order squashes. An actual owner-observed painted-Hunt failure still blocks G4 visual approval. A bad shadow must be disabled/reduced, never shipped as a giant wedge. G5 0.1 remains opt-in and staged; do not turn on GPU by default to make a milestone "done".
6. **ENG dependency**: Canon puts **Hollowed owner visual acceptance → ENG0–ENG4 reusable feature-engine consolidation → G5 0.1 → outstanding AI acceptance** for feature-engine sequencing. Respect that rule. The AR/WF32 exception explicitly allows independently verified composition/geography work in parallel, and this alpha plan does not override that. Do not force #399 art approval to make G5 move. If its gate remains pending, progress non-conflicting alpha work and state precisely which shared engine milestone waits.
7. **AI/FXP/audio**: AI2–AI6 #364 merged but launch opt-ins only after real-Hunt/device checks; #400 might have merging conflicts or missing CI. #374 is *future* combat aftermath, not automatic requirement. #128 remains sound-audition draft; only carefully reviewed small audio merges with physical listening approval. Existing AN #387 is closed; preserve archive; T #368 paused; do not merge Town/GPU rebuild.
8. **One integration queue**: for every PR, compare files to current main and other lanes, verify remote head SHA, update branch from new main without destructive reset, run focused tests + relevant full build/browser and real capture, ask owner *only at defined gate*, merge via standard repo method, verify new main commit and deploy/check runner, then update status board. Re-run full vertical journey on the final combined head, not merely individual branch checks.
9. **Rollback safety**: preserve feature flags, last known working Canvas/Town path, schema compatibility and released asset manifests. If integration fails, revert only the known candidate via normal review process; never erase owner work/branches or reset a broad workspace.

### Integration gate checklist for every merge

- [ ] Scope and owner clarified; not superseded, closed, paused, rejected or outside authorization
- [ ] Correct latest main and dependent bases; no hidden overwrite of concurrent files
- [ ] One game authority: C# state/IDs/events/save; existing animation/G/AI/FXP/VFX/audio adapter reused
- [ ] Deterministic seed/replay, idempotent loot/rewards and representative old-save migration
- [ ] Native 32px reference, real 2.5D depth/feet, mobile 320/390px screenshots **from actual playable Hunt**
- [ ] Validated default and fallback paths, night/zero-light readability if lighting changed
- [ ] Green relevant CI on the **actual final head**, with genuine physical device evidence separately identified
- [ ] Explicit owner approval for new character/terrain/lighting art and production cutovers
- [ ] Remote pushed commit SHA and changed milestone/status receipt

## 7. Alpha acceptance matrix — use this for real owner sign-off

| Test | Evidence required | Fails if |
|---|---|---|
| **C# determinism** | Same seed + decisions, same route/target/outcomes/loot, cross-reload stable | JS invents gameplay, generator changes rewards via art inputs |
| **Legal geography** | Forest, monastery and lair chart-to-Hunt screenshots, walk/LOS and boundary property tests | Dead-end promised road, passable painted cliff, missing site entrance |
| **Combat and Wyrm** | Genuine actual Hunt run, enemy/player/prop targeting, telegraphs, boss completion and defeat | Free aim stolen, enemies attack unseen, mock damage or invulnerable scene |
| **Progression** | Two completed Hunts with valid Essence/material spend and persistent mutation, plus death/failure/save | Duplicate XP/Arcane point/drop, broken save/once-only state |
| **32px 2.5D art** | Actual in-Hunt 320/390px screenshots/video with mage/Hollowed/Ashling scale, camera motion, roots and occlusion | Sprite smear, wrong scale/perspective, padded fake shadows, repeating huge motifs |
| **G5 0.1** | C# moving Fireball + fixed torch, colors/intensities/enable and lit albedo+optional maps, opt-in flag and Canvas A/B | Giant opposite shadow wedge, black screen, tearing, default path regression; *incomplete soft shadows/reflections may be recorded* |
| **G10 1.0 later** | Height-aware true cast/receive, actual reflected scenery, universal parity, zero-light world-black, device perf and owner approval | Just tinted sprites or a specular blob claimed as a reflection |
| **Phone/device** | Physical iPhone and Android where available: touch, second-thumb input, audio, pause/resume, web/native rendering, fps/memory/heat across a real run | Browser screenshot presented as physical hardware sign-off |
| **Experience** | Owner plays beginning-to-end, explains next objective without developer help, receives visible upgrade payoff | Beautiful scene with broken loop, lack of fair combat readability |

## 8. Discrepancy resolutions and anti-patterns

1. **AR status:** dated AR0/AR1 and AR2-next prose was superseded by approved/merged #457 and #458. Treat AR0–AR3 as an accepted *geographic foundation*, **not** proof that final visual height/shadow/material treatment is done. AR4–AR7 remain open.
2. **Lighting release labels:** G5 is 0.1 composition, G6–G10 hardening toward 1.0. Any old wording claiming "G5 production cutover" is stale; production sign-off is G10. G4 is not magically accepted because G1–G3 merged.
3. **Fire tiers/loot:** #209/#218 are *open stacked PRs*, not automatically implemented in main. Old "Tier II now implements / loot implemented" wording must be read as branch-only evidence until merged and tested. Do not silently reintroduce duplicate permanent Arcane points: issue/PR #118.
4. **AN vs sprite:** archived #387 closed unmerged; advanced 3D source skin/IK is no longer a game prerequisite. Keep original art/source assets intact.
5. **Town:** historical "all world scenes including Town in one GPU cutover" is superseded by the approved painted Town exclusion. Generic light descriptors may cover future Town research, but T3–T6/3D rebuild have no authorization.
6. **AI:** AI2–AI6 being *merged* does not equal owner-accepted behavior and physical device performance. Do not restart AI0 or add another AI engine; fix #400 and perform acceptance.
7. **WF32 vs C# height:** art visual height/normal maps convey pixels, but AR3 C# elevation and collision determine passability. G6/G7 must consume physical height to cast shadows; do not infer movement from image colors.
8. **Rendering truth:** same shared GPU can be used with imperfect G5 shadows for composition, but a distorted live-Hunt shadow is a defect, not an acceptable "stylization". A 32px reference is a terrain/native-pixel scale, **not** a rule that every character must be 32×32.
9. **Alpha vs long-term:** this plan stages canon; it does not delete P6–P9, seasons, FXP, six-school depth or G10. Do not let their completion requirements paralyze one honest alpha.
10. **Other drafts:** numerous old TownV2, original ground-art review, actor anatomy and isolated lab PRs remain archival/experimental; do not promote them to production solely by age or apparent mergeability.

## 9. Claude's first implementation ticket and report format

**First ticket: ALPHA0 + ALPHA1 diagnostic proof.**

- Checkout/inspect latest main and AGENTS; list active PR branches/bases and clean state. Audit existing Tier-I gameplay paths and exact main classes. Run current .NET, JavaScript and browser checks. Inventory load/create character, Forge/Nexus, Chart, actual Fire Tier-I, boss, extraction/loot, return, permanent XP/Essence, save/reload. Verify #118 double credit, #209/#218 branches, AR3 default flag and current preview paths.
- Create **one seeded end-to-end playable alpha smoke** with real C# states and browser journey (plus old-save compatibility). Record genuine mobile-size screenshots. Repair the highest-impact actual blocking gap in a small PR; don't reimplement already delivered targeting, engine or art. If no break is found, document the proven loop and choose AR4 material integration as next safe visual slice.
- Continue ALPHA2/AR4 and the independent unblocked tracks; notify only at explicit owner visual/device gates or hard authority blockers.

For each checkpoint report **what changed**, **which main/PR head**, **what actually passed**, **which real captured art/device evidence exists**, **which owner gate is pending**, **what is next and can proceed**, and **what could not be verified**. Never say "all done" just because a source asset or lab works.

**Release decision:** Mark the game a *solid alpha* only when ALPHA0–ALPHA8's functional acceptance is earned in the normal build. Keep G5 0.1 and G10 1.0 labels independent of the game alpha version. The fastest route to a trustworthy alpha is a small excellent loop, not declaring 100 planned milestones finished.
