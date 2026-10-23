# WyrmForge Arena Rebuild V2 — Step 3: new environment assets

## Scope and non-negotiable reset
The owner explicitly rejected the previous arena environment: **do not reuse or polish old trees, campsite, stone roads, shrubs, rocks, ruins, splines, or collision maps**. Step 1 is the approved **ground foundation**; Step 2 develops only the dirt/mud forest trails and clearings (PR #280 is not yet merged; do not claim it is live). Step 3 produces entirely new standalone Wet Forest assets, **not** an integrated scene.

This phase is **concept creation and acceptance**, and keeps every asset independent. The reference boards created during the 22 October design session are **moodboards only**: they are not sprites, not transparent, not a production atlas, and must not be rendered into the game. Each asset listed in the separate `asset-review-manifest.json` is pending approval.

## Aesthetic target
Grounded Gothic dark fantasy, old wet European woodland with a subtle unsettling feeling. Organic decay, convincing trunks and branch growth, restrained moss, damaged deadwood, natural rock stratification. Wet and ancient, not whimsical, glowing, alien or lush high-fantasy. Maintain the detail level of the accepted town **without copying town artwork**. Source sprites should have no text, cards, UI elements, environment backgrounds, fake cobblestone floors, baked soil, shadows that contaminate the ground material, or procedural rectangular decals.

### Asset shortlist, first pass
1. **Ancient living oak** — main forest silhouette. Broad asymmetric crown, textured aged bark, strong trunk that remains readable with canopy faded by depth sorting. Separate optional front foliage layer only if needed by runtime.
2. **Split dead elm** — distinct thin angular silhouette with broken limbs; Gothic, weathered and rooted, not a monster tentacle.
3. **Tangled understory shrub** — smaller leaf mass, dark tangled wet stems and a visible broken outline; not identical repeated rounded bushes.
4. **Exposed roots** — sculptural organic root cluster with alpha gaps exposing unchanged approved grass and mud beneath it; no sprite-sized dirt rectangle.
5. **Mossy wet boulder** — naturally irregular stone with a visible rounded lower body, not a cobble-road fragment or tiled prop.
6. **Fallen rotwood log** — long splintered fallen trunk with uneven diameter and wet patches; multiple future orientations are allowed after the first is approved.

## Render and asset contract
- Render at a consistent **three-quarter top-down 2.5D camera**. Keep scale relative to the player consistent; never generate a perspective-specific image and then arbitrarily rotate it in the game.
- **Each object is its own independent PNG/WebP**, ultimately transparent RGBA with complete bounding silhouette, alpha-safe edges, no 1px dark studio matte, and no neighboring assets. The design boards and extracted previews are for review only.
- Native/mobile pipeline is allowed to transcode approved source art (ASTC/ETC2/compressed atlas) and to separate foliage/occlusion layers; no browser-specific asset ownership.
- Pivot values in the JSON manifest are provisional normalized anchors. When implementing, adjust based on actual silhouettes and decide collider footprint **only after** the final art is accepted.
- Collision is NOT implemented now. Do not invent rectangles around a tree canopy; potential colliders should be measured around trunks/rock bodies after accepted art is placed.
- Rendering integration remains out of scope: no changes to `ArenaLab.razor`, `arena-ground-foundation.js`, `arena-ground-trails.js`, `arena-materials.js`, existing Hunts or the canonical C# simulation.
- **Performance acceptance**: test at an iPhone-sized 390 × 844 viewport AND on Android hardware, measure texture footprint and overdraw, and check canopy readability and correct near/far occlusion. Do not label native performance tested based only on browser smoke.

## Required visual review gates
1. **Individual silhouettes**: each of the six objects is recognizably different, aesthetically cohesive, framed and unclipped, without art-card labels inside the sprite.
2. **Alpha and ground**: layer candidate against untouched approved ground on *natural, mud and dirt*, with no opaque matte, no soil pasted under objects and no rectangular edges.
3. **Depth and scale**: 2.5D sort pivot at actual roots/base, controlled top/front layer, realistic scale versus mage and unobstructed pathways.
4. **Screen composition**: only after *individual* art acceptance, make a separate opt-in asset review stage, never automatically restore old forest assets. Test mobile readability and performance before promotion.
5. **Gameplay collision**: separately design and test navigation, occlusion and clearance in a later milestone. Step 3 does not add any obstacles to the ground-only arena.

## Workstream status
- **Started now:** new visual language/reference board, six separated design targets and a manifest specifying separate object acceptance.
- **Not done / not claimed:** six independent game-ready transparent sprites, manual alpha cleanup, native compression, integration in the arena, collision, animation, or user approval.
- **Next gate:** approve/revise the six individual designs and produce full-quality separated transparent source images; then create a dedicated non-gameplay asset review lab before considering any scene integration.
