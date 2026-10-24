"""Fail-closed integrity audit for every Hollowed/Ashling material atlas cell."""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/art"
DIRECTIONS = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")
EXPECTED = {"hollow-rigged": {"walk": 16, "attack": 16, "death": 24},
            "ashling-rigged": {"walk": 16, "attack": 22, "death": 28}}


def checksum(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def assert_empty_border(rgba, cell, row, frame, label):
    region = rgba[row*cell:(row+1)*cell, frame*cell:(frame+1)*cell]
    alpha = region[..., 3] if region.ndim == 3 else region
    if np.any(alpha[0, :]) or np.any(alpha[-1, :]) or np.any(alpha[:, 0]) or np.any(alpha[:, -1]):
        raise AssertionError(f"{label} {DIRECTIONS[row]} frame {frame}: clipped transparent border")


def main():
    totals = {}
    for folder, clips in EXPECTED.items():
        directory = ART/"enemies"/folder
        runtime = json.loads((directory/"manifest.json").read_text())
        materials = json.loads((directory/"lit-material-manifest.json").read_text())
        assert tuple(runtime["directions"]) == tuple(materials["directions"]) == DIRECTIONS
        assert materials["castsShadow"] and materials["receivesShadow"] and materials["receivesLight"]
        assert materials["emissive"] is None  # deliberate: separate source-derived mask needed
        assert set(materials["clips"]) == set(runtime["clips"]) == set(clips)
        total = 0
        for clip, count in clips.items():
            source = runtime["clips"][clip]
            layer = materials["clips"][clip]
            cell = source["cell"]
            assert count == source["frames"] == layer["frames"]
            assert layer["cell"] == cell and layer["anchor"] == source["anchor"]
            assert layer["worldSize"] == source["worldSize"] and layer["albedo"] == source["image"]
            assert layer["casterMode"].startswith("original mesh screen-space alpha silhouette")
            assert layer["sourcePoseSha256"] == checksum(ROOT/layer["sourcePose"])
            paths = {name: (directory/layer[name]).resolve() for name in ("albedo", "normal", "depth", "caster")}
            assert checksum(paths["albedo"]) == layer["albedoSha256"], (folder, clip, "albedo checksum")
            color = np.asarray(Image.open(paths["albedo"]).convert("RGBA"))
            normals = np.asarray(Image.open(paths["normal"]).convert("RGBA"))
            caster = np.asarray(Image.open(paths["caster"]).convert("L"))
            depth = np.asarray(Image.open(paths["depth"]))
            expected = (8*cell, count*cell)
            assert color.shape[:2] == normals.shape[:2] == caster.shape == depth.shape == expected
            original_alpha = color[..., 3]
            normal_alpha = normals[..., 3]
            assert not np.any((normal_alpha > 0) & (original_alpha == 0))
            if clip == "walk":
                # #332 preserved the entire color-alpha silhouette, including raster-edge pixels.
                # Geometry-only casters must be a SUBSET; never overwrite its existing normals.
                assert np.array_equal(normal_alpha, original_alpha)
                assert not np.any((caster > 0) & (normal_alpha == 0))
            else:
                assert np.array_equal(caster, normal_alpha)
            assert np.array_equal(depth > 0, caster > 0)
            assert len(layer["sourcePoseSha256"]) == 64
            for row in range(8):
                for frame in range(count):
                    assert_empty_border(color, cell, row, frame, f"{folder}/{clip}/albedo")
                    assert_empty_border(normals, cell, row, frame, f"{folder}/{clip}/normal")
                    assert_empty_border(caster, cell, row, frame, f"{folder}/{clip}/caster")
                    ys = slice(row*cell, (row+1)*cell)
                    xs = slice(frame*cell, (frame+1)*cell)
                    if not np.any(caster[ys, xs]):
                        raise AssertionError(f"{folder}/{clip}/{DIRECTIONS[row]}/{frame}: missing geometry")
                    total += 1
            if folder == "ashling-rigged":
                assert layer["emissiveMask"] and layer["emissiveSource"]
                emissive_path = (directory/layer["emissiveMask"]).resolve()
                eye_source = ROOT/layer["emissiveSource"]
                assert checksum(eye_source) == layer["emissiveSourceSha256"]
                assert checksum(emissive_path) == layer["emissiveMaskSha256"]
                eye = np.asarray(Image.open(emissive_path).convert("L"))
                assert eye.shape == expected
                assert not np.any((eye > 0) & (original_alpha == 0)), "Emission outside original albedo"
                assert not np.any((eye > 0) & (caster == 0)), "Emission without original posed mesh"
                assert np.any(eye > 0), "Source-derived eyes missing"
                if clip == "death":
                    assert not np.any(eye[:, 13*cell:]), "Dead eyes must extinguish by authored frame 13"
            else:
                assert layer["emissiveMask"] is None
            for name in ("normal", "depth", "caster"):
                if f"{name}Sha256" in layer:
                    assert checksum(paths[name]) == layer[f"{name}Sha256"], (folder, clip, name)
        totals[folder] = total
    print(json.dumps({"status": "pass", "frames": totals, "total": sum(totals.values())}, indent=2))


if __name__ == "__main__":
    main()
