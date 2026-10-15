# Laboratory slice v1: Rime Infusion (Phase B, first playable Frostfire invention)

Status: implemented on branch `feature/lab-frostfire-mutation` (local, not pushed).
Design authority: the Game Design & Spellcraft handover of 2026-10-15 (§5 to §9, §15 Phase B, §16, §17).
North star: the player becomes *the mage who knows how to create the spell*, not merely the one who owns it.

## 1. What the player does

1. Finish the First Hunt and bring back a **Rime Heart** from Rimeclaw. The Forge then shows a **Laboratory** entry.
2. Run the **experiments**. Each one asks a single question and is presented as icon + icon → result.
   - **Examine the Rime Heart**: rime preserves cold.
   - **Infuse Fire Bolt with rime**: an *instructive failure*. Fire melts the rime, and the finding is that cold must land first.
   - **Freeze, then ignite**: fire shatters ice.
   - **Quench Fire Bolt in rime**: an optional dead end that records an incompatibility.

   Experiments never consume specimens. Repeating one teaches nothing new and shows **ALREADY RECORDED**.
3. With all three required findings, **stabilize** the mutation. This needs an explicit consent checkbox, which shows the exact spend: 1 Rime Heart. Stabilizing then always succeeds.
4. Unlock the **Rimebrand socket** in the Arcane Atlas. It is node `hybrid-fire-frost-2`, five nodes from the Wyrmheart. Then **equip** Rime Infusion.
5. Start a hunt and pick Fire Bolt.
   - Primary choice shows a **RIME INFUSION** badge.
   - On commit, a "MUTATION AWAKENED" moment appears.
   - Fire Bolt freezes and burns from the first cast, and Frozen targets shatter (Frostfire).
6. The run summary shows a **FIELD NOTES** chip with the reactions that were triggered.

## 2. Existing systems reused, not duplicated

| Need | Existing system used | New code |
|---|---|---|
| Frost and Fire reaction | `Frostfire` synergy and its `Frozen` interaction rule | none |
| Catalyst spell | `FrostShard` rank 1, learned as a passive catalyst | `ApplyPreparedLaboratoryMutation` |
| Trade-off | `BuildModifiers` (PercentAdd on `Damage`) | one modifier profile, −10% |
| Socket | Arcane Web node selection | `LaboratoryCatalog.Socket*` and `ReconcileSocket` |
| Specimen | Essence vault (`DragonEssenceId.RimeHeart`) | consumed once, on consent only |

**One primary cast.** Only `build.Spells.ActiveSpell` auto-casts. FrostShard rank 1 is learned exactly the way the legacy synergy acquisition path learns it, so it adds no attack stream.

**No stacking.** The mutation selects Frostfire before the first level-up. `CanAcquireCombination` therefore hides the `synergy:Frostfire` offer, and exactly one Frozen interaction rule applies. A test covers this.

**Trade-off.** Damage ratio versus the legacy Frostfire path is exactly 0.9 (tested). The mutation trades raw damage for having the reaction from the first cast.

**Dormancy.** If the primary is not Fire Bolt, the mutation stays dormant and changes nothing.

## 3. Contracts

- **Domain:** `Wyrmforge.Domain.Progression.Laboratory`.
  - `LaboratoryIds`: experiment, observation and mutation enums.
  - `LaboratoryCatalog`: static and data-like definitions.
  - `LaboratoryState`: aggregate methods `Availability`, `Run`, `Stabilize(id, vault, consent)`, `Equip`, `Unequip`, `ReconcileSocket`, `PreparedFor`, `RecordFieldTest`, `ToSave` and `Restore`.
- **Application:**
  - `RunSimulation.Laboratory.cs` adds `PrepareLaboratoryMutation` before primary commit, and `ActiveLaboratoryMutation` and `ReactionsTriggered` on the summary.
  - `RunSimulationFactory` takes an optional `preparedMutation`.
- **Presentation:**
  - `Home.Laboratory.cs` handles load, save and handlers.
  - `LaboratoryView` is the screen, reached from the Forge.
  - `ArenaView` shows the badge and moment; `RunSummaryOverlay` shows the field notes.

## 4. Persistence and migration

- New localStorage key `wyrmforge.laboratory.v1`. Its value is the `LaboratorySave` record:
  - `Version`
  - `Observations[]`
  - `Mutations[]`
  - `Equipped?`
  - `FieldTests`
  - `FieldReactions`
- Existing keys (`wyrmforge.arcaneBuild.v1`, `wyrmforge.essenceVault`, and the others) are untouched. Old profiles simply start with an empty Laboratory.
- On restore, unknown ids are dropped, and `Equipped` is only restored if that mutation is stabilized.
- When the stabilizer consumes the Rime Heart, the Laboratory is saved *before* the vault. If an interruption happens between the two writes, the worst case is a free recipe, never a lost specimen.
- After a save, or when the Arcane selection changes, `ReconcileSocket` unequips the mutation if the socket path is lost. The recipe is kept and a notice is shown.

