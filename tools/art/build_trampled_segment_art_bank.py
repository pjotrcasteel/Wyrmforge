#!/usr/bin/env python3
"""Create six source-backed, longitudinally varied Trampled Earth art strips.

Only an offline unapproved visual study. These art masks never become C# road shapes,
collision, navigation, GPU lighting, opacity maps or physical water regions.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROLES = (
    "subtle-footpath", "heavy-wear", "cart-ruts", "muddy-wear", "broken-edges", "chaotic-wear"
)


def candidate_bank(directory: Path, family: str) -> tuple[list[Image.Image], list[dict]]:
    report_file = directory / ("grass-moss-candidate-report.json" if family == "grass-moss" else f"{family}-art-candidates.json")
    report = json.loads(report_file.read_text(encoding="utf-8"))
    if family == "grass-moss":
        valid = (report.get("stage") == "editable-reproducible-grass-moss-art-candidates"
                 and report.get("sourceFamily") == family and report.get("ownerApproved") is False)
    else:
        valid = report.get("status") == "unapproved-artwork" and report.get("family") == family
    if not valid or report.get("runtimeUse") is not False:
        raise ValueError(f"Unapproved art-only source required: {family}")
    records, sources = [], []
    for index in range(1, 7):
        name = (f"grass-moss-ART-CANDIDATE-{index:02d}.png" if family == "grass-moss"
                else f"{family}-INDEPENDENT-ART-CANDIDATE-{index:02d}.png")
        blob = (directory / name).read_bytes()
        expected = report["variants"][index - 1]
        identity = expected if family == "grass-moss" else expected.get("independent", {})
        digest = hashlib.sha256(blob).hexdigest()
        if (identity.get("file") != name or identity.get("sha256") != digest
                or (family == "grass-moss" and (expected.get("approval") != "unreviewed" or expected.get("productionUse") is not False))
                or (family != "grass-moss" and expected.get("approved") is not False)):
            raise ValueError("Unapproved source candidate checksum or identity mismatch")
        with Image.open(directory / name) as opened:
            if opened.mode != "RGB":
                raise ValueError("Only RGB art source candidates supported")
            art = opened.copy()
        if art.width != art.height or art.width < 96:
            raise ValueError("Square visual candidates required")
        sources.append(art)
        records.append({"file": name, "sha256": digest})
    return sources, records


def _smoothstep(t: np.ndarray) -> np.ndarray:
    v = np.clip(t, 0, 1)
    return v * v * (3 - 2 * v)


def _sample(images: list[Image.Image], index: int, side: int, height: int, seed: int) -> np.ndarray:
    # Continuous y sampling across consecutive source-backed paintings. Changes
    # occur only across broad bands, never abruptly at segment cut positions.
    yy, xx = np.indices((height, side), dtype=np.int32)
    variants = [np.asarray(images[(index + shift) % 6].resize((side, side), Image.Resampling.BOX)) for shift in (0, 2, 4)]
    start = side // 3 + seed * 13
    u = (yy + start) % side
    v = (xx + index * 37 + seed * 17) % side
    rgb = variants[0][u, v].astype(np.float32)
    joins = (height / 3.0, height * 2 / 3.0)
    for k, seam in enumerate(joins):
        weight = _smoothstep((yy.astype(np.float32) - (seam - side * .19)) / (side * .38))[..., None]
        rgb = rgb * (1 - weight) + variants[k+1][u, v] * weight
    return rgb


def _make_strip(grass: list[Image.Image], earth: list[Image.Image], mud: list[Image.Image], role: int, side: int, height: int) -> Image.Image:
    g = _sample(grass, role, side, height, 2)
    soil = _sample(earth, role, side, height, 4)
    y, x = np.indices((height, side), dtype=np.float32)
    u, v = x / side, y / side
    center = .5 + .058 * np.sin(v * 1.45 + role * .76) + .025 * np.sin(v * 4.1 + role * .38)
    dist = np.abs(u - center)
    coarse = np.sin(u * 15.0 + v * 1.7 + role) * np.sin(v * 3.5 - u * 5.2) * .018
    if role == 0:
        shape = _smoothstep((.126 + coarse - dist) / .047) * .82
    elif role == 1:
        shape = _smoothstep((.312 + coarse - dist) / .058)
    elif role == 2:
        left = np.abs(u - center + .13 - .025*np.sin(v*1.9))
        right = np.abs(u - center - .13 + .015*np.sin(v*2.6))
        ruts = np.minimum(left, right)
        shape = _smoothstep((.056 + coarse*.35 - ruts) / .026) * .97
        shape += .16 * _smoothstep((.22-dist)/.05)
        shape = np.clip(shape, 0, 1)
    elif role == 3:
        shape = _smoothstep((.25 + coarse*2 - dist) / .06)
        mm = _sample(mud, role, side, height, 3)
        damp = _smoothstep((np.sin(u*19+v*1.45) * np.sin(u*4.5-v*3.1) - .13) / .6)
        soil = soil * (1 - damp[..., None] * .76) + mm * (damp[..., None] * .76)
    elif role == 4:
        broken = .24 + .085 * np.sin(v*3.2+role) + .055 * np.sin(v*6.3+u*7)
        shape = _smoothstep((broken + coarse - dist) / .06)
    else:
        islands = (np.sin(u*17 + v*3.0) * np.sin(v*3.8-u*10.2)
                   + .46*np.cos(u*25+v*4.1))
        shape = _smoothstep((islands + .18) / .72) * _smoothstep((.48-dist)/.12)
    out = np.clip(np.rint(g * (1-shape[...,None]) + soil * shape[...,None]), 0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGB")


def build(grass_dir: Path, earth_dir: Path, mud_dir: Path, output: Path, side: int = 640, height: int = 1600, overlap: int = 160) -> dict:
    if side < 96 or height < side * 2 or overlap <= 0 or overlap >= side // 2 or height != side*3 - overlap*2:
        raise ValueError("Expected three overlapping square art segments")
    output = output.resolve()
    for root in (grass_dir, earth_dir, mud_dir):
        root = root.resolve()
        if output == root or root in output.parents:
            raise ValueError("Do not write into the art source directory")
    g, g_meta = candidate_bank(grass_dir, "grass-moss")
    e, e_meta = candidate_bank(earth_dir, "trampled-earth")
    m, m_meta = candidate_bank(mud_dir, "wet-mud")
    output.mkdir(parents=True, exist_ok=True)
    records=[]
    board=Image.new("RGB",(6*220+7*12, 590),"#161916")
    pen=ImageDraw.Draw(board)
    for index, role in enumerate(ROLES, 1):
        strip = _make_strip(g,e,m,index-1,side,height)
        name=f"{index:02d}-{role}-three-segment-strip.png"
        strip.save(output / name, optimize=True)
        segments=[]
        for k in range(3):
            fname=f"{index:02d}-{role}-segment-{k+1:02d}.png"
            strip.crop((0,k*(side-overlap),side,k*(side-overlap)+side)).save(output/fname,optimize=True)
            segments.append(fname)
        x=12+(index-1)*232
        pen.text((x,12), f"{index:02d} {role}", fill="#f0e8dd")
        board.paste(strip.resize((220,550),Image.Resampling.LANCZOS),(x,36))
        records.append({"role":role,"strip":name,"sha256":hashlib.sha256((output/name).read_bytes()).hexdigest(),
                        "segments":3,"segmentFiles":segments,"overlapPixels":overlap,"approved":False,"stripIsTileable":False,"gameIntegration":False})
    board_name="TRAMPLED-EARTH-SOURCE-BACKED-SEGMENTS-UNAPPROVED.png"
    board.save(output/board_name,optimize=True)
    report={"schemaVersion":1,"status":"unapproved-art-study","source":"art-only six-family candidate exports",
            "grassSources":g_meta,"earthSources":e_meta,"mudSources":m_meta,
            "variants":records,"sourceArtworkUnchanged":True,"physicalWaterAuthored":False,
            "rendererIntegration":False,"runtimeUse":False,"board":board_name}
    (output/"manifest.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    return report


if __name__ == "__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--grass",type=Path,required=True)
    parser.add_argument("--earth",type=Path,required=True)
    parser.add_argument("--mud",type=Path,required=True)
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    report=build(args.grass,args.earth,args.mud,args.output)
    print(f"Exported {len(report['variants'])} source-backed segmented Trampled Earth designs: {args.output}")
