# Corrective large-boss pixel style002 - in progress

Owner rejected the player-sized proof. Supersedes the earlier viewport-width quota: calibrate grounded SE body/limb height (head/chest/pelvis/limbs, excluding long tail/padding) to roughly5x the actual mage's42px reference height. One world scale across clips/facings; camera zoom transforms ground and all actors together. Arena view retains imposing size; Fit whole dragon zooms the entire scene for inspection.

Native256/512 pixel renders and a fixed64-color charcoal/ash/scorched-red/ember palette preserve finer tonal detail at this larger world scale. Four motions only: idle,claw_right,fly,roar. Approved anatomy/motion untouched. Previous001 remains preserved as a rejected scale/coarseness study. No owner acceptance or full41-motion finishing claimed.

Reference principles remain the attributed Motion Twin/Aseprite studies from001: native cel-shaded source rendering, fixed palette over time and real consecutive-frame review.

Remaining: render, palette/pixel validation, corrected browser/phone-size visual review, independently verified native and atlas backups.

Latest owner follow-up:5x reads too large. The preview now uses an iPhone17Pro-proportioned402x874 logical viewport with a1206x2622 canvas, based on [Apple specifications](https://support.apple.com/en-gu/125090). Approximate rounded frame/island/home indicator are preview chrome, not a physical device test. A live1–6x slider, manual-toggle/default comparison and reset allow tuning while the viewport, mage and game camera remain fixed. Default3x is a trial setting, not owner acceptance.

All1632 new native frames pack exactly; binary alpha and52 used colors from64 fixed palette entries; zero empty/clipped source frames.96 atlas sheets include64 new fine/bold sheets and32 source003 comparisons. Phone/browser validation passes all96 atlas loads, all controls, fixed phone proportions at320/390/440/1100px browser widths, six slider values, constant player/camera during sizing, manual toggle and reset. Independently retrieved native002 plus textures reopen with no missing dependencies and preserved anatomy/UVs/weights/bones/tail mask. Final atlas receipt pending.

## Owner-approved TierI size

Owner selected the phone preview at2× and supplied a screenshot. Treat the **rendered appearance** as authority rather than claiming that the full silhouette literally measures twice the player. `tier-I-scale-baseline.json` locks the exact448.53076140099125 world-cell rectangle with0.75 camera and402x874 logical viewport. Reset/manual-off now restore2×; future tier size multipliers apply to this baseline. The saved reference image and SHA are preserved. This is size approval only; pixel style remains a review candidate.
