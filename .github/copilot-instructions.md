# WyrmForge — repository-wide GitHub Copilot instructions

These instructions apply to all code, tests, content tools, and documentation in this repository. WyrmForge is an original, Gothic, mobile-first **2.5D pixel-art action RPG/roguelike**. Maintain its existing architecture and approved visual direction; do not redesign the game while implementing a small task.

## 0. Authority, reconnaissance, and honest status

1. Read `AGENTS.md` and `docs/canon/README.md` first. Read the **relevant topic** in `docs/canon/` before touching gameplay, rendering, terrain, art, animation, UI, or platform behavior.
2. The current source tree describes **what is implemented**. Canonical topic documents describe **intended behavior**. `LOCKED` owner decisions outrank proposals, old handovers, dated experiments, and README release notes.
3. Use `docs/canon/roadmap.md` as the sole ordered major/minor milestone index. `docs/handover/2026-11-01-claude-cleanup-ledger.md` is a dated audit, **not** another design authority.
4. Check latest `main`, open PRs, relevant active branches, tests, and existing consumers before modifying a subsystem. A draft PR, passing unit test, concept image, or standalone lab is not a shipped or owner-approved feature.
5. When owner decisions change, update the **relevant canonical topic** in the same PR. Do not introduce a competing master spec, duplicate milestone numbering, or claim unfinished work is accepted.
6. When a key convention is **not defined** (coordinate handedness, camera projection formula, normal-map tangent convention, etc.), inspect actual contracts, use the existing adapter, and document/ask for the decision. **Never assume Right-Handed/OpenGL just because an example says so.**

## 1. Runtime and engine boundaries (non-negotiable)

- Target **.NET 10**. The Domain/Application C# core, especially `src/Wyrmforge.Application/Runs/Simulation/`, is authoritative for deterministic gameplay, physics/collision, movement, AI decisions, targeting, hits, projectiles, damage, death, loot, progression, destructible terrain, navigation, save/replay, and legal exits.
- The browser frontend in `src/Wyrmforge.Presentation.Web/` presents C# state/events. JavaScript, shaders, audio, and render adapters must **not** create competing gameplay simulation, collision, damage, drops, RNG, or authoritative terrain state.
- Use **one reusable engine per responsibility**, extended by typed data/profiles/adapters rather than enemy-, spell-, school-, or scene-specific copies:
  - **Gameplay/physics**: existing deterministic C# RunSimulation and Domain.
  - **AI**: existing shared C# AI; species add behaviors/profiles, not second AI loops.
  - **Lighting**: one shared generic G/LightingEngine for supported world scenes.
  - **Animation**: existing sprite-first shared controllers/compositor; C# action events drive timing and truth.
  - **FXP**: shared *cosmetic* 2.5D visual physics only, never a second gameplay physics solver.
  - **VFX**: shared typed effect/event registry; **audio/haptics**: shared semantic event/mixer path.
- The same C#-authorized typed event (stable event/actor IDs, simulation tick/time, position/direction, traits and lifecycle) drives consumers such as lighting, VFX, animation, debris and sound. Handle pause/resume, despawn, duplicate delivery, replay and reduced effects. A Fireball impact must never be independently re-decided by multiple visual systems.
- Reuse existing modules and contracts; avoid unnecessary dependencies, new full physics frameworks, duplicate engines, speculative abstractions or large rewrites. New rendering libraries or mandatory 3D pipelines require explicit architectural approval.

## 2. 2.5D world, pixels, and coordinate correctness

