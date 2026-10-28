#!/usr/bin/env python3
"""Hollowed visual-source worktree isolation gate; NEVER edits any source files.

Usage: python tools/art/hollow-rebuild/check-scope.py [base-ref]
Works on the committed diff only. Deliberately does not invoke Blender,
animation tests, renderer source or production art pipelines.
"""
from __future__ import annotations

import subprocess
import sys

# No existing engine, animation, gameplay, Ashling or runtime file is in scope.
ALLOWED_PREFIXES = (
    "art/source/enemies/hollow/rebuild-v1/",
    "tools/art/hollow-rebuild/",
    "docs/art/evidence/hollow-rebuild-v1/",
)
ALLOWED_EXACT = frozenset((
    ".github/workflows/hollow-rebuild-art.yml",
))
BASE_DEFAULT = "789f3c175371dd1b07978424feda725462205db6"


def changed_files(base: str) -> list[str]:
    result = subprocess.run(
        ["git", "diff", "--name-only", "--diff-filter=ACDMRT", f"{base}...HEAD"],
        check=True,
        capture_output=True,
        text=True,
    )
    return [line for line in result.stdout.splitlines() if line]


def invalid_files(paths: list[str]) -> list[str]:
    return [
        path for path in paths
        if path not in ALLOWED_EXACT and not path.startswith(ALLOWED_PREFIXES)
    ]


def main() -> int:
    base = sys.argv[1] if len(sys.argv) > 1 else BASE_DEFAULT
    try:
        paths = changed_files(base)
    except subprocess.CalledProcessError as error:
        print(f"FAIL: cannot compare the isolated branch to {base}: {error}", file=sys.stderr)
        return 2
    invalid = invalid_files(paths)
    if invalid:
        print("FAIL: this art task has edited paths outside its isolated source area:")
        for path in invalid:
            print(f"  {path}")
        print("Do not merge, edit or cherry-pick animation work; revert the out-of-scope changes.")
        return 1
    print(f"PASS: {len(paths)} changed files are within the locked Hollowed art-source scope.")
    print("No claim of visual quality, model approval, engine compatibility or runtime rendering.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
