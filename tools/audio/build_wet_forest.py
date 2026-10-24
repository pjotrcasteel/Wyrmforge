#!/usr/bin/env python3
"""Build an offline Wet Forest soundbed from three verified CC0 field/SFX sources.

No network or synthesis in gameplay. Run only after acquiring CC0 source files
in tools/audio/wet-forest-sources; writes Ogg, MP3 and SHA256 provenance.
"""
import hashlib
import json
import math
import subprocess
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SOURCES = ROOT / "tools/audio/wet-forest-sources"
AUDIO = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/audio/recorded"
PREVIEWS = ROOT / "docs/audio/previews"
RATE, DURATION = 24000, 36
# Pinned to the exact human-reviewed CC0 source bytes; reject silent upstream changes.
PINNED_SOURCE_SHA256 = {
    "wind": "0cfdbd3f21ed449689a9024264edf267d0037a6495813a7010827672ec191dac",
    "drips": "df491823e4877371c34dbda4e9321cd83a4a14fa7573cee0ebca1ae423b70e6e",
    "creak": "465356e0e32e71a5c29fda529a0ac23af7791c62e3bd862e8cb2961eb104e1b1",
}
RECORDINGS = (
    ("wind", "SketchMan3", "https://opengameart.org/content/wind-whoosh-loop",
     "https://opengameart.org/sites/default/files/wind%20woosh%20loop.ogg"),
    ("drips", "JaggedStone", "https://opengameart.org/content/loopable-dungeon-ambience",
     "https://opengameart.org/sites/default/files/dungeon_ambient_1_0.ogg"),
    ("creak", "AntumDeluge / Department64", "https://opengameart.org/content/tree-creaking",
     "https://opengameart.org/sites/default/files/tree_creak_0.ogg"),
)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def decode(path):
    data = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(path), "-t", "45",
                                    "-ac", "1", "-ar", str(RATE), "-f", "f32le", "pipe:1"])
    pcm = np.frombuffer(data, dtype="<f4").copy()
    if len(pcm) < RATE or not np.isfinite(pcm).all():
        raise ValueError(f"Bad or too short CC0 recording: {path}")
    return pcm


def loop(source, count, phase=0):
    """Overlap/add the original sound on a circular buffer: no hard splice at loop boundaries."""
    length = len(source)
    overlap = min(int(RATE * 1.8), length // 4)
    stride = length - overlap
    if stride < RATE // 2:
        raise ValueError("Ambience source too short for seamless layering")
    output, weights = np.zeros(count), np.zeros(count)
    for block in range(-1, math.ceil((count + stride) / stride) + 2):
        begin = block * stride - phase
        for offset in range(0, length, RATE):
            values = source[offset:offset + RATE].astype(np.float64)
            pos = offset + np.arange(len(values))
            envelope = np.minimum(np.minimum(1., pos / max(overlap, 1)),
                                  np.minimum(1., (length - 1 - pos) / max(overlap, 1)))
            index = (begin + pos) % count
            np.add.at(output, index, values * envelope)
            np.add.at(weights, index, envelope)
    return output / np.maximum(weights, .05)


def add_creak(bed, sound, time, gain):
    begin = round(time * RATE)
    length = min(len(sound), len(bed) - begin)
    if length < RATE // 2:
        return
    take = sound[:length].copy()
    fade = min(RATE // 4, length // 5)
    take[:fade] *= np.linspace(0., 1., fade)
    take[-fade:] *= np.linspace(1., 0., fade)
    bed[begin:begin + length] += gain * take


def main():
    AUDIO.mkdir(parents=True, exist_ok=True)
    PREVIEWS.mkdir(parents=True, exist_ok=True)
    manifest_path = AUDIO / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    records, provenance = {}, []
    for key, author, source_page, url in RECORDINGS:
        source = SOURCES / f"{key}.ogg"
        payload = source.read_bytes()
        if not payload.startswith(b"OggS"):
            raise ValueError(f"CC0 source not Ogg: {source}")
        if sha(payload) != PINNED_SOURCE_SHA256[key]:
            raise ValueError(f"Source changed since approval: {key}")
        provenance.append({"key": f"forest-{key}", "url": url, "sourcePage": source_page,
                           "author": author, "license": "CC0", "originalSha256": sha(payload)})
        records[key] = decode(source)

    count = RATE * DURATION
    wind = loop(records["wind"], count, 8700)
    drips = loop(records["drips"], count, 11800)
    wind /= max(.02, np.sqrt(np.mean(wind * wind)))
    drips /= max(.02, np.sqrt(np.mean(drips * drips)))
    bed = .032 * wind + .020 * drips
    creak = records["creak"].astype(np.float64)
    creak /= max(.03, np.max(np.abs(creak)))
    add_creak(bed, creak, 10.4, .095)
    add_creak(bed, creak, 27.1, .060)
    bed -= np.mean(bed)
    tail = int(RATE * .08)
    bed[-tail:] += (bed[0] - bed[-1]) * np.linspace(0., 1., tail)
    peak = float(np.max(np.abs(bed)))
    if peak > .45:
        bed *= .45 / peak
    rms = float(np.sqrt(np.mean(bed * bed)))
    if not .005 <= rms <= .12:
        raise ValueError(f"Unexpected Wet Forest RMS {rms}")

    master = SOURCES / "wet-forest-master.wav"
    with wave.open(str(master), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(RATE)
        handle.writeframes((np.clip(bed, -.99, .99) * 32767).astype("<i2").tobytes())
    ogg = AUDIO / "wet-forest-bed.ogg"
    mp3 = PREVIEWS / "wet-forest-ambience.mp3"
    for output, opts in ((ogg, ["-c:a", "libvorbis", "-b:a", "56k"]),
                         (mp3, ["-c:a", "libmp3lame", "-q:a", "4"])):
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(master),
                        "-ar", str(RATE), *opts, str(output)], check=True)
    original_keys = {source["key"] for source in manifest["sources"]}
    manifest["sources"].extend(source for source in provenance if source["key"] not in original_keys)
    manifest.setdefault("ambience", {})["wetForest"] = {
        "file": ogg.name, "sha256": sha(ogg.read_bytes()), "license": "CC0",
        "sourceKeys": [item["key"] for item in provenance], "durationSeconds": DURATION,
        "intent": "Quiet Wet Forest wind/drips and two sparse timber creaks, below Hunt music and combat"
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    (PREVIEWS / "wet-forest-provenance.json").write_text(json.dumps(
        {"sha256": sha(ogg.read_bytes()), "rms": rms, "sources": provenance}, indent=2) + "\n")
    print(f"Wet Forest: {ogg.stat().st_size} bytes, 36 seconds; RMS {rms:.4f}")


if __name__ == "__main__":
    main()
