# Experimental voxel foundation v2

Status: isolated experiment; not production engine.

## Entry point
Proposed public route: `/experimental/voxel` under the existing GitHub Pages base path `/Wyrmforge/`. Route is not live until the experimental page is implemented, merged, and deployed.

## Non-negotiable constraints
- Preserve Wyrmforge's pixel-first, mobile-first 2.5D presentation; voxel is a *terrain data representation*, not a mandatory runtime 3D mesh engine.
- No dependency from production Hunt onto experimental code. No replacement of the production renderer.
- Fixed-step simulation separate from rendering, with a frame-time budget and bounded work per frame.
- A voxel edit invalidates only the intersecting chunk and its immediate edge neighbors when necessary; never the whole world.
- Terrain coordinates and render offsets have one authoritative transform; camera movement cannot alter stored terrain geometry.
- Static terrain buffers are cached; visual changes use stable world coordinates, not camera-relative texture writes.
- Batch visible draw work and avoid allocations in hot loops; offscreen chunks are culled.
- Lighting, destruction, spawning and VFX each have independent, measurable budgets.
- Instrument median, p95 and p99 frame times, update cost, draw cost, dirty chunk counts, rebuild counts and allocations where available.
- Test on real iPhone Safari and Android Chrome, at 320px and 390px logical widths.

## Milestones and acceptance
1. **V0: independent route and diagnostics.** The experimental page loads without Hunt initialization. Show device pixel ratio, FPS, frame-time histogram, active chunks and renderer mode. Test direct navigation and refresh on Pages.
2. **V1: deterministic chunk data.** Sparse material/elevation cells and deterministic generation. Unit tests cover negative coordinates, chunk boundaries, reproducibility and edit isolation.
3. **V2: pixel-first renderer.** Draw only visible chunk surfaces with correct camera transform and consistent pixel snapping. No visible camera jitter. Profile scroll and zoom.
4. **V3: local destruction.** Fireball crater affects a bounded dirty region, with a fixed work budget and deterministic replay. Measure latency and rebuild counts.
5. **V4: material and lighting integration.** Restore art and existing shared lighting contracts without global terrain redraw.
6. **V5: ambush stress.** Spawn in bounded batches; separate AI, animation, particles and terrain updates. Test worst-case simultaneous explosion and ambush.
7. **V6: parity gate.** Compare native-size captures, responsiveness and device frame-time traces with production before considering any migration.

## Initial performance targets (to verify on devices)
- 60 FPS aspiration on recent phones (16.7 ms frame budget), 30 FPS floor on supported lower-end phones (33.3 ms).
- No synchronous world-scale regeneration or rebuild.
- Destruction cost scales with changed cells/chunks, not total map size.
- Explicit stress benchmarks and p95/p99 budgets must pass before adding gameplay complexity.

## Isolation layout (proposed)
- `src/Wyrmforge.Presentation.Web/Pages/Experimental/Voxel/`: isolated route and diagnostics.
- `src/Wyrmforge.Presentation.Web/wwwroot/experimental/voxel/`: experiment-specific rendering code and assets.
- `tests/javascript/experimental-voxel/`: deterministic world and renderer tests.

## Release policy
Use a dedicated experiment branch and PR. Do not merge to main until route isolation, automated tests and build validation pass. Merge of an isolated route does not authorize switching production Hunt to this engine.

## Fast iteration delivery (owner decision, 9 November 2026)
- Develop the experiment as a standalone static HTML/JavaScript app. No Blazor or .NET dependency in its edit/test loop.
- Keep it in the same repository and under the public route `/Wyrmforge/experimental/voxel/`.
- Run focused JavaScript tests on every experimental change; keep full solution CI for production integration only.
- GitHub Pages currently deploys the whole site through the main-branch `pages.yml` workflow, so an experiment-only push cannot independently update the same public Pages URL. Do not claim otherwise.
- First create the static app and focused tests on the experiment branch. Then adjust the Pages publishing architecture to allow quick static-only experiment updates without losing the production site's published files. Preserve the existing site and 404 deep-link fallback.
- Until that publishing path is proven, the route is not live and changes on the experiment branch are not public.
- Optimize for small, coherent checkpoints with direct browser feedback; benchmark actual commit-to-live latency instead of promising a fixed deployment time.