- **Pixel-first, mobile-first 2.5D**, not a conventional 3D game made pixelated afterward. Render layered/directional pixel sprites and terrain surfaces with a shared world-anchored camera, feet/root anchors, depth ordering, occlusion and *optional* real world elevation.
- The target terrain unit is **1 m × 1 m × 1 m physical block** with each visible block face authored at **32 × 32 native source pixels**. World metres, rendered screen pixels, source-art pixels and camera scale are **different units**; never silently conflate them. A provisional 6.4 m XY adapter from XYZ experiments is **not** approved as the 1m mapping.
- **Current XYZ/greybox direction (owner, 1 November 2026):** use a neutral grey, texture-free, one-block-tall baseline for the playable Hunt. Remove authored arena wall/scenery/texture selection in this mode, **while preserving the playable mage, enemy spawn/combat, actual route progression and real exit gate**. Keep Town/menu art intact. See draft **PR #469**; it is work in progress, not proof the change is on `main`.
- Greybox should not invisibly load old Wet Forest paintings, 900px/16px texture banks, walls, props, pickups, reflections, or night overlays through a hidden fallback. A new asset mode selects one explicit source/manifest; if its source is missing, show a diagnostic instead of reviving rejected art.
- Ground-plane coordinates, height (the #469 draft uses Z=0..1m for its first layer), camera projection, foot anchors, physical blockers, navigation and surface samples must be **explicitly bridged and tested**. Do not hardcode a global handedness or axis convention without checking authoritative code.
- **Destructible 1m blocks are the intended XYZ gameplay capability**, not merely cosmetic breakable tiles. Each block's occupancy, damage/fracture, exposed faces, collision, navigation/LOS, debris-triggering events and save/replay must derive from authoritative C# state. The greybox is the first playable scale/render baseline; it does **not** yet establish that live Fireball excavation or complete destruction is implemented.
- **Destruction is not an excuse to render fractional sprite pixels.** A 10cm idea yields 3.2 source pixels and is not a valid literal pixel-grid partition. PR #469 explores **8×8×8 physical microcells (12.5cm; 4 source px per face)**; treat this as draft implementation detail until scale, C# state, fracture behavior and owner approval are verified. C# owns occupancy, HP, excavation, nav/LOS/collision, safe routes, save/replay and impact events; visuals derive crisp native-pixel clusters/debris from that state.
- The requested **one-source-pixel contrasting inset line** around blocks is a **toggleable debug overlay** only. Do not bake it into terrain art, normal maps, game textures, production sprite assets or physics.
- World/Hunter's Chart and local Arena must project the **same versioned C# geographic site** (stable IDs, seed, required landmarks, traversable edges, legal entrances/exits). Roads connect to meaningful destinations; geography and actual collision agree. Later natural irregular 1–3m cliff steps and low passes must be C#-traversable/blocked consistently—not fake painted walls in the current greybox.

## 3. Rendering, lighting, art, and animation

- Use **existing** rendering adapters: current browser GPU path uses **WebGL2/Three.js** internally for 2.5D surfaces/sprite planes, with a Canvas Hunt fallback. This is **not** a decision to replace the app with OpenGL, migrate every scene, or require 3D meshes. A future native port needs measured platform-specific choice.
- **G5 = Lighting Engine 0.1**, an opt-in composition baseline; **G6–G10** progressively harden toward 1.0. Do not call 0.1 final production acceptance or switch all Hunts to GPU by default without the required gate.
- The single lighting engine consumes authoritative emitters, material/normal/roughness/emission data, real occluder and height facts. Static torches, moving/extinguished Fireballs, spot/directional lights, foliage, characters and terrain must use shared lighting contracts. Normal maps **do not** provide physical shadow-casting geometry. Correct shadow direction/contact, multi-light, zero-light behavior and mobile performance are acceptance requirements; no fake full-bright actors or duplicate night masks.
- **The approved painted 2D Town is protected.** Do not restart the cancelled 3D Town rebuild or relight/replace Town as part of Hunt rendering work.
- Keep native pixel art sharp, aligned across albedo/normal/roughness/emissive/depth maps, with coherent perspective and appropriate atlas padding/sampling. Gothic, grounded, readable silhouettes take priority over noisy high-resolution textures. The **current greybox intentionally has no authored ground textures**; do not introduce art work until its separate approval gate.
- The owner's local reference folder `user_handover_files/concepts/Arena/` contains **isometric textures for inspiration** when those files are available in the checkout. Study volume, side-face shading, exposed strata, chips, cracks and broken-block silhouettes, but do **not** copy third-party pixels, treat the examples as shipping textures, adopt an isometric camera by default, or convert WyrmForge into 3D. Create original, coherent 32px-face 2.5D art only in its approved art phase; preserve provenance/attribution. References never override the current texture-free greybox.
- Animation is **sprite-first**: authored directional frames/layers using existing `sprite-animation.js`, `sprite-layer-compositor.js`, `rigged-sprites.js`. C# owns movement/combat facts; the visual controller owns pose, leg motion, transition and blending only. Offline Blender/3D-to-sprite authoring is permitted; mandatory runtime meshes, skeletal IK or source-skin pipelines are **not**.
- **AN0–AN6 PR #387 was closed unmerged/deferred.** Preserve archived research/source work; do not reactivate it or use rejected wizard/Hollowed art as a new default without explicit owner review.

## 4. Gameplay and product invariants

- Preserve playable **Town → Hunter's Chart → connected Hunt → actual exit/extraction → Town/progression** flow, existing save compatibility, player/enemy spawns, combat telegraphs and legal navigation when changing terrain or render adapters.
- The game has six Divine Wyrm school identities: Fire, Frost, Storm, Arcane, Necromancer and Summoner. New content is data-driven, original and consistent with approved lore/art. Do not invent abilities, balancing constants, permanent unlock changes or progression rules as incidental refactors.
- Auto-targeting is the default against a valid nearby enemy; actively engaged independent right-stick/mouse aiming overrides it, and release restores auto-aim. Respect occluders/line-of-sight and existing controls.
- Real collision and exits must match displayed geography. Never paint a navigable road that C# blocks, a fake exit, or a blocker invisible to gameplay. Visual effects must not modify authoritative health, loot or terrain.

## 5. Implementation, proof, and delivery

1. **Work in small vertical slices** against the existing owner contract. Keep current gameplay, saves, approved art/source/history, tests, attribution/LICENSE data and other branches intact. Never delete assets by guessed name or duplicate hash; inspect static/dynamic references, manifests, tests, and fallbacks first.
2. For gameplay/terrain changes, add deterministic C# tests for geometry, collisions, spawns, routes, damage, save/load/replay; add JavaScript/browser integration tests for real render selection and forbidden fallback imports. Run relevant .NET 10 build/tests, JS tests and CI.
3. For visuals, supply **genuine in-game** screenshots/video at **320px and 390px portrait**, including actual actors, props/occlusion where in scope, lights and exit; use real phone measurements for frame pacing/memory/thermal acceptance. Lab-only pictures, invented proof, and desktop emulation are insufficient for phone sign-off.
4. Do not silently merge or deploy unapproved visual changes. Push coherent checkpoints on task branches, use PRs and review gates, keep unrelated open drafts intact, and continue through unblocked tasks without stopping after every commit.
5. Report changed paths, exact build/test/CI results, PR/commit references, mobile/visual evidence, save compatibility, remaining limitations, and the next acceptance gate. Describe **implemented**, **merged**, **visually approved**, and **production enabled** as distinct states.

Useful source-of-truth entry points: `../AGENTS.md`, `../docs/canon/README.md`, `../docs/canon/architecture-and-quality.md`, `../docs/canon/hunts-and-world.md`, `../docs/canon/art-and-animation.md`, and `../docs/canon/roadmap.md`.
