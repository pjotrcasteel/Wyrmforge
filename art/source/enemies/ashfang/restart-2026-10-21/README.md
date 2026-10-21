# Ashfang 2.5D card-art restart — 21 October 2026

Owner rejects V59 and authorizes a base-art restart, working larger first.
**Primary target: the original card's Pixel Art Concept (Isometric / 2.5D Style)
strip, especially idle and stalk.** The high-detail hero and front/side explain
anatomy, plates and membranes. External film dragons do not replace this style.
Canonical creatures records the superseding direction. Prior V59 sources remain.

First source experiment: existing offline TRELLIS 1/DINOv2, using actual card
pixels rather than the failed code-authored loft/plate replacement. Compare an
idle-only reconstruction with a pixel-idle-weighted multi-reference source.
Keep latent, raw geometry, Gaussian appearance and GLB. Use 1024px inspection
views plus native reduced views; large output is NOT a claim that the small
source image contains new detail. This is a starting source, not final anatomy,
a valid rig, completed sprites or a promise that neural reconstruction passes.

Reference prep: original RGB preserved under editable authored alpha. Input
board explicitly labels itself as original card pixels, not newly generated
artwork. No online segmentation, hosted generation, new weights, subscriptions,
GPU settings or hardware changes. Existing RTX 5090 and installed local weights.

Research principles already consulted and rechecked: Weta's original Smaug case
study (https://www.wetafx.co.nz/films/case-studies/smaug) ties structure to surface;
Framestore's production account (https://www.framestore.com/work/how-train-your-dragon)
uses anatomical references and physical heft. Transfer anatomy credibility only;
do not copy designs, assets or photorealistic presentation. Own card is authority.

Current checkpoint: reconstruction recipe/reference inputs saved before GPU
work. Main 1c3101c8 and open PRs checked. PR #186 stays draft; no runtime changes.
Remaining: sample local candidates, inspect silhouette and coloured source from
real cameras against the card at large/native scale, reject weak sources before
rigging or effects, and record results honestly. No finished restart art yet.


## Input/source review so far

Idle-only seed 6283 is rejected: thin relief, fused feet/tail. Multi seed 9137
has real volume but looped claws and fused wing regions; not rig-approved or
style-approved. Actual 1024px clay/appearance and 96px views are preserved.
Reference v2 exposed clipping from inherited coarse masks. V3 restores the
original wing pixels; v4 additionally excludes warm floor regions below paws.
All RGB is original card data. Mask boards are input evidence, never new art.
Next: sample against references-v4 and inspect before rigging or effects.


## Method stop and art-master dependency

Multi seed 4729 is also rejected after large/native/clay review: slab-like tail
and fused geometry remain. Three source attempts have not passed Gate B. Stop
this reconstruction method rather than rigging failed anatomy. The initial
no-new-weights experiment is complete; it did not supply the needed art quality.

Next bounded stage: an actual larger 2.5D art master, reference-guided from the
original card idle pose, using local SDXL 1.0 image-to-image on RTX 5090. Public
fp16 weights (~6.94 GB) come from ModelScope, not Hugging Face; no online image
generation, account, subscription or GPU/driver change. Install two pinned
Python libraries in an isolated environment that reads the existing Torch
runtime without altering TRELLIS. The primary licence is CreativeML Open
RAIL++-M (https://github.com/Stability-AI/generative-models/blob/main/model_licenses/LICENSE-SDXL1.0).
Dependency URL, file sizes and locally computed hashes go in local-art-dependency.json;
weights stay outside Git at /opt/wyrmforge-models/SDXL-card-art.

The master candidates must match the card at large/native size before being
called accepted art. They are not automatically riggable meshes or animations.
The standalone raster master stage preserves the exact source pose and colour
reference; it does not authorize a new photorealistic style. Existing rejected
sources remain as evidence. No successful new art candidate claimed yet.


## Current 2.5D art review

The card Pixel Art Concept idle pose remains the exact target. References-v5
traces its silhouette without repainting original RGB. Art-master-002 preserves
three actual 1024x576 local offline SDXL studies. Seed 2801 changes the card least
and is selected only for comparison, not accepted as final art. It still loses
face, armour and molten chest detail; the fidelity gate remains open.

card-review-v1/card-fidelity-review.png compares the original pixels and study,
including 96x54 native checks. The folder preserves transparent masters, editable
OpenRaster files (candidate plus hidden immutable reference), and 256x144
card-palette exports. These are raster studies, not rigs or animation assets.
The isolated runtime used RTX 5090 with 9036 MiB peak allocated VRAM; provenance
records offline inference, seeds, prompts and reference hash. No hosted inference
or GPU driver/settings changes.

Next work must preserve the original card detail rather than treating silhouette
overlap as art acceptance. No further animation, runtime integration or merge is
validated by this review. Earlier reconstruction next-step notes above are
historical and superseded by the documented method stop.


## Current animation checkpoint after owner joint guide

Owner rejected the first motion appearance and supplied a green-line skeleton
plus idle, stalk, breath and collapse panels. owner-guide-001 registers that
guide to the original card using 502 affine inliers. The original screenshot
is not copied into the repository; only derived coordinates and the original
card overlay are saved. Follow the full hip/knee/hock/paw chains.

Actual exports now exist:
- card-mesh-idle-001: 64-frame breathing study, original visible rest pixels exact.
- layered-stalk-006: 64-frame owner-guided gait; smoothed skin weights, planted
  joint stance and chest/wing/tail response. Minimum triangle area ratio 0.465;
  no flips. This does not by itself pass artistic review. Layer joins and stalk
  posture still need improvement. Earlier 002/004/005 are superseded or rejected.
- card-breath-attack-001: 96-frame original-card breath pose, charge/recoil, timed
  emission and recovery. First/last visible rest pixels match. No idle transition
  or jaw articulation yet. Existing gameplay damage rules are not changed.

All run on the local RTX 5090. Editable limb layers, hidden-paint provenance,
source scripts, joint poses and atlases are preserved. The live local review is
http://127.0.0.1:4189/motion-review.html (loopback server must be running).
Browser idle/stalk/breath selectors were opened and the running frame counters
observed. PNG counts, RGBA dimensions and edge bounds pass. GIF timing is
approximate; the HTML player uses the actual FPS.

The owner wants independent work through a ready beast, not intermediate
approval stops. Continue self-review without asking routine questions. Do not
call these studies a finished enemy. Outstanding: layer/pose polish, connected
transitions, jaw, collapse, flight/landing, additional directions and native
game integration. Keep PR186 draft. The earlier static-only next steps above
are historical and superseded by this actual motion checkpoint.
