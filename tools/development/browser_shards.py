#!/usr/bin/env python3
"""Deterministically partition all MSTest browser methods; keep DataRows together.

The input is the C# test source, so new TestMethod tests are discovered automatically.
Fail rather than quietly drop a method when the source stops matching the known format.
Each fully-qualified method is assigned to exactly one GitHub Actions shard.
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TEST_DIR = ROOT / "tests" / "Wyrmforge.Browser.Tests"
NAMESPACE = re.compile(r"\bnamespace\s+([\w.]+)\s*;")
TEST_CLASS = re.compile(r"\[TestClass\]\s*public\s+(?:sealed\s+)?class\s+(\w+)")
TEST_MARKER = re.compile(r"\[(?:TestMethod|DataTestMethod)\b")
METHOD = re.compile(
    r"\[(?:TestMethod|DataTestMethod)(?:\([^\]]*\))?\]"
    r"(?P<attributes>(?:\s*\[[^\]]*\](?:[ \t]*//[^\n]*)?)*)\s*"
    r"public\s+(?:async\s+)?(?:Task(?:<[^>]+>)?|void)\s+"
    r"(?P<name>[A-Za-z_]\w*)\s*\(",
    re.MULTILINE,
)
ROWS = re.compile(r"\[DataRow\s*\(")


def discover(directory: Path = TEST_DIR) -> list[tuple[str, int]]:
    methods: list[tuple[str, int]] = []
    for path in sorted(directory.glob("*.cs")):
        source = path.read_text(encoding="utf-8-sig")
        markers = len(TEST_MARKER.findall(source))
        if not markers:
            continue
        namespace = NAMESPACE.search(source)
        test_class = TEST_CLASS.search(source)
        found = list(METHOD.finditer(source))
        if namespace is None or test_class is None or len(found) != markers:
            raise ValueError(f"{path}: discovered {len(found)} of {markers} MSTest methods; update shard parser")
        for match in found:
            name = f"{namespace.group(1)}.{test_class.group(1)}.{match.group('name')}"
            rows = len(ROWS.findall(match.group("attributes")))
            methods.append((name, max(1, rows)))
    if not methods:
        raise ValueError(f"No MSTest methods found in {directory}")
    names = [name for name, _ in methods]
    if len(names) != len(set(names)):
        raise ValueError("Duplicate fully-qualified MSTest methods; cannot partition safely")
    return methods


def partition(methods: list[tuple[str, int]], shards: int) -> list[list[str]]:
    if shards <= 0 or shards > len(methods):
        raise ValueError("Shard count must be positive and no greater than method count")
    groups: list[list[str]] = [[] for _ in range(shards)]
    weights = [0] * shards
    # Count parameterized cases, not just test methods, for a more even split.
    for name, weight in sorted(methods, key=lambda method: (-method[1], method[0])):
        index = min(range(shards), key=lambda shard: (weights[shard], shard))
        groups[index].append(name)
        weights[index] += weight
    if sorted(name for group in groups for name in group) != sorted(name for name, _ in methods):
        raise ValueError("Browser sharding lost or duplicated a test method")
    return groups


def filter_for(group: list[str]) -> str:
    if not group:
        raise ValueError("Empty browser shard")
    return "|".join(f"FullyQualifiedName={name}" for name in sorted(group))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--shard", type=int, required=True, help="Zero-based index")
    parser.add_argument("--shards", type=int, default=4)
    parser.add_argument("--output", type=Path, help="GitHub Actions GITHUB_OUTPUT file")
    args = parser.parse_args()
    methods = discover()
    groups = partition(methods, args.shards)
    if not 0 <= args.shard < args.shards:
        parser.error("Shard index out of range")
    selected = filter_for(groups[args.shard])
    print(f"Browser shard {args.shard + 1}/{args.shards}: {len(groups[args.shard])} methods")
    if args.output:
        with args.output.open("a", encoding="utf-8") as output:
            output.write(f"filter={selected}\n")
    else:
        print(selected)


if __name__ == "__main__":
    main()
