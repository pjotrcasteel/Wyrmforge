#!/usr/bin/env bash
# Run in the authorized Ubuntu-24.04 environment after acquiring official sources.
set -euo pipefail
export PATH=/opt/wyrmforge-trellis/bin:/usr/local/cuda-12.8/bin:/usr/bin:/bin
export CUDA_HOME=/usr/local/cuda-12.8
export TORCH_CUDA_ARCH_LIST=12.0
export MAX_JOBS=4
for project in FlexGEMM CuMesh nvdiffrast nvdiffrec TRELLIS.2/o-voxel; do
    log="/opt/wyrmforge-src/build-${project//\//-}.log"
    echo "Building $project (log: $log)"
    if ! pip install "/opt/wyrmforge-src/$project" --no-build-isolation > "$log" 2>&1; then
        tail -60 "$log"
        exit 1
    fi
    tail -3 "$log"
done
