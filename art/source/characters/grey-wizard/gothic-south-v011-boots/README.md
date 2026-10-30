# South boot-edge cleanup

Superseded by v012: the owner rejected the remaining lower-leg/robe overlap.
This version preserves the heel cleanup history, not accepted final motion.

Owner identified a small trailing heel artifact. V011 expands the boot mask to
own the actual boot edge, disables extra boot edge padding, and explicitly bevels
9 corner pixels. Motion, staff support, scale and14-layer source stay unchanged.
The old source and generated v010 remain intact. Build with prepare-gothic.mjs
--boot-cleanup and build-gothic-walk.mjs --boot-cleanup; --check verifies25 outputs.

Required reviews now include light/dark full sheets, grip-sleeve-detail.png and
feet-detail.png from review-artifacts.py. All16 current frames have one connected,
binary-alpha/unclipped silhouette. The heel regression reproduces15 old opaque
pixels in frames6–10 and verifies they are clear after the fix. This supplements
visual inspection, not a claim that all connected pixels make artistic sense.

Source-only support/contact checks remain0px;14-layer OpenRaster/GIF/MP4 retained.
Live stride/run fit, final motion/pixel acceptance, remaining facings/actions,
materials, actual Hunt and phone budgets remain open. No gameplay/engine cutover.
