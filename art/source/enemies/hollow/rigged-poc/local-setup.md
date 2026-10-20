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
