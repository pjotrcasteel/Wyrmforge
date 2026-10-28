# AN0–AN6 execution record — 28 October 2026

**NOT FINISHED. Keep PR #387 draft and unmerged. No final visual approval requested.**

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
