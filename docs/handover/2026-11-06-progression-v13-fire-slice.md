# Progression v1.3 Fire implementation checkpoint

Draft PR: https://github.com/pjotrcasteel/Wyrmforge/pull/499
Baseline main: bfddb981a9d29f21627c2f7798153105ae09128a. No merge or deployment authorized here.
Authority: owner design v1.3, Library libfile_24b6faecc30081918a63b181f0744045, sections 0.4–0.4.6. Owner clarification: inactive allocations retain smaller alternative dormant effects, not their full active effects.

## Implemented

- PassiveTreeSelection refunds into shared availability without reserving inactive-school points. Switching preserves allocations; graph dependency checks remain. Legacy reserved totals are ignored without minting points.
- PassiveDormancy supplies school-specific alternative stats. Choosing the primary rebuilds active/dormant combat profiles and limits active proc/amplifier behavior to the active school.
- FireballCoreCatalog exposes socket capacity 0/1/2/3/5. Sealed legacy equipment remains saved but inactive. Simulation preparation enforces the same capacity.
- School atmosphere uses static world-anchored gradients and bounded brightness from saved investment. Catalog indexes remove whole-graph scans during routing.
- Five functional Fire route nodes extend the existing graph: Cinder Thread, Ember Memory, Crucible, Ember Covenant, Long Pyre. Explicit Minor/Medium/Major/Grand/Keystone tiers preserve legacy IDs and costs. Long Pyre exchanges direct damage for field duration.
- Cinder Cascade is a temporary, Emberbrand-gated major Hunt upgrade; Solar Wake is its later gated evolution, requiring a prepared upgraded core and equipped mutation. The permanent recipe remains unchanged.
- SynergyResolver composes tagged sources with stable ordering, source ancestry, shared reaction budgets, diminishing contributions and an aggregate root-damage ceiling. Conflicting duplicate source definitions are rejected. Fire runtime uses existing impact and burning-ground rendering, limits concurrent fields, and inherits mutation area/duration.
- BuildView enables school activation while retaining inspection of future schools. Existing north rotation and pan/pinch navigation are reused. Overview node tap priority fixes a genuine 320px school-badge interception.
- HuntLab exposes a labelled developer Solar Wake review loadout. It grants no saved progression and does not claim earned unlocks. Browser tests cover both 320x568 and 390x844.

## Verification and evidence

- CI at 52ff279: full Domain 417 passed, full Application 863 passed, web publish passed: https://github.com/pjotrcasteel/Wyrmforge/actions/runs/42275917206
- Combined latest-main reconciliation still requires fresh CI.
- Full JavaScript suite: 779 passed; Solar Wake glyph mapping and reward-pool signature regressions fixed.
- Local focused Application suite: 60 passed (Nexus, temporary breakthroughs, milestones, cohorts, development encounter isolation/determinism).
- Web and browser-test builds passed. Full Application suite is not claimed locally; use CI.
- Both Chromium and WebKit passed all four mobile tests at e7124e42a463bd9bf07b474b35ad86c3e48cafeb: https://github.com/pjotrcasteel/Wyrmforge/actions/runs/42225593129
- That run contains actual Web screenshots. Its combat wait was later found to accept an asynchronous result at simulation time zero: the initial combat captures are INVALID as gameplay evidence. The corrected capture imports the diagnostics module first, then synchronously polls simulation time, requires an actual projectile, and records fields/performance. Inspect the later run before claiming combat proof. Desktop-emulated mobile results are not physical iOS/Android GPU measurements.
- Local browser execution is unavailable due sandbox Unix-socket restrictions. Evidence is produced by the real published game in Actions, not generated artwork.

- Corrected native 320/390 Chromium and WebKit evidence passed at 52ff279: https://github.com/pjotrcasteel/Wyrmforge/actions/runs/42275917201. Actual 25-second combat showed casts and boss damage (WebKit 390: Ashfang 1100 to 550 HP; hunter 100 to 16 HP). No Solar Wake field triggered during that capture. A separate labelled invulnerable practice test now waits for a real field, pending CI.
- Browser smoke failures exposed old level-one socket fixtures, a repeat refund acknowledgement bug and a close node pair. These are corrected; new CI must verify them. Terrain smoke timeouts remain to be reassessed against latest main.

## Next acceptance work (not complete)

