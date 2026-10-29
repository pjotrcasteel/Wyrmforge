# ENG0 preparatory audit — pixel-first 2.5D consolidation (29 October 2026)

**Scope:** source-backed first pass against the GitHub \`main\` commit established after PR #405, before changing shared engine behavior. This is a **preparatory inventory**, not ENG0–ENG4 completion or authorization to bypass the post-Hollowed owner acceptance gate. Do not modify in-flight PRs #399 (Hollowed), #387 (AN0–AN6), #381 (G4/G5 renderer), or #404 (AR1 world geography). The new cross-engine contract is [canonical architecture](../canon/architecture-and-quality.md#locked--pixel-first-25d-runtime-contract-29-october-2026).

## Live ownership versus parallel demonstrations

| Responsibility | Actual source / authority | Parallel or legacy implementation | Decision |
|---|---|---|---|
| Gameplay, movement, collision, damage, run state | \`src/Wyrmforge.Application/Runs/Simulation/RunSimulation.cs\` and partials; \`arena.js\` calls C# \`Frame\` | Development/lab modes within same C# simulation | **Keep.** No JS- or model-owned damage, loot, route or navigation changes. |
| Lighting/material/visibility | \`wwwroot/js/lighting/{engine,registry,lit-sprite}.js\`; C# lighting snapshots | Live \`arena.js\` currently uses \`arena-night-lighting.js\` and \`arena-spell-lighting.js\` (Canvas transition); \`arena-scene-lighting.js\` is reached from the standalone lighting lab | **Keep transition until G5 real-Hunt cutover is visually accepted**. Do not delete a functioning Canvas fallback or count laboratory lighting as a second production engine. Do not add new independent emitters. |
| GPU implementation technology | \`lighting/engine.js\` uses bundled Three.js WebGL, \`OrthographicCamera\`, \`MeshPhysicalMaterial\`; \`lighting/lit-sprite.js\` uses foot-anchored \`PlaneGeometry\` | Three.js has a 3D scene graph internally, but the game uses 2.5D sprite/material planes | **Keep the backend.** The canonical rule prohibits mandatory 3D *game assets* and a 3D gameplay world, not orthographic shader implementation details. Replacing it on principle would be a regression and wasted work. |
| Character animation | \`sprite-animation.js\`, \`sprite-layer-compositor.js\`, \`rigged-sprites.js\`; \`rigged-sprites.js\` uses image atlas \`drawImage\` with smoothing disabled | Hollowed and Ashfang may use offline Blender source rigs; species-specific render adapters remain | **Keep** approved source models and 2D exports. Do not require new live GLTF, FBX, skeletal mesh or 3D animation mixer in Hunts. Await PR #399 and AN0–AN6 visual gates. |
| AI | Shared C# simulation/agent path, merged AI0–AI6; C# enemies and navigation contracts | AI6 performance follow-up PR #400 | **Keep** the shared C# authority; follow-up mobile frame/behavior sign-off is distinct from merge. |
| VFX and cosmetic physics | \`arena-spell-vfx.js\`, \`arena-frost-vfx.js\`, \`arena-lightning-vfx.js\`, \`ashfang-vfx.js\`, \`hollow-fracture.js\` (visual adapters) | Fire/Explosive FX PR #374; rejected \`hollow-bone-burst.js\` appears as a lab/test artifact, not a live \`arena.js\` import | **Do not delete** archived art or files still used by tests/labs. The cosmetic solver/VFX lifecycle consolidation is pending ENG1–ENG2 and FXP milestones; avoid a speculative giant rewrite. |
| Sound and haptics | \`sound-events.js\` feeds \`audio.js\`, via \`arena-performance.js\` | Draft audio asset approval PR #128 | **Keep** the existing mixer/event channel; do not add a second runtime or conflate audio quality acceptance with code review. |
| Town | \`refuge-town.js\` and approved painted Town; Town lighting/day-night path | Parked Town PR #368 with T0–T2 concepts | **Keep** the actual 2D Town and preserve its accepted art. The formerly proposed mandatory future 3D Town is explicitly **not** an active roadmap dependency. |
| Arena geography | C# \`WyrmrealmMapNode\` and \`HuntArenaGenerator\` → environment snapshots | PR #404 AR1; prior artistic arena experiments #338/#340 | **Do not touch concurrently**; AR0–AR3 is exempted from Hollowed/ENG sequencing but remains pixel-first 2.5D, with solid-color real-Hunt gates. |

## Concrete findings

1. The main Hunt **still uses the Canvas night/spell lighting** in \`arena.js\`. Deleting it before G5 would break the playable fallback. The standalone \`arena-scene-lighting.js\` only appears from \`arena-lighting-lab.js\` and its test; it is a preview, not the shipped Hunt light engine.
2. The shared GPU lighting renderer internally uses **Three.js** for orthographic planar sprite/material rendering. This is an implementation dependency, **not evidence of a mandatory 3D model production pipeline**. Its sprite material and occlusion tests remain useful.
3. \`rigged-sprites.js\` already draws pixel atlas frames at ground anchors with \`imageSmoothingEnabled=false\`. Existing offline models can continue exporting to this shared 2D presentation contract.
4. Existing legacy or rejected work has **references in labs/tests/workflows and active PRs**. A blanket dead-file deletion would destroy useful source evidence and possibly work in progress. Removal needs verified import graphs and owner gates.
5. Canonical Town milestone text still suggested an obligatory **future 3D Town**. This contradicts the owner-cancelled rebuild and pixel-first decision; the cleanup corrects that roadmap dependency rather than rewriting the Town.

## Safe changes in this checkpoint

- Correct the obsolete future-3D-Town dependency in canonical roadmap. T3–T6 are parked and must be **re-scoped to the approved 2D/2.5D Town if explicitly revisited**, not unlocked by building a 3D city.
- Add \`tests/javascript/engine-2p5d-boundaries.test.mjs\` to the existing Node validation suite. It guards **one GPU owner**, proper orthographic sprite geometry, true pixel sampling, single C# authority and no silently introduced runtime 3D model-loading/skinning system. The bundled Three.js GPU backend is explicitly allowed.
- Keep all source art, runtime fallbacks and PR ownership untouched.

## What must be verified before ENG1–ENG4 cleanup

- **Hollowed gate:** wait for reference-consistent anatomy/motion and owner visual approval of the current active work. Do not alter #399/#391/#385/#387 during this preparatory audit.
- **G5 gate:** after PR #381 has real live-Hunt GPU sprite/material/light parity and mobile proof, migrate callers to one registry, then remove Canvas helper *usages* incrementally and only delete files if an import graph proves them unreferenced.
- **FXP/VFX gate:** trace stable C# source event IDs through Fireball, Ashling, Hollowed and one destructible; prove one effect per event, pause/resume/expiry, light disposal, no duplicate gameplay damage. Only then unify visual lifecycle and remove redundant adapters.
- **Town gate:** preserve painted Town; no 3D replacement proposal is permitted by this cleanup.
- **Mobile gate:** real 320/390px gameplay captures and physical-device budgets. Source scans and desktop CI are not visual/gameplay acceptance.

**Validation:** The repository CI \`.github/workflows/csharp.yml\` invokes \`node --test tests/javascript/*.test.mjs\` and .NET build/test. A green CI confirms this checkpoint's test and syntax regression checks, **not** G5/Hollowed/phone acceptance. No runtime sources changed in this PR.
