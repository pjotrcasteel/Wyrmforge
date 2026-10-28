# Shared character animation developer reference

Status: candidate API in draft PR #387. [Acceptance evidence and open gates](AN-status.md).
Canon: [art](../canon/art-and-animation.md#universal-animation-foundation--an0an6-27-october-2026),
[authority](../canon/architecture-and-quality.md#locked--unified-engine-ownership-and-event-authority-27-october-2026).

## Public entry points

`wwwroot/js/sprite-animation.js` is the shared playback owner. Existing schema-v1
profiles continue to use its existing API. No species switch belongs in this module.

```js
import {
  createSpriteAnimationState, validateCreatureRigProfile, updateSpriteAnimation
} from './sprite-animation.js';
const profile = validateCreatureRigProfile(await response.json()); // once per asset pack
const state = createSpriteAnimationState(); // one per entity, retained across snapshots
const pose = updateSpriteAnimation(state, profile, {
  entityId: snapshot.id,
  timestamp: visualSampleSeconds,
  travel: cumulativeObservedWorldDistance,
  world: {x: snapshot.x, y: snapshot.y},
  scale: visualActorScale,
  direction: facingIntent,
  moving: isMoving,
  frozen: snapshot.frozen,
  paused: presentationPaused,
  reducedMotion: accessibilityReducedMotion,
  action: cue && {name: cue.name, token: cue.token, sequence: cue.sequence}
});
```

The declaration file `creature-animation.d.ts` describes the presentation API.
`timestamp` and `travel` must be finite and monotonic; world coordinates must be
finite. Scale is positive. A teleport, replay seek or entity replacement creates
fresh state. Do not reconstruct state each render: that destroys contact epochs.
Stable IDs seed presentation deterministically. This module does not mutate inputs.

The Hollowed adapter currently projects **visual-only proximity cues**, not C# hit
markers. Continuous C# contact DPS remains unchanged. No renderer callback can
award damage, modify collision, choose AI behavior, or change saved state.
A future authoritative action cue must originate in C#, preserve event identity,
and be feature-gated if it changes gameplay timing. It is not enabled by this PR.

## Rig and contact coordinates

Schema-v2 profiles require ordered parent-before-child bones, finite invertible
positive-determinant affine rest matrices, positive lengths, optional angular
limits, semantic mappings and actual surface contacts. Missing limbs are absent
bones, not invisible extra chains. Surface types are foot/palm/paw/body; there is
no requirement for two legs or two arms. Optional emitter/attachment sockets must
refer to present bones. Validation rejects unsupported coordinate conventions.

Contact samples use actor ground-plane XY, positive Z up. Facing row index zero
has zero yaw along +X; successive indices rotate by 45 degrees. The exported
Hollowed profile orders E, SE, S, SW, W, NW, N, NE. Atlas row order is independent:
it is resolved by the manifest's direction names.

The Blender source uses metres in armature space. Current Hollowed export maps
source `(x,y)` to actor `(-y,x)*60`, then applies authored pivot yaw. Contact and
COM debug coordinates must use this same transform. Bone bind arrays retained
from Blender are source-space metadata, not a runtime skeletal solver; source
lengths are metres. Do not interpret them as actor-world lengths. A complete
retarget tool must retain that scale/basis explicitly before solving another rig.

A pose has explicit stance contacts; a missing contact is swing/flight, never an
implicitly planted limb. Unsupported samples must state catch/flight/fall.
The source mass model uses weighted segment centres and finite sole footprints.
It is an authoring approximation, not a gameplay rigid-body simulation or proof
of continuous dynamic balance.

## Clocks, priorities and interruption

Locomotion phase follows cumulative observed distance divided by authored stride
and actor scale. Action progress follows its own elapsed visual clock. A token
identifies one action; sequence numbers reject stale delivery. A committed action
retains its facing and token across target changes. Higher-priority terminal death
can override and hold. Frozen/paused samples stop the clock; the first resumed
sample drops paused elapsed time/displacement instead of catching up. Reduced
motion selects declared source poses. No random jitter is introduced.

Source turns are separate positive/negative, weight-bearing 45-degree clips.
A source turn does not establish correct turning under arbitrary moving C# roots.
Entry/exit continuity and low-FPS contact behavior are acceptance tests, not
properties inferred from clip names.

## Optional whole-body pose grids

A grid stores `actionFrames * phaseFrames` whole-body source poses, action-major.
Its packed `frames` is the pose count. Action duration is `actionFrames/fps`.
Both axes use nearest source samples; no pixel crossfade or independent leg loop
is synthesized. Each pose is solved/validated as a complete source body.

`poseGrid.travel = 'facing-projection'` advances a separate contact phase from
actual root displacement projected onto the action's committed facing. It permits
forward/backward steps while the claw's action clock proceeds normally.
`stanceVelocity` is the authored actor-local stance-contact derivative per gait
cycle. It initializes a new contact at continuous source phase. The solver still
measures the selected raster-pose landmark against its world anchor, and applies
only the existing one-source-pixel bounded whole-sprite translation.

The current study supports forward/reverse travel. Lateral travel still produces
observable slip/saturation; the negative regression deliberately preserves this
failed gate. There is no claim of arbitrary-direction moving attack support.

## Sampling and rendering

`PoseSample` exposes clip/frame/direction, base phase/frame, action identity and
progress, contact phase, deterministic seed, bounded root offset, material binding
and contact diagnostics. `debug.maxSlip` is residual error after the bounded
translation. Saturation is a failure signal, not permission to move the collision
body or relabel a sliding foot as swing. Quarter-source-pixel acceptance uses the
actual profile's `unitsPerPixel / 4 * actorScale`.

`creature-animation-assets.js` validates and SHA-256-verifies actual PNG bytes,
checks decoded dimensions, loads atomically, exposes errors/stats and disposes
images. Its default decoded budget is 64 MiB per shared pack, not per actor.
`renderDescriptor` reuses `lighting/lit-sprite.js` UV/material binding. The GPU
engine remains the lighting owner. Source-lit review PNGs are not production
albedo or proof of Hunt lighting. Missing depth/caster/material passes remain gates.

Atlas cells can declare `columns` and `crop: [left,top,right,bottom]` in original
source-cell pixels. Frames wrap into rows within each facing block. All maps must
share the layout. Cropping trims transparent padding; source pixel scale and
original anchor are preserved in Canvas and the existing GPU sprite geometry.
Decode budgets count padding cells too. Export rejects any crop that clips alpha.

## Reproducible source work

Prerequisites used: Blender 4.5.3 LTS, Python/Pillow, Node 22+, .NET 10.0.100 for
application checks. Pin the actual tool versions in evidence; do not call a green
Blender process visual approval.

```sh
blender -b -t 2 --python-exit-code 1 --python tools/animation/author_hollow_foundation.py -- --out artifacts/foundation --only walk,attack,pivot,pivot-negative
blender -b -t 2 --python-exit-code 1 --python tools/animation/validate_source.py -- artifacts/foundation
blender -b -t 2 --python-exit-code 1 --python tools/animation/render_grid_review.py -- artifacts/foundation
# Full export is intentionally tiered; inspect source review before this render.
blender -b -t 2 --python-exit-code 1 --python tools/animation/author_hollow_foundation.py -- --out artifacts/foundation --only walk,attack,pivot,pivot-negative --render --all --samples 2
python tools/animation/export_atlases.py artifacts/foundation --out artifacts/atlas-candidate
blender -b -t 2 --python-exit-code 1 --python tools/animation/render_material_passes.py -- artifacts/foundation/hollow-foundation.blend --out artifacts/material-candidate
```

The final command currently covers walk/attack material passes; it does not
complete grid/turn/depth/caster production exports. The manifest explicitly marks
review/source QC versus runtime/production acceptance. Source files contain named
editable Blender actions and packed textures. Grid actions are sampled surfaces:
scrubbing across a row boundary is not a continuous animation performance.

## Tests and actual application capture

```sh
node --test tests/javascript/creature-animation.test.mjs tests/javascript/creature-animation-assets.test.mjs tests/javascript/sprite-atlas-layout.test.mjs
node --test tests/javascript/*.test.mjs
blender -b -t 2 --python-exit-code 1 --python tools/animation/test_kinematics.py
# Standard .NET test project paths are listed under tests/; use Release.
dotnet test tests/Wyrmforge.Application.Tests/Wyrmforge.Application.Tests.csproj -c Release
```

Publish the actual Blazor application, then use `tools/animation/capture-hunt.cjs`
with `WYRMFORGE_PUBLISHED_ROOT`, `PLAYWRIGHT_MODULE`, and `CHROMIUM_EXECUTABLE`.
The script serves and browses in the same process/network namespace. It uses the
real developer Enemy Lab and C# entity ID 5, an actual healthy standard Hollowed;
default developer entity ID 1 is one-arm and must retain its matching fallback.
It records 320/390px browser captures. Those are desktop viewport emulation,
never evidence of a physical iPhone or GPU cutover.

## Adding a new body

Start from `tests/fixtures/animation/generic-quadruped.json`, `hand-crawler.json`
or `one-arm-biped.json`. Supply real bones/contacts/sockets/stride, source-authored
poses, matching manifests/material maps and a small adapter producing MotionIntent.
Run validation, absent-limb negative tests and the same clock/contact/replay tests.
No edit to shared playback is needed to identify the new creature. Do not reuse
Hollowed footage as acceptance of crawler palms or quadruped paws.

For content follow-ups see [four next-content handovers](next-content-handovers.md).
They remain blocked on the foundation's open quality gates. Approved Ashling art
and gameplay are unchanged.

## Feature flag and rollback

`?animationFoundation=1` opts in only a healthy standard Hollowed. Default playback,
injured sources and Ashling remain on existing adapters. Remove the query flag to
restore the previous presentation immediately. Do not mark productionReady or
remove fallback until owner visual acceptance and remaining runtime gates pass.
No save migration or damage-balance rollback is needed: this feature owns neither.

## Contact-region correction primitives (candidate, not integrated)

`SemanticSpritePart` extends the same render sample with ordered
`{clip, frame, direction, region, transform:[a,b,c,d,e,f]}` entries. The existing
compositor clips actual source pixels before applying these transforms. Its LRU
budget is shared, not allocated per actor. Unknown source regions and singular
transforms fail before mutating a cached tile. A sourceRectangle callback can
supply an existing atlas layout; this is a rendering bridge, not another clock.

`rig.sourceSpace` may explicitly describe Blender armature metres and its proper
uniform Z-up `toActor` matrix. Current Hollowed maps `(x,y,z)` to
`(-y*60,x*60,(z+0.5)*60)`. Bone arrays remain source-space data. Contact `chain`
metadata names connected present upper/middle/end bones, an explicit source pole,
rest surface point, joint limits and `bindSpace:'rig-source'`. Validation rejects
inconsistent spaces and missing limbs before correction.

`sprite-contact-kinematics.js` contains leaf kinematics, not another engine:
`solveTwoBoneContact` can reuse its output buffer; `retargetSourceContactRegion`
consumes actual posed source segments, source/target surface points, calibrated
orthographic projection, pole/length/limit data and a required finite correction
budget. It returns fixed-length 3D joints and projected region transforms. It
never clamps an impossible target or changes simulation state. Contact planning,
source-to-world conversion, support/mass acceptance and final material-normal
rotation are still integration gates; an adapter must not call this partial
capability a complete grounded actor.

CPU source metadata study (S/E only):

```sh
blender -b -t 2 --python-exit-code 1 --python tools/animation/export_contact_regions.py -- artifacts/foundation --out artifacts/contact-regions --color-atlas path/to/verified/walk.png
node --test tests/javascript/sprite-contact-kinematics.test.mjs tests/javascript/sprite-layer-compositor.test.mjs
node tools/animation/benchmark_contact_chains.mjs
```

Ownership passes use the same sample count as the inspected source alpha and
fail if they miss any actual color-alpha pixel. The exporter never redraws color
sprites. Bone-chain arguments are authoring data; the playback/kinematics modules
contain no species branches. Study metadata marks partial directions and source
QC explicitly. It is not a shipped asset declaration.

### Projected contact calibration and authoritative sample time

`contactSpace:'projected-world-offset'` plus `facingSamples` declares offsets from
the sprite anchor in actual presentation-world units, already projected for each
view. Do not yaw-rotate them again. `strideByDirection` and
`stanceVelocityByDirection` preserve the actual camera ground projection. The
source bind transform and camera projection have different jobs; a proper 3D bind
basis is not a substitute for orthographic screen contact calibration.

`RunRenderSnapshot.SimulationTimeSeconds` is read-only `elapsed`; it creates no
new attack event. The opt-in adapter uses this sample time and the shared action
state instead of repeatedly reissuing cues from the legacy visual-age timeout.
Snapshots without the field retain the earlier fallback. The source-region QA
command uses actual compositor pixels and is explicitly separate from Hunt QC:

```sh
node tools/animation/review_contact_regions.cjs artifacts/contact-regions/contact-regions.json
```

The current source audit also found that hand-picked sole landmarks did not lie
on the actual mesh patch. Real sole-vertex ownership/patch calibration is an open
source gate; never cite the old landmark-only slip as mesh contact acceptance.

### Actual mesh support and reliable source failures

The current author fits knee/ankle binds to actual weighted joint rings while
checking rest-skin fidelity. `solePatches` records the fully owned near-ground
skin vertices, convex support hull and pixel-derived height band.
`validate_source.py` reopens the saved file and measures those evaluated skin
vertices, actual ground error and independently recomputed segment-mass support.
Historical files without real patches require explicit `--allow-legacy-landmarks`
and are never mesh-contact acceptance.

```sh
python tools/animation/test_source_qc.py artifacts/foundation --blender /path/to/blender
```

The harness mutates temporary copies only and requires nonzero Blender status
plus the expected skating/hover failure. Always use `--python-exit-code 1` in
Blender automation. The cached source CI performs no full color/material render
or release. The earlier optional attack-travel study is rejected by the corrected
sole/reach constraints; the default four-action source is the current candidate.

### Live source support bridge

`updateSourceContactTargets(state, frame, intent)` consumes explicit boolean
`sourceContacts[id].planted` from the selected full-body source frame. Retain its
state per actor; it preserves world support across clip/facing changes until the
source releases the contact. It does not choose steps or run another clock.
Frozen external displacement is reported as transport; it is not called stance.

`assets.updateRegions(state, sample, intent)` supplies calibrated pixel scale and
passes those targets into the existing regional solver. Intent includes C# sample
`timestamp`, `world`, positive actor `scale`, pause/freeze and finite source-metre
`maxCorrection`/optional `maxRootCorrection`. The returned root offset is zero:
world contacts already account for displacement. Reach/limit/budget failures are
observable and the Hollowed adapter records `foundationError` before fallback.
Packs without region metadata retain their previous sample. This bridge does not
make the historical source pack, source transitions or GPU materials accepted.

### Candidate pack and full compositor profiling

`export_contact_regions.py` now records the exact validated color atlas and saved
Blender hashes. `pack_contact_candidate.py PACK --regions REGIONS [--materials MAPS]
[--crop]` refuses mixed rigs, incomplete directions/frames, missing actual-alpha
validation, or a mismatched color atlas. It removes unused review-only joint
matrices, preserves actual source contacts, optionally verifies all source/material
alpha and losslessly crops transparent cell padding. Cropped drawing retains
original source pixel coordinates through the existing compositor; it never
rescales the character. Start from a fresh full-cell color export before packing.

The metadata and texture limits remain 4MiB and 64MiB respectively. Per-pack cache
identity canonicalization removes numerical cancellation noise, with a worst-case
128px-source alias below 1.82e-7 native pixels. It does not round drawn transforms.
`benchmark_regions.cjs PACK` exercises the real sparse solver, shared compositor
and Canvas drawing for 500 synthetic visible actors. Supply
`CHROMIUM_EXECUTABLE`; record concurrency/device limits with the result. It does
not claim GPU, physical-mobile, or actual-Hunt-horde acceptance.

A renewed `--only attack-travel --phase-samples 8` source study uses 128 whole-body
samples and 1.5cm additional pelvis flexion reserve. All real-sole QC passes,
but it is still a source study without arbitrary-direction runtime acceptance.

Material packing preserves saved source sample count, checks every source/material
alpha, normalizes the supersampled **evaluated geometry normal vector**, and
rejects directions below 8-bit normal precision. It records the pre-normalization
length range. This is normal representation cleanup, not an RGB/art-derived
normal or proof of regional normal deformation. `renderDescriptor` continues to
reject regional GPU use until that deformation is validated.

`review_pose_grid.py SOURCE --out study.mp4` picks independent gait/action indices
from genuine S/E source frames and emits H.264/yuv420p/faststart with a source-only
label. A packed grid is not a sequential animation and this study is not the final
continuous performance or actual-Hunt approval video.

### Continuous source stance initialization

`PoseSample.sourcePhaseOffset` is a projected-world offset already multiplied by
actor scale. The shared controller derives it from the selected clip's declared
stance derivative and continuous phase relative to its nearest source frame.
`updateRegions` applies it only when a planted contact begins a new support epoch;
existing anchors never move to follow this value. Swing poses remain authored.
It prevents accumulated frame-rounding error without permitting longer source
corrections, changing world displacement, or synthesizing extra raster frames.

`node tools/animation/check_live_contacts.mjs PACK` replays actual packed source
chains through the same lifecycle at 15/30/60/120Hz. It deliberately exits nonzero
for rejected moving-stationary actions. It is not a raster, Hunt or device test.

For newly packed regional candidates, `regions.continuousPhaseBody: true` also
carries that phase residual into body and swing geometry. Source pole positions
translate with the chain. `maxRootCorrectionMetres` is an explicit one-source-
pixel source-body bound derived from the same rig scale as contact correction;
`PoseSample.rootOffset` remains zero on the regional path. This is quantization
compensation, not permission to follow arbitrary lateral root motion. Both reach
and actual source support are checked after correction. Packs without the
explicit declaration retain their previous swing/body behavior.

The current bounded source authoring/QC commands are:

```sh
blender -b -t 2 --python-exit-code 1 --python tools/animation/author_hollow_foundation.py -- --out artifacts/moving-source --only walk,attack-travel --phase-samples 16 --action-samples 8 --samples 2
blender -b -t 2 --python-exit-code 1 --python tools/animation/validate_source.py -- artifacts/moving-source
blender -b -t 2 --python-exit-code 1 --python tools/animation/validate_motion_envelope.py -- artifacts/moving-source
python tools/animation/test_source_qc.py artifacts/moving-source --blender /path/to/blender
```

Eight action samples retain the same 4/3-second action duration (6 action FPS).
The generator's `--travel-heading-degrees ±22.5 --stride-metres .28` options
produce **source studies** with `--only walk,attack-travel`. They retain body
facing and author diagonal steps; they do not modify C# movement or select clips
in runtime. Per-sample `rootTravelVectorMetres` and per-clip
`rootStrideVectorMetres` are source-ground vectors. Export projects the negative
stride as the stance derivative in each real camera view. Legacy source metadata
without these fields retains its original negative-Y stride. Validate with the
same independent mesh, envelope and mutation commands, then run
`python tools/animation/test_directional_export.py SOURCE...` (Pillow + Node).
That exporter test uses labelled synthetic cells, not a visual-review atlas.
`validate_motion_envelope.py -- SOURCE --heading-degrees 15` probes actual
lateral root displacement while advancing gait by its forward projection.
It writes a separate heading-labelled report and exits nonzero on rejection;
the default forward report is preserved. Current 15-degree cases all reject the
unchanged one-source-pixel correction budget. This diagnostic cannot substitute
for supported turning source motion or actual runtime replay.
The source-forward envelope is not arbitrary-motion acceptance. The source
workflow runs these checks without a full render. Render saved sources with
`render_saved_clips.py`; `--directions S,E` explicitly records partial views.
Actual Hunt diagnostic failures retain clip/frame/facing/contact and required
versus allowed correction in `foundationFailure` alongside matching fallback.
