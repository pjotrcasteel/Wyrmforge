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
