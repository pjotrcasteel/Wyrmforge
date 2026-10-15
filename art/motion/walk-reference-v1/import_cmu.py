"""Reconstruct CMU 07/01 ASF/AMC joints without changing the source motion."""
import json
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation

ROOT = Path(__file__).resolve().parent
FPS = 120


def rotation(angles, axes="xyz"):
    return Rotation.from_euler(axes.lower(), angles, degrees=True).as_matrix()


def skeleton(text):
    bones = {}
    children = {}
    section = None
    bone = None
    root = {}
    length_unit = None
    for original in text.splitlines():
        line = original.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith(":"):
            section = line[1:].split()[0]
            continue
        words = line.split()
        key = words[0]
        if section == "units" and key == "length":
            length_unit = float(words[1])
        elif section == "root":
            root[key] = words[1:]
        elif section == "bonedata":
            if key == "begin":
                bone = {"dof": []}
            elif key == "end":
                bone["basis"] = rotation(bone["axis"], bone["axisOrder"])
                bone["direction"] = np.array(bone["direction"])
                bones[bone["name"]] = bone
            elif key == "name":
                bone["name"] = words[1]
            elif key in ("direction", "axis"):
                bone[key] = [float(x) for x in words[1:4]]
                if key == "axis":
                    bone["axisOrder"] = words[4]
            elif key == "length":
                bone[key] = float(words[1])
            elif key == "dof":
                bone[key] = words[1:]
        elif section == "hierarchy" and key not in ("begin", "end"):
            children[key] = words[1:]
    if root["order"] != ["TX", "TY", "TZ", "RX", "RY", "RZ"] or root["axis"] != ["XYZ"]:
        raise ValueError("Unsupported source root order")
    if any(float(v) != 0 for v in root["position"] + root["orientation"]):
        raise ValueError("This importer expects the source's zero root offsets")
    # CMU ASF units are length_unit Acclaim units per inch; retain the source value.
    scale = .0254 / length_unit
    return bones, children, scale


def motion(text):
    frames = []
    current = None
    for line in text.splitlines():
        line = line.strip()
        if not line or line[0] in "#:!":
            continue
        words = line.split()
        if len(words) == 1 and words[0].isdigit():
            if int(words[0]) != len(frames) + 1:
                raise ValueError("Expected contiguous source frame numbers beginning at 1")
            current = {}
            frames.append(current)
        else:
            current[words[0]] = [float(v) for v in words[1:]]
    return frames


def forward_kinematics(frame, bones, children, scale):
    source_root = frame["root"]
    positions = {"root": np.array(source_root[:3]) * scale}
    matrices = {"root": rotation(source_root[3:])}

    def descend(parent):
        for name in children.get(parent, []):
            bone = bones[name]
            channels = frame.get(name, [])
            if len(channels) != len(bone["dof"]):
                raise ValueError(f"Motion channel mismatch: {name}")
            angles = [0., 0., 0.]
            for channel, value in zip(bone["dof"], channels, strict=True):
                if channel not in ("rx", "ry", "rz"):
                    raise ValueError(f"Unsupported channel {channel}")
                angles["xyz".index(channel[1])] = value
            basis = bone["basis"]
            matrices[name] = matrices[parent] @ basis @ rotation(angles) @ basis.T
            positions[name] = positions[parent] + matrices[name] @ bone["direction"] * bone["length"] * scale
            descend(name)

    descend("root")
    return positions


