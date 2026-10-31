# AR0 — world-first map-to-arena C# geographic foundation (29 October 2026)

**Status:** implementation in [draft PR #404](https://github.com/pjotrcasteel/Wyrmforge/pull/404), **NOT visually approved**. Do not proceed to AR1 without the required real-play visual approval. The 29 October owner correction on main \`11329eae\` specifically **unblocks AR0–AR3** independently of Hollowed, ENG, G5, AI and FXP; prior draft PR #402 was superseded and closed.

## Live source-of-truth crosswalk

| Layer | Current source | AR0 ownership and changes |
| --- | --- | --- |
| World identity, graph, camp, river, bridge, roads and node types | \`WyrmrealmMapGenerator\`, \`WyrmrealmTerritory\`, \`WyrmrealmMapNode\`, \`WyrmrealmMapState\` | **Existing C# remains authoritative.** \`WorldSiteGeographyProjection.Attach\` projects this generated node graph into one versioned per-node \`WorldSiteGeography\`, with stable ID, region, seed, chart point, mirrored edge IDs, compass-facing ports and named mandatory landmarks. It consumes no extra RNG and does not change the map graph. |
| Chart | \`Features/Map/WyrmrealmMapView.razor\` | Reads the C# site's \`ChartCenter\`, \`SiteId\`, \`Version\`, \`Ports.Count\`; pre-existing C# territory roads, bridge, river and node choice mechanics are retained. |
| Actual local encounter | \`ArenaEnvironmentState.Create\` + \`HuntArenaGenerator\` + C# collision/supply/phase systems | The selected node's **same geography object** is copied into the runtime environment, without touching existing C# collision, obstacles, spawn, route rewards, refuge, loot, extraction or combat RNG. Local normalized port coordinates are **AR0 structural diagnostics**, not yet separate selectable committed travel exits. |
| Live snapshot | \`ArenaEnvironmentRenderSnapshot\` | Carries the identical immutable geographic descriptor. Old fields stay compatible. This extends the existing snapshot, not a parallel renderer or save authority. |
| Solid-color screen proof | \`wwwroot/js/arena-environment.js\` (called by the actual \`arena.js\` camera/compositor) | \`?arenaTerrain=semantic\` draws the C# substrate material ID and connected C# corridor strokes as named debug colors; graph port markers show entrance/exit orientation. Same actual Hunt camera and actor rendering, default painted view unchanged. JavaScript never decides terrain topology, collision, awards, graph or route choice. |
| Regressions and paired captures | \`WorldSiteGeographyTests.cs\`, \`ar0-world-site.test.mjs\`, \`WorldFirstArenaBrowserTests.cs\` | Tests verify C# edge reciprocity across Fire Tier I–III seeds, stable seed/version/snapshot identity and palette opt-in. The Playwright test enters a real Fire Hunt through Town → Chart → first playable node at 320/390px; it requires matching site IDs and stores **real** screenshots \`ar0-chart-{width}.png\` and \`ar0-live-hunt-{width}.png\` in CI artifacts. Captures are evidence **only after the matching run succeeds**. |

## Preserved branches and functionality

- [#338](https://github.com/pjotrcasteel/Wyrmforge/pull/338): separate JS one-road experimental prototype, **not** adopted as authoritative geography.
- [#340](https://github.com/pjotrcasteel/Wyrmforge/pull/340): source artwork and manifests unchanged; none of its unapproved image repetition methods were promoted.
- [#381](https://github.com/pjotrcasteel/Wyrmforge/pull/381): shared-GPU draft untouched; AR0 debug uses the **existing live Canvas adapter** until approved G5 cutover. No second lighting engine.
- Hollowed, animation, AI and FXP drafts: untouched.
- Existing Tier I–III fork selection, one-time rewards, refuge/extraction, collision, supply and boss logic: no changes intended. Existing art/default live path remains available.

## AR0 approval still requires real evidence

1. CI **on final PR head**: build, C# seeded graph/replay, JS and browser tests green. A previously green head or downloaded artwork candidate cannot substitute.
2. Inspect **genuine** 320/390px Chart ↔ in-Hunt capture pairs from the same selected node, confirmed version/seed/region/site/ports and real mobile layout.
3. Review which geographic concepts remain *diagnostic* rather than fully physical (notably local physical exit commitment, topographic barriers, river/bridge collision and multi-class ecological fields). AR1 must convert these into credible C# navigation/site geometry before claiming forest forks, mountain passes or lairs are completed. Do not mislabel decorative route lines as full traversal authority.
4. **Stop at AR0 for owner visual approval.** AR1, AR2, AR3, AR4 source materials and FXP work remain out of this branch.

## Preservation and limitations

AR0 debug colors are not serialized gameplay properties. The surface descriptor contains baseline height, slope, moisture, wear and shelter; full continuous ecology/material weights belong to AR3. Unapproved local map ports are read-only geographic diagnostics while legacy stage gates and exit remain live. No new gear economy, renderer, physics system, or image-to-terrain decoder was introduced. Physical-phone performance and artistic acceptance have **not** been demonstrated by source checks alone.
