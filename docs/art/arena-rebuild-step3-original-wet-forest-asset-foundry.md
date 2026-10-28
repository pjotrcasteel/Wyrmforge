# Arena Rebuild V2 — Step 3: original Wet Forest asset foundry

**Status:** Original editable 3D model generator and catalog committed; render, mobile-size visual validation and asset integration **not yet completed**. Step 2 visual acceptance remains independent.

## Correct workflow
The arena was rebuilt because old trees, cobblestones, props and collision were visually unacceptable. **Do not pull them back in**, even as a temporary substitute. We can author new Step 3 art in parallel with step 2, while step 2 stays ground-only until the owner accepts it.

### Original Wet Forest identity
Gothic, grounded, rain-soaked old-growth woodland. Thick gnarled roots, dark wet bark, restrained olive moss, muted autumn foliage, broken deadwood and believable botanical shapes. Real depth cues from a single repeatable 2.5D orthographic camera; detailed but legible at mobile gameplay scale. Avoid alien plants, giant tentacles, cartoon geometry, repeated clones, oversaturated magical glow, and billboard-like silhouettes. No cobble roads/ruins or new environmental storytelling props at this stage.

### Milestone slices
1. **Living ancient oak**: unique trunk/root silhouette, asymmetric main crown, textured bark and moss, editable Blender source and transparent review PNG; check root contact, crown scale and legibility on approved background.
2. **Dead elm**: damaged, leafless silhouette, splintered leaders, no symmetry or reused oak mesh; transparent view and source project.
3. **Undergrowth**: low ferns, brush, small sparse shrubs only after first two canopies look credible.
4. **Ground-adjacent assets**: separately authored roots, mossy boulders, stumps, fallen logs. No dirt patches baked under the objects.
5. **Variation**: new asymmetrical topology, wetness/damage/age variants; avoid random hue-shift clones.
6. **Integration gate**: once individually reviewed, implement depth sorting, separate collision footprint, prop placement, and native renderer testing in later steps. **Nothing from this branch gets loaded by Arena Lab or Hunts.**

### Source-first and editability
`tools/art/step3_wet_forest.py` creates each object from original branch meshes, distorted tapered trunks, roots, organic leaf clusters, Blender procedural shading and a shared camera/light rig. It creates (not imports) geometry. Objects remain individually accessible in Blender. `--force` is required to overwrite a pre-existing .blend file. The .blend source is authoritative, while the PNG is a derivative.

Run with Blender 4+ installed:

```sh
blender -b -t 8 --python tools/art/step3_wet_forest.py -- --asset ancient_oak --output-dir art/source/environment/wet-forest/ancient_oak
blender -b -t 8 --python tools/art/step3_wet_forest.py -- --asset dead_elm --output-dir art/source/environment/wet-forest/dead_elm
```

Outputs for each asset: `<id>.blend`, `<id>-candidate.png`, `production.json`. Generated renders should be inspected before committing any final sprite. The source can be rerendered with a revised camera or materials; **do not delete the .blend**. When using version control, check repository size before adding binary files; use Git LFS or an accepted durable asset repository if needed.

### Technical constraints for later native/mobile use
- Source mesh dimensions are in world units; foot/root contact at `z=0`; orthographic projection fixed.
- Transparent RGBA render at 768 px for review; reduce resolution later based on an actual iPhone/Android screen-size test.
- **No baked ground shadows or underlays**. Contact shadow and dynamic occlusion should be separate masks/passes, not painted into this sprite.
- Trunk collision must derive from a deliberately authored root-footprint shape, **not the canopy alpha**. Occlusion and depth sorting follow the foot anchor; no movement/collision yet.
- The game continues to own simulation in platform-neutral C#; the Blender source merely produces renderer-agnostic visual assets.
- Export profiles must be frozen and checked before production assets are added to the live Hunt renderer.

### Acceptance gates
- Unique grounded gothic silhouette at **actual gameplay scale**, not only enlarged illustrations.
- Verify front/back root contact and occlusion against the approved grass/dirt/marsh materials.
- Visually inspect alpha edges on pale/dark backgrounds, including damp-forest lighting.
- No old assets, code-drawn placeholder trees or the previous procedural forest in the new arena.
- CI static tests are **not art approval**. Current repository branch intentionally contains only the source generator, catalog and production contracts, **not yet rendered tree sprites or `.blend` binaries**.

### Current impediment
Blender is not installed in the current execution environment, so no `.blend` or native PNG render has been verified on this branch yet. These commands are ready for a Blender-capable workstation/CI runner. Do not claim otherwise.
