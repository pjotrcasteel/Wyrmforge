# Owner-approved modeling foundation: Sotudios Rotwalker

**29 October 2026 — Owner explicitly chose the real 3D Rotwalker candidate as the new Hollowed foundation.**

The owner inspected the actual neutral-clay front view and said, "I like this one" and explicitly confirmed that the upright / arms-out source stance can be replaced with the right pose. This supersedes the earlier *subjective* source rejection. Rotwalker's artist-sculpted body, skull and torn clothing are worth developing. The requested ghoul identity is **long tangled hair, a wretched damaged face, irregular grotesque anatomy and the volcanic corruption from the three-view target**.

This approves **selection of modeling base**, not production art, geometry/skin quality, animation retargeting, completed pose or gameplay integration.

## Mobile-first clarification, same date

The game is **pixelated and targets iOS/Android**. The owner's required standard is **crisp, immediately identifiable pixel art in real gameplay**, not blurry/smoothed or photorealistic 3D stills. Preserving high-res sculpt detail matters only when it benefits the final native-scale silhouette.

Verified WyrmForge historical technical reference on main:
- `art/source/enemies/hollow/rigged-poc/mobile-refinement.md`: **96×96** cells, ~**56–64 px** actor height, nearest-neighbor presentation on mobile, bone/brown palette against dark arena.
- `art/source/enemies/hollow/rigged-poc/exports/pixel-walk-poc-v1/README.md`: authentic 96×96 native render, 56–60px actor, **binary alpha**, nearest sampling, fixed 64-color ramp and no dithering; that is historical proof, **not production approval or a mandate to reuse that rejected mesh**.
- `docs/art/card-to-spritesheet-production.md`: source 3D → derived 2D atlas, judge in actual scene beside mage, avoid anti-alias blur and lookalike interpolation, verify animation and foot contacts.

### Invariants for V2 3D → pixel sprite review

1. **One actual authored model** is the source, with correct geometric human-ghoul identity. Use authentic Blender and real camera angles. Never synthesize plausible sprites independently.
2. Review **true 96×96 output rendered from 3D at source resolution** at ~56–64 pixels character height, on dark background. Do *not* simply reduce a 320×400 glamour render and call that the game-scale test.
3. Save reproducible **8 independent directional views**, same scale, camera conventions and foot/pivot. Review at 1× actual pixels AND 4× nearest-neighbor so individual pixels remain square and crisp. At 390px/320px mobile viewport, inspect against actual Ashling and mage when integration is authorized; do not claim that has happened yet.
4. Build readable **head/hair masses**, **hooked claws**, hunched asymmetrical stance and calf/boot separation **at 1×**; details and ember wounds that vanish are not worth draw calls or texture memory.
5. Pixel policy: stable quantized, restrained shared palette (initial **48-color diagnostic**, tune against approved character art); **no image dithering**, binary cutout alpha for the derived source-art comparison, no unintentional halos or blended pixels around contours. Source textures can be high fidelity; don't bake overall ambient/night lighting into the albedo.
6. **Character light belongs to the one universal GPU lighting engine** in runtime. No new Hollowed-specific renderer, special lighting engine, animation engine, C# logic or runtime assets in V2 without separate integration approval.
7. Keep an explicit source camera/scale/pivot contract. Historical proof pivot `[48,72]` and drawing dimensions are starting *review* references only; verify against actual integration camera and occlusion before choosing the production atlas.
8. Quality acceptance is VISUAL: neutral clay → native pixel silhouette → grayscale/palette → true dark arena contrast → motion and mobile physical-device performance. Passing an automated contour test alone is **insufficient**.

### First proof to execute on this branch

`tools/art/hollowed-reference-v2/render_mobile_candidate_blender.py` consumes the genuine unmodified Rotwalker source file in the audit artifacts. It generates 8 native 96×96 diagnostic views, a shared-palette and binary-alpha review sheet, and 4× nearest-neighbor inspection. This is an **unapproved source-candidate proof**, not an import into the game; significant anatomy and pose are still outstanding.

**Isolation:** old H1 CC0 70-bone rig excluded forever; no merge with PR #391. PR #387 remains unchanged. PR #399 stays draft until the owner reviews real modeled progress.
