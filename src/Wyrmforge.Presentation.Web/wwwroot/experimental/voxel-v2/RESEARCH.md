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


## Research batch 2 — storage, traversal, mobile rendering (2026-11-09)

18. [voxel-framework chunk coordinates](https://docs.rs/voxel-framework/latest/src/voxel_framework/chunk/mod.rs.html) — Euclidean division for negative chunk positions.
19. [voxel-framework DDA raycasting](https://docs.rs/voxel-framework/latest/voxel_framework/world/raycast/index.html) — cell-by-cell traversal and face normals.
20. [Owl Engine voxel data API](https://owl.argawaen.net/media/documentation/0.2.1/d8/d14/namespaceowl_1_1data_1_1voxel.html) — floor division and compact run encoding.
21. [Owl Engine voxel architecture](https://owl.argawaen.net/media/documentation/0.2.1/dd/d05/page-voxel.html) — chunk coordinate boundary examples and CPU/GPU separation.
22. [Sector's Edge optimized CPU ray marching](https://vercidium.com/blog/optimised-voxel-raymarching/) — 32³ packed chunks, avoiding empty allocations, chunk-local traversal.
23. [Amanatides–Woo reference implementation](https://www.mathworks.com/matlabcentral/fileexchange/26852-a-fast-voxel-traversal-algorithm-for-ray-tracing) — classic 3D DDA algorithm and references.
24. [Mobile GPUs and tiled rendering](https://developers.meta.com/vr/documentation/native/android/gpu-tiled/) — tile-based mobile GPU architecture and power constraints.
25. [WebGL/WebGPU texture upload benchmarks](https://github.com/mvaligursky/webgl-webgpu-texture-upload) — browser/GPU-dependent transfer performance; desktop-only evidence.
26. [Voxel chunk scheduler refactor analysis](https://github.com/maguirekrist/voxel_enginevk/blob/main/chunk_refactor.md) — avoid event-only dirty tracking and centralize neighborhood sampling; engineering proposal, not validated universal result.
27. [Interactive voxel brickmap and ray traversal](https://www.jorisar.nl/blog/VoxelPlayground/) — empty-brick acceleration and traversal alternatives; GPU architecture differs from WebGL2 baseline.

### Batch 2 implications

- **Adopt:** Euclidean/floor chunk division and positive local modulo, one canonical neighborhood sampler, test exact boundaries and negative positions.
- **Adopt:** 3D DDA raycasting with tests for zero direction, tie boundaries, inside-solid origins, and maximum travel.
- **Adopt:** separate authoritative packed voxel data from CPU mesh outputs and renderer-owned GPU allocations.
- **Benchmark:** 16³ versus 32³ chunks, including update time, allocations, draw calls, and fragmented geometry.
- **Defer:** brickmap ray-marched renderer; the referenced prototype does not establish WebGL2 phone suitability.
- **Risk:** event-only mesh scheduling can strand dirty chunks; reconcile desired revisions against in-flight/completed mesh versions.
- **Evidence caveat:** mobile tile-based architecture guidance is not a Wyrmforge phone benchmark; published texture-upload numbers are not transferable across devices.


## Research batch 3 — scheduling, ownership and cancellation (2026-11-09)

28. [Godot Voxel Tools development notes](https://voxel-tools.readthedocs.io/en/latest/development/) — prioritised worker tasks and background thread pool; implementation evidence, not a mobile benchmark.
29. [Godot Voxel Tools performance source](https://github.com/Zylann/godot_voxel/blob/master/doc/source/performance.md) — authoritative implementation discussion of unbounded snapshot accumulation, spatial locking, bulk edits, deferred GPU upload, and collider creation costs. **Same project as reference 4; distinct document, not an independent engine.**
30. [Godot thread-safe APIs](https://docs.godotengine.org/en/latest/tutorials/performance/thread_safe_apis.html) — GPU operations can require synchronization and cause stalls; background CPU work is not equivalent to asynchronous GPU upload.
31. [Godot Voxel Tools changelog](https://voxel-tools.readthedocs.io/en/latest/changelog/) — shutdown and queued-destruction race fixes illustrate lifecycle hazards. **Same project as references 4, 5, 28 and 29.**

### Batch 3 conclusions

- **Adopt:** one writer; bound pending jobs AND snapshot bytes; reserve main-thread GPU upload budget; treat GPU resource deletion as budgeted work; bulk spatial edits rather than per-cell event emission.
- **Adopt:** each job carries chunk revision, sampled neighbor revisions, world-generation epoch and disposable buffer ownership. Accept mesh only when all versions match; discard stale outputs without altering voxel truth.
- **Adopt:** reset increments world epoch, stops accepting previous-epoch results, and drains/terminates workers with a documented timeout. Explicit tests for reset/exit with work queued.
- **Benchmark:** upload and deletion time independently of worker meshing time; collider work independently of rendering.
- **Do not overclaim:** the revision/epoch protocol is our proposed design response to documented races, not a design proven by the cited documentation. Mobile performance and safe concurrency remain unverified.
- **Source independence warning:** multiple references are documents from the same Godot Voxel Tools project. Count distinct documents separately, but do not represent them as independent implementations.

## Remaining research

Target 75 distinct sources across storage, meshing, destruction, workers, mobile graphics, physics, persistence and deployment. **44 further distinct references remain**. Do not claim research gate complete before each is inspected and linked to a decision or rejection.

No device performance claims are supported by this desk research.
