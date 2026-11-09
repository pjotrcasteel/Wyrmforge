# Voxel v2 progress

- **Execution roadmap:** [ROADMAP.md](ROADMAP.md) — research-integrated V2.0–V2.7 milestones, acceptance gates, benchmarks, deployment safety and V2 engine contracts.
- **Research gate:** 75 documents recorded in [RESEARCH.md](RESEARCH.md), with decisions in [ARCHITECTURE-DECISIONS.md](ARCHITECTURE-DECISIONS.md); this is documentary research, not device-performance proof.

- Current milestone: **V2.0 — experiment shell** (in progress; acceptance not met).
- Branch / commit: `experiment/voxel-v2`; see GitHub branch head for current SHA.
- Deployment URL / deployed commit: proposed `/Wyrmforge/experimental/voxel-v2/`; **not verified live**.
- Completed implementation: isolated WebGL2 prototype, 16×16 horizontal chunk meshes, editable demo terrain, orbit/touch controls, pinch zoom, FPS and triangle counters, visible build identity from `build.txt`.
- Completed acceptance checks: repository instructions and Pages workflow inspected; **no automated or device verification yet**.
- Device evidence: none. Desktop, iPhone Safari and Android Chrome unverified.
- Benchmark results: none. Build/deploy time, frame percentiles and memory unmeasured.
- Changed architecture decisions and reasons:
  - Current demo is a prototype, **not** the roadmap's authoritative sparse 3D terrain core or final renderer.
  - Existing game canon locks pixel-first 2.5D, C# gameplay ownership and 12.5 cm fracture cells. Roadmap's 10 cm proposal remains an **isolated experiment** until owner approval for integration.
  - The full Pages workflow seeds a complete-site cache. Fast workflow now requires a cache matching the latest `main` SHA and fails closed if `main` changes before deployment. This avoids knowingly deploying a stale production baseline; it does **not** eliminate all concurrent Pages publication races.
- Known limitations / blockers:
  - Full Pages build must first seed a cache for the exact latest `main` commit; otherwise fast workflow intentionally fails.
  - GitHub Pages deploys whole-site artifacts. Separate experimental and production workflows still share the same Pages environment; deployment race safety needs independent verification before acceptance.
  - Existing demo has no hill/cliff/arch acceptance scene, capsule, projectiles, explosion presets, stress/export controls or frame percentile diagnostics.
  - Current demo uses a simple fixed array and synchronous meshing; not a production engine.
- Next concrete task: prove the fast workflow publishes the correct commit without replacing production, then implement V2.0 report export, frame percentile sampling, deterministic test scenes and desktop/mobile controls; validate desktop and request actual-device evidence.

## Roadmap acceptance order
V2.0 experiment shell → V2.1 terrain core → V2.2 rendering → V2.3 destruction → V2.4 bounded asynchronous work → V2.5 physical interaction → V2.6 integration contracts → V2.7 foundation release.

No milestone may be marked complete without its specified evidence.
