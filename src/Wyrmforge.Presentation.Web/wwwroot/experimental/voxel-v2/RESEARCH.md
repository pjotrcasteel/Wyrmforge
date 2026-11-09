# Voxel V2 — independent research ledger

Date: 2026-11-09. Status: **in progress**, not a 75-source completed review.

## Verified references (distinct source documents)

1. [0fps: Meshing in a Minecraft Game](https://0fps.net/2012/06/30/meshing-in-a-minecraft-game/) — greedy quads versus naive; fragmented geometry limits savings.
2. [0fps: Meshing Part 2](https://0fps.net/2012/07/07/meshing-minecraft-part-2/) — topology, seams and triangulation tradeoffs.
3. [0fps: Ambient occlusion](https://0fps.net/2013/07/03/ambient-occlusion-for-minecraft-like-worlds/) — merge constraints when per-vertex lighting differs.
4. [Godot Voxel Tools: Performance](https://voxel-tools.readthedocs.io/en/latest/performance/) — upload budgets, snapshots, collider construction and bulk edits.
5. [Godot VoxelTerrain API](https://voxel-tools.readthedocs.io/en/latest/api/VoxelTerrain/) — 16/32 mesh chunk tradeoff.
6. [MDN: WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices) — conservative VRAM accounting and resource disposal.
7. [Khronos: WebGL2 disjoint timer query](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/) — asynchronous GPU measurement, optional extension.
8. [Khronos: WebGL1 disjoint timer query](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query/) — async measurement semantics.
9. [MDN: Transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects) — transferred buffer ownership.
10. [MDN: Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) — worker message and cloning behavior.
11. [MDN: Structured clone](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm) — data types and serialization limitations.
12. [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) — refresh-rate variability and background suspension.
13. [MDN: Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) — exclude hidden-tab intervals from performance runs.
14. [MDN: WebGL context lost](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event) — handle loss and resource recovery.
15. [MDN: isContextLost](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/isContextLost) — explicit context state checks.
16. [meshoptimizer](https://github.com/zeux/meshoptimizer) — indexing, vertex cache/fetch, mobile tile GPU overdraw tradeoffs.
17. [UnityVoxelTerrain prototype](https://github.com/Rabidus4k/UnityVoxelTerrain) — smooth density-field alternative and chunk-local rebuilds; not proof of mobile performance.

## Decisions supported so far

- **Adopt:** benchmark 16³ vs 32³; bulk edit and one authoritative writer; bounded snapshot/worker queue; revision-gated result acceptance; budget GPU uploads and explicit buffer disposal.
- **Adopt:** report p50/p95/p99 frame intervals and hitches; exclude hidden-tab pauses; distinguish CPU timings from optional GPU timer-query measurements.
- **Benchmark:** naive exposed faces vs greedy meshing under fragmented destruction, including vertex count, CPU build cost, GPU upload bytes, and latency.
- **Defer:** density-field marching cubes, LOD, octrees, and meshoptimizer integration until measured need.
- **Risk:** a full-site Pages artifact from an old cache can roll back production; deployment safety is a V2.0 gate.
- **Open question:** 10 cm experimental voxels vs existing 12.5 cm canon; owner approval required before integrating a changed gameplay contract.

## Remaining research

Target 75 distinct sources across storage, meshing, destruction, workers, mobile graphics, physics, persistence and deployment. **58 further distinct references remain**. Do not claim research gate complete before each is inspected and linked to a decision or rejection.

No device performance claims are supported by this desk research.
