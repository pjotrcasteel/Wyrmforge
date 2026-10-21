# Arena Generator Lab — playtest checklist

This development lab is a routed Blazor WebAssembly page at `/arena-lab`. It is built on top of the **same C# `ArenaEnvironmentState` and `HuntArenaGenerator`** as the proposed in-game arenas, not a screenshot, imitation generator or independent random playground.

## Open the lab

The development page is at https://pjotrcasteel.github.io/Wyrmforge/arena-lab.
Wet Forest is being developed and accepted first; other biome modes remain experimental.
Normal Hunts do not use the new scene until acceptance.

## What to test

- Cycle through Abandoned Road, Wet Forest, and the Frost habitats. Regenerate with identical seeds, verify reproducible placement and distinct environmental texture with different seeds.
- Explore the wet old road, scattered wooded glades and human traces in both directions. There are
  **no compulsory horizontal barriers, gated checkpoints or empty cross-shaped bands** in Wet Forest.
  Movement must stay reachable in multiple ways; physical prop collision must match actual art.
- Toggle **Collision outlines** to inspect the actual C# collider coordinates. Tree canopy may overhang walkable space; its narrow trunk remains solid.
- Enable **Pathing mobs** to observe two non-attacking enemy movement probes approaching around props. This is for navigation only, not a full combat simulation.
- Select **Hit prop** or **Blast area**, then tap an object. Destruction should remove its collider and its rendered object. Drops should appear only when applicable, and be collectible once by moving close.
- Set Wyrm proximity to stages 1, 4 and 8. Wet Forest should gradually show localized Fire influence, without a uniform color wash.
- Test portrait 320×568 and 390×844, and a wide desktop display. Keep the controls usable and maintain 30+ FPS or better where possible.

## Scope

The page does not unlock abilities, save player data or spawn real combat rewards. It is a test-only inspection surface, not a replacement for the full game or final environmental art. Report visual scale, hitbox and navigation issues before merging the gameplay PR.


## Wet Forest depth and cohesion check (21 October 2026)

- Compare seeds with contact shadows and litter enabled (the dressing is part of the cached
  terrain texture and therefore cheap to render each frame). Ground should read as wet loam,
  moss, old wood and scattered forest floor, not an unrelated uniform color tint.
- **Hollow and Ashling**, not Mire Hound, are the two non-attacking movement probes.
  Their approved pixels should remain intact; real movement distance determines foot poses.
  Check feet touching dirt at 390px and 320px, including movement behind rooted trees.
- Compare resting vs moving enemies, collisions at fallen logs, barrel destruction and
  pickup readability. No mandatory crossing walls or glow circles have been reintroduced.
- Acceptance is visual: the current environment atlas is still a basic proxy and needs
  a later focused Gothic tree/canopy art pass. Do not describe this as final artwork.

## Pixel material-pass acceptance — 21 October 2026

Candidate branch `feature/wet-forest-pixel-ground-20261021` (not shipped unless merged).

- Open `/arena-lab?seed=1204&stage=1&habitat=WetForest`, then repeat with seeds 1205 and
  3312. Compare the trail, puddles, root dressing and named site. The forest should have
  recognisable ground material clusters rather than smooth islands over a gradient.
- Walk across the entire trail and approach the offshoot and visible story site from both sides.
  The route must remain navigable and the drawn ground must not imply new solid boundaries.
- Try all four site identities via **Different seed**, checking disturbed graves, charred camp
  floor, broken flat waystone paving and cart ruts. Physical objects are still the C# props.
- Hit a tree/barrel and verify that its collision and sprite disappear together, while baked soil
  and footprints remain a floor detail. Turn Collision outlines on/off for comparison.
- Test 320×568 and 390×844 portrait Safari, with Hollow and Ashling following, plus a desktop
  wide scene. Check legibility at actual device scale, no noisy gridlines, correct feet contact
  and acceptable FPS. A successful automated test is **not** owner/device visual approval.
- Stage 1 versus stage 8 should differ via local soot spots only, not a global Fire color wash.

