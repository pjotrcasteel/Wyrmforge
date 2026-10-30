# AN0–AN6 execution record — 28 October 2026

**NOT FINISHED. Keep PR #387 draft and unmerged. No final visual approval requested.**

## 30 October 2026 — three-heading compact full-body source and actual C# blocker

**AN0–AN6 is not complete and must not be merged yet.** Independent
[compact five-stage source CI](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40972380943)
passed 3/3 real saved Blender rig authoring and independent evaluated
skinned-sole/support/mutation tests, plus the 96-case motion envelope for each
heading (0°, +90°, −90°). Each experimental moving-claw action has **8
walking phases × 5 claw stages = 40 actual source poses**, at a 0.25m
**authored** stride, not a change to C# speed, source pixel density or the
one-pixel correction budget.

Critically, **individually supported clips cannot yet switch during actual
travel**: direct forward→±90° tests on saved 8-phase/5-stage source report
**48/48 phase/stage cases unsafe for each side**. Worst contact-point mismatch
is about **6.57 native pixels**, and even the nearest nominal phase is about
**1.09 pixels**, above the fixed 1px criterion. A clear support-transfer
transition is mandatory; neither switching animation rows nor a bigger root
offset qualifies. The existing 16-phase/16-stage direct lateral test recorded
238/272 unsafe source handoffs, worst 7.36 px. The new atlas pipeline computes
this from real original source manifests and will not claim runtime acceptance
on an isolated source QC pass.

Actual C# 390px run [40968468105](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40968468105)
sampled the earlier forward/bidirectional-pivot review pack:
**walk 1.33px peak**, **moving claw 66.99px**, **pivot 100.99px**.
Pivot is authored in place while the C# root keeps travelling, explaining
the large cumulative planted-foot error. Native-frame/source phase-zero tests
are NOT evidence of moving pivot acceptance. Both previous full C# 320/390px
capture workflows remain correctly red. A new source-only per-clip analyzer
`tools/animation/diagnose_hunt_contact.mjs` preserves those metrics on every
new real capture and its own regression tests reject empty/false-green data.

The actual pixel source crop for the previous review is 68×63 at 96px
source cells. An optimistic three-heading 8×5 compact layout was projected
at **62,512,128 bytes (59.62MiB)**, including the previous walking/turn
budget, but **without new transition atlas costs**. It is **not** an approved
resident set; material maps, native sprite appearance and actual gameplay
still require proofs. `export_atlases.py --optimized-columns` now offers
explicit lossless WebGL-safe native packing without changing the default.
The separately gated compact source workflow renders full 8-view genuine
color frames for three directions; its follow-up job audits the actual
cropped atlases and true forward/sideways support handoffs. At this
checkpoint, that **new** all-view rendering/aggregation is queued, not passed.

Per canonical [roadmap](../canon/roadmap.md), **one animation engine** remains
authoritative. Preserve the default 2.5D pixel sprite/gameplay path and
separate G4/AI/AR work. An optional shared source-skin representation may
be investigated only within the same engine and existing LightingEngine
adapter, in 2.5D pixel-art appearance, if discrete sprites cannot resolve
arbitrary moving pivot/attack anatomy and within genuine mobile budgets.
Never silently promote it to a mandatory 3D actor engine.

**Still mandatory:** authored contact-safe moving entry/exit, moving claw
under crossing/sideways C# motion, moving pivots at arbitrary gait phase,
actual source material/occlusion/depth, 320/390px genuine gameplay frames,
physical-phone CPU/GPU/thermal/memory evaluation, owner visual approval
and PR integration tests. No fabricated images, no raising the one-pixel or
64MiB limits, no production default cutover and no merge before the gates.


## 29 October 2026 — measured compact atlas, real controller and C# blocker

**AN6 remains open.** The four-clip Blender source job passed on
[workflow 40964288628](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40964288628).
Full-rate pivots exceed the 64 MiB decoded 3-map limit (72,382,464 B).
Endpoint-preserving eight-frame pivots fit at 65,802,240 B and retain
source-only phase-zero entry/exit checks.

The actual shared runtime rejects 192/256 turns when entered at nonzero
walk phase; native slip peaks at 22.225811 px. Actual source-backed claw
replay covers 384 directions/phases/paths/rates: 128/128 aligned forward
cases pass; all 128 lateral and 128 crossing cases fail (29.96775 and
14.48388 px maxima). Genuine C# 320/390 Enemy Lab captures draw claw
and pivots but reach 101.17/104.36 native pixels; browser/resource logs
are clean. This is a real art/controller compatibility failure, not a
CI wiring issue or an owner visual approval gate.

Committed target crossing now completes a planted pivot step before
replanning; tests cover mid-step target return and reversal. Replay matrices
reject empty-case false greens. Source profile, source-skin research and
existing unrelated art/lighting/AI/physics work remain preserved.
Next: author a **direction-aware, phase-aware** 2.5D sprite motion
representation without exceeding the memory limit or changing C# movement.
The previous rigid cutout/affine-warp experiment was rejected and must not
be presented as a fix. More complete source/Hunt/GPU/mobile acceptance is
mandatory. PR #387 stays draft and unmerged.

## Owner reaffirmation: 2.5D spritesheets - 29 October 2026

The owner has asked to retain and verify the spritesheet goal. It is viable for
coherent baked full-body animation and bounded authored transitions. The live
skinned-mesh proof is research, not completion of that representation. See the
[milestone and resource reconciliation](spritesheet-viability-20261029.md).
Continue through the existing sprite controller/export/material path; do not
silently substitute a live skeletal renderer or promise arbitrary PNG blending.

### First full-body sprite walk proof

A fresh saved-source walk has now been rendered as 128 complete frames: 16 poses
in eight genuine views. The explicit `animationFoundation=sprite-walk` proof
selects that atlas through the existing asset/controller/draw path; it does not
use live skin or regional PNG deformation. A walk-only pack never claims an
unrendered claw: the existing attack presentation remains in use while the
shared gait phase continues. The 4.5 MiB decoded color sheet is source-lit review
art only. Source/GPU materials, actual contact and final visual acceptance are
still open. All 587 JavaScript checks pass, including the real baked-profile
adapter and eight-row/provenance tests. Current first-walk browser capture is next.

## Current continuity audit - 29 October 2026

The public candidate is the 0.65-duty catch-step source preserved at `0c57b3e12`.
Its complete weighted skin, actual sole geometry, source deformation mode and
real C# Hunt captures pass their checks. The later continuity audit still finds
abrupt torso transfers. This remains an AN4/AN6 blocker, not artistic acceptance.
The provisional [movies, native views and receipts](evidence/20261029/README.md)
are preserved. Retaining the previous body fit did not solve the problem and is
rejected. Shorter-stride, longer-stance and slower-orientation studies have
reach/support failures on seeds or actual roots and are not promoted.

The shared lifecycle no longer charges simultaneous translation and turning as
two gait steps. Bounded fitting consumes remaining translation space before
using the authored spine allowance. Current JS: 585/585. These changes need
fresh source/Hunt/continuity validation before final owner review. Main remains
`750e56ab7`, already merged. Parallel #390/#391 art, #385 variants and #381 GPU
work remain intact. Keep working; this checkpoint does not close AN6.

## Preserve-volume audit — 29 October 2026 (in progress)

The source Armature modifier uses preserve-volume dual-quaternion deformation.
The earlier linear GPU backend matched bones and pure-foot patches but did not
prove blended-vertex fidelity. The shared backend now declares and implements
linear/dual-quaternion modes for lit, normal, depth and distance passes, with
per-actor textures and rigid-transform validation. A two-bone regression retains
joint radius; the former linear blend collapses it. Full evaluated-source mesh,
protected-contact LOD, browser and actual-Hunt revalidation remain required.
The public candidate pack has NOT yet been replaced by this new export.

