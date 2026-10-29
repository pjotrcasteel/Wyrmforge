# Baked sprite walk: contact and facing follow-up

## Latest checkpoint — 29 October 2026

The 2.5D spritesheet route remains viable for bounded source-authored whole-body
motion and discrete transitions. AN6 is **not complete**. Current main
`0653cbfd8` is integrated; draft #387 remains unmerged.

- Shared full-frame motion-library selection, one gait clock, exact pause,
  atomic loading, source-matched material export and shared Hunt GPU sprite
  binding are implemented. No mandatory live character mesh is introduced.
- Editable sources and genuine eight-view walk atlases are preserved, including
  the separate compact-stride candidate. Its actual 390px capture remains above
  the contact limit (1.13695 native pixels); no candidate is silently promoted.
- Corrected Cycles normal export passes six independent analytic geometry/camera
  render checks. Actual native 320/390px world framebuffers pass aligned map
  inspection, zero-light RGB=0 and exact paused restoration, with no browser
  errors. [Framebuffer evidence](evidence/20261029/baked-sprite-materials/README.md).
- JavaScript 614/614, Application 694/694, Domain 405/405 and web compilation pass.
  These do not establish physical-phone performance or final art acceptance.
- Grounded start/stop/turn, non-base heading entry into the moving claw, actual
  crossing-target/recovery/chase, combined-library texture budgeting, final Hunt
  depth/occlusion, physical phones and the final excellent MP4 remain open.

