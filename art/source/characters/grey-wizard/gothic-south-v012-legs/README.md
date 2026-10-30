# Lower-leg and robe-hem repair

Owner rejected v011's visibly broken lower-body overlap. The heel fix did not
solve missing shins or cloth pixels moving with the boot. V012 reassigns source
garment above y116 to the body and paints lower-leg coverage under the opaque
neutral robe from explicit native leather donor regions. Legs remain behind
cloth in the existing source compositor; no foreground-band override. Source
rest recomposition is exact. Motion keys, scale and staff support are unchanged.

Build with prepare-gothic.mjs --leg-coverage, then
build-gothic-walk.mjs --leg-coverage; --check verifies25 exports.14 editable layers
and OpenRaster retained. review/leg-comparison.png compares the two contact
extremes and passing poses before/after. Full16-frame light/dark sheets, enlarged
feet/grip crops and grey-background GIF/MP4 support visual review.

Checks cover4 before-empty/new-opaque shin probes and2 old-grey/new-leather ankle
probes, alongside earlier heel/wrist regressions.22 focused tests pass; source
contact checks remain0px, all16 frames binary/unclipped/one connected silhouette.
These checks are not an artistic approval. Reviewed all16 lower-body poses and
full light/dark sheets before delivering; preserve future visual review gates.

Source cadence/run fitting, anatomical motion refinement, other directions,
materials, actual Hunt occlusion/elevation and physical-phone budgets remain
open. No production/default mage cutover or C# gameplay changes.
