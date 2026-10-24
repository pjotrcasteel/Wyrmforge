"""Validate every directional actor material frame, provenance, and atlas registration.

Runs after export-lit-actor-materials.py. No image inference or lighting simulation.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ENEMIES = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/art/enemies"
PROOF = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/art/lighting-proof"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate(actor, folder):
    directory = ENEMIES / folder
    manifest = json.loads((directory / "manifest.json").read_text())
    materials = json.loads((directory / "lit-materials.json").read_text())
    assert materials["actorId"] == actor and materials["schemaVersion"] == 1
    assert materials["directions"] == manifest["directions"]
    assert set(materials["clips"]) == {"walk", "attack", "death"}
    frames_total = 0
    for action, clip in manifest["clips"].items():
        info = materials["clips"][action]
        assert info["frames"] == clip["frames"] and info["cell"] == clip["cell"]
        assert info["anchor"] == clip["anchor"] and info["worldSize"] == clip["worldSize"]
        assert info["castsShadow"] if "castsShadow" in info else info["castShadow"]
        assert info["receiveShadow"] and info["shadowQuality"] == "planar-mask-only"
        width, height = clip["frames"] * clip["cell"], len(manifest["directions"]) * clip["cell"]
        rgba = np.asarray(Image.open(directory / clip["image"]).convert("RGBA"))
        normal_path = PROOF / f"{actor}-walk-normal.png" if action == "walk" else directory / info["normal"]
        normal = np.asarray(Image.open(normal_path).convert("RGBA"))
        depth = np.asarray(Image.open(directory / info["depth"]))
        caster = np.asarray(Image.open(directory / info["caster"]).convert("L"))
        emissive = np.asarray(Image.open(directory / info["emissive"]).convert("L"))
        assert rgba.shape == normal.shape == (height, width, 4), (actor, action)
        assert depth.shape == caster.shape == emissive.shape == (height, width)
        assert np.array_equal(rgba[:, :, 3], normal[:, :, 3]), (actor, action, "alpha mismatch")
        assert not np.any((caster > 0) & (rgba[:, :, 3] == 0))
        assert not np.any((depth > 0) & (rgba[:, :, 3] == 0))
        assert not np.any((emissive > 0) & (rgba[:, :, 3] == 0))
        if actor == "hollowed":
            assert not np.any(emissive), (actor, action, "nonemissive creature glows")
        assert np.any(caster > 0) and np.any(depth > 0)
        assert info["source"]["sourcePoseSha256"] == sha(ROOT / info["source"]["sourcePose"])
        assert info["source"]["albedoSha256"] == sha(directory / clip["image"])
        if action != "walk":
            assert info["source"]["normalSha256"] == sha(normal_path)
        for row in range(8):
            for frame in range(clip["frames"]):
                y = row * clip["cell"]
                x = frame * clip["cell"]
                cell_alpha = rgba[y:y + clip["cell"], x:x + clip["cell"], 3]
                cell_depth = depth[y:y + clip["cell"], x:x + clip["cell"]]
                cell_caster = caster[y:y + clip["cell"], x:x + clip["cell"]]
                assert cell_alpha.any() and cell_caster.any() and cell_depth.any(), (actor, action, row, frame)
                assert not cell_alpha[0, :].any() and not cell_alpha[-1, :].any()
                assert not cell_alpha[:, 0].any() and not cell_alpha[:, -1].any()
                assert np.array_equal(cell_alpha, normal[y:y + clip["cell"], x:x + clip["cell"], 3])
                frames_total += 1
    print(f"{actor}: validated {frames_total} aligned frames across all 8 directions")


validate("hollowed", "hollow-rigged")
validate("ashling", "ashling-rigged")