## 5. Acceptance coverage (handover §15 Phase B and §16)

| Requirement | Evidence |
|---|---|
| Original Fire Bolt still works without the Laboratory | Application tests: dormant and unprepared paths |
| No stacking with legacy Frostfire | Application test: one Frozen rule; synergy offer hidden |
| A failed experiment records a specific observation; repeats don't farm | Domain tests: `Run` returns `Novel=false` |
| No double spend; exact spend previewed | Domain test: consent required, 1 Rime Heart; capture shows the vault going from 3 to 2 |
| Losing the Web path unsets the socket but keeps the recipe | Domain test: `ReconcileSocket` |
| A failed hunt doesn't erase research | Research is stored separately from runs; a field test is recorded on game over |
| Deterministic, with reactions that really fire | Seeded self-play hunt test asserts reactions > 0 |
| Save and load | Domain round-trip test; browser reload check showing "Mutation equipped" |
| Mobile clarity of primary, mutation, trade-off and next action | 390×844 captures of the Laboratory and primary-choice badge |

## 6. Known side effects (accepted for v1, review later)

- The mutation satisfies the "Bind a synergy" quest, because Frostfire is genuinely bound.
- Frostfire adds Fire/Frost resonance and marks Frostfire as discovered in the Codex.
- An abandoned hunt still counts as a field test.

## 7. Open decisions (handover §17; product-owner sign-off needed)

- The −10% damage trade-off, which is a placeholder.
- The stabilizer cost of 1 Rime Heart. Its availability is gated by Rimeclaw hunts, which gates Laboratory access.
- Experiments are free. A common preparation currency is not introduced yet.
- Socket placement on `hybrid-fire-frost-2`, and the names "Rime Infusion" and "Rimebrand".
- There are no animated previews yet. The preview is static icons plus the in-hunt moment.
- Online, anti-cheat and ranked eligibility are deferred. Laboratory data is local and unverified.

## 8. Phase C.1 follow-up: Storm Infusion, research leads and post-run prompts

Status: implemented on the same branch.

**Second mutation: Storm Infusion** (Arcane Orb × Storm Heart → existing `ArcaneConduit` synergy).
- Stormglass (Storm × Frost) was rejected: the Arcane Web has no Frost–Storm bridge, and its specimen would again come from Rimeclaw.
- Experiments: *Examine the Storm Heart* (insight), *Charge Arcane Orb* (instructive failure: charge bleeds away), *Ground the orb* (dead end), *Count the impacts* (insight: every 4th impact discharges).
- Stabilizer: 1 Storm Heart, on consent. Socket: **Charged Focus** on `hybrid-storm-arcane-2` (Storm–Arcane bridge).
- Trade-off: casts 10% slower (`StormInfusionCastIntervalTradeOff`). Same no-stacking rule: the legacy `synergy:ArcaneConduit` offer is hidden.
- Conduit discharges now count as reactions (`RecordReaction()`), so field notes report them.
- The catalog is generalised: experiments, specimens, glyphs, awakened text and reaction nouns are per mutation. `LaboratoryView` has a tab per mutation.

**Research leads (guaranteed specimen access).**
- `LaboratoryState.Track` sets a lead while a mutation still needs its specimen. `LeadWyrm` returns the specimen Wyrm; `ReconcileLead` clears the lead once the specimen is held or the recipe is stabilized.
- In the hunt, `ResolveDragonAttraction` forces the lead Wyrm, except during the First Hunt or a due Ascendant rite, and only while that Wyrm is not yet defeated.
- The arena shows the tracked specimen; the harvest overlay highlights it with a "LABORATORY SPECIMEN" tag but never preselects it.
- Persisted as the optional `Tracked` field of `LaboratorySave`; older saves load with no lead.

**Advisor and post-run prompt.**
- `LaboratoryAdvisor.Next()` picks one next step in priority order: stabilize → novel experiment → equip (or unlock socket) → hunt specimen. The tracked mutation goes first.
- The Forge's Laboratory status line and the run summary's research-prompt button both use it. The button opens the Laboratory on the relevant mutation's tab.

**Tuning:** self-play measurements and proposals are in [`laboratory-tuning-v1.md`](laboratory-tuning-v1.md). No constants were changed.

## 9. Next slices

1. ~~**Phase C.1:** a second mutation on another existing synergy.~~ Done as Storm Infusion (§8).
2. **Phase C.2:** a preparation economy, meaning common reagents from non-Wyrm rares spent on experiments, shown with an exact spend preview. Forge and Laboratory must never consume the same Essence at the same time.
3. **Phase C.3:** a two-socket limit with path prerequisites, saved loadouts and free respec. Event-budget tests for reaction chains are already done (blueprint slice).
4. Animated reaction previews that match the deterministic rules. (Post-run research prompts are done, §8.)
5. ~~**Blueprint and compatibility contracts.**~~ Done. Mutations are typed blueprints with tags, a complexity budget and a reaction-event budget; see [`spell-blueprint-contracts-v1.md`](spell-blueprint-contracts-v1.md).