Pure JS regression: `tests/javascript/arena-wet-forest-art.test.mjs`. No changes to C#
world generation, enemy AI, saves or normal Hunt staging. Final Gothic forest atlas remains
outstanding; this checkpoint is a consistent material base for those assets, not the final art.

## Prop-grounded tree and understory pass — 21 October 2026

The same `feature/wet-forest-pixel-ground-20261021` draft PR now adds varied existing tree
atlas frames and local roots/lichen/sedge. Verify all with the same **physical C#** objects:

- Compare seeds 1204, 1205 and 1441, particularly groups of pines at the edge of the
  wandering trail. Pines should vary in height; no generic Christmas-tree repeat pattern
  should dominate a single phone viewport.
- Toggle Collision outlines: only the existing trunk/collidable prop circles appear, **not**
  extra canopy, decorative roots or grass blockers. Player and Hollow/Ashling can still walk
  around props; enemies must pass visually behind a tree when their world feet are farther back.
- Destroy a pine: both raised sprite and collider go away in the same simulation frame; baked
  roots/ground soil remain but must read as flat debris, not a standing tree. Check stale
  foliage does not cover the player after destruction.
- Compare ordinary Hunts and Frost in the lab: neither inherits Wet Forest-only frame
  selection or attached lichen. View at 320/390px and compare stable 30+ FPS mobile play.
- CI: `tests/javascript/arena-wet-forest-vegetation.test.mjs` covers frame identities,
  seed repeatability, C# footprint mapping, preview-only scope, static detail bounds,
  and absence of physical-state mutations.

No merge or final-art claims before visual acceptance. All actual Gothic tree/canopy sprite
replacement work remains outstanding.

## Experimental canopy acceptance — 21 October 2026

Browser snapshots now include `arena-lab-wetforest-320.png` **and**
`arena-lab-wetforest-390.png`, after the start-up overlay disappears. Both must show:
- Different irregular pine masses, skeletal dead trees and shallow ground roots around their
  actual C# footprints; no glowing plants, unexplained collidable decorations or flat tree tint.
- Physically correct back/front depth when Hollow, Ashling and mage cross each C# tree foot.
- Readable player and enemies at actual 320px width despite larger tree overhang. Movement,
  spells and destructible prop hits must still be apparent.
- Similar or better browser FPS than the earlier triangular-atlas pass. The pixel bitmap is
  drawn **once per prop** and reused, with a capped cache to protect long mobile runs.

A passing test/browser screenshot is *evidence for owner review*, not automatic art approval.
If it fails visually, adjust/revert the Lab-only silhouette experiment before release.

## Actual Hollow and Ashling rig parity — 21 October 2026

The Wet Forest Lab previously used `drawEnemyPixelArt` for **both** navigation probes. That path
is the tiny generic atlas fallback, **not** the character art Regular Hunts prioritize. It made
both monsters look like sprites pasted onto the scenery even after the ground and tree updates.

The Lab now loads and drives the **same existing directional authored source** as Hunts:
`hollow-sprites.js` for `EnemyKind.Hollow=0` and `ashling-sprites.js` /
`rigged-sprites.js` for `EnemyKind.Ashling=2`, with genuine 8-facing source clips.
Their position, IDs, foot depth and movement remain supplied by the C# Arena Lab. Both probes
are **nonattacking**, so Lab adapter passes `player: null` to animation playback and cannot
manufacture contact attacks/deaths. The original compact atlas remains a bounded loading/offline
fallback, never an acceptable source for final sprite screenshots.

Browser screenshot gates for **both 320px and 390px** now wait until
`readArenaLabDiagnostics(canvas).enemyArt.hollow && .ashling`. Compare movement in
all eight headings, idle planted feet and passing in front of/behind grounded physical tree
colliders. If either bundle fails to load, flag the screenshot as **not a valid art review**.
No animation asset bytes, identity, damage or combat logic have been modified in this step.

## Gothic material and silhouette candidate — 21 October 2026

