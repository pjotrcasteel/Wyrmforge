# Wyrmforge P1c — playable Hunt entry and legacy-semantics audit

**5 November 2026 · Draft review for issue #473 · No merge / Pages deployment authorized.**

The normal Hunt entry contract is the **World Gate's selected lineage and tier**. The Arcane Nexus's two-tap Fireball material links enter through the same validated `HuntSelection`. **Great Hunt Ascendant Rites** and today's untiered Frost run remain real and intentionally supported. They are not the Fire Tier-II target. No save key, historical `SpellId`, quest ID, or existing leaderboard record is removed.

## Call-site reachability matrix

| Entry / event | Live call path | Classification / decision |
|---|---|---|
| Refuge Gate, including first-run onboarding | `CanonicalTownView.OnGate` → `ForgeView` Gate → `WorldGateView.BeginHuntAsync` → `Home.StartSelectedHuntAsync` → `BeginRunAsync(HuntSelection)` | **Canonical** Fire Tier I–III. Tier unlocks checked in UI and `Home`, `HuntSelection.Validate()` enforces authored content. |
| Arcane Nexus material source | `FireballRitualView.StartMaterialHuntAsync` → `ForgeView.OnStartHunt` → same `Home.StartSelectedHuntAsync` | **Canonical direct link**. Correct unlocked Fire tier; locked tier navigates to Gate. Does not bypass validation. |
| Settings → Rites & offerings, no Rite | `RunHubView.OpenWorldGateAsync` → `ForgeView.Navigate(Gate)` | **Redirected**. Previous `RunHubView.OnStart` ordinary Hunt shortcut no longer player-reachable; offerings still apply at start. |
| Settings → Rites & offerings, sealed Great Hunt Rite | `RunHubView.ToggleAscendantAsync` → `Home.SelectAscendant` → `Home.StartAscendantRiteAsync` → `BeginRunAsync(null, selectedRite)` | **Intentional compatible mode**. Requires a sealed, available Rite; separate button and explanatory copy. If selected region excludes the Wyrm, starts in Cinder Frontier. |
| World Gate Frost Tier I | `WorldGateView.BeginHuntAsync` → `SelectRegionAsync(Frost)` → `Home.StartLegacyExplorationAsync` → `BeginRunAsync(null)` | **Intentional compatibility**. Existing depth-based Frost progression while a Frost tiered ladder is not authored. Explicitly ignores any previously selected Great Hunt Rite. |
| Developer combat lab / seeded simulations | `RunSimulationFactory.CreateDevelopmentHunt` / `CreateDevelopmentEnemy` | **Test/developer only**; does not enter the player's saved tiered Hunt ladder. |
| Arena reward drafts | `RunSimulation.TryLevelUp` / trail reward → `LevelChoiceService.RollForProgression` → `RunSimulation.ApplyChoice` → `ApplyForProgression` | **Canonical runtime**. Temporary refinements and five-level runes/attunements; no new permanent spell ranks or evolved Fireball card. |
| Historical rank / evolution draft code | `LevelChoiceService.Roll`, `Apply`, `CreateEvolutionDraft`; retained domain SpellIds and saved evolution state | **Legacy API/tests/save compatibility**, not current runtime reward draft. Explicit `ApplyForProgression` rejects old rank/evolution cards even when a stale client submits them. Don't delete until migration policy exists. |
| Route and boss | `RunSimulation.SelectHunt` → authored Hunt map / target; `RunSimulation` resonance/attracted Wyrm for untiered run | **Two intentional rulesets**. Fire targets the selected tier's Wyrm; depth-based Frost retains dynamic Wyrm attraction. |
| Descend/checkpoint | `RunSimulation.UseCheckpointAction(Descend)` → `PushDeeper` / `RunDepthState`; `CanPushDeeper` checks `SelectedHunt is null` | **Compatibility only** for untiered Frost and Rites. Fire tiered runs do not descend after boss extraction. |
| Extract and finish | `RunSimulation.Tick` extraction → `SelectedHunt != null` ends tiered run; null Hunt enters checkpoint → `HandleGameOverAsync` | **Canonical by selected mode**. Result records exact `Hunt`, run depth, cargo and tier; `Home.RecordHuntClearedAsync` opens next tier only after real extracted victory. |
| Retry / replay seed | `RunSummaryOverlay.OnReplay` → `Home.ReplayRunAsync` → retains `Summary.Hunt` and seed | **Canonical replay/compatibility**. Fire tier identity survives replay, historic untiered summaries remain valid. |
| Quests/XP | `Home.HandleGameOverAsync` → `HuntQuestState.Record` and `CreditHunterExperience`; `HuntQuestsView` → `HuntQuestState.Claim` | **Global persisted progression**, not a new Hunt launcher. Existing quest IDs and claim histories remain stable. |

## Quest reachability and copy

| Quest | Live attainability | Treatment |
|---|---|---|
| Trails / rare trails / first Wyrm | Fire tiers and/or untiered Frost | Keep. |
| `wyrm-4` | Four Wyrm identities remain in the Cinder region's resonance influence; repeated defeats of one Wyrm do not count four | Keep, not the same as defeating Fire Tiers I–IV. |
| `essence-4` | Multiple distinct Essence choices for currently playable Wyrms | Keep; counts *types* secured, not Fire tier number. |
| `depth-2`, `depth-3` | Run Depth II/III via the untiered Frost path, never by choosing Fire Wyrm Tier II/III | Explicitly name **Run Depth** and Frost. Keep saved progress and XP. |
| `synergy-1` | Prepared legacy Research/Laboratory synergy can still exist; not a Fireball socket-count goal | Keep until research ownership changes; reevaluate in P2. |
| `evolution-1` | No newly offered current runtime evolution cards (`RollForProgression` excludes them) | **Hide from active quest offers**. Retain catalog ID and grant an old earned, unclaimed evolution credit; claimed legacy quest remains under Completed. |

## Regression conditions

- Unselected Rite preparation at 320px/390px routes to World Gate, never starts a Hunt.
- A selected, sealed Rite has a distinct `BEGIN ASCENDANT RITE` path; no false equivalence to Fire Tier II.
- Gate Fire Tier I–III / Nexus source links use exactly `StartSelectedHuntAsync(HuntSelection)`; no client-side tier unlock bypass.
- Gate Frost has an untiered run and cannot inherit a Rite selected before leaving Settings.
- Existing claim/save migration and daily XP/relic caches are not deleted; obsolete evolution claims remain redeemable if earned.
- Names in run result distinguish **Wyrm Tier** from **Run Depth**.

**Deferred, explicitly outside #473:** Frost tier ladder, replaying a preserved Rite across application restarts (no persisted mid-run state exists yet), balance/drop percentages, new quest sets, and deeper rework of legacy level-choice classes. All need separate approved gameplay work; this audit does not label them shipped.
