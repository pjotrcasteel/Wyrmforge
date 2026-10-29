# Baked sprite walk: contact and facing follow-up

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

