# Wizard prototype checkpoint — 24 October 2026

**Scope: wizard/player character ONLY.** Hollowed, Ashling, PR #332 universal GPU engine, C# gameplay, and current temporary mage remain untouched.

## Ground truth from repository
- Existing Hollowed: 8 real directions; 16 walk / 16 attack / 24 death poses. Manifest under `wwwroot/art/enemies/hollow-rigged`.
- Existing Ashling: 8 real directions; 16 walk / 22 attack / 28 death poses. Manifest under `wwwroot/art/enemies/ashling-rigged`.
- PR #332 `lighting/lit-sprite.js` and `contracts.d.ts` are **in progress**, not on main. They bind a shared animation sample to one frame region and separate actor albedo/normal/caster material.
- The liked wizard design board contains invented Hollowed/Ashling figures; **never compare against those**. Use the ACTUAL repo atlases as visual references.

## Candidate work produced in this separate session
A deterministic **CPU model/render study** created an original grey-robed, long-bearded wizard in six accent/staff variants from one procedural 3D source, preserving neutral GLB geometry per school. The candidate outputs are external conversation artifacts, **not yet committed to this PR**. Export tooling and technical-source format are in this PR; the generated source file and PNG/GLB review assets must be brought into the branch before any production merge.

Source generator SHA-256: `353c5e0b82e35202073590fe22ba2ef4fd5b227f2600279310094b05702e28f1`.
- Render scope: walk, 16 frames x 8 directions x 6 school variants; geometry-derived albedo, normal, roughness, height, alpha caster passes, 128 px frames.
- Additional motion studies: 12 idle, 20 cast, 10 hurt, 24 death, South view only.
- Trial renderer: Python + NumPy + Pillow + trimesh. GLB groups are editable neutral meshes. **No Blender .blend, weighted production rig, approved secondary cloth/beard rig, artistic sign-off, production-runtime conversion, or physical mobile checks.**
- No source color artwork pretends to emit world light. Normal maps do not count as volumetric occlusion, and alpha casters do not equal authored geometry casters.

## Current artistic defects
The 3D geometry is intentionally coarse. Locomotion still needs more convincing cloth/foot interaction and larger human readable step arcs. Idle is too subtle; cast needs fuller shoulder/robe weight and proper weapon-hand anchoring; hurt/death need continuity in all views. This is an *art prototype*, not a completed sprite replacement. Preserve the original wizard concept and replace rough forms rather than rubber-stamping the procedural look.

## Next mandatory production gate
1. Import/refine into editable Blender source; preserve layered meshes, all six staffs and armature/pose sources.
2. Build a real weighted body/robe/beard walk at game pixel scale, verify grounded stance and looping gait against real Hollowed/Ashling runtime art, not the generated board.
3. Export actual eight-view idle, cast, hurt and death, with per-pose albedo/normal/roughness/depth/occluder passes. Maintain same foot anchor and school-state identity.
4. Compare 320/390px actual mobile scenes under shared GPU lighting from PR #332 when integrated.
5. Only with owner visual approval and CI/device proof replace the temporary player. Do not merge this draft earlier.

The prior PR CI passed, but that does not validate any new uncommitted renders or source rig.
