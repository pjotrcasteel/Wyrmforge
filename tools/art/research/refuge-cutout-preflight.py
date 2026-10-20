#!/usr/bin/env python3
"""EXPERIMENTAL ONLY: proof that canonical building foregrounds can be isolated.

This is not the production matte. Known defects include baked chimney smoke,
possible fringe pixels on fine vegetation, and ground-edge shadow ghosts.
Never silently ship outputs or overwrite the eight immutable source images.
Requires: Pillow, numpy, opencv-python-headless.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

BUILDINGS = ("ArcaneNexus", "Blacksmith", "Codex", "HallOfFame")
STATES = ("active", "vacant")
EXPECTED_SIZE = (1536, 1024)


def rough_foreground(rgb: np.ndarray) -> np.ndarray:
    height, width, _ = rgb.shape
    if (width, height) != EXPECTED_SIZE:
        raise ValueError(f"Incorrect source image size: {(width, height)}")

    # Source is lit against a blue-black studio gradient, not a solid flat RGB key.
    # Scanline colors are estimated from the scene edges, then smoothed vertically.
    edges = np.concatenate((rgb[:, :12, :], rgb[:, -12:, :]), axis=1)
    estimated = np.median(edges, axis=1).astype(np.float32)
    estimated = cv2.GaussianBlur(estimated.reshape(height, 1, 3), (1, 101), 0)
    distance = np.linalg.norm(rgb.astype(np.float32) - estimated, axis=2)
    mask = (distance > 23).astype(np.uint8)
    return cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))


def extract_pair(building: str, source: Path, dest: Path) -> None:
    images = {state: np.asarray(Image.open(source / building / f"{state}.png").convert("RGB")) for state in STATES}
    if images["active"].shape != images["vacant"].shape:
        raise ValueError(f"{building}: active/vacant shape mismatch")

    # Shared matte gives identical visible structural extents before any authored
    # trimming of ephemeral effects such as chimney smoke.
    a, v = images["active"], images["vacant"]
    foreground = cv2.bitwise_or(rough_foreground(a), rough_foreground(v))
    count, groups, stats, _ = cv2.connectedComponentsWithStats(foreground)
    retained = [i for i in range(1, count) if stats[i, cv2.CC_STAT_AREA] > 6500]
    mask = np.isin(groups, retained).astype(np.uint8) * 255
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(mask, contours, -1, 255, -1)
    alpha = cv2.GaussianBlur(mask, (0, 0), 2.1)

    dest.joinpath(building).mkdir(parents=True, exist_ok=True)
    for state, rgb in images.items():
        Image.fromarray(np.dstack((rgb, alpha)), "RGBA").save(dest / building / f"{state}-cutout.png")
    print(f"{building}: exploratory pair saved (not production-ready)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path("user_handover_files/concepts/buildings"))
    parser.add_argument("--output", type=Path, default=Path("artifacts/refuge-cutout-preflight"))
    args = parser.parse_args()
    for building in BUILDINGS:
        extract_pair(building, args.source, args.output)


if __name__ == "__main__":
    main()
