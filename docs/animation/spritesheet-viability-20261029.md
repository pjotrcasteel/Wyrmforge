# AN0-AN6 reconciliation: 2.5D spritesheets

The owner reaffirmed the spritesheet goal on 29 October 2026. **It remains viable.**
The canonical [production route](../canon/art-and-animation.md#animated-character-production-algorithm--required-procedure)
is an editable rigged 3D source rendered into 2D sprites. The live skinned-mesh
candidate in #387 is useful research, but it does not establish acceptance of
the requested spritesheet representation. Do not silently replace that target.

## Milestone audit

| Gate | Actual state | Work still required |
|---|---|---|
| AN0 | Source, engine owners, failures and references are recorded. The connected GitHub service confirms current main `750e56ab7` and draft #387; that main is already merged. | CLI Git transport is unavailable; remote checkpoints are verified through the connected service. |
| AN1 | Shared versioned controller, rig profiles, source export and cross-anatomy tests exist; full-frame atlas loading/playback already exists. | Demonstrate the final sprite pack through that same API, with bounded discrete transitions. |
| AN2 | Editable cape-free sources and independent skin/sole/length/support checks exist. | A convincing baked gait, grounded start/stop/turn and actual C# contact proof. Torso-transfer discontinuity remains unresolved in the live-retargeting study. |
| AN3 | Commitment, coupled source actions, pause/death/replay and recovery logic have evidence. | Validate the baked full-body claw and its authored entry/recovery/turn/chase transitions in the actual game. |
| AN4 | Provisional eight-view/native/phone-scale recordings exist. | An excellent final spritesheet performance and final MP4; mesh research recordings do not close this gate. |
| AN5 | Default parity, candidate gating and shared-GPU skin research are tested. | Spritesheet material/depth/caster adoption, actual Hunt proof and measured device limits. Skin-backend success is separate evidence. |
| AN6 | Draft PR, editable sources, API and handovers are preserved remotely. | Close the above engineering/visual-proof gaps so only owner visual approval remains. AN6 is not complete. |

## What spritesheets can and cannot do

Use coherent full-body frames, genuine eight-direction renders, preserved gait
phase, explicit action commitment and a bounded authored transition library.
Keep C# movement, hits, death and saves authoritative. Keep the shared animation
controller, semantic compositor and shared lighting engine.

PNG sheets cannot provide arbitrary continuous skeletal mixing or exact unlimited
runtime retargeting. The canonical Stage F explicitly distinguishes discrete
spritesheet playback from a live skeletal renderer. Bounded phase-specific
full-body actions/transitions are compatible with the sprite goal. Alpha
crossfades, rigid limb cutouts and affine PNG stretching are not substitutes.
The regional-warping experiment failed; that does not invalidate ordinary
full-body sprite export/playback.

## Measured resource feasibility

`audit_spritesheet_viability.py` measured the existing eight-facing full-frame
review pack. Its real alpha union is `[20,18,76,82]` inside a 96px source cell.
A lossless planning crop with one native pixel of guard is 58x66; no rescaling
or generated pixels are assumed. Existing loaded textures, including redundant
review-lit color, occupy 45 MiB.

With production albedo, source-derived normal and emission sheets, that measured
crop gives the following estimates:

| Baked library, eight facings | Decoded RGBA memory |
|---|---:|
| 16-frame walk, claw and two turns | 22.43 MiB |
| 16 gait x 8 action full-body moving-claw grid plus walk | 50.47 MiB |
| That grid, walk and two 16-frame turns | 61.68 MiB |
| Same library with a fourth RGBA depth sheet | 82.24 MiB |

All proposed texture dimensions are below 4096. The three-map larger library
fits the current 64 MiB asset limit narrowly; an additional full RGBA depth map
does not. New moving-claw poses must independently fit the measured crop. These
are evidence-led sizing estimates, not a promise of phone memory/performance or
finished material/caster support. Frame bounds, streaming/LOD and the existing
GPU material/depth contract must be validated before accepting a final layout.

## Continuation order

1. Prove one full-body baked walk in one view through the existing sprite API.
2. Validate source contacts and actual C# starts/stops; author bounded transition
   poses where needed instead of adding another retargeting engine.
3. Extend the same source to committed claw, recovery and weight-bearing turns.
4. Export all eight views and aligned material passes, then run the actual
   Hunt/GPU, 320/390px, memory and phone-compatible MP4 gates.
5. Reconcile AN6 documentation and request only final owner visual acceptance.

Preserve the mesh research and its sources as evidence. No default art, injury,
Ashling, painted Town, concurrent art PR or gameplay authority changes are
implied by this reconciliation.
