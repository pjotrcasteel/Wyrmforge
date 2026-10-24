"""Reusable offline biped gait authoring. Gameplay remains authoritative in C#.

This solver is not appropriate for quadrupeds, serpents, or flying actors.
"""
from __future__ import annotations
from dataclasses import dataclass
from math import isfinite, pi, sin

@dataclass(frozen=True)
class BipedGait:
    stride: float = 0.62
    stance_fraction: float = 0.62
    ankle_height: float = 0.14
    swing_clearance: float = 0.19
    left_x: float = -0.185
    right_x: float = 0.185
    opposite_offset: float = 0.5

    def __post_init__(self) -> None:
        values = (self.stride, self.stance_fraction, self.ankle_height,
                  self.swing_clearance, self.left_x, self.right_x, self.opposite_offset)
        if not all(isfinite(x) for x in values):
            raise ValueError("Gait values must be finite")
        if self.stride <= 0 or not 0 < self.stance_fraction < 1:
            raise ValueError("Require positive stride and stance fraction in (0, 1)")
        if self.ankle_height < 0 or self.swing_clearance <= 0:
            raise ValueError("Require nonnegative ankle height and positive toe clearance")
        if not 0 < self.opposite_offset < 1:
            raise ValueError("Opposite foot phase must be in (0, 1)")

@dataclass(frozen=True)
class FootSample:
    side: str
    x: float
    y: float
    z: float
    planted: bool
    cycle: float

def smoothstep(value: float) -> float:
    t = max(0.0, min(1.0, value))
    return t * t * (3.0 - 2.0 * t)

def sample_foot(phase: float, side: str, gait: BipedGait) -> FootSample:
    if side not in ("L", "R"):
        raise ValueError("Expected L or R")
    if not isfinite(phase):
        raise ValueError("Phase must be finite")
    t = (phase + (0.0 if side == "L" else gait.opposite_offset)) % 1.0
    x = gait.left_x if side == "L" else gait.right_x
    if t < gait.stance_fraction:
        u = t / gait.stance_fraction
        y = -gait.stride / 2 + gait.stride * u
        return FootSample(side, x, y, gait.ankle_height, True, t)
    u = (t - gait.stance_fraction) / (1 - gait.stance_fraction)
    y = gait.stride / 2 - gait.stride * smoothstep(u)
    z = gait.ankle_height + gait.swing_clearance * sin(pi * u)
    return FootSample(side, x, y, z, False, t)