def run():
    bones, children, scale = skeleton((ROOT / "source/07.asf").read_text())
    source = motion((ROOT / "source/07_01.amc").read_text())
    names = ["root", *bones]
    indices = {name: i for i, name in enumerate(names)}
    poses = [forward_kinematics(frame, bones, children, scale) for frame in source]
    points = np.array([[pose[name] for name in names] for pose in poses])
    root = points[:, 0]
    travel = root[-1] - root[0]
    travel[1] = 0
    forward = travel / np.linalg.norm(travel)
    right = np.cross(np.array([0., 1., 0.]), forward)
    world_basis = np.column_stack([right, np.array([0., 1., 0.]), forward])
    points = (points - np.array([root[0, 0], 0., root[0, 2]])) @ world_basis
    pairs = [(indices[parent], indices[name]) for parent, descendants in children.items() for name in descendants]
    expected = {name: bone["length"] * scale * np.linalg.norm(bone["direction"]) for name, bone in bones.items()}
    length_error = max(float(np.max(np.abs(np.linalg.norm(points[:, b] - points[:, a], axis=1) - expected[names[b]]))) for a, b in pairs)
    if length_error > 1e-8:
        raise AssertionError(f"Bone-length invariant failed: {length_error}")
    # An independent translation-invariance check catches accidental world/local mixing.
    changed = dict(source[0])
    changed["root"] = list(changed["root"])
    shift = np.array([2., 0., -3.])
    changed["root"][:3] = (np.array(changed["root"][:3]) + shift).tolist()
    original_pose = forward_kinematics(source[0], bones, children, scale)
    shifted_pose = forward_kinematics(changed, bones, children, scale)
    shift_error = max(float(np.linalg.norm(shifted_pose[n] - original_pose[n] - shift * scale)) for n in names)
    if shift_error > 1e-8:
        raise AssertionError("Root translation did not move every joint equally")
    foot_indices = [indices[n] for n in ("lfoot", "ltoes", "rfoot", "rtoes")]
    ground = float(np.percentile(points[:, foot_indices, 1], 1))
    points[:, :, 1] -= ground
    foot_metrics = {}
    contact_masks = {}
    for side in ("l", "r"):
        foot = points[:, indices[side + "foot"]]
        toe = points[:, indices[side + "toes"]]
        speed = np.linalg.norm(np.gradient(toe, 1 / FPS, axis=0), axis=1)
        mask = (toe[:, 1] < .06) & (speed < .35)
        contact_masks[side] = mask
        foot_metrics[side] = {"candidateContactFraction": round(float(mask.mean()), 4),
                              "medianCandidateToeSpeedMps": round(float(np.median(speed[mask])), 4) if mask.any() else None,
                              "minToeY": round(float(toe[:, 1].min()), 4), "maxToeY": round(float(toe[:, 1].max()), 4)}
    # Rank stride boundaries by root-relative joint agreement. Do not alter/crossfade the capture.
    relative = points - points[:, :1] * np.array([1., 0., 1.])
    key_indices = [indices[n] for n in ("ltibia", "rtibia", "lfoot", "rfoot", "ltoes", "rtoes", "thorax", "head", "lwrist", "rwrist")]
    best = None
    for period in range(96, 157, 4):
        for start in range(8, len(points) - period - 1):
            end = start + period
            delta = relative[start, key_indices] - relative[end, key_indices]
            pose_error = float(np.sqrt(np.mean(delta * delta)))
            v0 = (relative[start + 1, key_indices] - relative[start - 1, key_indices]) * FPS / 2
            v1 = (relative[end + 1, key_indices] - relative[end - 1, key_indices]) * FPS / 2
            velocity_error = float(np.sqrt(np.mean((v0 - v1) ** 2)))
            score = pose_error + .015 * velocity_error
            if best is None or score < best[0]:
                best = (score, start, period, pose_error, velocity_error)
    _, start, period, pose_error, velocity_error = best
    source_frames = list(range(start, start + period, 4))
    stride = points[start + period, 0] - points[start, 0]
    selected = points[source_frames].copy()
    selected[:, :, [0, 2]] -= selected[0, 0, [0, 2]]
    duration = period / FPS
    boundary_joint_distance = np.linalg.norm(relative[start, key_indices] - relative[start + period, key_indices], axis=1)
    report = {
        "source": "CMU subject 07 trial 01", "sourceCaptureFps": FPS, "sourceFrameCount": len(source),
        "metersPerSourceUnit": scale, "maxBoneLengthErrorMeters": length_error,
        "maxRootTranslationErrorMeters": shift_error, "groundOffsetMeters": ground,
        "footContactHeuristic": "toe y < 0.06m and world speed < 0.35m/s; not force/contact ground truth",
        "feet": foot_metrics,
        "strideCandidate": {"sourceStartFrame": start + 1, "sourceEndFrameExclusive": start + period + 1,
                            "nativeFrames": period, "durationSeconds": duration, "previewFrames": len(source_frames),
                            "previewFps": 30, "cadenceStepsPerMinute": 120 / duration,
                            "strideVectorMeters": stride.tolist(), "boundaryPoseRmsMeters": pose_error,
                            "boundaryMetricDefinition": "boundaryPoseRmsMeters is RMS per coordinate; also report 3D joint distances below",
                            "boundaryJointRmsMeters": float(np.sqrt(np.mean(boundary_joint_distance ** 2))),
                            "boundaryMaxJointDistanceMeters": float(boundary_joint_distance.max()),
                            "boundaryVelocityRmsMps": velocity_error},
        "limitations": ["Kinematic reconstruction, not a physical simulation or force-based balance test.",
                        "Captured free-arm walk has not been retargeted to a held staff or clothing.",
                        "Stride candidate is not crossfaded; inspect and polish its measured boundary.",
                        "CMU warns that early subjects and toe/hand channels can be noisy; this source is a reference, not a final cleaned clip.",
                        "Length invariance alone cannot establish rotation convention correctness; visual review is also required."]
    }
    data = {"jointNames": names, "bones": pairs, "fps": 30, "duration": duration,
            "stride": [round(float(stride[0]), 6), 0., round(float(stride[2]), 6)],
            "frames": np.round(selected, 6).tolist(),
            "contacts": [[bool(contact_masks[s][f]) for s in ("l", "r")] for f in source_frames],
            "source": report["source"], "report": report}
    (ROOT / "motion.json").write_text(json.dumps(data, separators=(",", ":")) + "\n")
    (ROOT / "validation.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    run()
