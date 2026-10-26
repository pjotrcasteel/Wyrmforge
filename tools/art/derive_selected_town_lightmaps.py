#!/usr/bin/env python3
"""Deterministically extract candidate light contributions from the OWNER'S
five selected isolated Town reference images, without adding full RGB frames.

No interpolation between the 1536 and 1672 registration groups is permitted.
This is an offline art-authoring stage, NOT a GPU renderer and NOT geometry.
Output candidates require human QC and emitter-only alpha authoring before use.
Requires Pillow and NumPy. Input file names are the approved 2026-10-26 files.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image

SOURCES = {
    "common": "01_gate_well_square_ONLY_no_chimney(2).png",
    "nexus": "02_observatory_only_WHITE(2).png",
    "blacksmith": "03_blacksmith_only_WITH_chimney(2).png",
    "codex": "04_codex_top_right_only(3).png",
    "hall": "05_hall_of_fame_bottom_right_only(3).png",
}
GROUPS = (("common", "nexus", "blacksmith"), ("codex", "hall"))
SIZES = ((1536, 864), (1672, 941))


def linear(pixels: np.ndarray) -> np.ndarray:
    value = pixels.astype(np.float32) / 255
    return np.where(value <= .04045, value / 12.92, ((value + .055) / 1.055) ** 2.4)


def srgb(value: np.ndarray) -> np.ndarray:
    value = np.clip(value, 0, 1)
    encoded = np.where(value <= .0031308, value * 12.92,
                       1.055 * np.power(value, 1 / 2.4) - .055)
    return np.uint8(np.round(encoded * 255))


def derive(source: Path, output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    report = {"schemaVersion": 1, "sourceKind": "owner-approved isolated reference",
              "generatedKind": "candidate unlit/reference light deltas; not physical emission maps",
              "sourceFiles": [], "candidates": [],
              "limitations": [
                  "1536 and 1672 reference sets are NOT mutually pixel-registered",
                  "Do not add the five full-scene RGB source paintings",
                  "Do not treat base estimates as geometry, normal maps or approved material albedo",
                  "Only window/magic regions may become emitter meshes; banners must not emit",
                  "Blacksmith chimney belongs exclusively to Blacksmith",
                  "Original sources remain byte-identical; T2 visual approval required",
              ]}
    for group, dimensions in zip(GROUPS, SIZES):
        images = []
        for key in group:
            path = source / SOURCES[key]
            with Image.open(path) as file:
                if file.size != dimensions:
                    raise ValueError(f"Approved source registration size mismatch: {path}")
                images.append(np.asarray(file.convert("RGB")).copy())
            report["sourceFiles"].append({
                "filename": path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "domain": key, "size": list(dimensions),
            })
        # Requiring pixel-identical dark landmarks prevents accidental use of
        # unrelated or stretched variants of the art. For the shared 1536
        # group, >50% of pixels are identical between sources.
        for comparison in images[1:]:
            matched = np.all(images[0] == comparison, axis=2).mean()
            if matched < .20:
                raise ValueError(f"Selected source frames are not exactly registered: {group}, {matched:.3f}")
        stack = np.stack([linear(image) for image in images])
        # Three mutually isolated lamps: median is the unlit color when at most
        # one group is bright. For the disjoint Codex/Hall pair, use minimum.
        base = np.median(stack, axis=0) if len(group) == 3 else np.min(stack, axis=0)
        basename = "unlit-estimate-" + "-".join(group) + ".png"
        Image.fromarray(srgb(base), "RGB").save(output / basename, optimize=True)
        report["candidates"].append({"file": basename, "kind": "inferred dark reference", "domains": group})
        for name, frame in zip(group, stack):
            delta = np.maximum(frame - base, 0)
            filename = name + "-positive-linear-light.png"
            Image.fromarray(srgb(delta), "RGB").save(output / filename, optimize=True)
            # Reconstruction error quantifies how much negative delta was
            # discarded; this is NOT a visual approval metric.
            rebuilt = srgb(base + delta).astype(np.int16)
            original = srgb(frame).astype(np.int16)
            report["candidates"].append({
                "file": filename, "domain": name, "kind": "nonnegative light reference",
                "sourcePixelReconstructionMae": round(float(np.abs(rebuilt - original).mean()), 4),
            })
    (output / "manifest.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    derive(args.input, args.output)
