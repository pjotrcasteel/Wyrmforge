# The Hollow: eight-direction claw attack

20 October 2026. Attack exported and self-reviewed: **eight actual 3D facings × 16 frames at 12 FPS**, authored on the same textured, weighted rig as the owner-accepted walk and death. Owner attack acceptance is pending. This completes the requested walk/attack/death art exports; it does not claim a finished gameplay adapter or additional unrequested animation states.

## Files and contract

- `hollow-attack.png`: transparent 2048×1024 atlas, sixteen 128×128 cells per row. Rows **N, NE, E, SE, S, SW, W, NW**. Every facing is a real rotated 3D render; no mirrored rows.
- `hollow-attack.manifest.json`: explicit rectangles, source hash, **anchor 64,88**, draw cell **124 world units**, 12 FPS, `loop=false`, `holdLastFrame=false`, `onComplete=walk`. The 128px cell has extra transparent padding and exactly the same pixel density as the 96px walk / 93-world-unit contract.
- `frames/`: 128 individual PNGs. `shared-palette.png`: the same 64-color Hollow palette. `attack-review.gif`: enlarged SE attack; `all-directions-review.gif`: all eight synchronized views; `contact-poses.png`: six representative phases in every view.
- `hollow-lifecycle-review.gif`: walk → attack → recovered walk → death → held corpse, with identical pixel density and aligned anchors throughout. Review GIFs repeat for inspection; the attack clip itself plays once.
- Editable source: `../../model/local-appearance-004/rigged-attack-v2/hollow-attack.blend`, including the preserved `Hollow_Shamble` action and new `Hollow_Attack_Claw`. Source v1 and export v1 remain historical; source v2 / export v2 are current.

## Motion and event semantics

The clip lasts 1⅓ seconds. Frames 0–5 anticipate with torso twist and a raised claw; frames 6–8 deliver a fast downward, across-body rake with a short torso lunge; frames 9–15 recover. The other arm counterbalances and cloth lags the torso. Both feet remain planted. First and last poses return exactly to the walk's phase-zero stance, with no root travel for a consumer to add.

`visualContactFrames=[7,8]` is **art reference only**, not authorization to move damage into those frames or change attack cooldowns. The canonical Hollow currently uses contact damage in `RunSimulation.Enemies.cs`; mapping these visuals to gameplay needs an explicit presentation adapter. This change does not alter combat, collision, movement, saves, death priority or damage timing.

Sprite Lab's **Hollow · attack** preset / `?candidate=hollow-attack-8dir-v1` plays through recovery and pauses at the returned stance so it can be inspected. Play or a compass direction replays it. The manifest tells a future gameplay adapter to resume walking on completion; the inspector does not simulate that adapter.

## Evidence

- `technical-report.json`: all 128 frames populated, binary alpha, clear outer cell boundaries, shared palette, exact return pose; rendered locally on **RTX 5090**, no hardware changes or hosted inference.
- `asset-validation.json`: every atlas cell matches its individual PNG's visible pixels; every visible color belongs to the palette. **Both first and last frames match the accepted walking entry pixels exactly in all eight directions.**
- `../../model/local-appearance-004/rigged-attack-v2/source-validation.json`: reopening the saved source reproduces every exported vertex exactly. Maximum foot translation drift `5.97e-8` model units; bone-length error below `6.74e-6`, both far below a native pixel. The existing walk sole tolerance remains below the floor by only `0.000284` model units, under 0.018 native pixels.
- `browser-review/browser-report.json`: actual 390px Edge viewport, wind-up/strike captures for every direction, correct original row mapping, one-shot completion, recovery pause, replay, walk/attack preset switching and downloaded 16×8 manifest checked; zero browser errors; format pass.
- `browser-review/death-regression/browser-report.json`: death still stops on the corpse and replays correctly after the shared inspector changes. Sprite Lab core regression tests: six passed.

Visual inspection covered all eight directions at six phases, plus native mobile wind-up and strike views beside the existing mage. Back-facing surfaces remain darker under the fixed world light; hidden surfaces are still inferred from the original reconstruction. Owner acceptance is recorded separately from automated checks.

Reproduce with Blender `tools/sprite-lab/build-hollow-attack.py -- <repository-root> <new-source-folder>`, then local CUDA `render-hollow-directions.py --attack --rig <source-folder> --revision <new-export-folder>`. Existing folders are never overwritten. `inspect-hollow-attack.py`, `validate-hollow-attack.py` and `capture-hollow-attack.cjs` check the delivered revision.
