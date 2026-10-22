# Pyromancer v1: phone acceptance evidence

Date: 23 October 2026. This is a **verification slice**, not a school feature, artwork redesign or game-wide milestone completion.

## Automated evidence

The separate `PyromancerVisualAcceptanceTests` suite drives the **real** WyrmForge UI at 320×568 and 390×844 pixels and captures eight images per browser CI pass:

| Build | Skill-map evidence | Equipped mutation inspector |
| --- | --- | --- |
| Advanced Conflagration: Crown of Ash + Detonation | `pyromancer-major-map-fire-spread-crown-{width}.png` | `pyromancer-major-socket-fire-spread-crown-{width}.png` |
| Advanced Immolation: Heart of the Furnace + Scorched Earth | `pyromancer-major-map-fire-ember-altar-{width}.png` | `pyromancer-major-socket-fire-ember-altar-{width}.png` |

The test starts with valid Fire Web node paths, a level-five core, and the corresponding researched and equipped mutation. It checks the selected major's inspector, a >=44px socket tap target, a valid slot option, a saved mutation binding, and persistence across real page reload. Existing browser checks independently test panning, wheel geometry/spacing and 320/390px UI layout.

All browser screenshots are retained in the normal `WYRMFORGE_BROWSER_ARTIFACTS` directory and uploaded by the existing browser-smoke workflow. **Successful CI proves behavior, not that the art feels grand.**

## Human iPhone pass

On a real iPhone (not merely a desktop-sized emulated viewport), inspect:
1. The two Fire regions' hierarchy at initial and overview zoom: minor, medium and major landmarks must be visually distinct and route lines not misleading.
2. Drag, pinch, recenter, scroll and switch between Fireball, Research and Web without lost touches or sticky scrolling.
3. Navigate to Crown of Ash and Heart of the Furnace using normal gestures; try assigning the mutation, closing/reopening, returning to Town, and relaunching.
4. Start a Hunt: compare Detonation's wider impact and Scorched Earth's persistent burning-ground threat. Core-level damage and Web power should be noticeable without reading numbers.
5. Verify the school-colored Nexus building remains distinct at low/high investment and never paints over NPCs or the Blacksmith.

Record pass/fail with phone model, iOS version, viewport dimensions, screenshots/video and the exact deployed game build. This pass remains **pending** until it actually happens.


## First Fire balance sample: what it really tells us

The first [PR #305 seeded headless report](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39866000323/artifacts/12462994562) contains **32 runs**: 2 seeds × 4 agent styles × 4 legal Pyromancer cohorts, each limited to 180 simulated seconds.

| Matched comparison (same agent + seed) | Median change in kills/min | Higher in cases | Interpretation |
| --- | ---: | ---: | --- |
| Fresh Fireball → Mid Detonation | +14.3 | 7/8 | Clear first specialization power signal |
| Mid Detonation → Crown of Ash | −0.3 | 4/8 | Major area specialization does **not yet show a consistent kill-rate gain** |
| Mid Detonation → Heart of Furnace | +10.0 | 7/8 | Stronger early sustained-pressure damage signal |
| Crown of Ash → Heart of Furnace | +12.3 | 8/8 | Furnace dominates this short-window kill rate; investigate build roles before tuning |

Crown of Ash's median *paired minimum-health* difference against Mid Detonation was approximately +14 percentage points, so kill rate alone may miss survivability/risk behavior. All 32 runs remained at depth 1, reached **zero Wyrms**, and stopped at the time limit. The study therefore cannot establish encounter balance, long-run progression, mutation power feeling or TTK at advanced Hunt tiers. Eight matched comparisons per row are far too few for precise balance constants.

**Next balance evidence:** run the new GitHub Actions **Pyromancer progression acceptance** workflow with more seeds and longer simulated runs; inspect per-agent survival, Wyrm contact, run time, and source-specific combat contribution. If the Crown still underperforms, inspect whether splash hits nearby mobs and whether agents create adequate clustered situations *before* buffing damage or weakening the Furnace. Do not rebalance Fire from this initial sample.

## Completion boundary

This PR does **not** declare Pyromancer ready-for-now. Pair its phone evidence with PR #305's seeded Fire progression report; evaluate early/mid/advanced Hunts including death, Wyrm reach, survival and power feel. No new Frost, Storm, Arcane or Fire mutations are part of this verification slice.
