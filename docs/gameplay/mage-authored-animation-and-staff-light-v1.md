# Authored pixel mage — five animation frames and physically aligned spell light

## Character consistency
The first production-oriented set contains **five separately authored pixel silhouettes**: idle, wind-up, release, follow-through, and empowered Surge release. Each is explicitly editable in `arena-mage-frames.js` as integer-coordinate colored blocks, not an image generator or a stretched/distorted neutral frame. Every frame keeps the approved slate-blue cloak, dark face, pale collar, leather staff and readable hem. The tiny focus charge rune marks still reflect canonical state.

The frames deliberately lean and plant feet differently across the attack: off-balance brace during windup, head/staff thrust at release, cloak overshoot at follow-through, wider forceful stance on Surge. Damage feedback remains separate from physics. Pose selection is a pure function of authoritative `cast.progress` and `cast.surge`, independent of render framerate.

## Lighting follows the action
The cast's localized light now uses the matching hand grip and actual staff tip angle instead of a fixed arbitrary distance in front of the player. Its intensity **rises during windup**, reaches full intensity during `release`, and decays during follow-through. Projectiles and impacts retain their own lights. The combined lighting budget stays six visible sources and reduced-motion mode preserves phase/frame identity without swishing animation.

## Validation and next work
JavaScript regression tests assert each frame is unique and has hood, dark face and collar. A 390px Playwright test renders actual different mage silhouettes with their staff lighting and compares pixels at windup/release/follow-through/Surge. Gameplay simulation, movement speeds, spell cast timing and damage stay completely unchanged.

These are hand-composed pixel-frame data inside the JS renderer, **not** a polished artist-produced sprite-sheet atlas. Further refinement should improve leg stride, eight-direction silhouettes, cloak deformation and sprite shading at original target size. Keep the demo in draft while reviewing human iPhone contrast and casting quality.
## October 15 corrective animation brief — keep with code

The user rejected the original staff silhouette because a thick transverse tip made it look like a **hammer**. [PR #114](https://github.com/pjotrcasteel/Wyrmforge/pull/114) replaced it with a continuous, slender world-oriented staff shaft, explicitly authored grip locations for idle, walk A/B, wind-up, release, follow-through and Surge, and a small tip crystal. **Do not reintroduce** horizontal caps, floating weapons, inconsistent grip/hand orientation or costume palette changes. The mage remains slate blue with pale collar.

School-colored hood lighting must read on a 390px viewport. Earlier browser smoke caught a real hood-light failure, fixed in subsequent revisions; inspect the very latest SHA rather than claiming tests pass because an older commit was green.

Art direction for future spells: increasingly forceful body gestures and unique elemental casting stages, real rank/evolution/Surge visuals, single actual committed-primary projectile and authentic combined status effects. Presentation never changes movement, cast speed, gameplay cooldowns or the underlying C# snapshots. See [handover](../handover/2026-10-15-project-art-and-backlog.md) and [visual reference](../design/battlemage-visual-reference.md).
