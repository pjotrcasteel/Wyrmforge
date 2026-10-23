# Original-card idle mesh study

Actual local CUDA render: 64 samples, 16 fps, 4-second loop. The original card
texture is preserved; the rest frame matches every visible reference pixel.
The persistent mesh, weights and sampled poses are saved alongside the atlas
and individual PNG frames. Open preview.html via a local HTTP server for
playback, speed/frame controls, original overlay and mesh inspection.

This is a bounded one-view breathing study, not a completed animation rig.
No hidden anatomy, walking, attack, flight or other direction has been supplied.
The earlier SDXL studies are not its texture source. Foot movement below
0.003 source pixels and no folded triangles support technical continuity,
not automatic artistic acceptance. 60 unique raster frames out of 64 samples
is expected at this small motion amplitude with nearest pixel sampling.

Production principles reuse the cited Framestore/Weta research in
../../performance-shadowfire-study.md: restrained body mass, stable support,
and delayed neck/tail/wing response. No measured animal timing is claimed.

Next: review continuous motion; prepare articulated limb layers and hidden
attachment art before attempting a gait. Do not stretch this single surface
into large pose changes and call it a full dragon.
