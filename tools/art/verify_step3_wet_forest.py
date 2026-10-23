"""Validate actual transparent Step-3 candidate images without any third-party packages."""

import hashlib
import json
import struct
import sys
import zlib
from pathlib import Path

ASSETS = ("ancient_oak", "dead_elm")
SIGNATURE = b"\x89PNG\r\n\x1a\n"


def inspect_rgba_png(path):
    png = path.read_bytes()
    assert png.startswith(SIGNATURE), f"{path}: invalid PNG signature"
    pos, data, dimensions = len(SIGNATURE), bytearray(), None
    while pos < len(png):
        size = struct.unpack_from(">I", png, pos)[0]
        kind = png[pos + 4:pos + 8]
        payload = png[pos + 8:pos + 8 + size]
        pos += size + 12
        if kind == b"IHDR":
            width, height, depth, color, compression, filtering, interlace = struct.unpack(">IIBBBBB", payload)
            assert (width, height, depth, color, compression, filtering, interlace) == (768, 768, 8, 6, 0, 0, 0), (
                f"{path}: expected 768x768, non-interlaced RGBA")
            dimensions = width, height
        elif kind == b"IDAT":
            data.extend(payload)
        elif kind == b"IEND":
            break
    assert dimensions and data, f"{path}: missing image pixels"
    width, height = dimensions
    stride = width * 4
    raw = zlib.decompress(data)
    assert len(raw) == height * (1 + stride), f"{path}: incomplete image"
    visible = 0
    bounds = [width, height, -1, -1]
    prev = bytearray(stride)
    offset = 0
    for y in range(height):
        mode = raw[offset]
        offset += 1
        line = bytearray(raw[offset:offset + stride])
        offset += stride
        assert mode in (0, 1, 2, 3, 4), f"{path}: unsupported PNG filter {mode}"
        for i in range(stride):
            a = line[i - 4] if i >= 4 else 0
            b = prev[i]
            c = prev[i - 4] if i >= 4 else 0
            if mode == 1:
                predictor = a
            elif mode == 2:
                predictor = b
            elif mode == 3:
                predictor = (a + b) // 2
            elif mode == 4:
                p = a + b - c
                differences = (abs(p - a), abs(p - b), abs(p - c))
                predictor = (a, b, c)[differences.index(min(differences))]
            else:
                predictor = 0
            line[i] = (line[i] + predictor) & 255
        for x in range(width):
            if line[4 * x + 3] > 8:
                visible += 1
                bounds[0] = min(bounds[0], x)
                bounds[1] = min(bounds[1], y)
                bounds[2] = max(bounds[2], x)
                bounds[3] = max(bounds[3], y)
        prev = line
    assert 5000 <= visible < width * height * .8, f"{path}: missing sprite or opaque backdrop"
    assert min(bounds[0], bounds[1], width - 1 - bounds[2], height - 1 - bounds[3]) >= 4, (
        f"{path}: clipped sprite edges, alpha bounds {bounds}")
    return visible, bounds


def main(folder):
    digests = []
    for asset in ASSETS:
        root = folder / asset
        blend = root / (asset + ".blend")
        png = root / (asset + "-candidate.png")
        manifest = json.loads((root / "production.json").read_text())
        assert blend.stat().st_size > 10000, f"{asset}: missing editable .blend source"
        assert manifest["id"] == asset and manifest["approval"] == "candidate-not-approved"
        assert manifest["gameIntegration"] is False and manifest["render"]["transparent"]
        pixels, bounds = inspect_rgba_png(png)
        print(f"{asset}: {pixels} visible pixels; bounds={bounds}; .blend bytes={blend.stat().st_size}")
        digests.append(hashlib.sha256(png.read_bytes()).hexdigest())
    assert len(set(digests)) == len(ASSETS), "Tree models must produce distinct sprites"


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path("artifacts/wet-forest"))
