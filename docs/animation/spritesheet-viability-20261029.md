# AN0-AN6 reconciliation: 2.5D spritesheets

The owner reaffirmed the spritesheet goal on 29 October 2026. **It remains viable.**
The canonical [production route](../canon/art-and-animation.md#animated-character-production-algorithm--required-procedure)
is an editable rigged 3D source rendered into 2D sprites. The live skinned-mesh
candidate in #387 is useful research, but it does not establish acceptance of
the requested spritesheet representation. Do not silently replace that target.

## Milestone audit

| Gate | Actual state | Work still required |
|---|---|---|
| AN0 | Source, engine owners, failures and references are recorded. Current main `0653cbfd8` is integrated, including the locked pixel-first rules; draft #387 is preserved. | Continue checking concurrent main/PR changes. Escalated Git transport now supports verified remote checkpoints. |
| AN1 | Shared versioned controller, rig profiles, source export and cross-anatomy tests exist; full-frame atlas loading/playback already exists. | Demonstrate the final sprite pack through that same API, with bounded discrete transitions. |
| AN2 | Editable cape-free sources and independent skin/sole/length/support checks exist. | A convincing baked gait, grounded start/stop/turn and actual C# contact proof. Torso-transfer discontinuity remains unresolved in the live-retargeting study. |
| AN3 | Commitment, coupled source actions, pause/death/replay and recovery logic have evidence. | Validate the baked full-body claw and its authored entry/recovery/turn/chase transitions in the actual game. |
| AN4 | Provisional eight-view/native/phone-scale recordings exist. | An excellent final spritesheet performance and final MP4; mesh research recordings do not close this gate. |
| AN5 | Default parity, candidate gating and bounded actual baked-sprite GPU material proof exist. Corrected source normals, 320/390px zero-light and exact frozen restoration pass through the same LightingEngine. | Final Hunt sprite depth/caster/occlusion and physical-device/performance acceptance. The material-only base-walk proof does not close contact or action gates. |
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

The later nine-heading, sixteen-frame walk study is a larger library than the
baseline table: its measured 66x63 guarded crop consumes 18.27 MiB per RGBA map,
54.82 MiB for three maps **before** actions. A combined final library therefore
needs a separately measured bounded layout; do not reuse the smaller table as
proof that all new clips fit. The completed bounded base-walk material proof uses
6,094,848 decoded bytes. See the [current execution receipt](spritesheet-walk-proof-20261029.md).

## Orthogonal animation-source feasibility — strict experiment

The new [lateral source study](https://github.com/pjotrcasteel/Wyrmforge/actions/workflows/animation-lateral-source-study.yml)
tests genuine **−90° and +90° travel relative to an unchanged body facing**
on the same editable Blender rig. It is intentionally restricted to an isolated
walk-only source, 0.24 m stride, and full fixed-length/sole/support validation.
The study retains the unchanged knee limits, minimum support margin, native
pixel resolution and runtime one-pixel correction budget.

The source manifest marks both results `sourceStudyOnly=true` and
`acceptedForRuntime=false`, irrespective of a successful Blender bake.
A source feasibility pass is only evidence that such a side-step *can* be
authored without joint distortion; it is not a claim that the 128-frame claw
can follow it. A failure must be preserved as a genuine reach/support
constraint, never turned green by changing C# movement or loosening limits.

No new lateral sprite atlas has been promoted to the game. Before AN6 can
accept it, it must be expanded into an authored body/claw support family and
pass all native memory, gait-entry/recovery, real-C# 320/390px, sprite GPU
material/occlusion, and physical-phone visual gates.

## Measured unified four-clip outcome — 29 October 2026

The smaller baseline packing table above is a **planning estimate**, not acceptance
of the latest single-rig walk/claw/bidirectional-turn pack. The completed
[unified source workflow](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40964288628)
measured all eight genuine facings with the same guarded native crop:

| Actually rendered variant | Three-map decoded bytes | 64 MiB result |
|---|---:|---|
| Full 16-frame pivots, 16 walk, 128 moving claw | 72,382,464 | Rejected: exceeds by 5,273,600 B |
| End-point-preserving 8-frame pivots, same walk/claw | 65,802,240 | Fits by 1,306,624 B; **source study only** |

Both versions pass the limited source-authored pivot *phase-zero* entry and exit
checks in every direction; those checks do not prove an arbitrary walk entry.
In the shared runtime controller, both variants fail **192/256** turns: every
25/50/75% gait-phase entry, up to 22.225811 native pixels of slip. The new
moving-claw replay fails **256/384** trajectories: all 128 lateral and all
128 crossing-heading cases, up to 29.96775 and 14.48388 native pixels.
All 128 forward-aligned moving-claw cases pass with less than 0.001 pixel
slip. This demonstrates that the authored claw itself is correctly coupled
to the forward gait, but not to arbitrary C# movement.

Genuine mobile-width C# Enemy Lab captures at 320px and 390px draw the
claw and sample the pivots, but fail strict contact acceptance at about
101.17 and 104.36 native pixels. Browser and resource errors were zero.
Screenshots/MP4s in the workflow artifact are **diagnostic evidence only**,
not final owner-approval footage or physical-phone performance.

**Required AN2/AN3 source direction:** author weight-bearing, phase-aware
walk-to-turn and committed-attack trajectories that can follow observed
lateral/crossing C# movement while retaining the separate attack facing.
Keep one animation engine, the one shared LightingEngine adapter, native
2.5D pixel sprites, the authored rest rig and C# gameplay authority. Do not
resurrect the rejected rigid-region warp or substitute unmeasured per-frame
root resets. Every proposed new atlas/material layout must re-prove the
unchanged **67,108,864 B resident decoded limit**, source contact and actual
C# playback before promotion.

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
