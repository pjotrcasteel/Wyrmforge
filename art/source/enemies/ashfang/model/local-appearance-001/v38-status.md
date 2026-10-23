# V38 anatomical silhouette gate

Owner rejected V37's cricket-like appearance. V38 replaces the remaining narrow
reconstructed trunk/neck and front legs with authored volumetric surfaces, adds
a separate jaw, and gives the haunches and paws substantial mass. It retains the
original card-derived texture reference, independent articulated wings and tail.
See [reference study](../../game-dragon-reference-study.md).

Code checkpoint precedes generation. Build with `--stance-only`: one grounded
sample and editable rig, not nine completed or validated actions. Review actual
front/side/game/rear cameras at 94 pixels per source unit, showing silhouette,
clay and texture separately. No screenshot pixels published; player unchanged.
Visual and deformation acceptance pending. PR #186 remains draft.

## Actual review and V39 follow-up

V38 review exposed a long folded-wing sail and clipped the side-view tail.
It is retained as failed evidence. V39 reverses the folded forearm and folds
back the finger knuckle instead of pointing the whole chain tailward. It adds
attached dorsal crests. The larger 256px review cell preserves source density
and contains all four views. V39 has one stance only, not the animation library.
Stance minimum Z is above floor; motion contacts remain unvalidated.
The clay views show fuller chest, thighs and paws and no long wing sail.
Appearance still needs work: compact membranes form rounded shoulder lobes,
head needs stronger authored planes, and nearest-source UV transfer is mottled.
Do not call this final art or restore the full animation bake yet.
