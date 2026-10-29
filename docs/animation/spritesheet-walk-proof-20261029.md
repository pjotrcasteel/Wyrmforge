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

