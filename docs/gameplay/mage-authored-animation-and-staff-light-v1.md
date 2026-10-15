# Authored pixel mage — five animation frames and physically aligned spell light

## Character consistency
The first production-oriented set contains **five separately authored pixel silhouettes**: idle, wind-up, release, follow-through, and empowered Surge release. Each is explicitly editable in `arena-mage-frames.js` as integer-coordinate colored blocks, not an image generator or a stretched/distorted neutral frame. Every frame keeps the approved slate-blue cloak, dark face, pale collar, leather staff and readable hem. The tiny focus charge rune marks still reflect canonical state.

The frames deliberately lean and plant feet differently across the attack: off-balance brace during windup, head/staff thrust at release, cloak overshoot at follow-through, wider forceful stance on Surge. Damage feedback remains separate from physics. Pose selection is a pure function of authoritative `cast.progress` and `cast.surge`, independent of render framerate.

## Lighting follows the action
The cast's localized light now uses the matching hand grip and actual staff tip angle instead of a fixed arbitrary distance in front of the player. Its intensity **rises during windup**, reaches full intensity during `release`, and decays during follow-through. Projectiles and impacts retain their own lights. The combined lighting budget stays six visible sources and reduced-motion mode preserves phase/frame identity without swishing animation.

## Validation and next work
JavaScript regression tests assert each frame is unique and has hood, dark face and collar. A 390px Playwright test renders actual different mage silhouettes with their staff lighting and compares pixels at windup/release/follow-through/Surge. Gameplay simulation, movement speeds, spell cast timing and damage stay completely unchanged.

These are hand-composed pixel-frame data inside the JS renderer, **not** a polished artist-produced sprite-sheet atlas. Further refinement should improve leg stride, eight-direction silhouettes, cloak deformation and sprite shading at original target size. Keep the demo in draft while reviewing human iPhone contrast and casting quality.