Additional fixes awaiting final integration validation: frozen lateral contact
axis, hit-flash rebind, airborne reach constrained to the ground half-space,
actual first-Hunt/mobile-emulation capture, and clearly labelled shared-engine
developer illumination. The first real trail capture exposed pre-existing
missing Wet Forest candidate images; do not describe fallback ground as accepted
GPU environment migration. No physical-phone performance claim is made.

## Windows continuation — 28 October 2026

### Whole-body support study (after `59f5cc546`)

**Continuous-motion follow-up (in progress):** a synthetic 12-trajectory ×
15/30/60/120Hz study now passes **48/48** through the same source-support follower
and whole-body solver. It keeps actual source stance flags and world anchors,
and carries signed source phase through reversals while allowing the lower
body's travel axis to change under a committed claw. The initial generic
landing planner failed 10/48 cases and is not promoted. A source-following
prototype removed its stance/template mismatch; five remaining diagonal/arc
reach failures were resolved by **authoring one native pixel of knee-flexion
reserve in the saved source**, not by increasing bone lengths, angular limits,
root offsets or pixel correction tolerances. The original default source is
unchanged. This is still a tool-driven source study; independent continuous
skin replay, runtime source-pose/raster/GPU integration and actual Hunt proof
remain pending. Current bounded source is preserved separately from old renders.

**Independent continuous skin replay completed:** 1,452 actual skinned samples
across the 12 synthetic trajectories at 30Hz. Maximum retained world-space sole
drift `5.21807e-7m`, ground error `2.68221e-7m`, bone-length error `1.63913e-7m`;
minimum recomputed actual-skin support margin `0.00812760m`. The 48-rate/source
solver cases and this real-skin replay are distinct evidence; neither is a Hunt.

**Raster representation rejection:** sampled dominant-weight skin projections in
all eight views found affine region errors up to **72.48 native pixels** for
near-end-on shins. This is a conservative source-geometry diagnostic, not visible
raster acceptance, and cannot justify enabling large deformations in the sprite
compositor. The steering skin remains source-correct; this rendering approximation
is not accepted. Next integration must use source skin geometry through the
existing shared LightingEngine resource/backend path, retaining the same shared
animation clock/pose and C# authority. No second renderer/lighting loop or gameplay
simulation is authorized. Keep current Canvas sprite fallback and other approved
actors untouched; actual GPU/Hunt proof and performance remain gates.

GPU integration baseline: current main `789f3c175` was merged into this draft
without changing main or concurrent branches. The existing `arena-gpu-world.js`
and `hunt-gpu-layers.js` adapter paths and their regression tests were recovered
unchanged from active PR #381 head `b3c534de`; its conservative shared light
culling helper is reused. They are an integration dependency, not a new Hunt
renderer. This checkpoint does not enable the adapter or claim G4/G5 completion;
source skin resources will extend its existing path. PR #381 remains untouched.

### Source-skin GPU resource checkpoint (in progress)

The original UV texture, actual source weights and a compact 16×16 whole-body
pose surface now export independently of raster cards. A **candidate** 1,800-
triangle LOD contains 2,490 render vertices, 230,760 binary geometry bytes and
580,378 pose JSON bytes, plus the original 1024² albedo texture. All weights
are retained in eight channels; discarded weight is zero. A four-weight attempt
correctly rejected five-bone seam vertices instead of silently changing skin.
Original tiny bind-width scales are preserved, not rounded into new anatomy.

The existing LightingEngine now accepts generic registered skin bindings and
complete global pose matrices, with corresponding eight-weight lit, normal,
depth and point-distance shader hooks. No species logic or animation clock was
added to lighting. Source quaternion/local-transform interpolation and bind-roll
reconstruction belong to shared animation math. Skin and atlas exporters now
reuse **one runtime profile builder**. Original default atlas calibration tests
still pass. The new resource tests cover source immutability, antipodal
quaternions, full gait/claw endpoints, fixed lengths, bad hierarchy/weights/
buffers, independent entity skeletons and all eight-influence shader variants.

**Not accepted yet:** browser shader compilation, LOD/native visual fidelity,
continuous compact-pose skin replay, resource lifecycle/performance, body-yaw
plant orientation, actual C# Hunt integration, phone limits and final film.
This code checkpoint changes no default production actor path.

The shared contact-kinematics module now has an **opt-in source-authoring study**
primitive, `solveSupportedSourcePose`. It accepts caller-owned support targets,
solves all declared contact chains together, translates the coupled source body
within an explicit finite source envelope, and recomputes segment mass from the
resulting whole-body skeleton after every load pass. Bone lengths and joint
limits are fixed. The source root does not move. It supplies no clock, AI,
world integration, damage or creature-name branches. It is **not enabled by a
runtime adapter** and does not bypass/widen the existing one-pixel raster
correction or whole-sprite offset limits.

Independent actual-skin replay on Blender 4.5.14 passed **1,296 source poses**:
16 gait phases × (walk + 8 claw rows) × 9 headings from -180° to +180°. Actual
sole-target error `2.75168e-7m`, ground error `2.38419e-7m`, bone endpoint
disagreement `4.03502e-7m`, length error `1.78814e-7m`, recomputed mass discrepancy
`3.20462e-8m`; minimum actual skin support margin `0.00809175m` against the
unchanged `0.00807292m` source minimum. All poses replayed on the actual saved
mesh, rather than accepting solver target arrays as contact evidence.

Full JS **551/551 passes**, including source immutability, non-Hollowed bone/hand
names, actually absent non-support arm, missing support, forged masses, excursion
and unbounded-body negative cases. The source study's bounded 0.28m contact
excursion and 0.14m body translation are explicit **skeletal-authoring envelopes**,
derived from its source stride; they are not raster tolerances or acceptance of
those extreme displacements in a rendered sprite. Runtime raster deformation,
continuous retained-foot trajectories, full-skin transitions, GPU materials and
actual Hunts still require separate proof. Do not label this runtime grounding.

Preserved source/reports: `art/source/animation-foundation/supported-study-20261028/`.

### Directional source continuation (after `4dbe3b371`)

The saved source generator now supports an explicit ground-travel heading and
stride vector while retaining the committed body/claw facing. Authored **±22.5°**
walk and moving-claw studies use a **0.28m source stride**. This is animation
source geometry, not a change to C# speed or gameplay balancing. The first 0.36m
diagonal attempt rejected unreachable knees; it was not promoted or given looser
limits. Feet retain their anatomical stance width and sole orientation; pelvis
load, knees/poles, swing and planted source targets are solved together.

Both reopened 16×8 studies pass actual sole/ground/bone/support and complete-skin
gait↔claw checks, and each passes 96 signed source-direction envelope cases at
15/30/60/120Hz. Maximum sole drift: positive `4.49512e-7m`, negative
`3.45213e-7m`; endpoint discrepancy: positive `8.68061e-7m`, negative
`8.81722e-7m`. Each also rejects skating, hover, endpoint corruption **and forged
lateral root-vector metadata**, all with Blender exit 1. Original default source
metrics are unchanged. Full JavaScript: **548/548 pass**.

Export now derives camera-calibrated stance velocity from the declared source
stride vector rather than assuming forward-only Y travel. An end-to-end test
runs the actual PNG/profile exporter, independently measures planted contact
derivatives for eight views and both clips, then validates the generated profile
with the existing JS public schema. Default and both directional studies pass.
Its synthetic atlas markers are test fixtures, **not rendered creature artwork**.
CI reproduces both studies and all four source negatives.

