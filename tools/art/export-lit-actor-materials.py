"""Reproducible pose-derived material passes for the existing accepted actor atlases.

Requires numpy, Pillow and numba. Run from the repository (no CUDA or Blender required).
Walk normals from PR #332 are SHA-protected and NEVER replaced.
These are 2.5D alpha-plane casters, not volumetric rigged shadow meshes.
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import numpy as np
from numba import njit
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ENEMIES = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/art/enemies"
PROOF = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/art/lighting-proof"
DIRECTIONS = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")
WALK_NORMAL_HASHES = {
    "hollowed": "0",
    "ashling": "0",
}
SPECS = {
    "hollowed": {
        "folder": "hollow-rigged",
        "export": "art/source/enemies/hollow/rigged-poc/exports",
        "sources": {
            "walk": ("movement-eight-directions-v1/hollow-movement.manifest.json", "sampled-walk.npz"),
            "attack": ("attack-eight-directions-v2/hollow-attack.manifest.json", "sampled-attack.npz"),
            "death": ("death-eight-directions-v4/hollow-death.manifest.json", "sampled-death.npz"),
        },
        "roughness": 0.92, "specular": 0.12,
    },
    "ashling": {
        "folder": "ashling-rigged",
        "export": "art/source/enemies/ashling/exports",
        "sources": {
            "walk": ("movement-fiery-eyes-v1/manifest.json", "sampled-walk.npz"),
            "attack": ("attack-fiery-eyes-v1/manifest.json", "attack-samples.npz"),
            "death": ("death-fiery-eyes-v1/manifest.json", "death-samples.npz"),
        },
        "roughness": 0.89, "specular": 0.16,
    },
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


@njit(cache=True)
def rasterize(screen, vertex_normals, vertex_emission, faces, cell):
    depths = np.full((cell, cell), np.inf)
    normals = np.zeros((cell, cell, 3))
    emission = np.zeros((cell, cell))
    for face in faces:
        a, b, c = screen[face[0]], screen[face[1]], screen[face[2]]
        denominator = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(denominator) < 1e-12:
            continue
        xmin = max(0, int(math.floor(min(a[0], b[0], c[0]))))
        xmax = min(cell - 1, int(math.ceil(max(a[0], b[0], c[0]))))
        ymin = max(0, int(math.floor(min(a[1], b[1], c[1]))))
        ymax = min(cell - 1, int(math.ceil(max(a[1], b[1], c[1]))))
        for y in range(ymin, ymax + 1):
            for x in range(xmin, xmax + 1):
                u = ((b[1] - c[1]) * (x + .5 - c[0]) + (c[0] - b[0]) * (y + .5 - c[1])) / denominator
                v = ((c[1] - a[1]) * (x + .5 - c[0]) + (a[0] - c[0]) * (y + .5 - c[1])) / denominator
                w = 1 - u - v
                if min(u, v, w) < -1e-8:
                    continue
                z = u * a[2] + v * b[2] + w * c[2]
                if z < depths[y, x]:
                    depths[y, x] = z
                    normals[y, x] = (u * vertex_normals[face[0]] +
                                      v * vertex_normals[face[1]] +
                                      w * vertex_normals[face[2]])
                    emission[y, x] = (u * vertex_emission[face[0]] +
                                      v * vertex_emission[face[1]] +
                                      w * vertex_emission[face[2]])
    return normals, depths, emission


def project(vertices, mvp, cell):
    clip = np.column_stack((vertices, np.ones(len(vertices)))) @ mvp.T
    ndc = clip[:, :3] / clip[:, 3:4]
    return np.column_stack(((ndc[:, 0] + 1) * cell / 2,
                            (1 - ndc[:, 1]) * cell / 2, ndc[:, 2]))


def vertex_normals(vertices, faces, basis):
    triangles = vertices[faces]
    cross = np.cross(triangles[:, 1] - triangles[:, 0], triangles[:, 2] - triangles[:, 0])
    cross /= np.maximum(np.linalg.norm(cross, axis=1, keepdims=True), 1e-12)
    normal = np.zeros_like(vertices, dtype=np.float64)
    for corner in range(3):
        np.add.at(normal, faces[:, corner], cross)
    normal /= np.maximum(np.linalg.norm(normal, axis=1, keepdims=True), 1e-12)
    return normal @ basis.T


def load_eye_source(actor, count):
    if actor != "ashling":
        return None
    source = ROOT / "art/source/enemies/ashling/exports"
    eye = source / "movement-fiery-eyes-v1/eye-source.npz"
    if not eye.is_file():
        raise FileNotFoundError("Approved authored Ashling eye weights missing")
    with np.load(eye) as data:
        return np.asarray(data["vertexWeights"], dtype=np.float64)


def load_fire_source(actor, clip):
    if actor != "ashling" or clip == "walk":
        return None
    revision = "attack-launch-eight-directions-v2" if clip == "attack" else "death-eight-directions-v3"
    path = ROOT / "art/source/enemies/ashling/exports" / revision / "fire-effect-source.npz"
    if not path.is_file():
        raise FileNotFoundError(f"Approved authored fire geometry missing: {path}")
    return np.load(path)


def export_actor(actor, spec):
    runtime = ENEMIES / spec["folder"]
    manifest = json.loads((runtime / "manifest.json").read_text())
    profile = json.loads((runtime / "animation-profile.json").read_text())
    results = {"schemaVersion": 1, "actorId": actor,
               "directions": list(DIRECTIONS),
               "source": "authored skinned triangle positions and face normals; existing colour immutable",
               "shadowQuality": "alpha-clipped, pose-synchronous planar silhouette (NO volumetric self-shadowing)",
               "castsShadow": True, "receivesShadow": True,
               "material": {"roughness": spec["roughness"], "metalness": 0, "specular": spec["specular"]},
               "clips": {}}
    assert manifest["directions"] == list(DIRECTIONS)
    out = runtime / "materials"
    out.mkdir(parents=True, exist_ok=True)
    for clip in ("walk", "attack", "death"):
        relative, pose_name = spec["sources"][clip]
        source_manifest_path = ROOT / spec["export"] / relative
        authored = json.loads(source_manifest_path.read_text())
        source_rig = ROOT / authored["sourceRig"]
        poses = source_rig.parent / pose_name
        source_hash = digest(poses)
        if authored.get("sourcePoseSha256") and source_hash != authored["sourcePoseSha256"]:
            raise ValueError(f"Source pose checksum mismatch: {actor}/{clip}")
        with np.load(poses) as data:
            positions = np.asarray(data["positions"], dtype=np.float64)
            faces = np.asarray(data["faces"], dtype=np.int64)
            mvp = np.asarray(data["mvp"], dtype=np.float64).copy()
        c = manifest["clips"][clip]
        count, cell = c["frames"], c["cell"]
        assert count <= len(positions) and c["anchor"] == authored["anchor"]
        if actor == "ashling" and clip != "walk":
            # The authored attack/death source was sampled at 96px; original exporter
            # scales its camera projection to preserve size in the padded 128px atlas.
            mvp[:2] *= 96 / 128
        original = runtime / c["image"]
        alpha = np.asarray(Image.open(original).convert("RGBA"))[:, :, 3]
        assert alpha.shape == (8 * cell, count * cell)
        assert digest(original).startswith(c["hash"])
        right, up = mvp[0, :3].copy(), mvp[1, :3].copy()
        right /= np.linalg.norm(right)
        up /= np.linalg.norm(up)
        towards = np.cross(right, up)
        towards /= np.linalg.norm(towards)
        basis = np.stack((right, up, towards))
        eye_weights = load_eye_source(actor, count)
        if eye_weights is not None and len(eye_weights) != len(positions[0]):
            raise ValueError(f"Eye weights do not fit authored pose mesh: {actor}/{clip}")
        fire = load_fire_source(actor, clip)
        maps = {key: np.zeros((8 * cell, count * cell, channels), dtype=dtype) if channels > 1
                else np.zeros((8 * cell, count * cell), dtype=dtype)
                for key, channels, dtype in (
                    ("normal", 4, np.uint8), ("depth", 1, np.uint16),
                    ("caster", 1, np.uint8), ("emissive", 1, np.uint8))}
        alignments = []
        provenance = {"sourceRig": authored["sourceRig"], "sourcePose": str(poses.relative_to(ROOT)),
                      "sourcePoseSha256": source_hash, "albedoSha256": digest(original),
                      "framesPerDirection": count, "cell": cell, "anchor": c["anchor"],
                      "fps": profile["actions"][clip]["fps"] if clip != "walk"
                             else manifest.get("fps", 12 if actor == "hollowed" else 20),
                      "normalSpace": "authored camera right/up/toward (sprite tangent)",
                      "depthEncoding": "16-bit unsigned normalized source camera NDC z; zero=transparent",
                      "caster": "author's posed mesh alpha clipped to original visible body, planar only",
                      "emission": "authored eye vertex weights and depth-tested flame mesh; no RGB thresholding"}
        for row, orientation in enumerate(authored["orientations"]):
            assert orientation["direction"] == DIRECTIONS[row] and not orientation.get("flipX")
            angle = math.radians(orientation["rotationDegrees"])
            rotation = np.array([[math.cos(angle), -math.sin(angle), 0],
                                 [math.sin(angle), math.cos(angle), 0], [0, 0, 1]])
            for index in range(count):
                vertices = positions[index]
                if actor == "ashling":
                    root = np.asarray(authored.get("groundRoot", [.07, .22, -.5]), dtype=np.float64)
                    vertices = (vertices - root) @ rotation.T + root
                else:
                    vertices = vertices @ rotation.T
                normals = vertex_normals(vertices, faces, basis)
                weights = eye_weights if eye_weights is not None else np.zeros(len(vertices))
                body_normal, body_depth, eye = rasterize(project(vertices, mvp, cell),
                                                           normals, weights, faces, cell)
                visible_mesh = np.isfinite(body_depth)
                source_alpha = alpha[row * cell:(row + 1) * cell, index * cell:(index + 1) * cell] > 0
                body = visible_mesh & source_alpha
                iou = np.count_nonzero(body) / max(1, np.count_nonzero(visible_mesh | source_alpha))
                # Deliberate fiery VFX can increase the alpha outside the character mesh.
                # Do not invent geometric normals for those authored separate effects.
                if iou < (.90 if actor == "ashling" and clip != "walk" else .975):
                    raise RuntimeError(f"Geometry/albedo mismatch {actor}/{clip}/{row}/{index}: {iou:.4f}")
                normal = body_normal
                normal /= np.maximum(np.linalg.norm(normal, axis=2, keepdims=True), 1e-12)
                normal[~visible_mesh] = [0, 0, 1]  # non-geometric effect pixels only
                region = np.zeros((cell, cell, 4), dtype=np.uint8)
                region[:, :, :3] = np.rint((normal * .5 + .5) * 255).astype(np.uint8)
                region[:, :, 3] = source_alpha.astype(np.uint8) * 255
                sy, sx = slice(row * cell, (row + 1) * cell), slice(index * cell, (index + 1) * cell)
                # Existing authored walking normals are immutable; only check silhouettes here.
                if clip != "walk":
                    maps["normal"][sy, sx] = region
                depths = np.zeros((cell, cell), dtype=np.uint16)
                depths[body] = np.clip(np.rint((body_depth[body] + 1) * 32767.5), 1, 65535).astype(np.uint16)
                maps["depth"][sy, sx] = depths
                maps["caster"][sy, sx] = body.astype(np.uint8) * 255
                glow = np.zeros((cell, cell), dtype=np.float64)
                if eye_weights is not None:
                    strength = max(0, 1 - index / 13) if clip == "death" else 1
                    glow = np.maximum(glow, np.where(eye >= .12, eye * strength, 0))
                if fire is not None:
                    froot = np.array([.07, .22, -.5])
                    effect_positions = np.asarray(fire["positions"][index], dtype=np.float64)
                    effect_faces = np.asarray(fire["faces"], dtype=np.int64)
                    transformed = (effect_positions - froot) @ rotation.T + froot
                    _, effect_depth, _ = rasterize(
                        project(transformed, mvp, cell), np.zeros_like(transformed),
                        np.zeros(len(transformed)), effect_faces, cell)
                    fire_visible = np.isfinite(effect_depth) & (
                        ~visible_mesh | (effect_depth <= body_depth + 1e-5))
                    glow = np.maximum(glow, fire_visible.astype(np.float64))
                maps["emissive"][sy, sx] = np.rint(np.clip(glow * source_alpha, 0, 1) * 255).astype(np.uint8)
                alignments.append(float(iou))
        names = {}
        for key, array in maps.items():
            if key == "normal" and clip == "walk":
                external = PROOF / f"{actor}-walk-normal.png"
                if not external.exists():
                    raise FileNotFoundError(f"Preserved G1 walking normal missing: {external}")
                exact = np.asarray(Image.open(external).convert("RGBA"))
                if not np.array_equal(exact[:, :, 3], alpha):
                    raise ValueError(f"G1 walk normal/albedo alpha differs for {actor}")
                names[key] = str(external.relative_to(runtime.parent.parent)).replace("\\", "/")
                provenance["preservedWalkNormalSha256"] = digest(external)
                continue
            name = f"{clip}-{key}.png"
            Image.fromarray(array).save(out / name)
            names[key] = "materials/" + name
            provenance[key + "Sha256"] = digest(out / name)
        results["clips"][clip] = {"albedo": c["image"], **names, "frames": count,
                                  "cell": cell, "anchor": c["anchor"], "worldSize": c["worldSize"],
                                  "castShadow": True, "receiveShadow": True,
                                  "shadowQuality": "planar-mask-only", "source": provenance,
                                  "minimumSourceMeshIoU": min(alignments)}
        if fire is not None:
            fire.close()
        print(f"{actor} {clip}: {8 * count} source-derived frames, min mesh coverage {min(alignments):.4f}", flush=True)
    (runtime / "lit-materials.json").write_text(json.dumps(results, indent=2) + "\n")


def main():
    for actor, spec in SPECS.items():
        export_actor(actor, spec)


if __name__ == "__main__":
    main()
