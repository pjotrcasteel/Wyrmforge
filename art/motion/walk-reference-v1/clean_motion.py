"""Periodic channel fitting and analytical leg IK for a neutral motion study.

This modifies the reference capture deliberately. It is animation cleanup, not a
physical balance solver. Support windows are inferred rather than force-measured.
"""
import json
from pathlib import Path
import numpy as np
from import_cmu import skeleton, motion, forward_kinematics

ROOT = Path(__file__).resolve().parent


def basis(phases, harmonics=5):
    columns = [np.ones_like(phases)]
    for h in range(1, harmonics + 1):
        columns += [np.cos(2 * np.pi * h * phases), np.sin(2 * np.pi * h * phases)]
    return np.column_stack(columns)


def knee_for(hip, knee, ankle, target):
    upper = np.linalg.norm(knee - hip)
    lower = np.linalg.norm(ankle - knee)
    vector = target - hip
    distance = np.linalg.norm(vector)
    if distance >= upper + lower - 1e-7 or distance <= abs(upper - lower) + 1e-7:
        raise ValueError("Support correction requests an unreachable ankle")
    direction = vector / distance
    along = (upper * upper - lower * lower + distance * distance) / (2 * distance)
    perpendicular = knee - hip - direction * np.dot(knee - hip, direction)
    if np.linalg.norm(perpendicular) < 1e-8:
        perpendicular = np.cross(direction, [1., 0., 0.])
    perpendicular /= np.linalg.norm(perpendicular)
    return hip + direction * along + perpendicular * np.sqrt(max(0., upper * upper - along * along))


def periodic_velocity(points, stride, dt):
    extended = np.concatenate([points[-1:] - stride, points, points[:1] + stride])
    return (extended[2:] - extended[:-2]) / (2 * dt)


def support_correction(points, mask, stride):
    count = len(points)
    extended = np.concatenate([points - stride, points, points + stride])
    repeated = np.tile(mask, 3)
    runs = []
    i = 0
    while i < 3 * count:
        if not repeated[i]:
            i += 1
            continue
        first = i
        while i + 1 < 3 * count and repeated[i + 1]:
            i += 1
        last = i
        if first > 0 and last < 3 * count - 1:
            anchor = np.mean(extended[first:last + 1], axis=0)
            anchor[1] = 0
            runs.append((first, last, anchor))
        i += 1
    deltas = np.zeros_like(points)
    for frame in range(count):
        j = frame + count
        best_weight = 0.
        for first, last, anchor in runs:
            distance = max(first - j, j - last, 0)
            if distance > 2:
                continue
            t = max(0., 1 - distance / 3)
            weight = t * t * (3 - 2 * t)
            if weight > best_weight:
                deltas[frame] = (anchor - extended[j]) * weight
                best_weight = weight
    return deltas


