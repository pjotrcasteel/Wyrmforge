# AR1 — source-backed world-first site geometry (29 October 2026)

**Status: DRAFT / IN PROGRESS.** AR0 was explicitly owner-approved in chat after real 320/390px Chart↔Hunt screenshots; the existing draft [PR #404](https://github.com/pjotrcasteel/Wyrmforge/pull/404) continues without merging unapproved visuals. **Do not proceed to AR2 before AR1 owner review.** GitHub `main` remains `11329eae` for this implementation baseline.

## Same engine / same authoritative world

- **Chart**: the original `WyrmrealmMapGenerator` still produces the region, roads, forest forks, ridges and Wyrm endpoint. `WorldSiteGeographyProjection` adds deterministic, versioned C# site IDs and reciprocal graph-edge ports. The Chart renders the same site's location and exposes data attributes for test diagnostics.
- **Physical site recipe**: `WorldSiteLandscapeGenerator` (under the **existing C# Navigation world model**, not a second world engine) adds seed-stable bounded obstacle polygons and named topographic types: `forest-fork`, `forest-trail`, `mountain-pass`, `wyrm-lair`. Passage reservations follow C# site corridors and all graph-edge ports. Region-specific lair material/landmark identifiers distinguish Fire volcanic ribs from Frost ice spires. Rock, roots, cliff and ice footprints are geometric collision regions, not just drawings.
- **Actual gameplay authority**: `ArenaEnvironmentState` uses precisely the C# polygon footprints for movement, lines of sight and projectile sweeps when AR1 physical mode is on. Existing deterministic enemy spawn repair continues using `IsBlocked`. Normal Hunts continue with their original fixed encounter gates and existing gameplay; **the AR1 run-wide opt-in** is `?ar1Geography=1`. Only the opt-in removes those obsolete horizontal gates, allowing real road/port travel.
- **Exit commitment**: after clearing an AR1 encounter, physical exit portal locations come from the completed node's valid forward graph edges. Entering one stores the chosen graph-neighbor ID; the next Hunter's Chart choice is limited to that actual walked direction. No duplicate reward authority, no JavaScript route choices, no independent physics, and no automatic skip/cheat to later nodes.
- **Visual authority**: `arena-environment.js` renders the *same C# obstacle polygon outlines* as solid terrain diagnostics via `?arenaTerrain=semantic`. The current live camera/actor/renderer in `arena.js` displays actual site geometry and real exit portals. Both semantic and source-art presentation show the active C# footprints. Debug-only neutral illumination retains the normal production night-lighting fallback unchanged.
- **No new mechanics**: AR2 exploration/rewards, AR3 ecology/continuous weight maps, AR4–5 authored art, AR6 physical foliage/FXP and AR7 production cutover are not included here; existing PRs #338/#340/#381 and the Hollowed/animation/AI work are untouched.

## Evidence and acceptance

- C# `WorldSiteLandscapeTests` covers repeated Fire seeds, physical graph road clearance, reciprocal fork ports, collision/sweeps, active-vs-default fallback and Fire/Frost lair identity.
- JavaScript `ar0-world-site.test.mjs` and `ar1-world-site.test.mjs` assert palette/physical gating and drawing exact C# polygons.
- New browser `WorldFirstArenaBrowserTests.Ar1_ForestAndMountain_AuthoritativeSiteShapesAppearInActualPlayableHunts` explicitly starts ordinary Fire Hunts via the Town → Free Play → Hunter's Chart flow at 320 and 390 CSS-pixel widths. The `ar1SiteKind=forest-fork` and `ar1SiteKind=mountain-pass` options select deterministic **initial world seeds**, not an artificial level or reward skip. Each test verifies matching Chart/live C# `SiteId`, `Kind`, obstacle count, then saves genuine screenshots `ar1-{kind}-chart-{width}.png` / `ar1-{kind}-live-hunt-{width}.png`.
- AR1 **lair** plan and C# snapshot tests exist; actual real-Hunt Wyrm Lair screenshot and full gameplay/navigation/boss-space evidence **still required** before claiming full AR1 acceptance. Do not substitute a standalone Lab/painted PNG or award progression via a debug skip.
- [PR #404](https://github.com/pjotrcasteel/Wyrmforge/pull/404) must stay draft until full CI **on latest head** and owner-approved real capture pairs for forest, mountain and lair. Keep a note of any test failure; don't mark AR1 green just because a prior commit validated.

## Preservation and limitations

- The AR1 opt-in is an isolated **whole-run** collision configuration; switching the semantic/debug palette inside that run does **not** change C# collision. Unflagged players never gain invisible experimental cliffs or bypass the existing stage gates.
- Site mountains use physically blocked cliff polygons plus typed height/slope fields; future continuous gradients, full slope-sensitive movement and ecological material weights are AR3 extensions, not evidence that a generic tinted rectangle is complete.
- The Lair inherits real `WyrmrealmMapNode` identity, geography and obstacles; no invented gear system, route RNG, no secondary renderer.
- AR1 must stop at the mandatory owner visual gate; do not merge while visuals remain unapproved.

## Incremental mobile readability pass — owner direction: slow and steady

- Existing actual-Hunt screenshots from commit `205cf23e` at 390px showed that the first Hunt camera often displayed nothing except a large flat substrate and road, while authored obstacles remained outside the visible crop. This is a **visibility failure**, not permission to bake additional props into JS.
- `WorldSiteLandscapeGenerator.AddNearRoadShoulders` now places a few seed-stable obstacle polygons on both sides of existing C# road corridors, outside C#-reserved road clearance and the player/boss central safe envelope. These polygons use **exactly the same source geometry** for C# movement/sight/spawn and the existing Hunt Canvas. No CSS, palette or query choice changes world topology.
- The semantic renderer gives real rooted footprints a small visible core, and existing cliff polygons a directional rock seam, **inside** their C# footprint. These are identification hatches for the owner inspection, not a second light/collision/material engine.
- A new seeded property test requires forest/mountain physical footprints near the mobile starting-camera envelope, while existing swept 12px radius tests ensure roads remain unobstructed. Additional browser screenshots `ar1-{kind}-traversal-{width}.png` follow actual keyboard movement in the live Hunt at both 320px and 390px.
- This iteration is **not AR3**: no continuous material weights, no new source art, no alternative procedural painting, no FXP physics. The Wyrm Lair remains pending an honest end-to-end actual-Hunt gameplay capture.


## World-node → local-arena separation (31 October owner correction)

The Hunter's Chart supplies a **site-generation profile** (landform plus physical landmark),
habitat/ecology, world seed and travel connectivity. It must **not** dictate a literal
in-Hunt fork for each graph edge. A mountain + monastery node asks the C# arena generator
to create a unique mountain location with a real monastery footprint, not a Y junction.

- `WyrmrealmMapNode.GenerationProfile` is generated by the existing world-map authority.
  Elevation and landmark types compose independently; the same mountain landform can
  contain a monastery, village or wilderness.
- `WorldSiteGeography.Ports` and mandatory `Corridors` retain gameplay exit validation
  and collision-free travel permissions. Only C#-seeded `ScenicPaths` are drawn as
  local roads. A graph with two exits can now have one main trail; a world node with
  one exit can contain a locally generated trail fork.
- `WorldSiteLandscapeGenerator` reads the site-generation profile, not graph degree,
  and places a monastery hall, enclosure walls, an open gate and walkable courtyard
  as real C# collision geometry. The shared semantic renderer shows exactly those
  same footprints. Full architectural silhouettes/2.5D art remain in AR4/AR5;
  this AR1 pass establishes physical space without creating a separate engine.
- The previous forest-fork/mountain-pass captures are **superseded review evidence**;
  do not reuse them for approval. Re-capture genuine running gameplay after CI.
  Wyrm Lair end-to-end capture and owner AR1 sign-off remain mandatory.