Review branch `art/wet-forest-gothic-materials-20261021` before accepting its art.
The lab-only terrain painter now uses a narrower, low-saturation wet-loam/mud/moss
range and sparse seed-stable soil grain, not a broad dark overlay. Lab-only pine
crowns use narrower, broken bough masses with cold highlights and more exposed
black timber rather than wide rounded blobs. Existing tree feet, authoritative C#
colliders, site history, routes, drops, depth sorting, Hollow/Ashling rigging, and
ordinary Hunts remain unchanged.

### Owner visual acceptance

- Compare identical seeds `1204`, `1205`, and `3312` at 320px and 390px.
  The floor should read as loam, mud and old wet paths **without checkerboarding**
  or flat single-colour expanses.
- Trees should read as old, heavy and damaged, with irregular needles and open
  spaces; reject any new simple triangular silhouettes, rounded clumps, or high
  saturation green.
- Keep physical C# tree feet and real actor front/behind ordering. The full tree
  remains visible until its actual physical prop is destroyed.
- Inspect the four seeded human-history sites and 1/4/8 Wyrm proximity levels.
  Don't fix atmosphere by uniformly darkening the canvas or hiding visibility.
- Compare moving real Hollow/Ashling and the player in the scene at true iPhone
  size, including combat-readability expectations.
- Check the existing 30+ FPS mobile target. This is a **visual candidate**, not
  accepted final artwork, not a replacement for approved concept art, and not
  permission to enable generated arenas in normal Hunts.

## Gothic material boundaries and historically grounded prop sprites — continuation

The second Lab-only candidate adds **seeded 2px local material-edge stitches** to
soften hard grid cell changes at roads, puddles and leaf/mud margins. Its
`createWetForestTilePlan` and the original C# trail, patches, traversal and
encounter identities are unchanged. Material edges are drawn once in the cached
ground texture. They neither create world colliders nor add new terrain paths.

The three physical tree anatomies now grow lateral timber from a continuous trunk
and leave sparse negative space between broken boughs. Fallen logs, grave markers,
waystones, the charred camp and the broken wagon use original *code-authored pixel
studies* from `arena-wet-forest-sites.js`, replacing the cruder generic silhouettes
only for their existing Wet Forest Lab prop IDs. These are **candidate sprite studies**,
not externally approved PNG/atlas sprites and not a claim of finished quality.
They remain drawn in the same world-foot-sorted prop pass, and disappear when the
authoritative C# prop disappears. No new objects, loot, collision, damage or
navigation is introduced.

### Test / acceptance additions

- Generate seeds 1204, 1205, 3312 and compare trail bends, muddy banks,
  grave/camp/waystone/cart identities, and differences among old pines.
- Zoom at both 320 and 390 phone widths: check that material seams are not
  visible as square grids; graves read as worn human monuments; cart/wagon parts
  remain human-scale; trunks do not appear to float.
- Switch collision outlines on; check accurate physical feet and occlusion
  while real Hollow/Ashling rigs circle site props and trees.
- Hit a physical site prop, log and tree. Rendering must disappear with its
  collider, while only truly flat floor traces persist.
- Test stage 1 versus 8: no overall darkening/colour wash, no occult neon
  effects from ancient unpowered stones, and mage/enemy silhouettes stay readable.
- Review before/after local screenshots, mobile FPS/memory and CI; **passing
  tests are not visual acceptance**, and normal Hunts must stay untouched.

## Fire-influenced trees — step 1 (route-normalized Lab review)

The fire Wyrm should visibly damage forests on the **chosen route**, not after a
fixed number of global combat-pressure stages. The first implementation uses
`WyrmrealmHuntProgress.Fraction(routeNode, routeNodeCount)` where **routeNode**
is 1-based and **routeNodeCount** includes the eventual Wyrm. For example,
node 2/4 is 33% but node 2/14 is only 7.7%. The player cannot burn through a
long Hunt as quickly as through a short one. Alternative/unselected/optional
nodes do **not** inflate the chosen route's denominator.

