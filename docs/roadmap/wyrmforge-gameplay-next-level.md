# WyrmForge — Gameplay Next Level (roadmap)

Status: proposal, written after the art/UX pass on branch `art/runtime-pixel-pipeline-v1`.
Companion evidence: [`docs/art/asset-and-screen-audit.md`](../art/asset-and-screen-audit.md), screenshots in `docs/art/screens/`.

Legend:

- **[E] Evidence:** verified in code, tests or captures in this repo.
- **[A] Analysis:** reasoning from evidence.
- **[S] Speculation / hypothesis:** must be validated by playtest or self-play before being treated as true.

All source paths below are relative to `src/`.

> **Direction update (2026-10-15, Spellcraft handover).** The product owner approved the Game Design & Spellcraft handover as the agreed direction. Its north star: the player becomes *the mage who knows how to create the spell*. As a result:
>
> - The Laboratory is no longer deferred. It is the spine of progression: **Laboratory × Arcane Web × Hunt**.
> - **Phase B, the first playable Frostfire invention, is implemented.** See [`docs/design/laboratory-frostfire-slice-v1.md`](../design/laboratory-frostfire-slice-v1.md). It is the researched mutation *Rime Infusion*, which reuses the existing Frostfire rule, with fail-forward experiments, consented specimen spend and a Web socket.
> - M1 to M6 stay valid as supporting milestones. They are now ordered after the Laboratory phases they feed (see §11).

---

## 1. Current-state audit

### 1.1 What exists [E]

| Area | Implementation | Pointer |
|---|---|---|
| Hub → map → run | Forge hub, Wyrmrealm map with combat/reward/relic/refuge/dragon nodes | `Wyrmforge.Application/Runs/Navigation/WyrmrealmRouteGenerator.cs`, `Wyrmforge.Presentation.Web/Features/Map/WyrmrealmMapView.razor` |
| Simulation | Deterministic `RunSimulation` partials: Movement, Spells, Enemies, Hazards, Environment, Content, TrailExit, Extraction, Dragons, Resonance | `Wyrmforge.Application/Runs/Simulation/**` |
| Primary spell | One committed primary out of 8 (2 per school: Arcane, Fire, Frost, Storm) | `Wyrmforge.Domain/Spells/SpellCatalog.cs` |
| Surge | Every 4th cast deals 1.65× damage | `Wyrmforge.Domain/Spells/FocusedSurgeProfile.cs` |
| Level-ups | Upgrade offers, 24 evolutions (6 per school), refinements | `Wyrmforge.Application/Runs/LevelUp/LevelChoiceService.cs`, `Wyrmforge.Domain/Spells/Evolutions/SpellEvolutionCatalog.cs`, `Wyrmforge.Domain/Progression/Refinements/RunRefinementCatalog.cs` |
| Synergies | 3 synergies: Frostfire, Stormglass, Arcane Conduit | `Wyrmforge.Domain/Spells/Synergies/SynergyCatalog.cs` |
| Resonance | Threshold rewards for school commitment | `Wyrmforge.Application/Runs/Resonance/ResonanceThresholdCatalog.cs` |
| Enemies | 4 kinds: Chaser and Skitter (Pressure), RiftStalker (Ambusher), Brute (Pressure, depth ≥ 2) | `Wyrmforge.Domain/Combat/Enemies/EnemyCatalog.cs` |
| Pressure | Stage bands: 1–2 Skirmish, 3–4 Horde, 5–6 Ambush, 7+ Heavy assault | `Wyrmforge.Application/Runs/Navigation/WyrmrealmStageCatalog.cs`, `Wyrmforge.Application/Runs/Simulation/Enemies/EncounterDirector.cs` |
| Objectives | **Kill quotas only** (Swarm / StalkerPressure / default), scaled by depth | `Wyrmforge.Application/Runs/Navigation/WyrmrealmEncounterObjectiveCatalog.cs` |
| Wyrms | Ashfang (fire), Stormcoil (storm), Rimeclaw (frost), Voidweaver (arcane); harvest, then evacuation | `Wyrmforge.Domain/Combat/Dragons/DragonCatalog.cs`, `Wyrmforge.Application/Runs/Simulation/Dragons/RunSimulation.Dragons.cs` |
| Extraction | Refuge: mend, bank Essence, descend or end. Outcomes: extraction, defeat or abandon. | `RefugeOverlay`, `Wyrmforge.Presentation.Web/Features/RunResults/RunSummaryOverlay.razor` |
| Meta | Great Hunt, Ascendant rites, Codex, mastery, leaderboard | `Wyrmforge.Domain/Progression/GreatHunt/*` |
| Onboarding | Tutorial first hunt. Atlas and Codex unlock after 1 hunt, Leaderboard after 2. | `Wyrmforge.Domain/Progression/Onboarding/FirstHuntProgress.cs` |
| Self-play | Heuristic agent and driver for balance runs | `Wyrmforge.Application/Runs/SelfPlay/RunSelfPlayDriver.cs` |
| Feedback | Optional in-game playtest form: enjoyment, clarity, replay intent, focus area, free text | `Wyrmforge.Presentation.Web/Features/Playtesting/PlaytestFeedbackPanel.razor` |
| Art | Code-authored pixel atlases (189 frames, 27 UI icons) wired into the arena and UI | `tools/art/`, `wwwroot/art/`, `Shared/GameIcon.razor` |

