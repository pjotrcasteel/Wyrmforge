# Wet Forest — three-material GPU scene integration checkpoint

**Status:** draft / visual approval pending. This is a real C#-seeded browser GPU scene preview, NOT a live Hunt adoption or approved neutral albedo.

## Smallest useful vertical slice

- `/arena-material-kit?seed=1204` generates an authoritative recipe via `HuntArenaGenerator.GenerateWetForest(seed)` in Blazor WebAssembly/C#.
- `wet-forest-three-material-kit.js` maps the EXISTING trail, site and ground patches to Grass/Moss (ID 0), Wet Mud (ID 1) and Trampled Earth (ID 3). No independently invented JS paths, collisions, entrances/exits, props or gameplay geometry. Authored puddle patches use provisional painted mud only, not an inferred reflective water surface.
- Ground uses the existing six-swatch approved atlas but selects only these three established materials. The painted texture is cached once per seed, not rebuilt each animation frame.
- `wet-forest-gpu-material-review.js` registers one shared-engine ground receiver, a physical material descriptor and two declarative lights with the existing `lighting/engine.js` renderer. No separate lighting engine, CSS night tint or Canvas darkness mask.
- Lighting modes are Gothic night, neutral material inspection and zero-light black-world proof. The browser page is an art review instrument; native iOS and Android validation remains separate.

## Visual acceptance

Browser tests capture actual GPU PNGs at 320x568 and 390x844 for night, neutral, zero and a different C# seed. Zero world lighting must produce exact black RGB pixels; re-selecting neutral lighting must reproduce the baseline; changing the seed must change rendered pixels. The passing Browser smoke workflow artifact publishes the PNG screenshots.

Original painted swatches still have baked lighting. This checkpoint establishes correct C# recipe authority and shared GPU rendering, **not** production light-neutral textures, final edge blending, 3D world collision, live-Hunt adoption or native phone performance.

## Next art acceptance slice

Make one authored, consistent-pixel-scale, light-neutral Grass/Moss base, one Trampled Earth base and one Wet Mud base. Author edge/corner/vegetation details as separate reusable decorations where genuinely needed. Replace the three source appearances through the existing material IDs and GPU receiver; do not alter the gameplay C# recipe. Judge the scene with browser/mobile PNGs before adding six variants per family.

## Concurrent work boundaries

Do not modify live Hunts/Town, PR #338 one-road experiments or PR #340 original painting archive. Preserve current agreed lighting behavior and the owner-approved six-swatch source.

## GPU material-channel upgrade

The review now generates one compact non-color **roughnessMap** from the same C#-classified 16px material cells: grass 0.97, earth 0.84, wet mud 0.47. The G channel is registered through the existing shared LightingEngine, alongside painted albedo, on the SAME ground geometry. The preview uses no custom terrain-light shader, no new gameplay water, and no extra road surface mesh. Roughness values are design hypotheses (not verified physical measurements); they must be visually reviewed and adjusted alongside replacement light-neutral albedo.

## Compact modular pixel-art library (unapproved visual slice)

`tools/art/build_wet_forest_compact_materials.py` is the editable **fixed**
pixel-cluster source for three 256×256 PNG terrain modules; the generator's
reproducible output is delivered as immutable runtime PNGs under
`wwwroot/art/environment/wet-forest-compact/v1/` by CI before app publishing.
This is **static art asset baking**, independent of the hunt/world seed; it is
not a level generator, and it never edits the user's approved original paintings.

Color palettes are manually bounded to seven muted colors per family and do
not contain per-pixel brightness gradients or scene-dependent highlights.
The 256px source tiles repeat with exact left/right and top/bottom pixels;
perceptual tiling at gameplay scale still requires explicit owner approval.

The GPU scene now defaults to the compact modular art set and retains
an **Original painted swatches** selector for direct A/B inspection. The
existing C# Wet Forest trail and patches alone classify the ground. The
shared `LightingEngine` receives its separately computed non-color material
roughness map, as before. Small, crisp contact pixels from the existing
material boundary plan replace broad cross-material alpha fades.

For a local app build, run
`python3 tools/art/build_wet_forest_compact_materials.py --output src/Wyrmforge.Presentation.Web/wwwroot/art/environment/wet-forest-compact/v1`
first (requires Pillow). CI/Pages build and browser runs invoke the same
asset bake automatically and include the PNGs in the packaged site.
Use the focused Playwright run's **real GPU PNGs** to judge actual mobile
appearance and final source identity. This checkpoint is **not** approved
native iOS/Android art, physics water or live Hunt integration.

