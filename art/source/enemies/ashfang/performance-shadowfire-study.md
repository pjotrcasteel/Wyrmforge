# Ashfang performance and shadow/fire study — 21 October 2026

Owner wants the Tier-I boss to be substantially more organic and dynamic, and
explicitly names the movie Balrog for fire/smoke. Near-black charcoal remains.
Canonical creatures updated. Preserve Ashfang anatomy rather than copying the
Balrog's bipedal shape or any copyrighted reference assets.

References consulted:
- Framestore original production account, https://www.framestore.com/work/how-train-your-dragon : anatomical muscle/skeleton and bat/hawk/lizard/big-cat references inform physical heft and character-specific motion. Transfer: pelvis/chest counter-rotation with planted support and stable gaze, delayed flight-body response. No exact joint/timing measurements claimed.
- Weta original Smaug case study, https://www.wetafx.co.nz/films/case-studies/smaug : performance shapes skeletal motion before surface polish. Transfer: preserve an independently convincing underlying body; do not use fire to hide it.
- Original 2001 VFXPro production interview reproduced at https://www.theonering.net/torwp/2001/12/22/26954-media-watch-vfxpro-2/ : fire/smoke silhouette as a coordinated character effect. Film Balrog image-search stills inspected for the black central mass and brighter peripheral heat; no film footage/frame timing analysis claimed.
- Weta primary SIGGRAPH paper https://www.wetafx.co.nz/assets/Uploads/PDFs/siggraph2023_fire.pdf : separate heat/flame from soot and tune for shot readability. Transfer: independently authored flame and smoke density layers. Our bounded analytic density-sphere preview is not the paper's combustion solver or film-quality fluid simulation.

Source diagnosis: walk currently poses pelvis through neck under one rigid
transform; foot placement moves but does not drive torso articulation. Walk is
less than one second. Breath likewise leans as one block. Cruise uses a uniform
cosine stroke and a short 16-frame beat. Effects are pointed tongues with no soot.

Implementation candidate: slower 48-frame walk with shoulder/pelvis counter-yaw,
small support shift, stable head and delayed tail; longer breath with segmented
anticipation/recoil; 32-frame cruise with distinct recovery/load/power timings
and delayed body response. Existing IK/contact solver and preserved geometry.
New expanding smoke puffs follow historical evaluated surface positions rather
than moving rigidly with the current body. Depth-limited sphere integration
allows the body to occlude smoke behind it. Limited palette and sprite-size
readability remain review gates. No damage/aura mechanics added.

Checkpoint only: code and research saved before generation. Remaining: generate
and inspect, resolve floor/contact/loop errors, preserve charcoal/fire source,
render native motion with/without effects, owner review. PR #186 remains draft.
