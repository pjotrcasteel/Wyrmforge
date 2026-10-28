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
