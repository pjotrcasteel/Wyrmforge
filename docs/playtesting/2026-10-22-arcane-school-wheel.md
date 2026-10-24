# Six-school Arcane Web construction receipt — 22 October 2026

Canonical contracts: [magic and combat](../canon/magic-and-combat.md), [town and UX](../canon/town-and-ux.md). PR [#258](https://github.com/pjotrcasteel/Wyrmforge/pull/258), v0.0.159. This receipt records implementation evidence, not a competing design specification.

## Implementation checkpoint

- Shared earned budget, active-school allocation, learned global stats, per-school refund reservations, legacy mixed-save restoration and restricted loadout edits.
- Six-sector presentation layout with active school north, overview/zoom/sector camera controls, original Divine pixel atlas, inherited Nexus bronze/masonry framing and below-map phone inspector.
- Cancellable native modal for the first accepted inactive-school refund per Web visit, including refund-all. Refund reservations persist additively in the existing Arcane build save.
- Four discovered-mutation enhancement nodes resolved by the real Fireball simulation. Initial tunable values: Cinder Needle speed ×1.10, Meteor Heart damage ×1.08, Detonation radius ×1.10, Scorched Earth duration ×1.15. No new resource currency, school unlocks or school-switching UI.
- Stable graph IDs, adjacency, legacy techniques, mastery choices, existing saved non-Fire characters and Fire-only new-character gate preserved. Hybrid paths now have explicit learning ownership independent of their legacy resonance field.

## Reference research

- [Path of Exile's official passive tree](https://www.pathofexile.com/passive-skill-tree): spatial landmarks and navigable overview help retain orientation in a large persistent network. Transfer the navigation principle, not its tree, icons or assets.
- [Nielsen Norman Group, Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/): keep an overview legible and reveal detailed requirements/effects in the selected-node inspector. No copied visual treatment.
- [Last Epoch official Skill Specialization help](https://support.lastepoch.com/hc/en-us/articles/46363203944859-Skill-Specialization): distinguish specialized skill investment from currently used skills; Wyrmforge follows the owner's own cross-school knowledge/refund contract rather than copying respec rules.
- In-repository references: approved Fireball ritual chamber, shared `nexus.css`, original `divine-lineage-sigils.webp` and current Refuge materials. The Web origin remains Wyrmheart rather than reusing Fireball art.

## Verification evidence

The last implementation commit is `ec39ad89a60ac70918954ea5564de8667858ef21`. The documentation completion commit changes this receipt only.

- [Validate Wyrmforge #967](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39743124693): full solution build/publish, 357 Domain tests and 606 Application tests, 325 JavaScript tests, collector/Sprite Lab checks, reproducible art and portrait/balance samples.
- [Browser smoke #1024](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39743124698): 110 browser cases, including the six-school wheel at 320×568 and 390×844, legacy non-Fire orientation, inactive-learning rejection, retained mixed builds, persisted reserved refunds, cancellation, warning once per visit and refund-all cancellation. The integrated Town V2 smoke now waits for asynchronous foreground readiness before checking PNG pixels; this changes test synchronization only.
- [Focused magic comparison #250](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39743124701): authoritative magic comparison samples.
- Mobile capture review: wheel overview, readable school sector, selected-node inspector, reserved-point state and native refund dialog. Original pixel emblems and the bronze/masonry palette are retained; the active school stays north while browsing. The overview is deliberately for navigation; 44px school shortcuts open a useful reading scale. The available-points label stays visible on narrow phones.

Status: all three final CI workflows passed at the implementation commit above. Full solution build reports zero warnings/errors; all 357 Domain, 606 Application and 110 Browser tests passed, alongside JavaScript, art and balance checks. [Final browser evidence](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39743124698/artifacts/12410930432) and [playable preview package](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39743124698/artifacts/12410765730) are attached to the successful run. Phone captures were reviewed at both viewport sizes. An earlier imported Town V2 readiness race was corrected before the successful final run.

Physical iPhone/Safari touch acceptance remains an owner playtest item; Chromium phone screenshots are not evidence of physical Safari behavior. School switching UI, authored Death/Binding branches and additional school-native mutation enhancements remain future work. Mutation values are initial tuning values rather than a completed balance pass.

## Changed implementation boundaries

- Domain: `Progression/PassiveTree` learning ownership, active-school gating, reservations, save imports and route planning; `Combat/Stats` separates unconditional bonuses from conditional effects; `Progression/Loadouts` preserves inactive knowledge.
- Application: `Runs/Simulation/Spells` resolves matching prepared mutation modifiers into actual projectiles and ground hazards; `Runs/Resonance` does not misclassify future schools as Arcane.
- Web: `Features/Forge/BuildView.razor` and its code-behind, `ArcaneWheelLayout.cs`, `ForgeView.razor`, Home school/loadout/save adapters, shared `nexus.css`, cached `arcane-web.js` and versioned script reference.
- Regression coverage: `SchoolLearningTests`, `MutationWebCombatTests` and integrated phone browser cases. Existing node IDs, links and `wyrmforge.arcaneBuild.v1` remain compatible; the optional reserved-point map is additive and malformed amounts are bounded by earned budget.
