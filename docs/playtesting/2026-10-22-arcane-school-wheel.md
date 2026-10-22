# Six-school Arcane Web construction receipt — 22 October 2026

Canonical contracts: [magic and combat](../canon/magic-and-combat.md), [town and UX](../canon/town-and-ux.md). PR [#258](https://github.com/pjotrcasteel/Wyrmforge/pull/258), v0.0.158. This receipt records implementation evidence, not a competing design specification.

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

## Verification status

Local regression evidence: 357 Domain tests, 601 existing Application tests, four new mutation combat tests and 324 JavaScript tests pass. Domain and Application compiled. Local full Web build is blocked by the executor's out-of-process WASM task host; full build, browser captures and remaining regression results are pending CI. Phone visual acceptance is pending; automated screenshots do not establish physical Safari acceptance. Do not mark this construction checkpoint shipped until validation and review complete.
