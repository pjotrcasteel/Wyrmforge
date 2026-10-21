# Fire Tier-I Hunt implementation checkpoint

Design authority: [Hunts and world](../canon/hunts-and-world.md), [modes and progression](../canon/modes-and-progression.md), [roadmap](../canon/roadmap.md).

## Scope and implementation

- Branch: `feature/fire-tier-one-hunt-20261021`, initially based on main `2740d7f5`, integrated through `3dd57e18`.
- Explicit versioned `HuntSelection` from the World Gate through Home/Arena to the C# factory and run summary. Only Fire Tier I is authored for this contract; unsupported versions/tiers and conflicting Ascendant/region requests are rejected.
- Fire Tier I uses three fights on the short road or four on the rewarded detour, with one committed fork, real common approach and reachable Ashfang. Existing map presentation and physical arenas are reused, not redesigned. Combat pressure stages remain separate from encounter counts.
- Target is Ashfang irrespective of research lead or character school, and the map names that fixed target rather than suggesting resonance can select another Wyrm. Trail rewards are Fire-attuned; harvest uses the existing Ashfang Essence catalogue. No new currency, recipe cost or higher-tier material is invented.
- Both new and returning Fire hunters harvest an Essence and complete the existing extraction ritual. Only extraction secures cargo and completes this finite Hunt; no generic depth descent follows. Defeat still loses unsecured cargo.
- Fire Tier-I completion is an optional additive field in the existing world save. Older saves keep discoveries/selected region and start without claimed tiered victories. Existing character, inventory and spell IDs remain untouched. Replays keep the explicit selection and seed.
- Legacy factory calls, Frost, Ascendant rites and development labs retain their existing behavior. Arena Lab remains a design/testing tool.

## Verification and acceptance

Draft PR: [#205](https://github.com/pjotrcasteel/Wyrmforge/pull/205). No merge requested.

Local results at integrated implementation `1d54188f`:

- 115 focused Application checks passed, including 1,000 deterministic Fire layouts, 3/4-fight route budgets, graph/geography agreement, both committed route walks and reward uniqueness, target precedence, harvest/extraction/death and legacy navigation/aim/extraction/checkpoint/region/development regressions.
- Six real-game Chromium browser cases passed: World Gate and actual map at 320/390px, first-run/character creation, existing Frost and additive completion-save persistence across reload.
- Four map JavaScript checks passed. Release web publish and browser test build succeeded.
- Fixed a real selection-serialization issue found by the round-trip test: persist a stable region string without changing Domain region/save types.
- Used the public NuGet source for restore because this machine's unrelated Azure package feed could not supply vulnerability metadata. Repository package configuration is unchanged.

Concurrent main added ordinary salvage/material cargo during validation. Integrated both the Hunt metadata and material persistence/UI bindings without replacing the concurrent implementation. Added and passed assertions that existing Ember Residue/Charred Scrap secure exactly once on extraction and are lost on defeat. No new drop rates or recipes were added in this PR.

Actual-game captures: [320px map](evidence/fire-tier-one-2026-10-21/fire-tier-one-map-320.png), [390px map](evidence/fire-tier-one-2026-10-21/fire-tier-one-map-390.png), [390px tier selection](evidence/fire-tier-one-2026-10-21/world-gate-fire-tiers-390.png). These are Chromium viewport captures, not physical iPhone photos and not a new map-art approval.

CI for `1d54188f`: [compare](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39570967148) passed; [validate](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39570967208) and [browser](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39570967186) were still running when this receipt was written. Do not interpret pending checks as success. Later head `8cd749cf`: [compare](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39571427365), [validate](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39571427245) and [browser](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39571427032) all passed.

Physical iPhone playthrough, first-Hunt balance and owner acceptance remain required. Automated or synthetic browser evidence is not physical-device acceptance. Do not merge on an unverified playability claim.

## Remaining work

- Author and accept Fire Tier II with the optional harder refuge-reclamation quest; decide death penalty and pre-refuge recovery before implementing.
- Extend per-lineage Tier I-V unlocks and tier-aligned rewards only as actual content is ready; post-V persistent frontier follows.
- Cross-school synthesis and all seasonal work are deferred. No automatic higher-tier unlock is included here.
