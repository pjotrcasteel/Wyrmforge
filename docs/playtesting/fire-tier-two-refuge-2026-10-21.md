# Fire Tier-II Hunt with refuge — implementation checkpoint

Design authority: [Hunts and world](../canon/hunts-and-world.md) (Tier II refuge rules and length curve), [modes and progression](../canon/modes-and-progression.md), [roadmap](../canon/roadmap.md).

## Scope and implementation

- Branch: `feature/fire-tier-two-refuge-20261021`, stacked on the Fire Tier-I branch (draft PR #205). This work is draft PR [#209](https://github.com/pjotrcasteel/Wyrmforge/pull/209); merge #205 first.
- `HuntLadder` is the single rule for authored/unlocked tiers: Fire Tiers I–II are authored; tier N opens after an extracted clear of tier N−1 **of the same lineage**. Frost keeps its single legacy Tier 1.
- `HuntSelection.FireTierTwo` (Cinder Frontier, `WyrmTier.Ascendant`) generates two committed forks, 6–8 combat trails and an Ascendant Ashfang lair. The trail budget follows the tunable ×1.7 curve recorded in canon.
- One optional rare **Emberwatch Refuge** sits beyond the first fork. Both second-fork entrances connect to it, so skipping it is a real choice. It uses rare difficulty (a harder hold) and replaces the random rare for that map.
- Death rules (owner decision 21 October):
  - Before the refuge is reclaimed, or if it is skipped, death is a normal defeat.
  - After it is reclaimed, a fall returns the hunter to the refuge at full health; returns are unlimited.
  - Essences and materials gathered after the refuge are lost; earlier finds stay unsecured until extraction.
  - Levels, spells and relics are kept. Dragon counters rewind with the map.
  - Route rewards are paid once per trail, so repeated trails cannot be farmed.
- Map: `FIRE · TIER 2`, the target "Ascendant Ashfang", a `REFUGE` node with `⛨ OPTIONAL` / `⛨ HELD`, a sheet explaining the side quest and its loss rule, and a notice after a return showing what was lost. The run summary reports tier-specific clear text and refuge saves.
- Save: additive `ClearedHuntTiers` map in the world save. The legacy `CompletedTierOneHunts` is still read (as tier 1) and written, so the Tier-I build keeps its unlock.

## Verification

Local results at `c304a3b4` (with the docs commit on top):

- Full Application suite: 560/560 passed. New `FireTierTwoHuntTests` cover:
  - 1,000 seeded layouts: refuge placement and connections, fights 6–8 (+1 for the refuge), only one rare.
  - Tier I unchanged.
  - Map rewind.
  - A fall after the refuge: the post-refuge Essence and material are lost, the earlier material is kept, the route is paid once, and a second return works.
  - A fall before the refuge is a normal defeat.
  - Ladder rules.
- Full browser suite: 87/87 passed against a Release publish, including:
  - Fire Tier II opens only after a Tier-I clear and Frost stays at Tier 1.
  - The save persists across reload.
  - The Tier-II map and refuge sheet render at 320/390px without horizontal overflow.

Chromium viewport captures (not physical iPhone photos, not map-art approval): [gate, Tier 2 open](evidence/fire-tier-two-2026-10-21/world-gate-fire-tier-two-open.png), [map 320](evidence/fire-tier-two-2026-10-21/fire-tier-two-map-320.png), [map 390](evidence/fire-tier-two-2026-10-21/fire-tier-two-map-390.png), [refuge sheet 320](evidence/fire-tier-two-2026-10-21/fire-tier-two-refuge-sheet-320.png), [refuge sheet 390](evidence/fire-tier-two-2026-10-21/fire-tier-two-refuge-sheet-390.png).

Not yet verified:
- A full Tier-II playthrough on a physical device.
- Ascendant Ashfang balance at Tier-II build strength.
- How the refuge return feels in play.
- Whether a Tier-II Ascendant victory should also count toward the Great Hunt Ascendant deed. It currently does, because it uses the existing Ascendant victory path.

Owner acceptance is required before merge.

## Remaining work

1. Tier-aligned loot: the material/Essence pool and quantities by Hunt tier, within research and mastery gates.
2. Fire Tiers III–V, each introducing one new system (for example earned scouting), on the length curve.
3. The Fire Endless frontier after Tier V, separate per lineage.
4. Then cross-school knowledge, then seasons.
