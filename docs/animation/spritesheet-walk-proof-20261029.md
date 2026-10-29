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

The proof is explicitly selected by `animationFoundation=sprite-walk`. Default
art and gameplay remain unchanged. Missing claw content continues to use the
existing attack art, rather than presenting an unrendered source attack.

See [the milestone and representation audit](spritesheet-viability-20261029.md)
and the [walk pack README](../../src/Wyrmforge.Presentation.Web/wwwroot/art/review/animation-foundation-sprite-walk/README.md).
