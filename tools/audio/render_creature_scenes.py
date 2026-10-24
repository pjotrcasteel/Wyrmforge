#!/usr/bin/env python3
"""Export Safari-playable Hollowed/Ashling candidate scenes using the actual game recordings.

These are staged listening comparisons, NOT captures of live gameplay.
The engine's event routing and audio mixer remain the authority for production play.
"""
import array
import hashlib
import json
import math
import subprocess
import tempfile
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AUDIO = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/audio/recorded"
OUTPUT = ROOT / "docs/audio/previews"
RATE = 24000
FRAMES = 19 * RATE


def pcm(name, limit=21):
    source = AUDIO / name
    if not source.is_file():
        raise FileNotFoundError(f"Missing original in-game recording: {source}")
    result = subprocess.run(["ffmpeg", "-v", "error", "-i", str(source),
                             "-t", str(limit), "-ac", "1", "-ar", str(RATE),
                             "-f", "f32le", "pipe:1"], check=True, capture_output=True)
    frames = array.array("f")
    frames.frombytes(result.stdout)
    if not frames:
        raise ValueError(f"Empty sound file {source}")
    return frames


cache = {}


def layer(output, name, start_seconds, amplitude, max_seconds=21):
    if name not in cache:
        cache[name] = pcm(name, max_seconds)
    frames = cache[name]
    start = round(start_seconds * RATE)
    if start >= len(output):
        return
    count = min(len(frames), len(output) - start)
    for index in range(count):
        output[start + index] += frames[index] * amplitude


def export(name, frames, duration):
    length = min(len(frames), round(duration * RATE))
    fade = min(round(RATE * 0.75), length // 5)
    peak = max(abs(sample) for sample in frames[:length])
    gain = min(1., 0.85 / peak) if peak > 0 else 1.
    data = array.array("h", (round(max(-.999, min(.999, sample * gain)) * 32767)
                              for sample in frames[:length - fade]))
    data.extend(round(max(-.999, min(.999, frames[length - fade + k] * gain
                * (fade - k) / fade)) * 32767) for k in range(fade))
    with tempfile.TemporaryDirectory() as temp:
        source = Path(temp) / "scene.wav"
        with wave.open(str(source), "wb") as handle:
            handle.setnchannels(1)
            handle.setsampwidth(2)
            handle.setframerate(RATE)
            handle.writeframes(data.tobytes())
        target = OUTPUT / name
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(source),
                        "-ar", "44100", "-c:a", "libmp3lame", "-q:a", "3",
                        str(target)], check=True)
        if target.stat().st_size < 1000 or target.stat().st_size > 1_000_000:
            raise ValueError(f"Unexpected preview size: {target}")
        return {"file": target.name, "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
                "seconds": duration}


def scene(family, take):
    track = [0.] * FRAMES
    layer(track, "wet-forest-bed.ogg", 0., 0.40)
    layer(track, "music-cave.ogg", 0., 0.09)
    layer(track, "hunt-stride.ogg", 1.1, 0.25)
    layer(track, f"{family}-approach-{take}.ogg", 3.2, 0.50)
    layer(track, "fire-cast-1.ogg", 6.2, 0.44)
    layer(track, "impact.ogg", 6.65, 0.24)
    layer(track, f"{family}-hit-{take}.ogg", 6.8, 0.52)
    layer(track, "fire-cast-2.ogg", 10.8, 0.38)
    layer(track, "impact.ogg", 11.2, 0.22)
    layer(track, f"{family}-death-{take}.ogg", 11.45, 0.55)
    layer(track, "hunt-stride.ogg", 14.5, 0.19)
    return export(f"{family}-encounter-{take}.mp3", track, 19)


def isolated(family, action):
    length = 8 * RATE
    track = [0.] * length
    layer(track, f"{family}-{action}-1.ogg", .3, .74)
    layer(track, f"{family}-{action}-2.ogg", 3.75, .74)
    return export(f"{family}-{action}-ab.mp3", track, 8)


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((AUDIO / "manifest.json").read_text())
    results = []
    for family in ["hollow", "ashling"]:
        for action in ["approach", "hit", "death"]:
            cue = manifest["cues"][f"{family}-{action}"]
            if len(cue["variants"]) != 2:
                raise ValueError(f"Expected two real recorded takes: {family}-{action}")
            for variant in cue["variants"]:
                source = AUDIO / variant["file"]
                if hashlib.sha256(source.read_bytes()).hexdigest() != variant["sha256"]:
                    raise ValueError(f"Unverified Ogg sample: {source}")
            results.append(isolated(family, action))
        for take in [1, 2]:
            results.append(scene(family, take))
    metadata = {
        "title": "Hollowed versus Ashling, in-context audio A/B candidates",
        "type": "staged mix of real checked-in WyrmForge recordings; not a live gameplay capture",
        "forestSource": manifest["ambience"]["wetForest"]["file"],
        "recordings": results,
        "sceneTimelineSeconds": {"footstep": 1.1, "approach": 3.2, "fireball": 6.2,
                                 "hit": 6.8, "finalFireball": 10.8, "death": 11.45},
        "mix": "low background wind and Cave Theme; real footstep, Fireball cast, impact and two creature takes",
        "listeningNote": "Do not approve without actual iPhone speaker and in-game run; judge identity and repetitiveness."
    }
    (OUTPUT / "creature-encounters-index.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print("Published", len(results), "Safari MP3 auditions")
    for item in results:
        print(item["file"], item["seconds"], item["sha256"])


if __name__ == "__main__":
    main()
