# Tier-aligned loot rarity (Common · Rare · Epic · Legendary) — implementation checkpoint

Design authority: [Magic and combat](../canon/magic-and-combat.md) (persistent-loot rarity), [Hunts and world](../canon/hunts-and-world.md) (tier-aligned loot), [roadmap](../canon/roadmap.md).

## Scope and implementation

- Branch: `feature/fire-loot-rarity-20261021`, stacked on the Fire Tier-II branch (draft PR #209, itself on #205). Merge #205 → #209 → this PR in order.
- Builds on the basic Common salvage merged on main (Ember Residue, Charred Scrap, Cinder Needle).
- `LootRarity` (Domain `Progression/Loot`) is the one persistent-loot scale for Hunt materials, relics and Wyrm Essences. The old `RelicRarity` was folded into it. The in-run level-up `RewardRarity` scale is unchanged.
- `LootRarityRules`: the Hunt tier caps ordinary drops (I Common, II Rare, III Epic, IV–V Legendary), and the tier's Essence is graded one step above (I Rare, II Epic, III+ Legendary). Runs without a selected Hunt drop Common only and grade Essences Rare.
- New Rare material **Emberglass**:
  - Elite Fire foes drop it as a physical pickup when the tier allows Rare (Tier II). Tier I never drops it.
  - Reclaiming the Tier-II refuge grants one. It is banked before the refuge mark, so a later fall keeps it.
- Fireball core level 4 costs Emberglass ×1 and level 5 costs Emberglass ×2, on top of the unchanged Essence costs. The upgrade is atomic: graded Essences are refunded if materials are short.
- Graded Essence vault:
  - The vault spends the lowest grade first.
  - Grades are saved in the additive `wyrmforge.essenceGrades.v1` key (registered in `SaveLayout`). The `wyrmforge.essenceVault` id list is unchanged, so older builds still read it, and old saves count as Rare.
- UI uses the shared colours (Common bone, Rare blue, Epic purple, Legendary gold) through `LootRarityPresentation`:
  - Forge upgrade cards show Emberglass with its rarity, source and count, and Essences with their grades.
  - Trail Cleared marks non-Common finds.
  - The run summary shows the Essence grade and a "Salvage secured" list.
  - Relic cards use the shared scale (Rare is now blue rather than purple; Epic and Legendary have been added).
  - Pickups in the arena have a per-material palette; Emberglass has a blue rim.

## Verification

- Domain suite: 349/349 passed. New `LootRarityTests` cover tier caps, Essence grades, material rarities, vault grade save/restore with lowest-first spending, and legacy saves. `FireballCoreStateTests` add the Emberglass gate and the refund of graded Essences.
- Application suite: 566/566 passed. `FireTierTwoHuntTests` add:
  - Rarity per tier (Tier I and legacy never Rare).
  - Essence grade in the run summary.
  - The refuge pays Emberglass once.
  - The fall-after-refuge test now proves Emberglass survives a refuge return.
- Browser: the new test `Mobile_FireballLevelFour_NeedsRareEmberglassAndSpendsGradedEssence` (390px) checks:
  - The Rare label renders blue.
  - The upgrade is blocked without Emberglass.
  - The upgrade spends the Epic Cinder Heart, the Ashen Wing and the Emberglass, and saves all three keys.
  - Full-suite result: see the PR.

Chromium viewport capture (not a physical-device photo): [Fireball Lv 4 Emberglass gate, 390](evidence/fire-loot-rarity-2026-10-21/fireball-emberglass-gate-390.png).

Not yet verified or built:
- Elite Emberglass drop rate in real Tier-II play (elites are a 10% roll per eligible node, so the refuge is the reliable source).
- Epic and Legendary materials, which arrive with Fire Tiers III–V.
- Physical-device review of the rarity colours.
