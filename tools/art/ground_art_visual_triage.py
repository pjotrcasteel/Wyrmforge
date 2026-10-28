#!/usr/bin/env python3
"""Aggregate review-only candidate metrics; never automatically approve art."""
from __future__ import annotations
import argparse
import json
from pathlib import Path

FAMILIES = ("wet-mud", "trampled-earth", "old-paving", "scorched-ground", "marsh-wet-bank")

def summarize(root: Path) -> dict:
    records = []
    for family in FAMILIES:
        path = root / f"{family}-art-candidates" / f"{family}-art-candidates.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        if data["family"] != family or len(data["variants"]) != 6:
            raise ValueError(f"Missing or invalid six-candidate report: {family}")
        if data["runtimeUse"] or data["rendererIntegration"] or data["status"] != "unapproved-artwork":
            raise ValueError(f"Unexpected runtime or approval promotion: {family}")
        for variant in data["variants"]:
            if variant["approved"] or variant["visualRoleVerified"]:
                raise ValueError(f"Unexpected artistic approval: {family}")
            if family != "wet-mud" and variant["dominantSourceActual"] != variant["dominantSourceIntent"]:
                raise ValueError(f"Source identity lost: {family} candidate {variant['candidate']}")
        distances = [v["nearestVisualDifferenceRgb"] for v in data["variants"]]
        records.append({
            "family": family,
            "minimumNearestNeighborRgbDifference": min(distances),
            "meanNearestNeighborRgbDifference": round(sum(distances) / len(distances), 3),
            "candidateCount": len(distances),
            "visualRoleVerified": False,
            "needsHumanArtReview": True,
        })
    return {
        "stage": "art-review-triage",
        "status": "UNAPPROVED",
        "automaticArtApproval": False,
        "metricWarning": "RGB distance is a diagnostic, not a semantic or visual-quality acceptance threshold.",
        "families": sorted(records, key=lambda x: x["minimumNearestNeighborRgbDifference"]),
    }

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = summarize(args.output)
    (args.output / "ground-art-visual-triage.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS: review triage created; no automatic visual approval")

if __name__ == "__main__":
    main()
