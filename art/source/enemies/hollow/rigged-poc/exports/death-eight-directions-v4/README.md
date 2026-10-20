# The Hollow: directional death animation

20 October 2026. **Complete death export: eight real 3D facings × 24 frames, 12 FPS, plays once and holds the corpse.** Local RTX 5090 rasterization of the same textured, weighted character used in the owner-accepted directional walk. Owner accepted death in chat ("looks good. lets see the attack Is next"); gameplay runtime integration is not part of this delivery.

## Deliverables

- `hollow-death.png`: 3072×1024 transparent RGBA atlas; 24 columns, eight rows. Rows **N, NE, E, SE, S, SW, W, NW**. No mirrored rows.
- `hollow-death.manifest.json`: every source rectangle, frame index, facing, pivot and source hash. `playback.loop=false`, `holdLastFrame=true`; consumers must clamp to frame 23 rather than wrap back to life.
- `frames/`: 192 individual 128×128 PNGs; `shared-palette.png`: unchanged 64-color Hollow palette.
- `all-directions-review.gif`: synchronized overview, pauses on the corpse before repeating for review. `walk-to-death-review.gif`: the accepted SE walk flowing into the death at matching pixel scale. These review GIFs repeat; the animation manifest does not loop.
- `contact-poses.png`: every direction at frames 0, 3, 7, 10, 13 and 23. Preview images/GIFs use nearest-neighbor enlargement.
- Editable Blender source: `../../model/local-appearance-004/rigged-death-v5/hollow-death.blend`. Both `Hollow_Shamble` and `Hollow_Death_Collapse` actions are preserved. The original accepted walk file is unchanged.

## Timing and scale

The 2-second clip has recoil (frames 0–3), buckling knees (4–7), forward collapse (8–11), impact (12), recoil/settling (13–19), and a motionless corpse hold (20–23). Arms brace at slightly different times, the head lags the torso and cloth follows the fall. Lower-limb IK retains joint lengths while keeping knees clear of the floor. Feet rotate with explicit orientation and floor-aware ankle placement.

The prone silhouette needs extra padding. Death uses **128×128 cells, anchor 64,88 and draw cell size 124 world units**. Movement uses 96×96, anchor 48,72 and 93 world units. Both have exactly the same pixels per world unit. The original 96px walk cell occupies death pixels `(16,16)` through `(111,111)`; do not scale both atlases to the same total cell size, which would shrink the dying character.

No root travel should be added during death. The collapse's small forward displacement is already baked into the poses. The ground pivot stays at the actor's death location. Preserve the last frame while the game decides corpse lifetime/removal; no despawn, loot, collision or gameplay changes are included.

## Validation

- `technical-report.json`: all 192 frames populated and padded, binary alpha, same fixed palette, actual RTX 5090 rendering, zero terminal-pose change. No hardware settings changed.
- `asset-validation.json`: every atlas cell matches its individual PNG's visible pixels; all visible colors belong to the shared palette; final four frames are pixel-identical in every direction. First frame matches the accepted walk exactly in seven directions; E differs by one pixel due to floor contact.
- `../../model/local-appearance-004/rigged-death-v5/source-validation.json`: reopening the saved Blender source and evaluating every pose produces **zero vertex error** against the exported sample. Bone-length error is below `3.3e-7` model units. No exported vertex is below the floor; final hold has zero vertex motion.
- A saved post-skin Geometry Nodes corrective handles residual surface contact. Maximum raw penetration before correction is **0.02318 model units**, about **1.44 native pixels**; this is not claimed to be a physics simulation. The exact same corrective exists in the editable file and export.
- `browser-review/browser-report.json`: actual 390px Sprite Lab playback for all eight facings, frame 24 held without wrapping, replay works, original row selection, zero browser errors, downloaded 24×8 manifest validated, walk/death preset switching checked. Sprite Lab core regression tests: six passed.

Visual review covered six phases in every facing and the settled body beside the existing mage at native mobile size. The back and cloth remain darker under the fixed world light. Hidden surfaces still come from the inferred original reconstruction. Automated validation is not artistic acceptance.

## Review and reproduce

Use Sprite Lab's **Hollow · death** button, or `http://127.0.0.1:8766/sprite-lab/?candidate=hollow-death-8dir-v1` with `tools/sprite-lab/serve-review.cjs` running. Play or a compass direction restarts death; playback stops on the corpse.

Author with `tools/sprite-lab/build-hollow-death.py` under Blender, passing the repository root and a **new** output folder name after `--`. Render with `tools/sprite-lab/render-hollow-directions.py --death --rig <source-folder> --revision <new-export-folder>` under the local CUDA environment. Existing source/export folders are intentionally never overwritten. Run `inspect-hollow-death.py`, `validate-hollow-death.py` and `capture-hollow-death.cjs` for the corresponding source/asset/browser evidence. The latter two name the delivered revision explicitly.

Historical death sources v1–v4 and export candidates v1–v3 remain preserved for recovery; this v4 export from source v5 supersedes them.