def run():
    reference = json.loads((ROOT / "motion.json").read_text())
    report = reference["report"]
    start = report["strideCandidate"]["sourceStartFrame"] - 1
    period = report["strideCandidate"]["nativeFrames"]
    count = len(reference["frames"])
    bones, hierarchy, scale = skeleton((ROOT / "source/07.asf").read_text())
    source = motion((ROOT / "source/07_01.amc").read_text())
    native_phase = np.arange(period) / period
    sample_phase = np.arange(count) / count
    fit_basis = basis(native_phase)
    evaluate = basis(np.append(sample_phase, 1.))
    stride_source = np.array(source[start + period]["root"][:3]) - np.array(source[start]["root"][:3])
    stride_source[1] = 0
    fitted = [{} for _ in range(count + 1)]
    for name, first_values in source[start].items():
        values = np.array([source[i][name] for i in range(start, start + period)])
        if name == "root":
            values[:, :3] -= native_phase[:, None] * stride_source
            values[:, 3:] = np.rad2deg(np.unwrap(np.deg2rad(values[:, 3:]), axis=0))
        else:
            values = np.rad2deg(np.unwrap(np.deg2rad(values), axis=0))
        smoothed = evaluate @ np.linalg.lstsq(fit_basis, values, rcond=None)[0]
        if name == "root":
            smoothed[:, :3] += np.append(sample_phase, 1.)[:, None] * stride_source
        for i in range(count + 1):
            fitted[i][name] = smoothed[i].tolist()
    names = reference["jointNames"]
    indices = {n: i for i, n in enumerate(names)}
    poses = [forward_kinematics(f, bones, hierarchy, scale) for f in fitted]
    points = np.array([[p[n] for n in names] for p in poses])
    forward = stride_source / np.linalg.norm(stride_source)
    right = np.cross([0., 1., 0.], forward)
    world_basis = np.column_stack([right, [0., 1., 0.], forward])
    points = points @ world_basis
    origin = points[0, 0].copy(); origin[1] = 0
    points -= origin
    stride = stride_source * scale @ world_basis
    toe_indices = [indices['ltoes'], indices['rtoes']]
    ground = float(np.percentile(points[:-1, toe_indices, 1], 1))
    points[:, :, 1] -= ground
    closure = float(np.max(np.linalg.norm(points[-1] - points[0] - stride, axis=1)))
    if closure > 1e-8:
        raise AssertionError("Periodic channel fit did not close")
    points = points[:-1]
    original = points.copy()
    dt = reference["duration"] / count
    masks = {}
    targets = {}
    for side in ('l', 'r'):
        toe = points[:, indices[side + 'toes']]
        speed = np.linalg.norm(periodic_velocity(toe, stride, dt), axis=1)
        mask = (toe[:, 1] < .055) & (speed < .55)
        if mask.sum() < 4:
            raise ValueError("Insufficient inferred toe support")
        masks[side] = mask
        corrections = support_correction(toe, mask, stride)
        for i in range(count):
            lowest = min(points[i, indices[side + 'foot'], 1], points[i, indices[side + 'toes'], 1])
            corrections[i, 1] = max(corrections[i, 1], -lowest)
        targets[side] = points[:, indices[side + 'tibia']] + corrections
    # Lower the shared body only as much as needed to reach both fixed ankle targets.
    # This preserves all upper-body lengths instead of stretching a support leg.
    drops = np.zeros(count)
    for side in ('l', 'r'):
        for i in range(count):
            hip = points[i, indices[side + 'hipjoint']]
            knee = points[i, indices[side + 'femur']]
            ankle = points[i, indices[side + 'tibia']]
            reach = np.linalg.norm(knee - hip) + np.linalg.norm(ankle - knee) - .003
            target = targets[side][i]
            horizontal = np.linalg.norm((target - hip)[[0, 2]])
            if horizontal >= reach:
                raise ValueError('Ankle target cannot be reached by a vertical body adjustment')
            allowed_vertical = np.sqrt(reach * reach - horizontal * horizontal)
            drops[i] = max(drops[i], hip[1] - target[1] - allowed_vertical)
    if drops.max() > .06:
        raise ValueError('Body accommodation exceeds the 6 cm study limit')
    points[:, :, 1] -= drops[:, None]
    for side in ('l', 'r'):
        for i in range(count):
            hip = points[i, indices[side + 'hipjoint']].copy()
            knee = points[i, indices[side + 'femur']].copy()
            ankle = points[i, indices[side + 'tibia']].copy()
            delta = targets[side][i] - ankle
            points[i, indices[side + 'femur']] = knee_for(hip, knee, ankle, ankle + delta)
            for part in ('tibia', 'foot', 'toes'):
                points[i, indices[side + part]] += delta
    max_length_error = max(float(np.max(np.abs(np.linalg.norm(points[:, b] - points[:, a], axis=1) - np.linalg.norm(original[:, b] - original[:, a], axis=1)))) for a, b in reference['bones'])
    if max_length_error > 1e-8:
        raise AssertionError("IK changed a bone length")
    contact_report = {}
    for side in ('l', 'r'):
        mask = masks[side]
        inside = mask & np.roll(mask, 1) & np.roll(mask, -1)
        toe = points[:, indices[side + 'toes']]
        toe_velocity = periodic_velocity(toe, stride, dt)
        velocity = np.linalg.norm(toe_velocity[:, [0, 2]], axis=1)
        maximum = float(velocity[inside].max()) if inside.any() else None
        if maximum is None or maximum > 1e-8:
            raise AssertionError("Toe had horizontal drift inside the inferred support window")
        contact_report[side] = {"inferredSupportFrames": int(mask.sum()), "interiorSupportFrames": int(inside.sum()),
                                "maxInteriorToeHorizontalSpeedMps": maximum,
                                "maxInteriorToeVerticalSpeedMps": float(np.abs(toe_velocity[inside, 1]).max())}
    minimum_floor = float(points[:, [indices[n] for n in ('lfoot', 'ltoes', 'rfoot', 'rtoes')], 1].min())
    if minimum_floor < -1e-8:
        raise AssertionError("Foot/toe endpoints below reference floor")
    clean_report = {
        "method": "5-harmonic periodic channel fit; inferred toe support; two-bone leg IK; two-frame correction ramps",
        "durationSeconds": reference['duration'], "frames": count,
        "maxPeriodicFitClosureErrorMeters": closure, "maxBoneLengthChangeMeters": max_length_error,
        "minimumFootEndpointY": minimum_floor, "support": contact_report,
        "maxJointAdjustmentMeters": float(np.linalg.norm(points - original, axis=2).max()),
        "maxBodyAccommodationMeters": float(drops.max()),
        "limitations": ["Inferred toe support is not ground-truth contact or force measurement.",
                        "Zero horizontal toe drift is asserted only inside those inferred support windows; vertical foot roll remains.",
                        "This is kinematic animation cleanup, not a balance or dynamics simulation.",
                        "No staff grip, mage retargeting, clothing or production sprite rendering yet.",
                        "Support correction ramps and the sampled loop still require visual review."]
    }
    result = {**reference, "frames": np.round(points, 6).tolist(), "stride": np.round(stride, 6).tolist(),
              "contacts": [[bool(masks[s][i]) for s in ('l', 'r')] for i in range(count)],
              "cleanup": clean_report}
    exported = np.array(result['frames'])
    exported_stride = np.array(result['stride'])
    export_length_error = max(float(np.max(np.abs(np.linalg.norm(exported[:, b] - exported[:, a], axis=1) - np.linalg.norm(original[:, b] - original[:, a], axis=1)))) for a, b in reference['bones'])
    if export_length_error > 5e-6:
        raise AssertionError('Rounded JSON bone-length error exceeds 5 micrometres')
    export_support_speed = 0.
    for side in ('l', 'r'):
        mask = masks[side] & np.roll(masks[side], 1) & np.roll(masks[side], -1)
        velocity = periodic_velocity(exported[:, indices[side + 'toes']], exported_stride, dt)
        export_support_speed = max(export_support_speed, float(np.linalg.norm(velocity[mask][:, [0, 2]], axis=1).max()))
    if export_support_speed > 1e-4:
        raise AssertionError('Rounded JSON horizontal support drift exceeds 0.1 mm/s')
    clean_report['exportedJsonMaxBoneLengthErrorMeters'] = export_length_error
    clean_report['exportedJsonMaxInteriorToeHorizontalSpeedMps'] = export_support_speed
    (ROOT / 'cleaned-motion.json').write_text(json.dumps(result, separators=(',', ':')) + '\n')
    (ROOT / 'cleanup-validation.json').write_text(json.dumps(clean_report, indent=2) + '\n')
    print(json.dumps(clean_report, indent=2))


if __name__ == '__main__':
    run()
