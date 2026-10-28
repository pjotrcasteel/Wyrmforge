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
blender -b -t 2 --python tools/animation/author_hollow_foundation.py -- --out artifacts/foundation --only walk,attack,pivot,pivot-negative,attack-travel
blender -b -t 2 --python tools/animation/validate_source.py -- artifacts/foundation
blender -b -t 2 --python tools/animation/render_grid_review.py -- artifacts/foundation
# Full export is intentionally tiered; inspect source review before this render.
blender -b -t 2 --python tools/animation/author_hollow_foundation.py -- --out artifacts/foundation --only walk,attack,pivot,pivot-negative,attack-travel --render --all --samples 2
python tools/animation/export_atlases.py artifacts/foundation --out artifacts/atlas-candidate
blender -b -t 2 --python tools/animation/render_material_passes.py -- artifacts/foundation/hollow-foundation.blend --out artifacts/material-candidate
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
blender -b -t 2 --python tools/animation/test_kinematics.py
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
blender -b -t 2 --python tools/animation/export_contact_regions.py -- artifacts/foundation --out artifacts/contact-regions --color-atlas path/to/verified/walk.png
node --test tests/javascript/sprite-contact-kinematics.test.mjs tests/javascript/sprite-layer-compositor.test.mjs
node tools/animation/benchmark_contact_chains.mjs
```

Ownership passes use the same sample count as the inspected source alpha and
fail if they miss any actual color-alpha pixel. The exporter never redraws color
sprites. Bone-chain arguments are authoring data; the playback/kinematics modules
contain no species branches. Study metadata marks partial directions and source
QC explicitly. It is not a shipped asset declaration.
