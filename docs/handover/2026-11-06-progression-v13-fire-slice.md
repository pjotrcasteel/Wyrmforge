# Progression v1.3 Fire implementation checkpoint

Draft PR: https://github.com/pjotrcasteel/Wyrmforge/pull/499
Baseline main: bfddb981a9d29f21627c2f7798153105ae09128a. No merge or deployment authorized here.
Authority: owner design v1.3, Library libfile_24b6faecc30081918a63b181f0744045, sections 0.4–0.4.6. Owner clarification: inactive allocations retain smaller alternative dormant effects, not their full active effects.

## Implemented

- PassiveTreeSelection refunds into shared availability without reserving inactive-school points. Switching preserves allocations; graph dependency checks remain. Legacy reserved totals are ignored without minting points.
- PassiveDormancy supplies school-specific alternative stats. Choosing the primary rebuilds active/dormant combat profiles and limits active proc/amplifier behavior to the active school.
- FireballCoreCatalog exposes socket capacity 0/1/2/3/5. Sealed legacy equipment remains saved but inactive. Simulation preparation enforces the same capacity.
- Five functional Fire route nodes extend the existing graph: Cinder Thread, Ember Memory, Crucible, Ember Covenant, Long Pyre. Explicit Minor/Medium/Major/Grand/Keystone tiers preserve legacy IDs and costs. Long Pyre exchanges direct damage for field duration.
- Cinder Cascade is a temporary, Emberbrand-gated major Hunt upgrade; Solar Wake is its later gated evolution, requiring a prepared upgraded core and equipped mutation. The permanent recipe remains unchanged.
- SynergyResolver composes tagged sources with stable ordering, source ancestry, shared reaction budgets, diminishing contributions and an aggregate root-damage ceiling. Conflicting duplicate source definitions are rejected. Fire runtime uses existing impact and burning-ground rendering, limits concurrent fields, and inherits mutation area/duration.
- BuildView enables school activation while retaining inspection of future schools. Existing north rotation and pan/pinch navigation are reused. Overview node tap priority fixes a genuine 320px school-badge interception.
- HuntLab exposes a labelled developer Solar Wake review loadout. It grants no saved progression and does not claim earned unlocks. Browser tests cover both 320x568 and 390x844.

## Verification and evidence

- Local full Domain suite: 417 passed.
- Local focused Application suite: 60 passed (Nexus, temporary breakthroughs, milestones, cohorts, development encounter isolation/determinism).
- Web and browser-test builds passed. Full Application suite is not claimed locally; use CI.
- Both Chromium and WebKit passed all four mobile tests at e7124e42a463bd9bf07b474b35ad86c3e48cafeb: https://github.com/pjotrcasteel/Wyrmforge/actions/runs/42225593129
- That run contains actual Web screenshots and actual Ashfang encounter videos. Initial 8-second combat captures are too early to prove a visible Solar Wake trigger. A follow-up capture waits longer and records runtime projectiles, fields and performance diagnostics. Desktop-emulated mobile results are not physical iOS/Android GPU measurements.
- Local browser execution is unavailable due sandbox Unix-socket restrictions. Evidence is produced by the real published game in Actions, not generated artwork.

## Next acceptance work (not complete)

1. Inspect the longer combat recordings and demonstrate visible Mega/Evolution triggers in ordinary Hunts, including conditional failure cases.
2. Expand the Fire routes and school-aware atmosphere. The existing wheel plus this route is a foundation, not the enormous finished Web. Preserve authored branching, avoid edge crossings, and test touch navigation at scale.
3. Add equal-tier rare/miniboss/Ashfang and deep Endless stress cohorts. Existing overall multiplicative stat stacking is not fully migrated to the new resolver. Do not claim combat balance solved.
4. Validate seasonal ranked versus Eternal eligibility and complete save roundtrips against the separately active backup work.
5. Resolve full CI failures and review genuine mobile screenshots before requesting approval. No unrelated PR is merged or replaced.

## Visual direction

Use original irregular clusters, visible distant commitments and readable tradeoffs inspired by Path of Exile's passive tree (https://www.pathofexile.com/passive-skill-tree) and Enshrouded's branch navigation (https://enshrouded.com/en-US/news/enshrouded-forging-the-path-is-live). Do not copy their art or layouts. All displayed investable nodes must have real effects.

## Concurrent work

Keep PR #481's core-economy work and PR #491's aggregate saves/cloud backup independent. This branch uses the same socket-capacity contract names as #481 to make reconciliation easier, without importing its unrelated changes. Terrain/art/AI work remains outside this slice.
