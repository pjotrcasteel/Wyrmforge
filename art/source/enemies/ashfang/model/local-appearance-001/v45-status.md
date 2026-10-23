# V45 wing repair and threatening anatomy review — 21 October 2026

Authority: canonical art/creatures, original card and the saved game-dragon
reference study. Owner requested removal of visible wing artifacts and a
terrifying dragon/wyrm. No player, gameplay or balance changes.

The anatomical source now has an angular broad skull, stronger brows, longer
swept horns, cheek spurs, actual fangs, and attached shoulder armor. Wing spars
have explicit segment ownership instead of nearest-all-wing weights. Duplicate
membrane seam vertices are shared. Membrane bays originate at the wrist and
follow both finger knuckles, including the elbow/body attachment region.

V42 failed: inverse blended-matrix fold correction was numerically unstable
between endpoints (partial-pose width 17.955 units). Failed source and renders
remain preserved. V43 replaced it with translation-only membrane anchor bones,
removing that instability, but membrane fans still originated from the wrong
joint and floated apart from bent ribs. V44 rebuilt wrist-based bays around
actual knuckles. Its four poses were inspected in four real cameras.

V45 uses the same repaired source for a 33-state diagnostic fold sweep.
`rigged-block-v45-sweep/fold-sweep-review-v2/fold-unfold.gif` shows actual 3D
deformation, clay and native texture. This is a diagnostic, not authored flight.
All samples finite, max span [2.241152,1.589813,0.563993], max triangle edge
0.429978 (an authored rigid spar), min Z -0.195633 vs floor -0.197, no clipped
game-camera views. GPU receipt identifies local RTX 5090. The original 0.4 edge
bound incorrectly excluded a rigid 0.43 spar; inspection established that its
length stays constant, and the reviewed bound is 0.5. No geometry was changed
to evade that check.

Remaining: native owner visual acceptance, skull/plate/material refinement,
all-facing Tier-I size, and whole-body motion checks. The separate motion-gate
build is the next validation; V37 motion does not validate this new source.
No complete spritesheet or runtime integration is claimed. PR #186 remains draft.
