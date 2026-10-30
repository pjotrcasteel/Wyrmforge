# Correct wrist overlap

V008's dark wrist rectangle was incorrect robe underpainting in open air beside
the shaft. V009 restricts that hidden fill to the actual cape overlap below y96:
159 source pixels rather than322. No motion keys, scale or grip changes.
The reported region is now transparent in affected frames5–10. Pixel regression
test retains the rejected v008 example and verifies18 old-opaque/new-clear probes
plus no hidden cape paint above y96. Light contact sheet inspects all16 poses.

Build: prepare-gothic.mjs --overlap-fix, build-gothic-walk.mjs --overlap-fix.
25 deterministic outputs; exact idle,13 editable OpenRaster layers, GIF16frames
and MP4 decode verified. Prior v008 remains preserved as rejected review.
This is source art revision, not production integration. Existing live cadence,
motion/material/phone acceptance gates remain open. No gameplay/engine changes.
