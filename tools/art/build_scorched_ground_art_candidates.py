#!/usr/bin/env python3
"""Unapproved Scorched Ground diffuse painting studies; no emission or lighting integration."""
from __future__ import annotations
import argparse
from pathlib import Path
from build_wet_mud_art_candidates import create as build
from quilt_ground_material_study import SOURCES

def create(source_root: Path, output: Path, **kwargs) -> dict:
    return build(source_root, output, family="scorched-ground", **kwargs)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    create(SOURCES, args.output)
