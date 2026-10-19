# World Gate — mobile navigation (2026-10-19)

## Feature-branch implementation

After the player enters Refuge, tapping the actual World Gate hotspot opens the approved two-arch painting rather than calling the combat start handler.

Navigation is mobile-first:

1. World Gate: original painting; left Free Play active; right Campaign desaturated and disabled. No new companion art.
2. Free Play: New Hunt enabled; Endless Hunt and Endless Arena visible but inert.
3. New Hunt: responsive 4-column, 12-slot selector. Fire and Frost playable. Ten dark, unnamed sigils tease future content without inventing element names.
4. Wyrm tiers: Tier 1 starts the selected region's regular hunt. Tiers 2 through 5 are visible but disabled until their mechanics and encounters exist.

Selection stays in the Blazor World Gate component. OnRegionChanged persists the chosen region before OnExplore dispatches the existing Arena flow.

## Progression and compatibility

- The first run now respects Fire or Frost region selection; Frost no longer requires an Ashfang victory.
- Storm and Arcane regions remain planned, not playable. Region ecology, enemy rosters, and home-Wyrm selection use existing simulation rules.
- No new unnamed teaser is an authored lineage, spell or reward. Future tiers and lineages require real content before unlocking.
- The primary-magic oath remains a separate combat loadout decision after choosing the hunt region; selecting Frost does not force a Frost spell.

## Files

- Features/Forge/ForgeView.razor: town hotspot navigation
- Features/WorldGate/WorldGateView.razor and .razor.css: gate scene, sheet, element grid, tier screen
- Pages/Home.World.cs: selected region honored during the First Hunt
- Application/World/RegionCatalog.cs: starting-region eligibility
- Tests: RegionCatalogTests and WyrmforgeBrowserTests

## Verification / acceptance

Changes were submitted through GitHub. The local runtime has no .NET 10 SDK and no running local browser build, so do not describe this as visually accepted yet.

The PR triggers C# validation and Playwright browser-smoke workflows. Check both results and PR browser screenshots (including 320px and 390px widths). On the deployed build, also inspect iPhone Safari: image proportions, left/right portal targets, menu back navigation, selected Fire/Frost region/terrain, and no unintended horizontal overflow. Correct any visual regressions before declaring acceptance.
