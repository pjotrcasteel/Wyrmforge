# Registered right-facing Fire mage

Use Fire-Mage-Right-Aligned.aseprite as the working right-facing timeline. It contains 22 frames on a 36×40 canvas. The tags are idle_right, cast_right, walk_right, walk_start_right and walk_stop_right. Four independently editable layers hold the body, rigid shaft, school head and emission. The third cast frame uses the corrected two-arm release.

The walk has been resampled to match the idle and cast staff scale. Use (15, 39) as the provisional shared ground pivot in zero-based frame coordinates. Keep the same rigid staff geometry when changing schools. The preview plays idle, three start poses, part of the walk cycle, three stop poses, idle, and a single cast. Start and stop are one-shot tags. The preview exits the walk at frame 14 in Aseprite numbering. Bind that exit to the corresponding foot phase in the controller and check transitions at other interruption points.

Verify playback in Aseprite and the actual game, especially the first and last walk steps, in-game movement speed, and whether the staff tip holds its world-space contact during support. The earlier projects remain available as source references.