Editable sources and measurements are preserved under
`art/source/animation-foundation/directional-20261028/`. Directional source data
is not yet selected by runtime; no cross-heading blend, moving-turn or full Hunt
acceptance is claimed. Source S/E renders completed after `18a3cbedb`: 576 actual
RGBA frames across both studies, walk and moving claw. Two labelled 5.33s
768×480/30fps H.264/yuv420p faststart source movies show walk→claw→walk using
independent gait/action clocks, enlarged and native 96px views. Render receipts,
transparent source frames and videos are preserved with each editable source.
The review utility now uses the same nearest-sample rounding as JS.
Still images show the cape-free body, distinct planted/swing legs and readable
claw reach. This is a source study, not the required real-game
walk→strike→recover→turn→chase performance or physical-phone acceptance. No
cross-heading transition has been visually or mathematically accepted.

Research principles (28 Oct; no assets/code copied):
[Epic locomotion blending](https://dev.epicgames.com/documentation/en-us/unreal-engine/locomotion-based-blending-in-unreal-engine)
separates travel direction/speed from facing, supporting authored direction
samples rather than pretending one forward clip covers every trajectory;
[Spine IK guidance](https://esotericsoftware.com/spine-ik-constraints)
places limb endpoints from targets and distinguishes rotation from stretching.
This study keeps fixed lengths, existing knee limits, support checks and the
approved cape-free mesh/material identity. Its native/mobile art quality remains
to be inspected from actual source renders. Blender manual fetch failed and is
not cited as inspected evidence.

Resumed existing PR #387 at `14659ba25` after fetching current main
`789f3c175`; preserved untracked Ashfang sources and concurrent PRs #385/#389.
Reproduced a final-support-step lifecycle defect: the completing sample selected
pivot frame zero in the newly reached facing, then returned to gait one sample
later. The shared controller now returns to locomotion in the completing sample.
The regression failed before the fix and passes in both turn directions at
15/30/60/120Hz. Full local Node 24.22.1 suite: **548/548 passed**;
log: `artifacts/an-continuation-js.txt` (local generated evidence).

This is a lifecycle correction, not source-transition or visual acceptance.
No C# gameplay/save changes. Arbitrary lateral movement, moving turns, regional
GPU/depth/casters, device/horde and final continuous visual proof remain open.

The next source checkpoint reauthors/reopens walk + 16×8 moving claw using local
Blender **4.5.14 LTS**, distinct from CI's pinned 4.5.3. Actual sole drift maxima:
walk `1.49755e-7m`, claw `2.18112e-7m`; whole-skin endpoint discrepancy
`1.22113e-6m`. All three temporary-clone negatives (skating, hover, cloth-only
transition mismatch) reject with Blender exit 1. Source-forward envelope 96/96
passes. New **15-degree lateral root-motion probe rejects 96/96 cases** under
the unchanged `0.0161458m` source-pixel correction budget; first 15Hz case fails
at 0.2s with `0.0187470m` required correction. Gait phase uses forward projection,
while contact anchors include both components of actual root travel.

Preserved editable rebuild: `art/source/animation-foundation/windows-recovery-20261028/`.
Independent QC and both envelope reports:
`docs/animation/evidence/2026-10-28-windows/`. CI now requires the 15-degree probe
to fail for the expected correction-budget reason, and uploads its report.
This is diagnostic coverage and recoverable source, **not** a lateral-motion fix,
new raster/material export, new Hunt capture or final visual acceptance.

Base: c84eac3347a28b52b1d61cb507ff7e60711d9774.
Foundation branch: feat/universal-character-animation-an0-an6.
Prior remote checkpoint: 37d95b8f4ecb6b1f8dded9a7d95920376c0c1dc0.
PR #385 reference head at audit: def5ced9e499a0057ce743c73c965db0a63f8e95.
No maul/bite art, Ashling art, AI, Town or production gameplay migration was merged.

## Implemented and preserved

The existing shared sprite-animation API has an opt-in schema-v2 contract,
rig/bind validation, real contact metadata, action-token/sequence commitment,
source-authored positive/negative turns, deterministic per-entity state,
bounded root correction and explicit residual-slip diagnostics. V1 remains
the default. Typed contracts and biped/missing-arm/palm-crawler/quadruped
examples exercise extension without species branches in the core.

Atomic source atlases now verify actual SHA-256 bytes, frame dimensions,
profile/clip agreement and a 64MiB decoded-texture budget; errors are observable.
A generic 2-frame/32px fixture proves the loader is not fixed to Hollowed's
16-frame/96px assets. The material descriptor reuses lighting/lit-sprite.js.
Healthy standard Hollowed alone may opt in using animationFoundation=1.
Missing/broken limbs keep their matching source art; Ashling is unchanged.

Editable cape-free source authoring supplies a gait, stationary supported claw
and both 45-degree two-step turns. It uses actual bind matrices, explicit
poles, fixed lengths, joint limits and an authored segment-centre mass model.
Eight distinct source facings and source albedo/normal/emission passes exist
for walk/attack. Turn material passes, depth/casters and final GPU proof are open.

## Actual measurements, with limits

Independent QC reopens the saved Blender actions rather than trusting targets:

| Source clip | Maximum sampled stance drift (m) | Minimum mass-proxy support margin (m) |
|---|---:|---:|
| walk | 8.0590e-8 | 0.0035654 |
| attack | 1.1996e-7 | 0.0381698 |
| positive turn | 7.8414e-8 | 0.0043475 |
| negative turn | 9.1857e-8 | 0.0040841 |

Maximum bone-length error: 1.237e-7m. Source knee angles ~28.9–79.2 degrees;
elbows ~44.0–118.2 degrees. The tested authoring limits are knees 8–145 and
elbows 12–150. Quarter-pixel source tolerance is 1.55/96/4 = 0.00403646m.
These are contact-landmark/segment-mass checks, NOT mesh sole, penetration,
full-volume biomechanics, continuous subframe or aesthetic acceptance.

**Critical actual runtime failure:** a healthy C# lab entity (ID 5) loaded the
candidate successfully and showed about **19.97 world units of residual
contact slip** during the stationary claw while C# still moved it.
It is incorrect to equate the source-only results above with runtime grounding.
The one-pixel root correction saturates; this is a failed AN2/AN3/AN5 gate.

The first source review MP4 is H.264/yuv420p, 960x640, 12 seconds with faststart.
It stitches source clips and does NOT prove seamless walk/strike/turn transitions.
The persisted checkpoint archive contains the earlier three-action source,
source facings/material atlases, that MP4 and test logs; the later combined
four-action local source/captures were not uploaded before workspace loss.
[Persisted source checkpoint](https://chatgpt.com/library?file_id=libfile_fe54d3c7548881919e71de90cb7bce61&account_id=personal).

## Validation actually executed

- Initial main JavaScript baseline: 478/478.
- Latest completed local Node suite: 495/495 (before workspace loss/final remote recovery commit).
- Local Release Application suite: 668/668 after fixture isolation; developer-ID subset: 5/5 after adding the one new test. Do not claim a completed 669-test full run.
- Domain baseline: 393/393.
- Three standalone Blender kinematic tests passed.
- Packed walk/attack normal/albedo/emission alpha masks matched exactly.
  Opaque encoded normal lengths ~0.985–1.016. Four color clips had eight distinct
  facing hashes and no cell-edge clipping.
- Node-only 500-actor/600-frame stationary microbenchmark: baseline mean
  0.0537ms, v2 mean 0.3726ms, p95 0.8777ms. This is NOT GPU/phone/Hunt-horde
  performance. Negative retained-heap deltas are GC noise, not memory savings.
- Actual published Blazor enemy-lab was captured at 320/390px using Chromium
  142.0.7444.61, desktop browser emulation. No physical phone was tested.
  Chromium 131 terminated at startup; a CSS visibility wait also needed repair.
- The first real capture spawned one-arm ID 1 and correctly did NOT use the
  healthy candidate. The developer-only EntityId option defaults to 1; ID 5
  selects a real healthy source identity under C# authority, without modifying
  ordinary Hunt spawning, damage, saves or production AI.

The old checkpoint f72f594 passed Browser smoke, Arcane WebKit, Hollowed
broken-leg and bone-burst CI. Its full validation failed two unrelated behavior
fixtures because Random.Shared terrain obstructed haste/flank expectations.
A further local Frost champion lane test reproduced the same fixture issue.
These three direct behavior-unit fixtures now remove terrain explicitly; 39/39
focused tests and the 668-test full Release suite then passed. Production
navigation/terrain/combat code was not changed. Latest-head CI is separate;
never substitute those older green runs for a new head.

## Gate status

| Gate | Status |
|---|---|
| AN0 | Audit/reuse decision and measured source/runtime baseline delivered. Film fetch failed; no false claim to have watched it. |
| AN1 | Candidate single API/schema/fixtures/source loader implemented; more complete retarget and negative coverage remains. |
| AN2 | Source contacts/limits/mass proof partial; actual-motion slip, speed changes and stop/start/pivot transitions OPEN. |
| AN3 | Token/facing lifecycle tested; supported moving strike and continuous pass-by transitions OPEN. |
| AN4 | Source facings and stitched MP4 partial; excellent complete performance and final owner proof OPEN. |
| AN5 | Gated adapter and real Canvas capture partial; real contact gate fails; GPU/depth/device/horde acceptance OPEN. |
| AN6 | Resumable developer handover preserved, not a claim of foundation completion. |

## Hard blocker / recovery

The selected execution environment became unavailable again during the
all-material export. The command was:

```sh
blender -b -t 2 --python tools/animation/render_material_passes.py -- artifacts/animation-final-candidate/hollow-foundation.blend --out artifacts/materials-all --clips walk,attack,pivot,pivot-negative
```

The tool did not return a completed render status before environment loss;
orchestration was terminated after the workspace was declared unavailable.
An earlier loss returned: "exec-server transport disconnected; failed to resume
exec-server session: recovery timed out after 25s". Do not count pending outputs
as rendered, tested or delivered.

Resume from this remote branch, not by merging #385:
1. Restore the checkpoint archive, fetch main/current PR heads and retain others' work.
2. Recover/rebuild the combined four-action source using the committed generator;
   run validate_source.py on saved actions and all-direction atlas checks.
3. Fix the actual C# motion/contact mismatch. Do not enlarge drift tolerances,
   unbound root offsets, change contact DPS or quietly brace production AI.
   A source pose-grid study was not completed/promoted; a longer-stride attempt
   correctly rejected a knee at 5.224 degrees against an 8-degree lower limit.
4. Author/validate source-supported moving strike, starts/stops, catch/stumble
   and both turn transitions against recorded actual C# trajectories and all 12
   mandatory scenarios. Ensure no independent unaffected leg loop returns.
5. Complete all source material/depth/caster exports and reuse the existing GPU
   engine/adoption work; no second renderer. The current main Hunt is Canvas.
6. Re-run relevant JS/C#/Blender/browser/horde tests at the exact final head,
   record remaining physical-device limits, inspect source AND actual Hunt frames.
7. Upload accessible final source and MP4, complete docs and next-content
   handovers. Ask the one final owner visual approval only when all controlled
   work is genuinely complete. Never merge/deploy/mark art accepted beforehand.

## Moving-strike study — 28 October, after b8d5617

The source generator now accepts `--only attack-travel`: a 16 gait-phase ×
16 action-progress **whole-body** pose grid. Every pose re-solves the actual
arms, ankles, pelvis and mass proxy together. It is not an upper-body attack
pasted onto a separately running leg loop. The grid is an authoring surface;
its 256 samples are not a 256-frame sequential animation.

Independent saved-Blender evaluation passed all 256 samples: maximum stance
landmark drift 1.248945e-7m, bone-length error 1.427865e-7m, minimum mass-proxy
support margin 0.00300793m; knees 11.385–79.222°, elbows 25.106–149.822°.
The existing quarter-pixel tolerance and anatomical limits were unchanged.

Shared playback has optional validated action-major pose-grid metadata and
independent distance/action sampling. Action duration uses the action-axis
frame count, not the packed pose count. Target crossing, freeze/resume,
15/30/60/120Hz and malformed grids have focused regression coverage.
The narrow v1/v2 suite passed 22/22.

**Not integrated or accepted:** this study only covers travel along the source
forward axis. Turning world velocity during a locked strike, quantized raster
contact, atlas memory, material export and live Hunt contact remain open.
The existing runtime candidate is unchanged; the ~19.97-world-unit failure is
not claimed fixed. No new C# motion, damage or AI changes were made.

Reproduce the study:

```sh
blender -b -t 2 --python tools/animation/author_hollow_foundation.py -- --out artifacts/travel-study --only attack-travel
blender -b -t 2 --python tools/animation/validate_source.py -- artifacts/travel-study
node --test tests/javascript/creature-animation.test.mjs tests/javascript/sprite-animation.test.mjs
```

### Source-grid playback contact probe

A second probe uses the **actual 256 source contact samples**, transformed to
actor units, at the previously observed healthy actor speed (46.53 units/s).
This is a synthetic trajectory fixture, not a new actual-Hunt recording.
The quarter-source-pixel tolerance is still `(93/96)/4 = 0.2421875` actor units.

Unsigned travel initially failed even this study: forward drift reached
1.22025 units and forward-to-reverse drift 25.3335 units. Two scoped corrections
now initialize contacts at the source's continuous stance phase, measure the
actual selected raster-pose contacts, and drive an action grid from signed root
displacement projected onto its committed facing. The action clock and token
continue unchanged. The sprite correction remains bounded to one source pixel.

For 15/30/60/120Hz forward and exact opposite-direction root travel, maximum
sampled landmark slip is below 0.00000233 units, with no correction saturation.
The complete Node suite passed **500/500** after these changes. A negative
lateral-motion test intentionally requires observable saturation/slip: a
forward-axis grid cannot claim arbitrary-direction grounding. This is not yet
an integrated raster/Hunt result, and does not close AN2–AN5.

### Atlas/layout and reliability checkpoint

The existing `lighting/lit-sprite.js` binding now accepts optional source-pixel
crops and multi-row frame packing; its original UV and geometry tests still pass.
The same layout drives the existing Canvas adapter, GPU frame descriptor and
budget/dimension checks. New tests verify exact cropped bounds, foot anchor,
source pixel scale and multi-row facing offsets. No GPU shader or lighting engine
was changed. The default decoded budget remains 64 MiB.

The full JavaScript suite passed **503/503**. A fresh full Release Application
run on .NET 10.0.100 passed **669/669** (2m9s). The real Blazor application was
rebuilt successfully; local SDK TaskHostFactory IPC declarations were removed
only from restored SDK package files, not repository code, to accommodate the
execution environment. A new browser capture must be evaluated separately.

All five combined editable source actions passed independent saved-file QC.
The eight-view/256-pose grid color render is in progress at this checkpoint;
pending frames are not counted as complete. `developer-reference.md` now records
the actual API, coordinates, clocks, exporter commands, body-plan extension,
material/retarget limits, feature flag and rollback. It is a developer reference,
not a claim that open AN acceptance gates have passed.

## Actual grid/Hunt comparison and contact-region correction work

A rebuilt real Enemy Lab was captured twice at 390/320px, with C# healthy entity
5 and the same right/up/left player inputs. Both captures loaded their requested
asset pack without browser errors. These are desktop Chromium 142 Canvas runs,
not physical phone or GPU-lighting acceptance.

| Measured sampled residual | Original stationary action | Forward/reverse pose grid |
|---|---:|---:|
| Attack maximum slip, world units | 24.35060 | 14.26452 |
| Moving negative turn maximum slip, world units | 47.06024 | 48.05397 |

The trace confirms sideways C# velocity during a south-facing committed action.
The source-derived straight/reverse unit proof was valid but insufficient.
**The grid is not promoted to the repository's runtime asset path.** Eight
meaningful camera rows and all 2,048 color frames finished and passed crop/hash
checks. The review pack, including existing walk material maps, decodes to
63 MiB under the unchanged 64 MiB budget. Grid/turn final material, depth/caster
and actual GPU proof remain open. Adding direction grids multiplies memory and
does not repair contact transitions; the reusable correction now extends the
existing semantic compositor instead.

[New source/evidence checkpoint](https://chatgpt.com/library?file_id=libfile_0f3d0a8a044c81918b37170633e169c2&account_id=personal)
contains the genuine combined five-action editable Blender file, eight-view
review atlas, source manifest/QC, actual Hunt traces/screens/videos and a short
H.264 source study. It is a checkpoint, not a final owner-approval package.
Its CHECKPOINT.json records its exact older code/test boundary.

### Implemented correction primitives, not yet a Hunt fix

- Existing compositor accepts ordered source-bound semantic parts with affine
  transforms. Legacy attachment composition still works. Invalid regions and
  transforms fail before cache eviction or drawing; cache allocation stays bounded.
- Shared sparse two-bone animation kinematics rejects unreachable/singular poles,
  invalid limits and over-budget source corrections. It does not integrate forces,
  own gameplay or schedule contacts. The projected region helper preserves real
  3D chain lengths and maps those solved joints into compositor transforms.
- Independent Blender data for 32 actual knees agrees with the JS helper within
  a documented Float32 accumulation bound. Seeded property checks cover unequal
  lengths, poles, scaling and translation.
- Node-only 500-actor/600-frame cost for two pooled chains per actor, validation
  included: mean 0.27008ms, p95 0.48430ms. This is NOT the full regional compositor,
  mobile CPU, GPU or Hunt-horde cost. Regional integration must be profiled too.
- CPU Blender skin-ownership export extends the existing RLE contract. A real
  S/E × 16-pose study covers all 26,203 actual color-alpha pixels, with zero gaps;
  it also exports source joint matrices and calibrated orthographic projections.
  One-sample ownership initially missed 4,126 edge pixels and was rejected;
  matching four-sample ownership passes cover the actual source alpha. This does
  not prove deformed seam quality or unrendered directions.
- Profiles can explicitly declare source-metres-to-actor transforms and actual
  connected contact chains. Reflected/skewed/up-axis-invalid binds, missing chain
  bones, malformed poles and non-finite timing fail at load. Canonical replay JSON
  rejects cycles, sparse arrays, accessors and non-JSON values. Reserved string
  contact IDs cannot alias object prototypes.

Latest full Node result after these primitives: **518/518**. Source authoring
now records chain surface landmarks and its tool SHA; all five saved actions
were independently rechecked. Contact scheduling, mass/support-aware regional
integration, deformed source/mobile visual QC and material-normal transforms
remain open. No runtime source is silently marked accepted.

## Camera/contact-space and actual-sole audit correction

The old contact residuals above used an actor-local Cartesian approximation.
They are evidence that the candidate failed, **not exact measurements of the
drawn feet**. Independent S/E source projections exposed a sign and ground-plane
foreshortening mismatch. The exporter now records the actual orthographic camera
basis for eight views, emits projected-world contact offsets and per-view strides,
and playback does not rotate those offsets a second time. A saved-rig marker
cross-check has maximum error 0.00000256 actor units. New projected fixtures cover
S/E/diagonal source travel and reverse at 15–120Hz. Lateral motion still requires
regional correction; this is not declared solved.

The authoritative snapshot now projects `SimulationTimeSeconds = elapsed` without
changing ticking, damage or AI. The opt-in adapter consumes it and lets the shared
action lifecycle decide when a visual proximity cue completes. Duplicate renders,
legacy render-age expiry, freeze/resume and crossing targets do not restart the
candidate cue. Old snapshots fall back compatibly. Full local Application tests
passed **671/671**; full Node tests passed **524/524** at this checkpoint.

Source-region Canvas QA now actually renders the shared compositor with the
constrained 3D chain helper, for eight S/E key poses and a bounded 2cm correction.
This is source QC, not Hunt acceptance. Complete unchanged region sets draw the
original source once; partial sets cannot accidentally restore absent regions.

**Additional actual-mesh failure found:** the original manually chosen rest
landmark `(±0.09,-0.025,-0.5)` is about 5.5cm from the actual highly foot-weighted
mesh vertices. Its near-zero mathematical drift did not prove real sole contact
or the rectangular support footprint. The actual near-ground sole patches contain
225/180 fully foot-weighted vertices. Correcting authoring to use those real mesh
patches and independently measuring their posed vertices is the next required
source gate. Previous source and study archives remain explicitly unapproved.

## Actual sole-patch source gate — 28 October

The source rig knee/ankle bind centres were fitted to actual weighted mesh joint
rings, retaining original joint heights. Rest-skin displacement is only
6.32203e-8m; mesh, UVs, weights and original anatomy were not rescaled. Foot
support now comes from 405 fully foot-weighted actual near-ground vertices and
their convex support hulls, not a rectangle around a hand-picked empty point.
The support band derives from a quarter native source pixel (0.00403646m).
The authoring mass-margin target was tightened to half a source pixel (0.00807292m).

Independent saved-Blender evaluation measures the evaluated skin vertices:

| Clip | Maximum actual sole slip, m | Maximum sole ground error, m | Minimum independent mass-proxy margin, m |
|---|---:|---:|---:|
| walk | 2.18112e-7 | 2.38419e-7 | 0.00927244 |
| stationary supported claw | 1.49198e-7 | 2.38419e-7 | 0.03641078 |
| positive turn | 3.14009e-7 | 1.78814e-7 | 0.00909645 |
| negative turn | 3.00343e-7 | 2.38419e-7 | 0.01053297 |

All knee/elbow limits and fixed bone lengths pass. This remains a declared
segment-mass/support approximation, not rigid-body dynamics or visual acceptance.
Real-mesh world-motion Hunt acceptance remains open.

Temporary-clone negative tests inject actual mesh skating and hovering. Both
were rejected for the expected geometry failure with **Blender exit status 1**.
Commands now use `--python-exit-code 1`; Blender's default zero status after a
Python exception cannot be treated as a passing check. The new read-only source
workflow caches a SHA-pinned Blender 4.5.3 runtime, runs these gates without
rendering every commit, and uploads source/QC only; it cannot publish or merge.

The old optional 256-pose `attack-travel` study fails the corrected real-sole
reach constraint at pose 26 and remains rejected. The reproducible current
source pipeline uses the four validated clips, then shared contact-region
integration. Do not spend another full eight-facing grid render on that rejected
study or promote its historical landmark-only metrics.


### Continued checkpoint: corrected sole source and asymmetric arm coupling

The new shoulder-relative hanging/leading arm source passes independent evaluated-mesh QC for all four actions. Maximum stance-vertex drift: walk 1.943e-7 m, claw 1.505e-7 m, positive-source turn 2.896e-7 m, negative-source turn 2.937e-7 m. Minimum mass-proxy support margins respectively 0.0128003, 0.0352565, 0.00831263, 0.00856848 m. These are offline source results, not live Hunt acceptance.

Full local JavaScript regression suite: **531/531 passed**. Added atomic profile-byte SHA validation and skeleton-signature agreement, invalid pelvis-correction budget rejection, calibrated projection inversion, and generic arbitrary-anatomy stance/swing target scheduling. The scheduling helper is not yet connected to production sampling. Corrected Blender Z-yaw versus screen-facing turn sign in atlas export; runtime visual continuity still requires integration validation.

Remaining acceptance gates stay open: runtime regional body/contact coupling and support checks, source entry/exit continuity, aligned deformed material maps, eight-facing current-source export, complete continuous source performance, actual Hunt phone-scale lighting capture, and representative renderer performance. Do not infer AN6 completion from this checkpoint.


### Sparse region sampling checkpoint

`sampleSourceContactRegions` produces existing shared-compositor parts from actual source chains and caller-owned world support targets. `measureSourceSupport` reports the actual projected footprint hull, including explicit degenerate point/line support; its mass readout is labelled an authored proxy rather than a newly simulated physical COM. Missing support targets and unreachable joints fail visibly.

The corrected-source S/E metadata export completed; the browser compositor review was rendered and inspected. `node tools/animation/check_region_trajectory.mjs artifacts/shoulder-contact-regions/contact-regions.json` completed two calibrated forward strides at 120 Hz in both views, with maximum projected target reconstruction error 2.061e-14 world units. This measures projected source contact reconstruction, not raster foot slip, arbitrary-direction Hunt grounding, or dynamic balance. Full local JS suite: **533/533**. Runtime wiring and remaining acceptance gates are still open.


### Asset-to-compositor bridge

The existing atomic asset adapter now accepts optional SHA-verified source region metadata, requires exact rig identity and all required facing/frame rows, and exposes `sampleRegions` for caller-owned support targets. Canvas drawing reuses the existing shared compositor with one pack-wide cache constrained by the same texture budget. GPU regional descriptors explicitly reject pending material deformation instead of advertising incorrect normal/emissive transforms. Default assets remain unchanged. Full local JS suite **535/535 passed**. This is bridge implementation, not completed live motion integration.

### Resumed live support bridge — 28 October

Resumed at `463b723` and inspected current main `789f3c17` and open PRs; parallel sigil, lighting, AI and art branches remain separate. Rebuilt all four current editable source actions with SHA-verified Blender 4.5.3. Independent saved-mesh QC reproduced maximum actual stance drift below 2.94e-7m and minimum authored mass-proxy margin 0.0083126m.

The source-region exporter now records explicit per-frame stance membership. The shared contact helper retains actual world support epochs across source clip/facing changes and makes externally transported frozen contacts explicit. The asset adapter passes those supports through the existing fixed-length regional solver/compositor and avoids applying whole-sprite root correction twice. The healthy opt-in Hunt adapter calls this bridge when the pack supplies region metadata; unreachable/budget failures retain a per-actor diagnosis and fall back to that actor's existing art. No damage, movement, AI or save behavior changed.

This does not promote the old asset pack: its metadata has no current-source regions. Moving-strike support, transition continuity, complete current-source exports, deformed materials, GPU/Hunt proof and final approval remain open. Synthetic bounded-world displacement tests are not raster or actual-Hunt foot-slip evidence.

### Eight-view correction and renewed moving-source study

The corrected four-action color export completed all eight distinct facing rows. The corrected-source contact-region forward-trajectory probe initially failed joint limits in N/NE/NW: its caller projected swing height as if it were ground XY. Adding the calibrated vertical projection before inverse solving fixed that probe in all eight views (maximum reconstruction residual 2.14e-14 world units). This is not raster/Hunt acceptance.

A new bounded 8-phase × 16-action whole-body source study lowers the grid pelvis by 1.5cm to reserve knee flexion for the real sole patch. Independent reopened-mesh QC now passes all 128 poses: maximum stance skin drift 2.314e-7m, minimum mass-proxy support margin 0.00822094m, minimum knee flexion 13.594 degrees; original contact tolerances and anatomical limits unchanged. This replaces no runtime pack and has no claimed arbitrary-direction or source-transition acceptance. The older 256-pose source remains rejected.

Full local JavaScript suite passed 537/537 at the support bridge checkpoint. A fresh .NET 10 Application run passed 671/671 after isolating the direct DrownedWraith fixture from random map walls (no production C# change); the initial run reproduced 670/671 with the telegraph blocked. Blazor publish succeeded after removing TaskHostFactory declarations in restored local SDK packages only. Standard Chrome could not open its singleton Unix socket in this environment; the matching 142.0.7444.61 headless shell ran source-region browser review and actual 320/390px Enemy Lab capture. The new source pack without regions still exhibits large contact residuals; do not call it grounded or GPU-lit acceptance.

### Live regional candidate and browser cost

All four corrected-source actions now have complete eight-facing region metadata with explicit stance and exact color-atlas provenance. Runtime rejects a separately signed region file that names another atlas even when rig identity matches. The compact pack retains 3,359,308 bytes of metadata (below the unchanged 4MiB bound) and 18,874,368 decoded color-texture bytes before material maps. Current-source browser regional review and real 320/390px Enemy Lab captures completed. In the first regional Hunt trace only 1/58 sampled poses rendered regionally; 57 reported `Source contact correction budget exceeded` and used the healthy actor's existing fallback. This is an exposed failure, not grounded motion acceptance. The bound remains one native source pixel; no tolerances or C# movement were relaxed.

The real shared sparse solver + Canvas regional compositor + draw was measured with 500 synthetic visible actors over 60 frames at 390x844, Chromium headless shell 142.0.7444.61. Initial mean 57.94ms/p95 79.7ms; insignificant world-cancellation noise prevented cache reuse. Cache identity now canonicalizes coefficients at 1e-9 (worst alias <1.82e-7 native pixels on the 128px source; drawn transforms unchanged). Repeated observed mean 18.79ms/p95 28ms, zero solve failures, six MiB shared cache. Concurrent offline rendering affects these timings; this is not an isolated device/horde/GPU acceptance result, and does not prove 60fps on phones.

A freeze regression was found and fixed: changed facing intent could switch from the held walk clip to a differently sized pivot while retaining the walk frame. Freeze now retains clip/frame/facing together; terminal death still overrides. The complete JS suite passed 540/540 before the latest cropped-compositor/cache additions; latest-head validation is separate.

Material export originally changed the saved source's sample count and therefore its alpha coverage. That output was rejected. The exporter now retains source sampling and matching re-export is in progress; a sampled corrected albedo/source comparison is exact, not yet a claim about all frames. Regional atlases can now retain calibrated original region coordinates while losslessly cropping transparent padding, necessary to fit all maps under the shared texture budget. GPU deformation, depth/caster adoption and end-to-end source/Hunt acceptance remain open.

### Preserved material/region evidence checkpoint

All four current source actions completed 512 facing frames per channel. Packing verified exact alpha against source for all 1,536 albedo/normal/emissive frame comparisons. Supersampling averages evaluated geometry normals; the pack explicitly normalizes those geometry-derived vectors (never derives normals from art), rejects vectors below 8-bit quantization precision, and preserves alpha. Packed vector lengths are 0.99347–1.00646 after 8-bit encoding. Lossless transparent-padding crops reduce all 16 decoded textures to **29,249,536 bytes**, plus the bounded shared cache; metadata is **3,359,647 bytes**. A negative atlas-provenance mutation was rejected with exit 1.

The cropped pack loaded in the real published application with zero loader/browser errors at 320/390px. Its trace still rejects 56/57 sampled regional poses for exceeding the unchanged one-source-pixel correction budget. Those are fallback/failure captures, not acceptable walking or a final review movie. The newer material-pack browser stress run was mean 27.24ms/p95 74.4ms with zero solve failures; timing variance confirms that the earlier faster run is not a mobile budget acceptance. No physical phone or actual GPU Hunt was tested.

[Persistent source/material/browser evidence checkpoint](https://chatgpt.com/library?file_id=libfile_28751fa2a45c81919abbbad20ff2b178&account_id=personal)
contains both editable source studies, independent real-sole QC, the exact cropped pack, real Hunt failure traces/H.264, a separately labelled S/E moving-source MP4, source-region inspection image and local test/performance logs. It is explicitly incomplete. `review_pose_grid.py` samples separate gait/action clocks rather than playing packed rows sequentially; it does not prove source entry/exit continuity. The historical grid review overlay now uses actual authored sole contacts instead of the obsolete empty landmark.

Latest completed local suites: **542/542 JS**, **671/671 Application**. At code checkpoint b7df6c52, 9/10 workflows were successful and Browser smoke was still running; later-head CI must be checked independently. PR #387 remains draft/unmerged. AN2/AN3 live moving-support/body coupling, AN4 continuous walk→strike→recover→turn→chase, AN5 GPU/depth/casters and representative mobile performance are **not finished**. No final owner approval is requested.

### Continuation: continuous stance initialization and moving-pack export

Recovered the prior working tree and remote `bbc966f4` without discarding source
or export changes. The public lifecycle now exposes a calibrated
`sourcePhaseOffset`: newly observed planted contacts start at continuous gait
phase instead of the nearest raster frame. Existing world support epochs remain
fixed. Swing targets, pause, reduced motion and correction/reach limits retain
their existing meaning. No C# movement, damage or AI was changed.

A packed-source replay reproduced failure in all 32 constant-forward walking
cases before the correction. After correction, all eight facings at 15/30/60/120Hz
pass two-second source-chain replays under the unchanged one-source-pixel budget.
The committed actual-source fixture exercises these paths, stable stance targets
and <1e-10 projected-world reconstruction residual. This is source-chain evidence,
not raster/Hunt/phone acceptance. The same replay still rejects the stationary
claw during movement; moving action and turn integration remain open.

The recovered export changes support wrapped multi-row contact/color/material
atlases and shared camera-independent source pose tables. They preserve per-clip
Blender hashes when separately authored actions share the same validated bind
rig. Source-pose sharing reduces the existing four-action metadata from 3,359,647
to 1,198,918 bytes; it does not raise the 4MiB bound. A hardcoded reduced-motion
frame 128 was outside the renewed 128-pose moving-claw grid; export now computes
a valid middle action row from declared grid dimensions. The eight-view moving
region export is being completed and is not yet runtime acceptance.

### Moving-grid and exact source-transition checkpoint

The 128-pose moving pack completed all eight region views and fits unchanged
budgets: 3,253,774 metadata bytes and 22,369,280 decoded color bytes. Its genuine
Blazor capture still rejected 58/58 sampled regional poses. Constant-forward
replays also expose corrections above the unchanged source-pixel bound; this
pack is rejected as runtime acceptance, not promoted because it loads.

A new 16-phase/16-action source surface joins the actual walking performance at
both ends. Interior torso/arm load and knee-flexion reserve fade in/out together;
the endpoint uses the same hanging/leading arms and body motion as the gait.
Reopened-mesh QC passes all 256 poses: maximum actual stance drift 2.56802e-7m,
minimum mass-proxy support margin 0.00816692m. Independent complete evaluated-skin
entry/exit comparison across all 16 phases measures maximum discrepancy
3.12603e-6m (quarter-source-pixel limit 0.00403646m). These are source results only;
this source has not yet completed rendering or regional/runtime integration.

`validate_source.py` now checks any declared `transitionReference` against the
saved Blender skin. Temporary-clone mutation checks reject skating, hover and a
cloth-only endpoint mismatch, each with Blender exit 1. The latter measures a
0.0487433m discrepancy and leaves contact/mass checks otherwise intact.
Latest complete JavaScript suite: 544/544. Live capture browser errors: none.
All earlier GPU, moving-turn, full-sequence, horde/device and final-review gates
remain open; AN0–AN6 is not complete.

A bounded source alternative uses 16 gait phases × 8 complete action poses,
with action FPS 6 to preserve the original 4/3-second action duration. Reopened
mesh QC passes: maximum actual stance drift 2.42116e-7m and full-skin entry/exit
discrepancy 1.81647e-6m. The action-pose count is an explicit authoring option,
not a relaxed contact tolerance. Its eight-facing export and runtime proof remain
pending. The separately rendered 256-pose S/E study is H.264/yuv420p at 768×480;
it is not the required continuous walk→turn→chase Hunt approval movie.

### Signed action exit continuity

The shared lifecycle previously discarded the moving action's signed contact
phase on completion and resumed the unsigned cumulative-distance phase. It also
dropped displacement in the completing sample. Recovery now retains that signed
phase before releasing the action. A forward/reversal regression checks the exact
exit at 15/30/60/120Hz. Focused animation/asset/contact suite: **55/55 passed**.
This repairs clock/phase continuity; it does not make a source turn under arbitrary
lateral C# motion physically supported. The bounded source's full facing render
is still a pending acceptance input.

Full local JavaScript regression after the signed-phase change: **545/545 passed**
(`node --test --test-concurrency=4 --test-reporter=tap tests/javascript/*.test.mjs`).
The bounded moving source also passed all three temporary-clone rejection tests,
including complete-skin endpoint failure. CI now authors/reopens that source in
addition to the original four-clip proof, and uploads its saved source/QC.
Capture now begins when candidate assets are actually ready, before the initial
approach is discarded by a fixed startup sleep; steering still starts 1.5s later.

### Source-forward envelope and signed locomotion

A read-only reopened-rig probe now checks 96 forward/reversal scenarios before
rendering: 15/30/60/120Hz, four initial phases, and 1/2/4.3 gait cycles per second.
All 96 pass source-pixel correction and anatomical reach/knee limits. It is
explicitly source-forward-only, not arbitrary-motion, raster or Hunt acceptance.
The source workflow reproduces and uploads this report.

Calibrated locomotion now also consumes actual signed C# displacement projected
onto the declared source stance derivative. It no longer loses that sign after
recovery; old packs retain their cumulative-distance behavior. Focused suite:
56/56 passed, including S/E/diagonal reversal beyond action completion. Lateral
motion is not reclassified as supported; regional reach/support failures remain
observable and continue to use the matching existing actor fallback.

### Bounded moving pack: live contact/body integration evidence

The complete 16-gait-phase × 8-action-pose, eight-facing pack retains
3,262,548 metadata bytes and 22,631,424 decoded color bytes. Initial actual-pack
replay passed 57/64 scenarios; seven failed support because a phase-corrected
foot anchor was combined with an uncorrected body. The shared adapter now applies
the identical bounded source-phase translation to body, swing chains and poles.
Existing planted anchors remain fixed. Both source-contact correction and body
translation stay within one native source pixel, and anatomical limits and the
support test remain unchanged. Old packs without `continuousPhaseBody` retain
prior behavior. Final actual-pack replay: **64/64 passed**, eight facings × four
frame rates × walk/moving-claw, with support checked as well as contact error.

Actual published Blazor Enemy Lab at 320/390px still fails the full sequence:
first capture 24/90 regional poses, diagnostic repeat 23/88, with all remaining
poses rejected and the matching fallback shown. Diagnostics now identify the
failed contact, source pose and measured/allowed correction. The initial path
has lateral motion even while labelled S: one recorded walking residual is
0.0239493m versus the unchanged 0.0161458m allowance. This is the concrete remaining
arbitrary-motion/source-support gate. No limit was widened to hide it. Source-
forward success cannot be called a grounded pass-by/turn/pursuit performance.

Full local JS: **547/547 passed**. Current synthetic browser benchmark: 500 visible
actors, 60 frames, mean **17.79ms**, p95 **28.2ms**, max **53.9ms**, zero solve
failures; 22,631,424 decoded color bytes plus 6,291,456 shared cache bytes.
Chrome's coarse reported heap was 35.1MB before/after. This was desktop headless
Chromium, no concurrent Blender rendering, not physical-phone, GPU or real-Hunt
horde acceptance. Current source remains candidate/unapproved. GPU deformation,
depth/casters, arbitrary moving turns, final continuous sequence and device gates
are open. Do not request final owner approval or call AN0–AN6 complete.

### Shared skin lifecycle continuation — 28 October

The shared v2 lifecycle now emits source-support phase, continuous committed yaw and calibrated ground basis. Source skin support consumes that sample without another clock. Ground-yaw foot controls preserve sole orientation through body turns; bounded coherent body fitting retains fixed leg lengths and explicit source limits. New synthetic shared-lifecycle checks cover forward, sideways, backward, corner, reversal, idle and turn at 15/30/60/120 Hz (28/28); this is not independent saved-skin or Hunt acceptance. All 569 JavaScript tests pass. Independent full skin/foot-orientation replay and actual Hunt adoption remain open.

The real LightingEngine compiled and rendered source skin lit, normal, mask and shadow passes in Windows HeadlessChrome 153.0.8010.12, with no browser errors and exactly zero nonblack world pixels when lights/ambient/emission are disabled. The 1,800-triangle candidate loses silhouette detail. The protected-group decimation experiment creates holes in the actual Blender source and is rejected. Unprotected 6,000/12,000 triangle candidates require native comparison/performance review. Variable influence sets preserve all source weights, including 12-weight experimental geometry; no source weights are silently discarded. Physical iPhone evidence and final owner approval are still open.

### Hunt skin integration checkpoint — 28 October

Candidate `?animationFoundation=1&arenaGpu=1` now loads an atomic hashed source-skin pack through the existing creature asset owner, consumes the shared lifecycle/support sample and registers actual skinned geometry with the reused HuntGpuWorld/LightingEngine adapter. The source camera is calibrated to the Blender ground projection. Standard healthy Hollowed only; injury, frozen/hit presentation and failed solve retain existing art. Default flag-off Canvas behavior and C# gameplay are unchanged. The 12,000-triangle pack is a reversible visual candidate, not approved content. Existing JavaScript suite remains 569/569. Real current-application browser capture is next; this checkpoint does not assert acceptance or AN6 completion.

### Supported idle/skin replay checkpoint — 28 October

Idle initialization now uses an authored double-support frame; a stopped gait settles the airborne contact through the same lifecycle phase into double support, rather than holding a one-foot walk pose. All 288 seeded already-moving cases and 288 idle-start cases passed nine trajectory families at 30Hz. The four-rate run passes 36/36. The original 0.14m source-body and 0.28m contact authoring envelopes remain unchanged; the larger-envelope diagnostic study was not promoted. Independent Blender 4.5.14 replay of 1,089 complete runtime matrix poses measures max bone endpoint error 4.16e-7m, max bone length error 1.64e-7m, retained world sole drift 4.85e-7m, and min actual mass support margin 0.0080838m. Sole patch band is 0.00402379m (below one quarter native pixel); this is not a 4mm ground-hover assertion. Full JavaScript 571/571 and Application C# 671/671 pass.

Actual current-branch published Blazor Enemy Lab, healthy C# entity 5, rendered through HuntGpuWorld with 12,006 total triangles; first 87 samples and albedo inspection 88 samples had zero solve failures, max projected sole drift 6.36e-14 world pixels. Desktop inspection is explicitly labeled. Native 12k/full-source comparison mask IoU 0.9796875 (13 differing pixels). The derivative editable .blend and native comparison are preserved. No physical iPhone was used.

Main advanced to `b2552580d3321d51dd5f7b9d5d890b193a2716a0` (#389/#392–395 target sigil/aim fixes), requiring reconciliation before final validation. Open concurrent #390/#391 anatomical/cloth art, #385 variety and #381 Hunt GPU work remain untouched. AN6 is not complete at this checkpoint.

### Continuity audit — 28 October, source timing study still open

Real 390px albedo encounter captured 228 samples without solver/browser failures; the overlay capture recorded 226 samples, two committed claw tokens with exactly zero yaw change, and recovery progress reaching 0.999975. These are preserved locally pending final movie export. A new frame-to-frame audit nevertheless finds abrupt airborne-foot and mass transitions in synthetic root corners; therefore these successful contact checks do not close AN4/AN6.

Shared follower now blends swing release from the retained actual liftoff anchor. Generic full-body IK can fit only grounded chains while bringing unreachable airborne targets into actual fixed-length joint reach; it never moves a planted target. Optional authored load weights use the weighted Minkowski support region, alongside the unchanged actual sole hull test. The source profile can describe anisotropic stride distances; the single lifecycle still owns signed phase and commitment. The new longer/double-support source is preserved as a study, not promoted runtime content. Earlier 0.28m candidate remains the public asset until current source skin/continuity/native/Hunt validation passes. JavaScript passed 575/575 before the new timing metadata (rerun required after that metadata is finalized).

### Guided source + bounded orientation checkpoint — 29 October

A source guide preserves the authored complete-body performance before the static source balance bake, so runtime fitting does not depend on a second leg or torso clip clock. The saved .blend retains both guide and supported actions. Forward/side stride distances, pelvis/spine/chest orientation allowance and a small non-contact balance joint are profile data. The shared lifecycle owns phase and commitment; the existing source-contact helper and LightingEngine consume the resulting complete pose. Renderer camera/ground offset/model units now come from source declarations rather than creature-specific constants. Replay seeks within a HUD second reset presentation state; changing C# actor scale starts a fresh source epoch. CPU solving and GPU skin populations are both bounded to 12; reduced-motion, injury, frozen/hit, budget overflow and failed solves retain approved existing art.

All 288 seeded already-moving trajectory cases pass (nine root families, 32 deterministic seeds at 30Hz). The rare corner that previously missed the support margin now uses 1.2615 degrees of the declared 10-degree spine allowance. Independent Blender replay of its 1,089 actual complete skin poses passes: max endpoint error 5.36e-7m, length error 2.09e-7m, retained world sole drift 5.21e-7m, minimum actual mass support margin 0.0080840m. Gait/claw guide endpoints differ at most 2.11e-6m. Native frame-to-frame speed measurements remain review evidence, not a claim of artistic acceptance. JavaScript suite: 580/580.

The public flag-gated asset pack is still the earlier short-stride candidate at this checkpoint. The guided source must pass actual current-Hunt and source/material comparison before that reversible candidate pack is updated. AN6 remains open; no merge, deployment or physical-device acceptance is claimed.
