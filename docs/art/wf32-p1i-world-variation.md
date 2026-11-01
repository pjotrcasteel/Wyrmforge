# WF32-P1i — World-coordinate terrain variation and generic corners

**Status: source-only AR4 art review. Not merged or deployed to live Hunts.**

## What this extends

Previous WF32-P1h paints degrading flagstone, cobble and brick road on a periodic 256px field. Repeating this field across a complete arena would repeat recognizable stone silhouettes even when a different degradation texture is selected per tile. P1i introduces an **optional world-coordinate source painter** using the same existing WyrmForge `Bitmap` utility and `DEGRADATION_STATES`. It does not build a new GPU renderer, world generator, shadow engine or runtime material owner.

## Reusable contracts

- `createWorldMasonryWindow(type, {originX, originY, width, height, seed, state})`: stable, global-coordinate site placement, irregular outlines and regionally clustered wear. Separate `stoneIds`, `originalIds`, `heights` and `roughness` buffers. Window origins and dimensions align to 32px; geometry, albedo and per-stone decisions must match in overlapping windows. Family can be `flagstone`, `cobble`, or `brick`. States reuse P1h's `intact / worn / broken / collapsed / reclaimed` progression.
- `worldBoundaryMask`: cardinal edges and **outer + inner corners** use consistent shared roles. Its parameters are test-art coordinates; actual road/site boundaries must come from AR3 C# material weights, never from a JS preview's authored intersection.
- `createWorldBoundaryWindow`: adds a surrounding 64px halo for whole-stone elimination. Soft material fills the removed stone space without chopping still-visible fragments at the edges of the output window. This uses a source-only global, nonrepeating soft-color sampler; no scene ownership.
- `worldLightingMaps`: derives tangent-space normal and G-channel roughness from terrain relief/response data, compatible with the *existing* shared `LitMaterial` contract (`albedo`, `normal`, `roughnessMap`, scalar `specular`). These are prototype height/roughness values; the renderer's real shadowcasting still needs authored geometry or occluders.
- `cutWorldInto32`: source preview cutter only; exported 32px cells reconstruct their parent pixel field. Do not randomize cells individually or reintroduce a 256px stamp.

## Testing

Run from WyrmForge repository root:

```sh
node --test tests/javascript/terrain-world-variation.test.mjs
node --test tests/javascript/terrain-*.test.mjs tests/javascript/wet-forest-32.test.mjs
node tools/art/prototypes/build-world-variation-review.mjs docs/art/previews/wf32-world-variation
```

P1i adds seven tests covering independent overlapping world windows for three masonry families, no repeated 256px pattern, all edge and corner roles, whole-stone preservation, 32px map reconstruction, and bad input rejection. **41 local Node tests across the current art suite passed.** Full repository CI is a separate check.

## Review artifacts

The opt-in review CLI outputs `world-material-comparison.png` (flagstone/cobble/brick), `inner-outer-corners.png`, `offset-windows.png`, sample albedo/normal/roughness maps, and `manifest.json`.

**Limitations / next gates:** These material studies are not actual in-game screenshots. Art style, regional road width, contact with grass/mud, and mobility-scale contrast are not owner-approved. Physically plausible lighting must be checked with the existing G engine and C# site in a later AR4 integration after AR3 approval. World-coordinate generation is a source-only quality demonstrator; production must use C# geography and bounded atlas/cache budgets, not generate 512px CPU paintings every frame. Additional environmental debris and seed diversity tuning remain optional, not a replacement for the generic grammar.
