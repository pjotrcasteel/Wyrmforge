# Local RTX 5090 continuation — 20 October 2026

Resumes draft PR #156 on `art/hollow-rigged-source-poc`; main verified at
`01bd774732b044d6d187384974a40a0fc12bfb32`. Open #136 overlaps the broader
Fire/Frost lifecycle; this work remains limited to the Hollow source proof.

Owner authorized installing Ubuntu/WSL, free TRELLIS dependencies and weights.
Local source supplied: `C:/Trellis2/TRELLIS.2-main`.

Verified:
- Windows RTX 5090, 32607 MiB VRAM; driver 617.42.
- Ubuntu 24.04 installed successfully under WSL2; Linux 6.6.87.2.
- NVIDIA GPU visible inside Ubuntu; Python 3.12.3 available.
- Existing card and neutral reference recovered from remote draft and inspected.
- Earlier Blender smoke test was on the prior host, not verified on this desktop.

Next: install a Blackwell-compatible PyTorch/CUDA toolchain, build TRELLIS
extensions, reconstruct seed 1729, then inspect topology/identity before rigging.
The upstream setup defaults to an older CUDA/PyTorch combination; do not assume
it supports the RTX 5090. Record actual versions and successful GPU computation.
No model, rig, gait or new spritesheet exists at this checkpoint.

Official upstream requirements and API:
https://github.com/microsoft/TRELLIS.2

## Local toolchain progress

- Actual CUDA matrix multiplication passed with PyTorch 2.8.0+cu128 on RTX 5090.
- CUDA compiler 12.8.93 installed without installing a Linux display driver.
- Complete official TRELLIS source: `/opt/wyrmforge-src/TRELLIS.2`, revision
  `75fbf0183001ed9876c8dbb35de6b68552ee08bd`. The supplied Windows directory
  lacks the inference pipeline, so it remains intact as provided.
- Isolated Python environment: `/opt/wyrmforge-trellis` (Python 3.12).
- xFormers 0.0.32.post2 installed; FlexGEMM compiled. Other builds in progress.
- Public TRELLIS weights downloading; Blender installing. Neither is a completed
  character proof. Build logs are in `/opt/wyrmforge-src/build-*.log`.
- Official DINOv3 and RMBG weight URLs returned HTTP 401 without authentication.
  DINOv3 is required; its model page requires review of access terms and account
  information sharing with Meta. Owner has no paid subscription; none is needed
  or being purchased. Free approved model access remains unresolved.
- Existing alpha input permits avoiding the unused RMBG dependency altogether.
  The local recipe records this and fails if asked to remove a background.

Sources: https://pytorch.org/get-started/previous-versions/ (pinned CUDA 12.8
package pair); https://docs.nvidia.com/cuda/wsl-user-guide/index.html (WSL uses
Windows GPU driver); https://huggingface.co/facebook/dinov3-vitl16-pretrain-lvd1689m
(official access conditions). These are toolchain references, not art approval.

## Completed local prerequisite checks / new owner direction

All checks in `local-toolchain-report.json` now pass: GPU matrix multiplication,
fp16 attention, every required CUDA extension import, real TRELLIS pipeline class,
and Blender 4.0.2. Blender CPU Cycles also rendered a 64x64 RGBA smoke image with
alpha range 0–255; denoising is disabled because Ubuntu's build lacks OIDN.
This diagnostic sphere is not a delivered art asset.

xFormers' default Hopper FA3 dispatch failed on RTX 5090. Disabling FA3 made the
actual attention operation pass; the saved local recipe applies that fix.
WSL's `/usr/lib/wsl/lib` must be in LIBRARY_PATH to link nvdiffrec's CUDA library.
Public TRELLIS.2 weights (20 requested files, approximately 16 GB cache) and the
sparse decoder downloaded successfully. Required DINOv3 approval remains pending.

The owner now explicitly requires local RTX 5090 generation and an alternative
to waiting for Hugging Face approval/services. No hosted inference is permitted.
No clocks, voltage, power limits, firmware or Windows GPU driver were changed.
A read-only check after installation reported 30 C and 58 W at idle.

Alternative under investigation: original MIT-licensed TRELLIS with DINOv2,
using downloadable ModelScope files and Meta's direct DINOv2 distribution.
This avoids DINOv3's approval gate; actual source/file access and RTX 5090
inference must still be proven. It is not yet a working replacement.
Do not silently substitute DINOv2 into TRELLIS.2; those conditioning models are
not interchangeable without a compatible trained generation model.

## Local alternative executed successfully

Original TRELLIS + DINOv2 produced a real colored Hollow mesh on the RTX 5090.
Public weights were downloaded from ModelScope, DINOv2 from Meta's direct CDN;
Hugging Face networking was disabled during inference. See the candidate's
`review/review.md` for the first visual rejection and remaining work.

Local pipeline import/kernel checks pass. Shape reconstruction is proven;
card-quality texturing/topology, deformation, gait and final sheet are not.
`production.json` records the current stage; original cloud quota logs remain
historical evidence. No runtime assets or gameplay changed.

## Mobile pixel walk proof delivered

Current deliverables and precise scope: `exports/pixel-walk-poc-v1/README.md`.
The richer appearance decoder, real UV texture and 22-bone rig now produce a
16-frame one-view walk at native mobile pixel size. Lower-limb/cloth skinning
was corrected before the final `rigged-pixel-v3` source. Actual RTX rasterization,
source contact/seam measurements, 390px Sprite Lab playback and current-mage
comparison were completed. Owner artistic acceptance is not inferred.

The Python review server initially listened but timed out on requests. A
loopback-only Node server now serves the existing Sprite Lab successfully.
An approval-review usage-limit failure briefly prevented one diagnostic; after
owner requested continuation, the normal approval retry succeeded. No bypass.
The task-owned stalled server/helper was stopped after successful validation.

19 existing Sprite Lab tests pass. No full gameplay suite or physical iPhone
acceptance is claimed because current combat integration was not changed.
