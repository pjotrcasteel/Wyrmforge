#!/usr/bin/env python3
"""Create 6 independent and 6 cross-compatible Trampled Earth source-art candidates.

No road authority, gameplay, renderer, lighting or scene integration.
"""
from __future__ import annotations

import argparse
from pathlib import Path

from build_wet_mud_art_candidates import create as create_source_art
from quilt_ground_material_study import SOURCES


def create(source_root: Path, output: Path) -> dict:
    return create_source_art(source_root, output, family="trampled-earth")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCES)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    create(args.source, args.output)
