# Reusable actor motion review (wizard is the first consumer)

Run `python tools/sprite-lab/actor_motion_review.py --source <rendered-frames> --output <review-folder> --frames 16 --fps 12`.

The producer only accepts EXISTING original source-rendered PNG frames and never
synthesizes animation. It publishes the exact-loop GIF, 4-column contact sheet,
and a JSON record of pairwise pixel changes, including the last-to-first seam.
A zero-change detection warns that an apparent animation frame may be frozen;
a nonzero difference DOES NOT indicate sound anatomy, planted feet, cloth,
mobile-size leg readability or physical plausibility.

PR #335's Blender-native workflow runs this on the reopened wizard's original
16 walk frames. Every future character rig (humanoid, quadruped or flying) can
use the tool after independently authoring its own animation frames. The output
is a visual review aid, never an in-game render path or a substitute for
reviewing authentic motion at 320/390px in production lighting. WyrmForge's
shared GPU engine PR #332 remains separate.

**Artistic status:** Wizard walk still lacks convincing hip/leg action. Keep
the PR draft. No live player cutover or changes to Hollowed/Ashling.