### 1.2 Not implemented [E]

- Elder Wyrms.
- Arcane Laboratory (#108).
- A real Hall of Fame (#66).
- A canonical biome catalog. Valley, ash and ridge exist in presentation code only.
- Spell, impact and status VFX sprites. The procedural `wwwroot/js/arena-spell-vfx.js` is still in use.
- Pixel-art map node badges.

### 1.3 Known issues [E]

- **#117:** The Hunter-XP point and the per-hunt point are both granted and may stack. Whether that is intended is unresolved. Do not add another Arcane-point grant path until it is settled.
- **#60:** Cloudflare 403 in CI.
- **#55:** Native mobile.
- **Repeated level-up hint:** "A small {School} trail reward…" repeats identically on every card. See `docs/art/screens/after/*06*`.

### 1.4 Diagnosis

- **[A] The core action is the strongest part.** The deterministic simulation, committed primary, Surge and pressure director give a solid action core.
- **[A] The weakest parts are the conversions:**
  - **Understand:** the player has to guess what an upgrade leads to.
  - **Choose:** card copy is repetitive, and recipes are invisible.
  - **Want another hunt:** the summary suggests no next step.
- **[A] Encounters are mechanically homogeneous.** Every objective is "kill N", and three of the four enemies have the Pressure role. Stage bands change density, not the problem being solved.
- **[S]** The archived 0.0.83 study (`docs/playtesting/archive/player-study-0.0.83.md`) suggests clarity complaints. It is a hypothesis only and has not been re-validated since the art pass.

---

## 2. Design pillars

1. **One spell, mastered.** The committed primary is the player's identity. Every system deepens it and never turns it into a weapon salad.
2. **Read before you react.** Every threat is telegraphed by silhouette, colour and timing before it can hurt, and stays legible on a phone.
3. **Visible recipes, earned surprises.** Evolutions and synergies are discoverable, then shown openly. Mystery creates a moment once; after that it becomes information.
4. **Greed versus extraction.** Every Refuge and Wyrm harvest is a real bet: bank now or push deeper.
5. **Respect the player's time.** No compulsion loops, timers or currency fog (§10).

### 30-second player promise

> *"Pick one school of magic and one spell. Hunt through the Wyrmrealm, bending that spell into something only you built. Corner a Wyrm, take its heart, and get out alive — or push one ridge further."*

---

## 3. Core loop and weakest conversions

```
discover ──► understand ──► choose ──► fight ──► earn ──► evolve ──► want another hunt
  (hub)    (cards/codex)  (level-up)  (arena)  (essence,  (forge,      (summary,
                                                harvest)   mastery)     next goal)
```

| Conversion | Current state | Strength | Fixed by |
|---|---|---|---|
| discover → understand | The Codex is locked until hunt 1 is complete. Cards describe stats, not outcomes. | Weak | M2, M3 |
| understand → choose | Recipes are invisible before they trigger, and card hints are duplicated | **Weakest** | M2 |
| choose → fight | Choices apply immediately, but the visual difference between schools is low | Medium | M1 |
| fight → earn | Kill quota, then reward. Clear but monotone. | Medium | M4 |
| earn → evolve | Forge, mastery and Great Hunt exist | Medium-strong | M6 |
| evolve → want another hunt | The summary lists results with no suggested next goal | **Weak** | M3 |

---

## 4. Opportunity matrix

Each criterion is scored 1–5, where 5 is best. For complexity and risk, 5 means simple or safe.

| Opportunity | Benefit | Simplicity | Tech safety | Dependencies | Freshness | Scalability | Testability | Pillar fit | Σ |
|---|---|---|---|---|---|---|---|---|---|
| Visible evolution/synergy recipes (Frostfire first) | 5 | 4 | 5 | `SynergyCatalog`, `LevelChoiceService` | 4 | 5 | 5 | 1, 3 | 28 |
| Card-hint dedupe and outcome-first card copy | 4 | 5 | 5 | `LevelChoicePresentation` | 2 | 4 | 5 | 2 | 25 |
| School-distinct spell/impact/status sprites and telegraphs | 5 | 3 | 4 | Art pipeline (done) | 3 | 5 | 4 | 1, 2 | 24 |
| Next-goal summary and consented funnel signals | 4 | 4 | 4 | Playtest panel, #117 | 3 | 4 | 4 | 5 | 23 |
| Objective variety (defend, hunt the marked, survive the surge) | 5 | 2 | 3 | Encounter director | 5 | 4 | 4 | 4 | 22 |
| Biome catalog and enemy ecologies | 4 | 2 | 3 | Objectives, art | 4 | 5 | 4 | 2, 4 | 21 |
| Wyrm phase escalation | 5 | 2 | 3 | VFX sprites | 4 | 3 | 4 | 2, 4 | 21 |
| Arcane Laboratory (fixed recipes, #108) | 4 | 1 | 2 | Recipe UI, mastery | 4 | 3 | 3 | 3 | 16 |
| Elder Wyrms | 3 | 1 | 2 | Wyrm phases | 4 | 2 | 3 | 4 | 15 |
| Secondary weapons / multi-spell loadouts | 2 | 1 | 2 | Everything | 2 | 2 | 2 | **violates 1** | rejected |

---

## 5. Milestones (vertical slices)

Every milestone must meet these shared gates:

- **Determinism:** the simulation stays deterministic, meaning seeded and with identical self-play replays.
- **Tests:** `dotnet test`, the browser tests and `node --test tests/javascript/*.test.mjs` all pass.
- **Visuals:** checked at 390 × 844 using `tools/art/capture-screens.mjs`, plus real iPhone Safari before merge.

### M1: School identity and readable combat feedback

**Player outcome:** From a screenshot alone, the player can tell which school is in play and what will hit them next.

**Hypothesis [S]:** Distinct projectile, impact and status art raises the clarity score in the playtest form. It also lowers the share of contact damage taken within 250 ms of an enemy wind-up.

**Files:**
- New `tools/art/sprites/vfx.mjs`, containing projectiles, impacts and status overlays for burn, chill, frozen, shock and mark.
- `wwwroot/js/arena-spell-vfx.js`: draw from the atlas, keeping the procedural code as a fallback.
- `arena-enemy-art.js`: wind-up tells.
- `Features/LevelUp/LevelChoicePresentation.cs`: hint dedupe.

**Dependencies:** The art pipeline (done).

**Out of scope:** New spells and balance changes.

**Acceptance:**
- All 8 spells have a unique projectile frame set and a unique impact frame set.
- Statuses are readable at 1× on a 390 px viewport.
- Brute and RiftStalker show a wind-up of at least 300 ms.
- The trail hint appears at most once per offer.
- `build-art.mjs --check` passes.

**Tests:**
- Manifest coverage: every spell has `vfx.<spell>.*` frames.
- A presentation test for the hint dedupe.
- Refreshed screenshot evidence.

**Risks:** Overdraw on low-end phones. Use a fixed particle budget.

**Effort:** M (about 1 week).

**Prerequisites:** None.

**Demo:** Side-by-side captures of a Fire Bolt hunt and a Frost Shard hunt at stage 5.

### M2: Visible recipes, Frostfire first

**Player outcome:** A Fire Bolt player offered a Frost upgrade sees *"1 of 2 toward **Frostfire**: frozen targets shatter for 2× splash"*. When the recipe completes, a short reveal plays and the recipe is recorded in the Codex.

**Hypothesis [S]:** Showing the recipe raises the rate of picks that advance a synergy, and hunts that reach a synergy show higher replay intent. Test with a self-play baseline and opt-in playtests.

**Files:**
- `Wyrmforge.Domain/Spells/Synergies/SynergyCatalog.cs`: expose recipe progress as a pure function.
- `LevelChoiceService.cs`: annotate offers with progress.
- `LevelChoicePresentation.cs`.
- `LevelUpOverlay.razor`: progress pips and a `<GameIcon>`.
- Codex view: a recipe page.

**Dependencies:** None. M1 helps but is not required.

**Out of scope:** New synergies. Stormglass and Arcane Conduit follow the same pattern once this ships.

**Acceptance:**
- Offers that advance a recipe show its name, icon and progress.
- The reveal can be skipped and lasts at most 1.2 s.
- The Codex lists discovered recipes; undiscovered ones show as silhouettes with school hints.
- The phone card stays within the compact grid.

**Tests:**
- Domain tests for recipe progress.
- An Application test checking that offers carry the progress annotation.
- A browser test for a seeded Frostfire hint.

**Risks:** Players may follow the recipe instead of their own choices. Mitigate by showing a hint only once at least one ingredient is owned.

**Effort:** S–M.

**Demo:** On a fixed seed: take Fire Bolt, see "1 of 2", reach Frostfire, watch the reveal, open the Codex.

### M3: First-session funnel, next-goal summary and consented signals

**Player outcome:** Each summary ends with one concrete, personal suggestion, such as "You were 1 pick from Frostfire" or "Rimeclaw's ridge rewards Fire". The Codex teaser is available from hunt #1.

**Hypothesis [S]:** A specific next goal raises the replay-intent answer in the existing form.

**Files:**
- `RunSummaryOverlay.razor`.
- New `Wyrmforge.Application/Runs/Results/NextGoalAdvisor.cs`, a pure function of the run record.
- `FirstHuntProgress.cs`.
- `PlaytestFeedbackPanel.razor`: add an optional "what would you try next?" field.

**Dependencies:** Settle #117 first, so goals never point at mis-credited Arcane points.

**Out of scope:** Remote analytics (§9).

**Acceptance:**
- The advisor is deterministic.
- It never suggests something the player cannot access.
- The summary fits 390 × 844 with the primary action visible.

**Tests:**
- Advisor unit tests across representative run records.
- A browser test for the summary.

**Risks:** The advice may feel naggy. Limit it to one line, with no badges or timers.

**Effort:** S.

**Demo:** Lose at stage 4 with Frost. The summary says: "Ice Lance pierces — try it against Horde stages."

### M4: Objectives beyond kill quotas

**Player outcome:** Stages have distinct jobs:
- **Defend the Ward:** hold a ward stone for N seconds.
- **Hunt the Marked:** a fleeing elite calls packs.
- **Survive the Surge:** a timed density spike with a guaranteed cache.

**Hypothesis [S]:** Fewer abandons at stages 3–6.

**Files:**
- `WyrmrealmEncounterObjectiveCatalog.cs`: replace `int KillsRequired` with an `EncounterObjective` record.
- `EncounterDirector.cs`.
- `RunSimulation.Content.cs`.
- The ArenaView HUD.
- Map node badges as new icons in `tools/art/sprites/ui.mjs`.

**Dependencies:** M1 (telegraph language).

**Out of scope:** Escort missions and any new pathfinding.

**Acceptance:**
- Objectives are seeded and deterministic.
- Self-play completes each objective type at least 90% of the time at depth 1.
- The HUD shows objective progress with an icon.

**Tests:**
- Simulation tests per objective.
- A self-play completion-rate test.

**Risks:** `HeuristicRunAgent` needs objective awareness.

**Effort:** L.

**Demo:** A seed with all three objective types in the first 5 stages.

### M5: Canonical biomes and enemy ecologies

**Player outcome:** Each biome has its own enemy mix and hazard:
- **Valley:** Chaser and Skitter swarms.
- **Ash:** Brutes and burning ground; Frost counters it.
- **Ridge:** RiftStalker ambushes and wind that pushes projectiles; Storm counters it.

**Files:**
- New `Wyrmforge.Domain/World/BiomeCatalog.cs`.
- `EnemyEncounterComposition.cs`.
- `RunSimulation.Hazards.cs`.
- The art pipeline: one new enemy per biome, using new roles from §7.

**Acceptance:**
- Biomes are data-driven, and each lists its enemies, hazard and counter-schools.
- The Codex has ecology pages.

**Effort:** L.

**Prerequisites:** M4.

**Risks:** Content load. Mitigate with the pipeline in §8.

### M6: Wyrm escalation and mastery depth

**Player outcome:** Each Wyrm has 2–3 phases with readable tells. Per-spell mastery unlocks cosmetic staff variants and one sidegrade evolution each.

**Files:**
- `RunSimulation.Dragons.cs`.
- `Wyrmforge.Application/Runs/Hunts/DragonHuntSignaturePlanner.cs`.
- `DragonCatalog.cs`.
- Mastery in `Wyrmforge.Domain/Progression`.

**Acceptance:**
- Phase transitions are deterministic and telegraphed for at least 600 ms.
- Self-play wins against each Wyrm at depth 1 fall within an agreed band (proposal: 55–75%).

**Effort:** L.

**Prerequisites:** M1 and M4.

### M7: Arcane Laboratory (#108), promoted to M0 and in progress

**Status:** Superseded by the Spellcraft handover. **Phase B is done.** The design is in [`laboratory-frostfire-slice-v1.md`](../design/laboratory-frostfire-slice-v1.md), and the slice is on branch `feature/lab-frostfire-mutation`.

**What changed from the original plan:**
- Recipes are researched through fail-forward experiments, not only found.
- A mutation is equipped through an Arcane Web socket.
- Mutations reuse existing synergy rules, so a legacy effect and its new counterpart never stack.

**Complexity cap (still in force):**
- No free-form crafting.
- No random affixes.
- One primary cast.
- Every specimen spend is consented and previewed.

**Pillar-5 risk (a second economy):** mitigated in v1. Experiments are free, and the only cost is one consented Rime Heart at stabilization. A preparation currency is an open decision for Phase C.2.

**C.1 done:** *Storm Infusion* (Arcane Orb × Storm Heart → Arcane Conduit), research leads that guarantee specimen access, a Laboratory advisor and a post-run research prompt. Self-play tuning proposals are in [`laboratory-tuning-v1.md`](../design/laboratory-tuning-v1.md).

**Blueprint contracts done:** mutations are typed `SpellBlueprint`s with structural tags and a complexity budget, validated by a versioned `BlueprintRuleset`. Sockets accept tags instead of spell ids, and a per-step reaction-event budget caps secondary events. See [`spell-blueprint-contracts-v1.md`](../design/spell-blueprint-contracts-v1.md).

**C.3 done:** up to two mutations in generic, element-tagged bridge sockets (only the primary's one wakes), three saved hunt loadouts, and loadout apply as a free respec. See [`laboratory-sockets-loadouts-v1.md`](../design/laboratory-sockets-loadouts-v1.md).

**Owner decisions applied:** trade-offs raised to 15%, research leads lapse after 3 missed hunts, loadouts also remember the primary and the offering ([`laboratory-tuning-v1.md`](../design/laboratory-tuning-v1.md) §5).

**Next:**
- **Arena roster (pulled forward by the product owner):** the first-hunt enemies, habitats, elites and the Reliquary, per the brief below.
- **C.2:** a preparation economy. Its reagents come from non-Wyrm rares, elites and the Reliquary, so it follows the arena roster.
- After that: animated previews.

### Deferred to the story phase: arena redesign (product-owner request)

The arena is bland, every map looks the same, and the maps look poor. Enemies, the mage and spell effects are fine. **Redo the arena completely**, but only when the story is implemented (Phase D, Chronicle), so the story sets the art direction for each location. Don't polish arena tiles before then.

**Brief for that refactor:** `user_handover_files/WyrmForge_First_Hunt_Encounter_Design.md` and its ten concept sheets in `user_handover_files/concepts/` (reference art only, never runtime sprites). They define the enemies for the tutorial, the story and the first area hunt:
- Commons: Hollow, Ashling, Ash Priest, Ash Slinger, Mire Hound, Penitent, Drowned Wraith.
- Set pieces: the Bell Warden (pre-Wyrm), the ultra-rare Reliquary miniboss, and Ashfang as the climax.
- Habitat-driven packs, per-node elite modifiers, and the doc's seven-step vertical implementation order.

**Update:** the product owner pulled the roster forward. The mechanics (habitats, enemies, packs, elites, Reliquary, Bell Warden) and their pixel actors are now active work; the full tile/location art redesign still waits for the story phase. The current mobs are replaced by this roster. Elites and the Reliquary are also the intended source of non-Wyrm Laboratory materials (Spellcraft handover §8).

### Elder Wyrms (after M6)

A Great Hunt capstone variant of an existing Wyrm with one extra phase. No new species until the phase system is proven.

---

## 6. Progression by hunt count

| Hunt | Player state | Intended feeling | Systems engaged |
|---|---|---|---|
| **#1** | Tutorial, one primary, short route | "One spell, and it gets stronger." | Committed primary, Surge, 2–3 level-ups, first Refuge choice, one Codex recipe silhouette (M2/M3) |
| **#5** | Has tried 2–3 schools and seen 1 Wyrm | "I know what I want to build next." | Visible recipes, first synergy (most likely Frostfire), next-goal suggestions, Atlas and Codex open |
| **#20** | Has seen all 8 spells and harvested every Wyrm | "I'm choosing the risk, not just the build." | Objective variety, biome counter-picks, Great Hunt, mastery tracks, early Ascendant rites |
| **#100** | Mastery on favourite spells; pushing depth | "I'm writing my own challenge." | Opt-in Ascendant rites (Pact-of-Punishment style), Elder Wyrms, Laboratory recipes, Hall of Fame (#66) |

---

## 7. System plans

- **One-primary identity:** Never add secondary weapons. Depth comes from evolutions, refinements, synergies driven by upgrade ingredients, and mastery. Before extending the ingredient model, confirm in `SynergyCatalog` exactly how Frostfire's Fire Bolt + Frost Shard condition is satisfied.
- **First genuine Fire/Frost synergy:**
  - Frostfire exists, but players cannot see it coming.
  - M2 makes it the reference implementation of visible recipes.
  - M1 gives shatter its own impact frames so the freeze → shatter payoff is the visual peak of a hunt.
- **School distinctness:** Each school owns one verb:
  - **Fire:** burn and area.
  - **Frost:** control and shatter.
  - **Storm:** chain and multi-target.
  - **Arcane:** precision and resonance.

  Biome hazards (M5) and objectives (M4) reward different verbs, so route choice matters.
- **Mastery:** Per spell and horizontal. It grants cosmetics and sidegrades, never raw power.
- **Telegraphs:** One shared language:
  - Red ground decals mean damage; cyan means control.
  - Wind-ups last at least 300 ms for enemies and 600 ms for Wyrms.
  - Telegraphs are never drawn under the lighting layer.
- **Enemy ecologies:**
  - Existing roles: Pressure and Ambusher.
  - New roles: Bulwark, Caller and Artillery.
  - Each biome uses 3 roles. Add roles before variants.
- **Objectives:** Every objective must be solvable by every school, with some schools better at it (M4).
- **Laboratory:** Deferred (M7).

---

## 8. Content pipeline

```
catalog record (Domain) ──► presentation text/glyph (Application) ──► GameIconMap (Presentation)
sprite module (tools/art/sprites/*.mjs) ──► build-art.mjs ──► wwwroot/art/{*.png, manifest.json, icons.css}
guards: tests/javascript/art-pipeline.test.mjs (glyph & id coverage), Domain catalog invariants, build-art --check
```

To add a spell, enemy, Wyrm or icon:

1. Add the catalog entry.
2. Add the sprite frames.
3. Run `node tools/art/build-art.mjs`.
4. Map the glyph in `Shared/GameIconMap.cs`. The coverage test fails until every catalog glyph has a mapped icon.

**CI (to do):** Add `node tools/art/build-art.mjs --check` and `node --test tests/javascript/*.test.mjs` to the workflow. Watch for #60.

**Determinism:** The art generator is seeded and its output is byte-exact. `.gitattributes` marks `wwwroot/art/**` as `-text`.

---

## 9. Playtest and measurement plan

**Instruments:**
- The existing optional feedback form.
- Deterministic self-play for balance.
- Local-only run records.

**Funnel signals** (local; exported only when the player chooses to):
- Hunt #1 started, then completed, then hunt #2 started.
- Level-up time-to-pick.
- Whether a synergy was reached.
- The stage at which the player abandoned.
- The ratio of extractions to defeats.

**Guardrails:**
- Median hunt length stays between 8 and 15 minutes.
- The clarity score must not drop.
- p95 frame time is at most 20 ms on the phone profile.
- Self-play replays of a given seed stay identical.

**Cadence:**
- Each milestone is followed by 5–10 consented players.
- Compare results with the previous milestone's answers.
- Treat results as directional, not statistically significant.

---

## 10. Ethics: what we will not build

These rules are informed by [Behavioral Game Design (Hopson)](https://www.gamedeveloper.com/design/behavioral-game-design) and by [F2P monetization tricks (Shokrizade)](https://www.gamedeveloper.com/business/the-top-f2p-monetization-tricks), which serves as a do-not-do list. See also [dark patterns](https://en.wikipedia.org/wiki/Dark_pattern) and [loot boxes](https://en.wikipedia.org/wiki/Loot_box).

- No daily-login rewards, streaks, energy systems or fear-of-missing-out (FOMO) timers.
- No premium or obfuscating currencies, loot boxes or randomised paid rewards.
- No variable-ratio schedules designed to extend sessions. Drops stay legible and bounded.
- Playtest signals are opt-in, all answers are optional, and nothing is sent without explicit action.
- Accessibility: a God-Mode-style assist in the style of Hades is a candidate after M3. Extra difficulty stays opt-in (Ascendant rites).

---

## 11. Prioritisation

**Quick wins (days):**
- Card-hint dedupe.
- Settle #117.
- The `NextGoalAdvisor`.
- The Frostfire recipe hint.

**Structural (weeks):**
- The VFX atlas and telegraph language.
- `EncounterObjective`.
- `BiomeCatalog`.

**Laboratory track (top priority, per the Spellcraft handover §15):**
- Phase B: Rime Infusion. Done.
- C.1: a second mutation on an existing synergy. Done.
- Blueprint and compatibility contracts, with the reaction-event budget. Done.
- C.2: a preparation economy with exact spend preview (waits for elites/Reliquary from the arena refactor).
- C.3: two sockets, loadouts, free respec, and event-budget tests. Done.
- Phases D to G stay gated on product-owner scheduling: Chronicle/FLC, offline blueprints, the verified Conclave, and content delivery.
- Arena roster (enemies, habitats, elites, Reliquary): active, pulled forward. Step 1 of 7 (habitats, renamed roster, safe spawns) and step 2 (Hound pounce, Ash Slinger, new silhouettes and ground telegraphs) shipped; see `docs/design/arena-roster-v1.md`. Full arena tile redesign: still deferred to the story phase (M7 note).

**Deferred:**
- Elder Wyrms.
- Hall of Fame (#66).
- Native mobile (#55).

**Bad ideas (do not build):**
- Secondary weapons. They break pillar 1.
- Free-form Noita/Magicraft-style crafting. It is opaque on mobile.
- Uncapped stacking. Risk of Rain 2-style runaway trivialises Wyrms.
- Screen-filling particle chaos, a known readability pitfall of Vampire Survivors.
- Anything listed in §10.

### Top 3 immediate milestones and first coding actions

> Since the Spellcraft handover, **Laboratory Phase C.1 comes first**: add a second `LaboratoryMutationId` to `LaboratoryCatalog` with its experiments and socket, plus Domain and Application tests mirroring the Rime Infusion ones. The three milestones below follow it. M2's visible recipe hints now also teach Laboratory findings.

1. **M2: Visible recipes.** Highest Σ, lowest risk, and it fixes the weakest conversion.
   - Add `SynergyCatalog.Evaluate(RunBuildState)` returning per-synergy progress, with a Domain test for Fire Bolt + Frost Shard.
   - Add an optional `SynergyHint` to the offer model.
   - Render the hint in `LevelUpOverlay` with `<GameIcon>` and pips.
2. **M1: School identity and combat feedback.** It extends the pipeline that just shipped.
   - Create `tools/art/sprites/vfx.mjs` with Fire Bolt and Frost Shard frames, plus a `vfx` atlas in `build-art.mjs`.
   - Resolve frames in `arena-spell-vfx.js` through `art-atlas.js`, falling back to the procedural VFX.
   - Emit the school trail hint once per offer.
3. **M3: Next-goal summary.**
   - Write the combined integration test requested in #117 and decide the intended reward.
   - Create `NextGoalAdvisor` with 4 rules: near-synergy, unseen Wyrm, untried school, and deepest depth + 1.
   - Render the advisor line under the summary headline.

---

## 12. Reference games and transferable principles

| Game | Transferable principle | Pitfall to avoid | Source |
|---|---|---|---|
| Hades | Narrative meta progression, pick-3 boons, God Mode, opt-in Pact of Punishment | Static loadout across a hunt | [Wikipedia](https://en.wikipedia.org/wiki/Hades_(video_game)), [RPS](https://www.rockpapershotgun.com/how-supergiant-games-made-the-hacknslash-accessible-with-hades) |
| Diablo II | Rune words as discoverable fixed recipes; thematic skill trees | Rare-farming chase | [Wikipedia](https://en.wikipedia.org/wiki/Diablo_II:_Lord_of_Destruction) |
| Vampire Survivors | Telegraphed evolution recipes; unlocks as content; frictionless onboarding | Unreadable chaos on mobile | [Wikipedia](https://en.wikipedia.org/wiki/Vampire_Survivors), [Polygon](https://www.polygon.com/22905166/vampire-survivors-steam-indie-hit), [PC Gamer](https://www.pcgamer.com/vampire-survivors-creator-didnt-have-a-vision-when-he-started-making-the-game-that-allowed-him-to-quit-his-job/) |
| Risk of Rain 2 | Time-based difficulty clock; banking at checkpoints | Runaway stacking | [Wikipedia](https://en.wikipedia.org/wiki/Risk_of_Rain_2) |
| Noita | Separate container stats from spell content | Opaque self-damage | [Wikipedia](https://en.wikipedia.org/wiki/Noita_(video_game)) |
| Brotato | Wave → shop cadence; auto-aim with optional manual aim; mobile release | Needs distinct kits | [Wikipedia](https://en.wikipedia.org/wiki/Brotato), [RPS](https://www.rockpapershotgun.com/brotato-scratches-that-vampire-survivors-itch-faster-and-bloodier) |
| Wizard of Legend | Pre-run commitment; separate meta currency | — | [Wikipedia](https://en.wikipedia.org/wiki/Wizard_of_Legend) |
| Magicraft | Spell chaining | Expectations of a large content pool | [Wikipedia](https://en.wikipedia.org/wiki/Magicraft), [PC Gamer](https://www.pcgamer.com/games/roguelike/magicraft-is-like-brotato-mixed-with-hades-where-you-make-up-all-your-guns-as-you-go-along/) |

Also: [First-time user experience](https://en.wikipedia.org/wiki/First-time_user_experience).

GDC talks were considered but could not be verified, so they are not cited.
