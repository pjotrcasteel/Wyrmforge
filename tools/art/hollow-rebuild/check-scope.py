#!/usr/bin/env python3
"""Strict art-source scope check, without touching the animation engine.

Normal local usage:
    python tools/art/hollow-rebuild/check-scope.py origin/main

Lightweight CI (uses GitHub PR changed-file API, no full repository checkout):
    python tools/art/hollow-rebuild/check-scope.py --pr 391

The authenticated GitHub request must succeed: never fall back to a partial
single-commit diff that could overlook pre-existing out-of-scope changes.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

ALLOWED_PREFIXES = (
    "art/source/enemies/hollow/rebuild-v1/",
    "tools/art/hollow-rebuild/",
    "docs/art/evidence/hollow-rebuild-v1/",
)
ALLOWED_EXACT = frozenset((".github/workflows/hollow-rebuild-art.yml",))


def changed_files(base: str) -> list[str]:
    result = subprocess.run(
        ["git", "diff", "--name-only", "--diff-filter=ACDMRT", f"{base}...HEAD"],
        check=True,
        capture_output=True,
        text=True,
    )
    return [line for line in result.stdout.splitlines() if line]


def changed_pr_files(pr_number: int) -> list[str]:
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    token = os.environ.get("GH_TOKEN", "")
    if repo != "pjotrcasteel/Wyrmforge" or not token:
        raise ValueError("PR scope validation requires authorized Wyrmforge GH_TOKEN")
    files = []
    for page in range(1, 50):
        request = urllib.request.Request(
            f"https://api.github.com/repos/{repo}/pulls/{pr_number}/files?per_page=100&page={page}",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {token}",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "WyrmForge-Hollowed-Source-Scope",
            },
        )
        with urllib.request.urlopen(request, timeout=35) as response:
            results = json.load(response)
        if not isinstance(results, list):
            raise ValueError("Unexpected PR changed-files API response")
        files.extend(item["filename"] for item in results)
        if len(results) < 100:
            return files
    raise ValueError("PR changed-file listing exceeded 4900 files: refusing an incomplete audit")


def invalid_files(paths: list[str]) -> list[str]:
    return [
        path for path in paths
        if path not in ALLOWED_EXACT and not path.startswith(ALLOWED_PREFIXES)
    ]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("base", nargs="?", default="origin/main")
    parser.add_argument("--pr", type=int)
    args = parser.parse_args()
    try:
        paths = changed_pr_files(args.pr) if args.pr else changed_files(args.base)
    except (subprocess.CalledProcessError, urllib.error.URLError, ValueError, KeyError) as error:
        print(f"FAIL: source-scope listing unavailable: {error}", file=sys.stderr)
        return 2
    if not paths:
        print("FAIL: no changed files found: refusing an incomplete source audit", file=sys.stderr)
        return 2
    invalid = invalid_files(paths)
    if invalid:
        print("FAIL: forbidden change outside Hollowed-only art source area:")
        for path in invalid:
            print(f"  {path}")
        print("Never change the universal animation engine, gameplay, live sprites or Ashling here.")
        return 1
    print(f"PASS: all {len(paths)} changed paths are confined to new Hollowed art source.")
    print("Technical isolation only; no claim of visual approval or runtime integration.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