[Provisional actual C# compact-walk MP4](evidence/20261029/baked-compact-walk-provisional-390.mp4)
uses source-lit review sprites and the existing attack fallback; it is not AN4
acceptance. Earlier sections below preserve the failures and their resolution.

The first actual Canvas encounter rendered the real eight-facing walk sheet
without browser errors, but reported 102.88 world pixels of source-marker drift.
It is not accepted as grounded animation.

Inspection found that a walk-only profile omitted turn clips while the shared
controller waited for a turn clip before changing facing. Profiles now explicitly
choose `facing.transition: row` or `source-pivot`. Discrete row changes preserve
gait phase and begin new source-contact epochs. They are not a claim of an
authored weight-bearing turn. Profiles without the optional declaration retain
their prior behavior, and live-skin research keeps its own existing source-yaw
path through the same lifecycle.

All 588 JavaScript checks pass, including the actual walk-profile adapter,
eight-row/provenance checks and phase-preserving row transitions.

The corrected real C# encounter captured 226 samples at 390 CSS pixels with
mobile/touch/DPR3 emulation. It rendered 172 sprite-proof actor samples across
E/N/NE/NW/S/W, with no page, console, resource or adapter-solve errors. Maximum
unsnapped source-marker residual fell from 102.88 to 11.28 world pixels. That
remaining drift is unacceptable for the contact gate; no grounded-animation
acceptance is claimed. These are marker measurements for drawn source frames,
not the live-skin backend's evaluated weighted-sole metric. Motion-direction
calibration and authored turn/transition work remain necessary. See
[the capture receipt](evidence/20261029/baked-walk-row-capture.json).
This receipt does not close AN2/AN4/AN6.

## Source-projected locomotion facing

The next calibration uses `facing.selection: projected-motion`. Equal 45-degree
screen sectors do not match an elevated orthographic source: its NE stride is
about 29 degrees on screen. The shared controller now compares observed motion
with the complete measured source stride vectors to choose a locomotion row.
New committed actions still use their explicit facing intent. Other profiles
and the source-skin yaw path keep their existing behavior.

All 590 JS checks pass, including measured-direction selection and action-facing
priority. The fresh real C# encounter has no browser/resource/adapter errors;
maximum marker residual is now 5.04 world pixels, still outside acceptance.

The same packed profile was replayed through the public controller at
15/30/60/120 Hz and speeds 30/60 world pixels per second. All 64 source-forward
cases pass the unchanged one-native-pixel residual gate; maximum residual is
0.0839 native pixels. The 64 between-heading cases correctly fail, peaking at
7.6327 native pixels. This separates correct source-aligned playback from the
finite motion-direction coverage gap. These tests measure projected source
markers, not raster silhouettes, weighted skin, phone cost or final animation
quality. No regional warp or live skin is used.

`check_live_contacts.mjs PACK` now handles ordinary full-frame packs as well as
the older regional study. `--between` explicitly probes the unsupported angular
coverage and exits nonzero on the unchanged contact gate. Source-authored motion
variants and turns are next; increasing the correction allowance is not a fix.

The proof is explicitly selected by `animationFoundation=sprite-walk`. Default
art and gameplay remain unchanged. Missing claw content continues to use the
existing attack art, rather than presenting an unrendered source attack.

See [the milestone and representation audit](spritesheet-viability-20261029.md)
and the [walk pack README](../../src/Wyrmforge.Presentation.Web/wwwroot/art/review/animation-foundation-sprite-walk/README.md).
# Source motion-library continuation

Nine editable whole-body walk actions are preserved in
`art/source/animation-foundation/baked-motion-library-20261029/`. Independent
saved-source mesh checks and all three negative mutations pass. The original
walk/moving-claw guide-authoring regression also passes. This closes source
authoring for the bounded heading experiment only; baking, shared-controller
selection, boundary continuity and actual game contact proof remain open.

## Current-main reconciliation

Integrated main `f72f4aa10`, including its locked pixel-first acceptance matrix.
Preserved both animation entity identity and current AI tier/pack controls in
Enemy Lab, both simulation time and damage-number snapshots, and both renderer
and damage-settings disposal. The exact optional source-skin research module is
grandfathered by canon; the boundary audit permits that module only and still
rejects additional model loaders. All 608 JavaScript checks pass and the web
project builds without warnings. Full Application validation is running.

## Bounded baked motion selection

The shared controller and atomic atlas owner accept optional
`locomotion.motionVariants`: complete same-frame-count/fps/contact-schedule
source clips, maximum sixteen. Projected source travel selects both the view
and complete clip while retaining one gait clock; pause retains its source
frame. Actions keep their existing commitment. This capability is restricted to
explicit baked row profiles and cannot silently alter source-skin playback.
All 610 JavaScript checks pass, including invalid-library and frozen-selection
checks. The first S-view source bake is inspected; the eight-view atlas,
switching contact residuals and actual C# Hunt acceptance are still pending.

The dense source-heading library passes all 2,880 constant-heading marker cases
(360 screen angles, 15/30/60/120 Hz, 30/60 world pixels per second), maximum
0.5201 native pixels. Curved paths remain a failure: 19/40 cases exceed one
pixel, maximum 3.5741. More headings close the straight-motion envelope but do
not establish grounded turning. Keep this negative evidence and the AN2 gate
open; do not reset contacts at every clip switch to conceal the residual.
Current-main Application validation passes 694/694 tests.

The completed review bake contains 1,152 frames (nine walks, eight genuine views).
Its measured guarded crop is `[15,23,81,86]`, 18.2725 MiB decoded RGBA; three
matching maps would be 54.8174 MiB before actions. The review pack contains only
source-lit color. Both source libraries pass the real exporter, lossless-pixel
crop checks, independent projected derivatives and runtime-profile validation.

## Actual merged-main encounter

Real C# Enemy Lab, nine-clip source-backed pack, phone/touch/DPR3 emulation:
390px has 226 samples and 0.9904 world pixels of maximum marker residual;
320px has 226 samples and 1.2846. At this actor's scale 1 these are 1.0224 and
1.3260 native pixels, so both remain above the one-pixel acceptance limit.
Neither has page, console, resource, adapter or GPU errors. Default 390px also
loads without errors. These are source-marker diagnostics and source-lit Canvas
sprites, not evaluated live-skin soles, production GPU materials or phone hardware.
Application 694/694, Domain 405/405 and JavaScript 610/610 pass on integrated main.

Actual first Wet Forest Hunt: 230 captured samples, 1.5359 native marker pixels,
no adapter/page errors, and the same three missing ground candidates already
reproduced flag-off. This is not Hunt/GPU acceptance. Sanitized summary receipts
are preserved beside the heading and curve diagnostics.

An alternate compact source (0.50m stride, 0.60 stance) passes independent mesh
QC and negative mutations. It reduces curve residuals and passes the tested
constant curves through 0.6 radians/second, but faster curves still fail, maximum
2.374 native pixels. A 0.55-stance/0.56m attempt failed real limb reach and was
rejected. No limits or correction bounds were widened. The compact source is
preserved separately for baking and actual-game comparison. Metadata-only
captured-root replay is explicitly undersampled and cannot replace live proof.

The atomic asset owner now supports explicit primary `colorRole: albedo`, reusing
that image in the shared GPU descriptor rather than requiring a fourth review
color texture. Unknown roles fail before publication; existing packs retain
their prior behavior. All 612 JavaScript checks pass. Material rendering and
actual GPU acceptance remain open.

The compact full-body claw source passes independent saved-mesh QC, including
all sixteen base-gait entry/exit phases (maximum whole-skin discontinuity
0.000001481m) and four negative mutations. This is source evidence only;
non-base heading entry, arbitrary action travel, raster timing and actual
crossing-target performance remain open. Eight action stages over 1.333 seconds
must be visually assessed before accepting this bounded export size.

The standalone material packer now requires a matching Blender hash and complete
eight-view albedo/normal/emission receipts, checks exact source alpha alignment,
normalizes evaluated geometry normals and enforces the decoded 64 MiB limit.
Its primary image is unlit albedo, with two additional maps, rather than a
duplicate review-color image. Synthetic provenance/alpha/budget tests pass;
real material export, GPU/depth and physical-device evidence remain open.

Real source material export and exact alpha packing now pass for the bounded
base walk in all eight views. Three maps decode to 6,094,848 bytes. Shared Hunt
GPU sprite binding is implemented through LightingEngine, with frame/anchor/map
resource-sharing checks; all 613 JavaScript tests pass. The first real GPU
capture is pending; this does not close lighting/depth/caster or device gates.

The first real 390px GPU material capture runs with no page, console, resource
or GPU errors. It intentionally uses only the base walk for material isolation;
its 3.7794-native-pixel contact failure is retained and does not replace the
denser-heading contact pack. New diagnostics count actual baked sprite GPU
actors/resources. A read-only framebuffer check now exercises actual C# paused
encounters at 320/390px, aligned albedo/normal views, true zero-light (including
emission off) and exact frozen restoration. Results are pending.

## Normal-basis correction

The first actual framebuffer checks pass exact zero light and restoration at
320/390px, but the initial material export is rejected: visible source normals
all have negative camera-toward Z, making the lit actor too dark. This is a real
exporter fault, not successful material acceptance. Cycles reverses Blender
camera Z in its [camera conversion](https://github.com/blender/blender/blob/v4.5.3/intern/cycles/blender/camera.cpp#L296).
The corrected exporter explicitly converts camera right/up/forward to
right/up/toward. Six independently oriented analytic plane/camera render checks
pass against geometric world/camera rotations. The material packer and primary
albedo loader now reject the old/unverified convention. Regeneration and renewed
framebuffer inspection are required; earlier dark captures remain rejected.

Corrected regeneration and repeated actual framebuffer inspection now pass at
both sizes; native maps and renderer diagnostics are preserved in the linked
evidence folder. The packer also checks each source frame/view for reversed
normal handedness, recording the actual small fraction of backfacing fold
samples rather than assuming every covered edge points strictly forward.
The analytic projection check remains independent of this aggregate guard.

## Remaining execution order

1. Finish grounded source-supported start/stop/turn and verify actual C# motion
   at 320/390px. Do not widen the one-pixel root bound, reset contacts at every
   clip switch or change C# movement to make the art appear to pass.
2. Bake and assess the preserved compact full-body claw, including non-base
   heading entry, crossing targets, recovery and chase. Current captures still
   use the approved attack fallback; the source grid is not rendered acceptance.
3. Measure the complete material/action/heading library against the actual
   texture budget. The single material clip and nine-walk review pack are
   separate bounded proofs; adding their full libraries is not yet budgeted.
4. Extend the actual shared-GPU Hunt proof with accepted sprite frames, real
   occlusion/depth/caster evidence, matching maps and default/reduced/WebGL
   fallback comparison. Preserve concurrent AR/G work and the reproduced ground
   fallback; do not invent missing source paintings.
5. Obtain physical iOS/Android pacing, memory and thermal evidence, produce the
   final excellent performance MP4 and complete AN6 so only owner visual approval
   remains. No physical-phone or final-art acceptance is claimed here.

The unattended continuation goal reports `usageLimited` at this checkpoint.
No goal or milestone has been marked complete because of that limit. All
completed slices are remotely checkpointed on the existing draft PR.


Final remote audit observed main `0653cbfd8`: its only addition since validated
`f72f4aa10` is the separate pinned G4 Pages-preview workflow. That workflow is
integrated unchanged; it does not deploy this animation draft or change the
validated C#/JS runtime. The Pages workflow names the existing source-backed
ground generators for restoring the three omitted local validation assets;
use those source tools in the next Hunt validation rather than inventing art.

## Same-day AN6 continuation — committed recovery and texture budget guard

The shared baked controller now settles a completed committed action into the
current projected-motion row **on the completing sample**, rather than showing
one stale-facing locomotion frame before the next C# frame. This preserves the
single gait clock, action priority, native-pixel root bound, frozen playback and
the existing contact epochs. It does **not** author or accept a grounded turn.
New tests cover both explicit row recovery and crossing-target observed motion.

An executable atlas budget audit uses the same `spriteAtlasLayout` dimensions
as the shared renderer, counting the source color as the primary albedo instead
of duplicating it. It accepts full-library projected normal/emissive maps and
reports per-clip decoded RGBA bytes, remaining headroom and budget failures.
Measured from the preserved actual manifest:

- Nine-heading motion library: **19,160,064 bytes** source-color only.
- The same layout with normal + emissive: **57,480,192 bytes**
  (54.8174 MiB), leaving **9,628,672 bytes** under 64 MiB before actions.
- Existing separately exported single-walk three-map pack: **6,094,848 bytes**.
- A hypothetical 128-frame claw added at the walk's current source crop
  fails the combined 64 MiB gate. This is a *planning negative*, **not** an
  actual claw export or a measured claw memory footprint.

Reproduce with
`node tools/animation/check_baked_atlas_budget.mjs --production-maps src/Wyrmforge.Presentation.Web/wwwroot/art/review/animation-foundation-sprite-motion/manifest.json`.
The new regression tests exercise this measured capacity and negative case.
CI/build status must be checked independently; the new regression suite
does not establish actual in-Hunt contact, caster/depth parity or phone cost.
The non-base heading claw, grounded turn and all remaining execution gates
above remain open. **AN6 is still incomplete and PR #387 remains draft.**