1. Inspect the longer combat recordings and demonstrate visible Mega/Evolution triggers in ordinary Hunts, including conditional failure cases.
2. Expand the Fire routes and school-aware atmosphere. The existing wheel plus this route is a foundation, not the enormous finished Web. Preserve authored branching, avoid edge crossings, and test touch navigation at scale.
3. Add equal-tier rare/miniboss/Ashfang and deep Endless stress cohorts. Existing overall multiplicative stat stacking is not fully migrated to the new resolver. Do not claim combat balance solved.
4. Validate seasonal ranked versus Eternal eligibility and complete save roundtrips against the separately active backup work.
5. Resolve full CI failures and review genuine mobile screenshots before requesting approval. No unrelated PR is merged or replaced.

## Visual direction

Use original irregular clusters, visible distant commitments and readable tradeoffs inspired by Path of Exile's passive tree (https://www.pathofexile.com/passive-skill-tree) and Enshrouded's branch navigation (https://enshrouded.com/en-US/news/enshrouded-forging-the-path-is-live). Do not copy their art or layouts. All displayed investable nodes must have real effects.

## Concurrent work

Main now includes #481 core economy/mastery, #490 damageable Hunt proofs and terrain stability updates. Merge reconciliation preserves those changes, the new essence/material recipes and legacy sealed equipment. PR #491 aggregate saves/cloud backup remains independent. No terrain/art/AI implementation is authored by this slice.

## 7 November integration and validation follow-up

- Reconciled main through f4db829, including #481 and #490. CI 155c9cc passed 430 Domain and 874 Application tests, publish and focused magic: https://github.com/pjotrcasteel/Wyrmforge/actions/runs/42317411323.
- Browser checks exposed four Fire-route path obstructions/crossings. Repositioned the five new landmarks; geometry check covers 70 nodes and 77 paths, no crossings/obstructions or pairs under 90 world pixels. Actual browser regression remains authoritative.
- Field evidence originally read a nonexistent snapshot `burningGrounds` array. Existing rendering combines fire fields into `EssenceBursts`; added a read-only `BurningGroundCount` without duplicating render geometry. Previous diagnostics cannot establish absence of fields.
- Live simulation showed the original practice setup's burn expires during Ashfang flight before the killing hit. The explicitly labelled late-run review loadout now includes existing Emberbrand II. Phase-two combat creates a field through ordinary casts; no enemy health, status or damage is injected by the test. A separate negative test verifies non-burning kills do not trigger either breakthrough.
- Removed a duplicated first-upgrade browser action introduced by merging overlapping test fixes. No production Nexus behavior changed in this follow-up.
- Full JavaScript suite after integration: 790 passed. New mobile captures and latest full CI remain pending. Existing main-origin first-trail Chart-return smoke failures are tracked separately from the progression slice; do not suppress them.

## Verified Fire slice and outer routes — 7 November

- At 76c2730 all eight Actions workflows passed, including all four browser shards. Full validation: 430 Domain / 879 Application tests; mobile evidence: five tests each in Chromium and WebKit. Earlier first-trail failures did not recur in this run.
- Validated live Solar Wake field in the labelled 320px Cinder Needle + Emberbrand II phase-two practice fight. This practice encounter enables invulnerability and does not establish normal-Hunt difficulty. The separate 320/390px full-damage encounters remain intact. No injected kill, burn status or render-only effect is used.
- CI: https://github.com/pjotrcasteel/Wyrmforge/actions/runs/42373301223 and https://github.com/pjotrcasteel/Wyrmforge/actions/runs/42373301266. Recording: https://chatgpt.com/library?file_id=libfile_f357074a60748191b990d9f98e019e66&account_id=personal . Screenshot: https://chatgpt.com/library?file_id=libfile_d922eada0bb88191a7c2c141cc367b5b&account_id=personal . These are the pre-expansion build.
- Next increment adds 16 functional outer Fire nodes after Long Pyre: duration, burn damage and health routes. Each complete route fits the current 24-point budget. Bonuses add within their stat group; no extra multiplicative damage or new triggers. Numbers remain tuning values.
- World extent expands from 3200 to 4800; SVG, CSS and phone zoom derive from that extent. Locked distant Major/Grand/Keystone goals remain visible. Existing node IDs, costs, connections, saves and school ownership are unchanged.
- Local route and tier tests: 10 passed. Navigation tests: 10 passed, including 4800 and 12000 world extents at 320px. Geometry checks: 86 nodes / 93 paths, no crossings, unrelated-node obstruction or node pair below 90 world pixels. Fresh browser captures and CI for this increment are required before visual acceptance.
- The 86-node graph remains an incremental foundation, not the enormous finished six-school Web. Equal-tier rare/miniboss/Ashfang, deep Endless, ranked/Eternal boundaries and physical-phone budgets remain acceptance work. Do not merge unrelated active PRs.
