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
