#!/usr/bin/env python3
"""Verify the original owner-approved Town art did not drift during G4."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MANIFEST = REPO / "docs/art/town-2p5d-t0-source-checkpoint.json"


def main() -> None:
    payload = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert payload["version"] == 1
    assert payload["sourcePaintingSize"] == [1672, 941]
    assert payload["hashAlgorithm"] == "git-blob-sha1"
    failures = []
    for source, expected in payload["files"].items():
        path = REPO / source
        if not path.is_file():
            failures.append(f"MISSING {source}")
            continue
        content = path.read_bytes()
        header = f"blob {len(content)}\\0".encode("ascii")
        actual = hashlib.sha1(header + content).hexdigest()
        if actual != expected:
            failures.append(f"CHANGED {source}: expected {expected}, got {actual}")
    if failures:
        raise SystemExit("Approved Town sources changed without sign-off:\\n" + "\\n".join(failures))
    print(f"PASS: {len(payload['files'])} approved Town sources match locked Git blob hashes.")


if __name__ == "__main__":
    main()
