# Ashfang performance and shadow/fire study â€” 21 October 2026

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


## V55–V58 result

V55 darkens the non-emissive material to near-black charcoal while retaining
molten texels, eyes, fangs and all V54 motion. Source and reviews are preserved.
V56 intentionally revises performance while retaining rest anatomy. Walk now
has 48 unique frames plus closure, breath 73 samples, cruise 32 unique frames
plus closure. Pelvis/chest counter-rotation, support shift, toe release and
lagging tail accompany a stable head. Breath articulation anticipates and
recoils. Cruise uses distinct loaded/recovery/power poses rather than a uniform
cosine stroke. These are authored animation choices, not measured biomechanics
or new gameplay speed/balance values.

V57 assembles that motion with V55's exact rest-surface/chart/charcoal texture,
28 surface-bound flame tongues and the first 42-puff smoke source. The first
smoke pass was too quiet. V58 uses 70 overlapping density lobes, billowed volume
boundaries, warm light near fresh soot fading to dark aged smoke, and bounded
local fire-light on the body. Smoke follows historical surface positions and
is integrated only in front of visible body/fire depth. This is an analytic
volume approximation for pixel-art source review, not a film combustion solve.

Current source: model/local-appearance-001/rigged-block-v58-shadowfire.
The packed Blender source contains all nine editable body/fire actions and
49-frame opening walk timeline. Smoke remains separate reproducible analytic
NPZ source and code; it is not a Blender fluid cache. editable-source-checks.json
verifies packed textures, unchanged rest geometry and flame shape counts.
All nine body sources are finite/floor-safe (minimum about -0.195817 versus
floor -0.197); walk and flight loops close exactly. Fire and smoke loops close.

The original 192px motion canvas clipped the higher recovery stroke in two
clay clips and portions of smoke; failed v1 evidence is retained. The v2 canvas
is 224px at the SAME 80px/unit, not a smaller creature. All six regular actions
are now finite/unclipped in both motion-clay-review-v2 and motion-review-v2.
Eight actual directional views are in turnaround-review-v1. walk-weight-study.png
shows actual clay samples. Source preservation/equivalence reports remain.

A local-only Hunt screenshot composite uses the existing 110px/unit fit, 440x955
viewport and unchanged player region in all 48 source frames. Pixel checks are
recorded in native-fit-checks.json; screenshot/derived media are ignored and
were NOT published. This is an art composite, not live gameplay or phone QA.

Remaining: owner acceptance and further boss-performance/effect polish, actual
phone/Hunt validation, completed action/direction sheets, final breath/ground
fire, hit/death and explicit C# aerial integration. Geometry/fire previews do
not create combat hazards or establish a finished boss. PR #186 stays draft.
