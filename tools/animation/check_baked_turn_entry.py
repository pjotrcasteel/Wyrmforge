"""Measure actual baked walk-to-pivot source-marker entry continuity.

This is a SOURCE-ONLY negative/positive gate. Even a pass does not accept an
in-game animation: the authoritative C# root, drawn sole pixels, mobile device,
and owner's visual review are independent.

python tools/animation/check_baked_turn_entry.py <atlas/profile.json> [--diagnostic]
"""
import argparse
import json
import math
from pathlib import Path


def compare_entry(walk, pivot, correction_limit):
    """Test both actually planted feet; never teleport an absent/new contact."""
    base = {c["id"]: (c["x"], c["y"]) for c in walk}
    target = {c["id"]: (c["x"], c["y"]) for c in pivot}
    if not base or base.keys() != target.keys():
        return None
    deltas = [(base[key][0] - target[key][0],
               base[key][1] - target[key][1]) for key in base]
    dx = sum(delta[0] for delta in deltas) / len(deltas)
    dy = sum(delta[1] for delta in deltas) / len(deltas)
    magnitude = math.hypot(dx, dy)
    if magnitude > correction_limit:
        dx *= correction_limit / magnitude
        dy *= correction_limit / magnitude
    return max(math.hypot(x - dx, y - dy) for x, y in deltas)


def audit(profile):
    unit = profile.get("unitsPerPixel")
    limit = profile.get("maxRootOffset")
    if not all(isinstance(n, (int, float)) and math.isfinite(n) and n > 0
               for n in (unit, limit)):
        raise ValueError("Real positive source native pixel and root correction required")
    locomotion = profile.get("locomotion", {})
    pivots = profile.get("pivots", {})
    directions = profile.get("facing", {}).get("directions", [])
    if not directions or set(pivots) != {"positive", "negative"}:
        raise ValueError("Explicit bidirectional authored pivot profile required")
    results = []
    for direction in directions:
        walk_rows = locomotion.get("facingSamples", {}).get(direction)
        if not walk_rows:
            raise ValueError("Missing real walk source facing: " + direction)
        for sign in ("positive", "negative"):
            pivot_rows = pivots[sign].get("facingSamples", {}).get(direction)
            if not pivot_rows:
                raise ValueError("Missing real pivot source facing: " + direction + "/" + sign)
            entry = pivot_rows[0].get("contacts", [])
            ranked = []
            for index, frame in enumerate(walk_rows):
                slip = compare_entry(frame.get("contacts", []), entry, limit)
                if slip is not None:
                    ranked.append((slip / unit, index))
            best = min(ranked) if ranked else None
            results.append({
                "direction": direction,
                "turn": sign,
                "bestNativeMarkerSlip": best[0] if best else None,
                "bestWalkEntryFrame": best[1] if best else None,
                "compatibleAuthoredContactEpochs": len(ranked),
                "sourceEntryWithinOneNativePixel": bool(best and best[0] <= 1),
            })
    return {
        "measurement": "actual source walk/pivot marker continuity with bounded shared root correction; not raster/game/phone approval",
        "runtimeAccepted": False,
        "sourceEntryGatePassed": all(r["sourceEntryWithinOneNativePixel"] for r in results),
        "nativePixelWorldUnits": unit,
        "rootCorrectionLimitWorldUnits": limit,
        "results": results,
    }


def self_test():
    base = [{"id": "left", "x": 0, "y": 0}, {"id": "right", "x": 2, "y": 0}]
    assert compare_entry(base, base, 1) == 0
    assert compare_entry(base, [dict(c, x=c["x"] + .25) for c in base], 1) < 1e-9
    assert compare_entry(base, [dict(c, x=c["x"] + 8) for c in base], 1) > 1
    assert compare_entry(base, [{"id": "left", "x": 0, "y": 0}], 1) is None
    assert compare_entry(base, [dict(c, x=c["x"] * 8) for c in base], 1) > 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("profile", nargs="?")
    parser.add_argument("--diagnostic", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        print("Baked pivot entry continuity self-tests passed")
    elif not args.profile:
        parser.error("A real runtime atlas/profile.json is required")
    else:
        report = audit(json.loads(Path(args.profile).read_text()))
        print(json.dumps(report, indent=2))
        if not report["sourceEntryGatePassed"] and not args.diagnostic:
            raise SystemExit(1)
