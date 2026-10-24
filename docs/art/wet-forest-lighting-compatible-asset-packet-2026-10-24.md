# Wet Forest — first source-backed universal-lighting asset packet

**24 October 2026 · REVIEW CANDIDATE — not accepted final art.**
Parent renderer: [G0–G1 draft PR #332](https://github.com/pjotrcasteel/Wyrmforge/pull/332).
Design authority: [art & animation](../canon/art-and-animation.md), [universal light contract](../design/arena-real-geometry-light-engine.md), and [G1 implementation](../engineering/universal-lighting-g0-g1.md).
The approved Town paintings, Arcane Nexus Fireball texture and six original ground samples remain unmodified.

## Why this exists

The chat's painterly Gothic Wet Forest art sheets define a desired direction, **not** production sprites, texture atlases, or automatically usable maps. Do not crop a flattened moodboard into pre-lit world assets and claim they receive correct GPU light. Start with a single editable physical asset and an inspectable renderer-facing packet.

This slice uses the **original #307 Blender ancient oak** already recovered for #332, with real polygon leaves and geometry normals. The model and original exported `oak.bin`/`oak.json` are unchanged. The new independent `wet-forest-oak.asset.json` names each of its six surfaces and supplies candidate roughness/specular values. The renderer-neutral packet builder joins the exact source export, verifies bytes/vertices, and emits the **existing** `LitMaterial`/`LitRenderable` descriptors. The existing `/arena-light-engine` G1 proof now consumes these descriptors without editing `LightingEngine` or introducing another light/shadow system.

## Concrete files

- Editable geometry: `art/source/environment/lighting-proof/ancient-oak.blend`; exporter: `tools/art/export-lighting-oak.py` (parent #332).
- Original immutable mesh: `wwwroot/art/lighting-proof/oak.json` + `oak.bin` (parent #332).
- Material/asset packet: `wwwroot/art/lighting-proof/wet-forest-oak.asset.json`.
- Portable descriptor adapter: `wwwroot/js/lighting/wet-forest-oak-asset.js`.
- Real G1 proof consumption: `wwwroot/js/lighting/proof-scene.js` (only the candidate-oak loading function changed).
- Structural tests: `tests/javascript/wet-forest-lit-oak-asset.test.mjs`.

All `wwwroot` paths above are under `src/Wyrmforge.Presentation.Web`.

### Physical/light semantics

- Right-handed X/Y ground, Z up, metres; renderer proof placement remains provisional. **No extra game/C# collision is inferred from the art.**
- Per-material colors are source procedural ramp *midpoints*, not fully authored new pixel albedo. Surface roughness/specular are provisional visual tuning values; zero metalness.
- Real mesh vertex normals and triangle geometry produce light response and **actual shadow casters**, without fake bitmap normal maps or alpha cutout shadows. Polygon-leaf foliage is not equivalent to validated layered alpha-card foliage and self-shadowing remains subject to visual acceptance.
- All six surfaces receive light/shadow and cast shadow. They emit no light; an actual nearby Fireball must declare its separate `LightEmitter`. No color filters, Canvas night overlays, baked glows or invented new lights.
- Reflections are direct-light specular **only**, not scene reflections. Shadow budgeting, linear/sRGB conversion and all-off black visibility remain owned by PR #332.

## Acceptance and outstanding work

| Gate | Current state |
| --- | --- |
| Source-owned oak mesh and editable original | Reused from existing #332; preserved |
| Source material group reconciliation and byte checks | Implemented here, with JS regressions |
| Same G1 renderer/descriptor integration | Wired in isolated `/arena-light-engine`, not gameplay |
| Approved painterly Gothic bark, deep foliage, silhouette and palette | **NOT YET** — current material colors are flat midpoints |
| Authorable neutral albedo, roughness texture, normal/depth/caster passes (where applicable) | **NOT YET** |
| Detailed leaf-on-leaf, bark/root and ground shadow acceptance | **NOT YET** |
| Fireball/zero/neutral/multiple-source comparative GPU images at 320/390px | **NOT VERIFIED FOR THIS CHANGE** until new CI captures |
| Actual iPhone performance and aesthetic review | **NOT YET** |
| Arena generator/C# physical placement, collisions, production rendering | **NOT TOUCHED** |

Do not merge this dependency PR as approved art. G1/owner visual review comes first.

## Next art slice, after G1 evidence

Refine **the source Blender model** using the proposed Gothic art language and the Town/Nexus quality target; author neutral bark/leaf color variation at the correct projected pixel density, preserving actual silhouettes and three-dimensional lighting geometry. Export deterministic material passes from the same source. Inspect the **same** object under scene moonlight, moving Fireball, and genuinely black all-off state at real gameplay crop and zoom. Record screenshots and provenance. Once visuals are approved, add coherent family variants (living, damaged, charred) sharing anchors and lighting/material rules; map collisions back to authoritative C# world state rather than using texture alpha as physics.

The six already-approved Material Lab ground paintings are deliberately untouched. Their existing quilt/blend composer needs a later neutral-albedo audit before being called fully relightable. An attractive illuminated concept sheet is **not** such a proof.