**Scope and status:** This step adds three illustrative route-length presets
(4, 8, 14) and a selected-node slider to the actual generator Lab. It feeds
the normalized value as `ArenaEnvironmentRenderSnapshot.Corruption` for **Lab
rendering only**. The physical Wet Forest seed and prop IDs stay fixed while the
node slider advances, so changes are actual damage to the *same* trees rather
than rerolling a different woodland. The C# `WyrmrealmMapState.CombatStages` pressure stages and
existing regular-Hunt path logic remain separate. The full game should later
supply its genuine committed route length and ordinal from its traversal state;
the Lab does **not** pretend to know a future player branch in advance.

For fire-ecology Wet Forest and **existing physical tree prop IDs only**, seeded
per-tree thresholds progress monotonically from intact/healthy to **charred**,
then some to **burning**, and a rarer subset to **split-glowing**. Trees that are
already dead or naturally fire-resistant can remain charred without every
trunk turning into a flame. Broken boughs, near-black bark and needle loss are
baked as tiny pixel shapes into the existing 112×128 cached tree artwork.
Bright orange pixels are restricted to actual burning wood or split cracks.
A handful of 2px motes flicker at frame time without rebuilding the bitmap.
No new trees, floor scorches, fissures, magical wash, collision, loot, navigation
or damage is added in step 1. Frost/other regions and normal Hunts still use
their own approved art.

**Review:** Test the same seed with Short node 1/4, 2/4, 3/4 and 4/4,
then Long node 1/14, 2/14, 8/14 and 14/14; compare percentages and tree identities.
Switch to Frozen Road to check zero fire effects. Hit a charred/burning
tree and verify its sprite and collider disappear together. Inspect the
moving Hollow/Ashling silhouettes and mobile FPS at 320/390px. Check
the resulting Art and Playwright captures before merging.

## Wet Forest ground fidelity, ruined-world readability (21 October)

This iteration changes the **real Web renderer** for the physical C# Wet Forest
Arena Lab, not a picture, a CSS darkening filter, or another isolated demo.
The existing connected fighting glades from the horde-playability change
remain completely unchanged: no C# path edits, new blockers or combat hazards.

- **Wet soil**: small seed-stable striations, crushed leaf tips, softened road
  wear, dim moss and interrupted reed reflections in dark puddles. Different
  material families get different *microgeometry*, not a single random
  noise brush. The same real C# winding trail gets broken eroded ruts; physical
  200px+ combat glades get dispersed crushed leaf/soil around their margins,
  **not** around an invisible collision circle. Built into the static floor
  texture, not the game loop.
- **Fire ecology**: scorches are anchored solely to actual C# tree IDs whose
  seeded art has already become charred/burning at the chosen route percentage.
  Baked ash remains harmless, as do a few restrained hot embers beside actively
  burning tree roots. At 78%+ influence, a minority of burning roots split the
  soil with short glowing seams; these are purely visual, **not** hazards or
  telegraphs. Other elemental habitats get **zero** fire ash.
- **History**: shattered stone, split timber and old soot lie on the ground
  around the physical grave, waystone, abandoned camp, wagon and fallen-log
  prop positions. No scenery duplicates or invisible walls.
- **Horde contract**: the center and travelling clearings remain walkable
  despite visual texture. Enemy collision, navigation, destructible props,
  automatic spell targeting and existing Hollow/Ashling art do not change.
- **Performance**: all material details and ruin litter are baked once into
  the existing bounded scene texture cache. There is no per-frame surface
  regeneration and no new atlas, sprite-download or canvas-image dependency.

### Test before accepting

Compare identical seed 1441 at node 1/14, 8/14 and 14/14 at real
iPhone widths 320 and 390. Check microdetails stay legible, never
checkerboard. Walk an entire glade while enemies approach from multiple
directions; rooted ash should only appear under corresponding burning trees.
Toggle collision outlines and hit a cart/tree to verify actual C# footprint
and destruction. Verify the minimum target of 30 FPS on mobile with large
enemy packs *before* enabling this world in ordinary Hunts. The present
two non-attacking Lab agents are not a substitute for a genuine swarm test.

This is an incremental procedural pixel-material improvement. It is not
claimed to match the town's fully illustrated art fidelity yet; that
requires reviewed, original, atlas-ready wilderness assets integrated
at the game's camera scale.
