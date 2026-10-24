"""Geometry-derived attack/death materials for the approved Hollowed and Ashling.
Run against the original Git-tracked sampled poses. Never infer normals from RGB.
Walk normals are owned by PR #332 and are validated, NOT regenerated here.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from numba import njit
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/art"
DIRECTIONS = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")
INPUTS = {
    "hollowed": {
        "folder": "hollow-rigged",
        "source": "art/source/enemies/hollow/rigged-poc/exports",
        "clips": {
            "walk": ("movement-eight-directions-v1/hollow-movement.manifest.json", "sampled-walk.npz"),
            "attack": ("attack-eight-directions-v2/hollow-attack.manifest.json", "sampled-attack.npz"),
            "death": ("death-eight-directions-v4/hollow-death.manifest.json", "sampled-death.npz"),
        },
        "roughness": .82,
        "specular": .18,
    },
    "ashling": {
        "folder": "ashling-rigged",
        "source": "art/source/enemies/ashling/exports",
        "clips": {
            "walk": ("movement-fiery-eyes-v1/manifest.json", "sampled-walk.npz"),
            "attack": ("attack-fiery-eyes-v1/manifest.json", "attack-samples.npz"),
            "death": ("death-fiery-eyes-v1/manifest.json", "death-samples.npz"),
        },
        "roughness": .9,
        "specular": .12,
    },
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


@njit
def rasterize(vertices, vertex_normals, faces, size):
    """Z-buffer the SAME projected triangles used by the color export.
    Non-covered pixels have no geometry: they are not invented surface normals.
    """
    depth = np.full((size, size), np.inf, dtype=np.float64)
    normal = np.zeros((size, size, 3), dtype=np.float64)
    for face in faces:
        a, b, c = vertices[face[0]], vertices[face[1]], vertices[face[2]]
        denominator = (b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
        if abs(denominator) < 1e-12:
            continue
        xmin = max(0, int(math.floor(min(a[0], b[0], c[0]))))
        xmax = min(size-1, int(math.ceil(max(a[0], b[0], c[0]))))
        ymin = max(0, int(math.floor(min(a[1], b[1], c[1]))))
        ymax = min(size-1, int(math.ceil(max(a[1], b[1], c[1]))))
        for y in range(ymin, ymax+1):
            for x in range(xmin, xmax+1):
                u = ((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/denominator
                v = ((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/denominator
                w = 1-u-v
                if min(u, v, w) < -1e-8:
                    continue
                z = u*a[2]+v*b[2]+w*c[2]
                if z < depth[y, x]:
                    depth[y, x] = z
                    normal[y, x] = u*vertex_normals[face[0]]+v*vertex_normals[face[1]]+w*vertex_normals[face[2]]
    return normal, depth


def geometry_for_frame(positions, faces, mvp, degrees, root, cell, eye_vertex_weights=None):
    angle = math.radians(degrees)
    rotation = np.array([[math.cos(angle), -math.sin(angle), 0],
                         [math.sin(angle), math.cos(angle), 0], [0, 0, 1]])
    points = (positions-root)@rotation.T+root
    triangles = points[faces]
    face_normals = np.cross(triangles[:, 1]-triangles[:, 0], triangles[:, 2]-triangles[:, 0])
    face_normals /= np.maximum(np.linalg.norm(face_normals, axis=1, keepdims=True), 1e-12)
    normals = np.zeros_like(points, dtype=np.float64)
    for corner in range(3):
        np.add.at(normals, faces[:, corner], face_normals)
    normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-12)
    right, up = mvp[0, :3].copy(), mvp[1, :3].copy()
    right /= np.linalg.norm(right)
    up /= np.linalg.norm(up)
    toward = np.cross(right, up)
    toward /= np.linalg.norm(toward)
    normals = normals@np.stack((right, up, toward)).T
    clip = np.column_stack((points, np.ones(len(points))))@mvp.T
    ndc = clip[:, :3]/clip[:, 3:]
    screen = np.column_stack(((ndc[:, 0]+1)*cell/2, (1-ndc[:, 1])*cell/2, ndc[:, 2]))
    normals_out, depth = rasterize(screen, normals, faces, cell)
    if eye_vertex_weights is None:
        return normals_out, depth, None
    eye_values, _ = rasterize(screen, eye_vertex_weights, faces, cell)
    return normals_out, depth, eye_values[:, :, 0]


def write_clip(actor, clip_name, cfg, runtime_manifest, strict):
    path, pose_name = cfg["clips"][clip_name]
    source_manifest_path = ROOT / cfg["source"] / path
    source_manifest = json.loads(source_manifest_path.read_text())
    pose_file = (ROOT / source_manifest["sourceRig"]).parent / pose_name
    expected = source_manifest.get("sourcePoseSha256")
    if expected and sha256(pose_file) != expected:
        raise ValueError(f"{actor}/{clip_name}: original pose checksum mismatch")
    source_sha = sha256(pose_file)
    runtime_dir = WEB / "enemies" / cfg["folder"]
    original = runtime_dir / runtime_manifest["clips"][clip_name]["image"]
    if source_manifest.get("atlasSha256") and sha256(original) != source_manifest["atlasSha256"]:
        raise ValueError(f"{actor}/{clip_name}: approved albedo changed")
    atlas = np.asarray(Image.open(original).convert("RGBA"))
    cell = runtime_manifest["clips"][clip_name]["cell"]
    count = runtime_manifest["clips"][clip_name]["frames"]
    expected_dimensions = (cell*len(DIRECTIONS), cell*count)
    if (atlas.shape[0], atlas.shape[1]) != expected_dimensions:
        raise ValueError(f"{actor}/{clip_name}: unexpected atlas dimensions")
    if source_manifest["directions"] != list(DIRECTIONS):
        raise ValueError(f"{actor}/{clip_name}: directions differ from runtime")
    if list(source_manifest["anchor"]) != runtime_manifest["clips"][clip_name]["anchor"]:
        raise ValueError(f"{actor}/{clip_name}: feet anchors differ")
    if len(source_manifest["orientations"]) != 8:
        raise ValueError(f"{actor}/{clip_name}: incomplete source rotations")
    poses = np.load(pose_file)
    positions = poses["positions"]
    faces = poses["faces"].astype(np.int64)
    mvp = poses["mvp"].astype(np.float64)
    if len(positions) < count:
        raise ValueError(f"{actor}/{clip_name}: sampled animation too short")
    root = np.asarray(source_manifest.get("groundRoot", [0, 0, 0]), dtype=np.float64)
    if actor == "ashling" and "groundRoot" not in source_manifest:
        profile = json.loads((pose_file.parent / "profile.json").read_text())
        root = np.asarray(profile["groundRoot"], dtype=np.float64)
    # Ashling fire-eye pass renders from the 96px projection scaled to 128px.
    if actor == "ashling" and cell == 128:
        mvp[:2, :] *= 96/cell
    alpha_caster = np.zeros(atlas.shape[:2], dtype=np.uint8)
    normal_atlas = np.zeros_like(atlas)
    # NDC z is camera-relative original posed-mesh depth (not physical height).
    depth_atlas = np.zeros(atlas.shape[:2], dtype=np.uint16)
    metrics = []
    depth_ranges = []
    eye_weights = None
    eye_atlas = None
    eye_source = source_manifest_path.parent / "eye-source.npz"
    if actor == "ashling":
        if not eye_source.is_file():
            raise FileNotFoundError(f"{actor}/{clip_name}: original surface-bound eye source missing")
        with np.load(eye_source) as source_eyes:
            weights = source_eyes["vertexWeights"].astype(np.float64)
        if len(weights) != positions.shape[1]:
            raise ValueError(f"{actor}/{clip_name}: source eye vertices do not match mesh")
        eye_weights = np.repeat(weights[:, None], 3, axis=1)
        eye_atlas = np.zeros(atlas.shape[:2], dtype=np.uint8)
    for row, orient in enumerate(source_manifest["orientations"]):
        if orient["direction"] != DIRECTIONS[row] or orient.get("flipX", False):
            raise ValueError(f"{actor}/{clip_name}: mirrored or shuffled source orientation")
        for frame in range(count):
            values, depth, eye_values = geometry_for_frame(positions[frame], faces, mvp, orient["rotationDegrees"], root, cell, eye_weights)
            ys = slice(row*cell, (row+1)*cell)
            xs = slice(frame*cell, (frame+1)*cell)
            color_alpha = atlas[ys, xs, 3] > 0
            covered = np.isfinite(depth)
            intersection = np.count_nonzero(covered & color_alpha)
            union = np.count_nonzero(covered | color_alpha)
            iou = intersection/max(1, union)
            if iou < (.985 if clip_name == "walk" else .85):
                raise ValueError(f"{actor}/{clip_name}/{DIRECTIONS[row]}/{frame}: silhouette IoU {iou:.4f}")
            # Deliberate fire VFX can extend beyond the opaque body. They are NOT geometry.
            # Albedo alpha remains intact; outlying pixels carry no invented normal/caster.
            covered &= color_alpha
            values /= np.maximum(np.linalg.norm(values, axis=2, keepdims=True), 1e-12)
            result = np.zeros((cell, cell, 4), dtype=np.uint8)
            result[:, :, :3] = np.rint((values*.5+.5)*255).astype(np.uint8)
            result[:, :, 3] = covered.astype(np.uint8)*255
            normal_atlas[ys, xs] = result
            alpha_caster[ys, xs] = covered.astype(np.uint8)*255
            # Clip-wide NDC -> 16-bit depth [1..65535], uncovered is 0.
            patch_depth = np.zeros((cell, cell), dtype=np.uint16)
            clipped = np.clip((depth[covered]+1)/2, 0, 1)
            patch_depth[covered] = 1+np.rint(clipped*65534).astype(np.uint16)
            depth_atlas[ys, xs] = patch_depth
            if eye_atlas is not None:
                strength = (float(np.interp(frame, [0,3,8,13,count-1], [1,1,.45,0,0]))
                            if clip_name == "death" else 1.0)
                level = np.clip(eye_values*strength, 0, 1)
                active = (level > .12) & color_alpha & covered
                eye_atlas[ys, xs] = np.where(active, np.rint(level*255), 0).astype(np.uint8)
            depth_ranges.append([float(depth[covered].min()), float(depth[covered].max())])
            metrics.append(iou)
        print(f"{actor}/{clip_name}/{DIRECTIONS[row]}: {count} source frames", flush=True)
    normal_file = f"{clip_name}-normal.png"
    depth_file = f"{clip_name}-depth.png"
    caster_file = f"{clip_name}-caster.png"
    if clip_name != "walk":
        Image.fromarray(normal_atlas).save(runtime_dir / normal_file)
        Image.fromarray(depth_atlas).save(runtime_dir / depth_file)
        Image.fromarray(alpha_caster, mode="L").save(runtime_dir / caster_file)
    else:
        # Owner of existing walk normals: #332. Do not touch their original bytes.
        original_normal = WEB/"lighting-proof"/f"{actor}-walk-normal.png"
        existing = np.asarray(Image.open(original_normal).convert("RGBA"))
        if not np.array_equal(existing[:, :, 3], atlas[:, :, 3]):
            raise ValueError(f"{actor}: existing #332 walk normals differ from albedo alpha")
        # Walk caster/depth may be generated here without touching already approved normals.
        Image.fromarray(depth_atlas).save(runtime_dir / depth_file)
        Image.fromarray(alpha_caster, mode="L").save(runtime_dir / caster_file)
        normal_file = f"../../lighting-proof/{actor}-walk-normal.png"
    emissive_file = None
    if eye_atlas is not None:
        emissive_file = f"{clip_name}-eye-emissive.png"
        Image.fromarray(eye_atlas).save(runtime_dir / emissive_file)
    if strict and min(metrics) < .985:
        raise ValueError(f"{actor}/{clip_name}: strict geometry/albedo agreement failed")
    return {
        "albedo": runtime_manifest["clips"][clip_name]["image"],
        "normal": normal_file, "depth": depth_file, "caster": caster_file,
        "frames": count, "cell": cell, "anchor": runtime_manifest["clips"][clip_name]["anchor"],
        "worldSize": runtime_manifest["clips"][clip_name]["worldSize"],
        "fps": (12 if actor == "hollowed" else 24) if clip_name != "walk" else None,
        "sourceRig": source_manifest["sourceRig"],
        "sourcePose": str(pose_file.relative_to(ROOT)),
        "sourcePoseSha256": source_sha,
        "albedoSha256": sha256(original),
        "normalSha256": sha256((runtime_dir / normal_file).resolve()),
        "depthSha256": sha256(runtime_dir / depth_file),
        "casterSha256": sha256(runtime_dir / caster_file),
        "normalSource": "original pose triangulated surface, same camera and direction as albedo",
        "minimumMeshColorSilhouetteIoU": round(min(metrics), 6),
        "depthSpace": "source camera normalized device depth; 0 means no geometry",
        "casterMode": "original mesh screen-space alpha silhouette, NOT volumetric self-shadowing",
        "nonMeshPixels": "excluded from normal/depth/caster; retained in original albedo",
        "emissiveMask": emissive_file,
        "emissiveMaskSha256": sha256(runtime_dir / emissive_file) if emissive_file else None,
        "emissiveSource": str(eye_source.relative_to(ROOT)) if emissive_file else None,
        "emissiveSourceSha256": sha256(eye_source) if emissive_file else None,
        "emissiveMaskSpace": "linear grayscale, surface-bound original posed mesh; engine sampling pending" if emissive_file else None
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()
    for actor, cfg in INPUTS.items():
        folder = WEB/"enemies"/cfg["folder"]
        manifest = json.loads((folder/"manifest.json").read_text())
        materials = {
            "schemaVersion": 1,
            "actor": actor,
            "directions": list(DIRECTIONS),
            "roughness": cfg["roughness"],
            "specular": cfg["specular"],
            "metalness": 0,
            "alphaCutoff": .5,
            "castsShadow": True,
            "receivesShadow": True,
            "receivesLight": True,
            "emissive": None,
            "emissiveStatus": "Not enabled: emissive subregions require separate source-mask acceptance",
            "clips": {},
        }
        for clip in ("walk", "attack", "death"):
            materials["clips"][clip] = write_clip(actor, clip, cfg, manifest, args.strict)
        (folder/"lit-material-manifest.json").write_text(json.dumps(materials, indent=2)+"\n")
    print("Geometry-derived actor material exports complete. No runtime migration implied.")


if __name__ == "__main__":
    main()
