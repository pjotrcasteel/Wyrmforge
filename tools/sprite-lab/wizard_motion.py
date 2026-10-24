"""WyrmForge wizard animation timing, pure Python (no Blender dependency).

Coordinate frame: X right, Y forward towards camera is negative, Z up in metres.
The renderer must NOT use these data to change authoritative C# player movement.
All gait distances are local in-place foot/hip offsets, not world travel.
"""
from __future__ import annotations

from dataclasses import dataclass
from math import cos, pi, sin
from character_pipeline.biped import BipedGait, sample_foot, smoothstep


WALK_FRAMES = 16
STANCE_FRACTION = 0.62
STRIDE_METRES = 0.62
ANKLE_HEIGHT = 0.14
SWING_CLEARANCE = 0.19


# Shared biped solver preserves this actor's public foot trajectory API.
_WIZARD_GAIT = BipedGait(stride=STRIDE_METRES,stance_fraction=STANCE_FRACTION,
                         ankle_height=ANKLE_HEIGHT,swing_clearance=SWING_CLEARANCE)

@dataclass(frozen=True)
class FootPosition:
    side: str
    x: float
    y: float
    z: float
    planted: bool
    cycle: float

def foot_position(phase: float, side: str) -> FootPosition:
    return FootPosition(**vars(sample_foot(phase,side,_WIZARD_GAIT)))


@dataclass(frozen=True)
class WizardPose:
    phase: float
    left: FootPosition
    right: FootPosition
    pelvis_z: float
    pelvis_y: float
    pelvis_roll: float
    chest_counter_yaw: float
    staff_grip_y: float
    staff_grip_z: float
    beard_lag: float


def walk_pose(phase: float) -> WizardPose:
    t = phase % 1.0
    angle = 2 * pi * t
    return WizardPose(
        phase=t,
        left=foot_position(t, "L"),
        right=foot_position(t, "R"),
        pelvis_z=0.97 + 0.028 * cos(2 * angle),
        pelvis_y=0.018 * sin(angle),
        pelvis_roll=0.036 * sin(angle),
        chest_counter_yaw=-0.055 * sin(angle),
        staff_grip_y=-0.29 + 0.065 * sin(angle - 0.4),
        staff_grip_z=1.16 + 0.035 * sin(angle - 0.7),
        beard_lag=0.018 * sin(angle - 0.62),
    )


def cast_progress(frame: int, frame_count: int = 20) -> tuple[float, float, float]:
    """Returns bracing, staff elevation and emissive charge (0..1)."""
    if not 0 <= frame < frame_count:
        raise ValueError("Cast frame is out of clip range")
    t = frame / (frame_count - 1)
    if t < .23:
        charge = .70 * smoothstep(t / .23)
    elif t < .46:
        charge = .70 + .30 * smoothstep((t - .23) / .23)
    elif t < .78:
        charge = 1.0
    else:
        charge = 1.0 - smoothstep((t - .78) / .22)
    brace = smoothstep(t / .30) * (1 - smoothstep((t - .72) / .28))
    elevation = 0.55 * smoothstep(t / .45) * (1 - smoothstep((t - .72) / .28))
    return brace, elevation, charge
