# Pyromancer v1 — ready-for-now acceptance checkpoint

Date: 23 October 2026. This is an **implementation/evidence checkpoint**, not an amendment of the canonical product roadmap. Check GitHub for changes after this date.

## Milestone evidence

| Milestone | State | Proof | Remaining acceptance |
| --- | --- | --- | --- |
| 1. Integrate and deploy Fire specialization | **Complete** | Consolidated PR #290 merged to `main`, version 0.0.177; all four PR CI workflows and post-merge deployment/balance/browser workflows succeeded | None for implementation |
| 2. Main Spell / Research / Arcane Web contract | **Implemented and tested** | Real Fireball core-level damage; equipment slots; researched mutations; learned Fire minors and major mutation-specific socket binding; combat modifier integration; deterministic C# tests | Confirm felt progression with player |
| 3. Saves and mobile browser safeguards | **Automated checks green** | Socket assignments and legacy saves, loadouts and Hunt snapshots tested; Chromium and WebKit checks green at Fire PR #290 | Physical iPhone touch/scroll/reload review |
| 4. Early/mid/advanced Fire combat balance | **First Wyrm-reaching study complete; larger sample pending** | Merged #305/#313 run four legal Fire builds using the same seeds and four agent styles; a 420-second study reached Wyrms in 29/32 runs | Complete expanded 128-run matched-seed study; review Wyrm time, survival, essence securing and cohort differences before any tuning |
| 5. Art, power feedback and mobile acceptance | **Human acceptance pending** | Web map has tiers, large asymmetric Fire branches and test-verified interaction | Compare 320/390px screenshots and test on iPhone: tier silhouettes, legibility, pan/zoom, major-socket interaction, actual combat power payoff |
| 6. Arcane Nexus school radiance | **Implemented, validated and deployed; physical visual acceptance pending** | PR #292 merged with green Validate/Chromium/WebKit; main subsequently deployed successfully at 0.0.179 | Verify the dome/portal glow, touch behavior and brightness progression visually on an iPhone |

## Fire-only power diagnostic

The opt-in `--fire-progression` mode runs four **legal** real-simulation builds on identical seeds and agent personalities:

- **Fresh Fireball:** core 1, no Web nodes, no equipped mutation
- **Mid Detonation:** core 3, legal Web route through Conflagration, Detonation equipped
- **Crown of Ash:** core 5, major Conflagration path, Detonation plus a compatible area-amplifier assignment
- **Heart of Furnace:** core 5, major Immolation path, Scorched Earth plus a compatible duration-amplifier assignment

Run locally using:

```bash
dotnet run --project src/Wyrmforge.BalanceLab/Wyrmforge.BalanceLab.csproj -c Release -- --fire-progression --runs-per-combination 10 --max-seconds 420 --output artifacts/pyromancer
```

This produces `pyromancer-progression-runs.json` and `pyromancer-progression-report.md` with real seeded simulation results. The dedicated acceptance PR CI now runs 8 matched seeds × 4 agent personalities × 4 Fire builds (128 observations, 420 simulated seconds each). Manual workflow dispatch supports larger studies. The existing general Balance Lab behavior is unchanged.

**No automatic 'better = balanced' assertion.** Different early and advanced cohorts deliberately have different gear/investment. Inspect survival/death, route depth, Wyrm time and kill-rate progression *together*, then adjust one balance variable per iteration. In particular, do not buff monsters solely because a level-5 mage outperforms a new mage.

## Why the first short study could not measure Wyrm difficulty

The initial 32 Fire progression study runs used a 180-second horizon and produced 0/8 first-Wyrm encounters per cohort. This is not evidence that Wyrms are unreachable or that the builds are badly balanced. The 480-run [post-Fire baseline Balance Lab](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39861791243) reaches the first Wyrm around 250–290 seconds median for its Fire builds, with an overall first-Wyrm-time median of approximately 285 seconds.

The **420-second, 2-seed acceptance run is now complete** (PR #313, 8 observations per cohort). Its observed medians were:

| Cohort | Median kills/min | Wyrm contact | Median first Wyrm | Median minimum health |
| --- | ---: | ---: | ---: | ---: |
| Fresh Fireball Lv1 | 48.4 | 8/8 | 343s | 64% |
| Mid Detonation Lv3 | 61.0 | 7/8 | 320s | 71% |
| Crown of Ash Lv5 | 63.1 | 6/8 | 315s | 71% |
| Heart of Furnace Lv5 | 74.9 | 8/8 | 297s | 61% |

This shows a meaningful Fire power progression and Wyrm contact, **not final balance**. Crown of Ash's 6/8 contact versus Detonation's 7/8 must not be interpreted as a regression from only eight runs. The next acceptance slice uses eight shared seeds (32 observations per cohort), retaining matched agent personalities and the 420-second horizon. The upgraded report includes conditional median first-Wyrm contact and secured essence counts alongside kills/min, depth and minimum health. Review those together before any combat tuning. A manual 720-second end-to-end study can follow if player feedback warrants it.

A Wyrm reached in self-play is still not proof that its telegraphs are fair or the rewards satisfying; physical mobile playtesting remains separate.

## Definition of ready-for-now

Pyromancer may be marked ready-for-now when one beginner, one mid Detonation and one advanced Scorched Earth route are demonstrably playable, Fire skills feel substantially different and worthwhile across multiple Hunts, the unlocked mutation amplifiers work after save/load and remain correct in combat, and no mobile navigation/visual blockers remain. Future Fire variants, Frost, Storm, Arcane and hybrid expansions are explicitly excluded.

The whole game's canonical P0–P9 roadmap remains ongoing: a **Fire-school acceptance gate is not completion of WyrmForge's wider game milestones**.
