#!/usr/bin/env python3
"""Phone-playable Fire/Frost/Storm/Arcane impact comparisons from shipped OGGs.

Dry narrated-free auditions using existing licensed recordings. Staged, not live gameplay.
"""
import array
import hashlib
import json
import subprocess
import tempfile
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AUDIO = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/audio/recorded"
OUTPUT = ROOT / "docs/audio/previews"
RATE = 24000
SECONDS_PER_SCHOOL = 6.2
SCHOOLS = ("fire", "frost", "lightning", "arcane")


def read(name):
    source = AUDIO / name
    result = subprocess.run(["ffmpeg", "-v", "error", "-i", str(source),
                             "-ac", "1", "-ar", str(RATE), "-f", "f32le", "pipe:1"],
                            check=True, capture_output=True)
    samples = array.array("f")
    samples.frombytes(result.stdout)
    if not samples:
        raise ValueError(f"Empty source: {name}")
    return samples


def paste(into, samples, time, scale):
    start = int(time * RATE)
    count = min(len(samples), len(into) - start)
    for i in range(max(0, count)):
        into[start + i] += samples[i] * scale


def save(name, samples):
    peak = max(abs(sample) for sample in samples)
    if not 0.01 <= peak < 3:
        raise ValueError(f"Invalid stage peak {peak}")
    gain = min(1., .84 / peak)
    fade = min(len(samples) // 10, RATE // 3)
    raw = array.array("h")
    for i, value in enumerate(samples):
        envelope = (len(samples) - i) / fade if i >= len(samples) - fade else 1.
        raw.append(round(max(-.999, min(.999, value * gain * envelope)) * 32767))
    with tempfile.TemporaryDirectory() as temp:
        wav = Path(temp) / "stage.wav"
        with wave.open(str(wav), "wb") as handle:
            handle.setnchannels(1)
            handle.setsampwidth(2)
            handle.setframerate(RATE)
            handle.writeframes(raw.tobytes())
        path = OUTPUT / name
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-ar", "44100",
                        "-c:a", "libmp3lame", "-q:a", "3", str(path)], check=True)
    return {"file": name, "size": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((AUDIO / "manifest.json").read_text())
    forest = read(manifest["ambience"]["wetForest"]["file"])
    segments, reviews = [], []
    for school in SCHOOLS:
        cue = manifest["cues"][school]
        casts, hits = cue["variants"], cue["hitVariants"]
        if len(casts) < 2 or len(hits) < 2:
            raise ValueError(f"{school} has insufficient real recorded variations")
        length = round(RATE * SECONDS_PER_SCHOOL)
        stage = [0.] * length
        paste(stage, forest[:length], 0., .15)
        for index, offset in enumerate((0.6, 3.25)):
            cast, hit = casts[index], hits[index]
            for entry in (cast, hit):
                file = AUDIO / entry["file"]
                if hashlib.sha256(file.read_bytes()).hexdigest() != entry["sha256"]:
                    raise ValueError(f"Sample hash mismatch: {file}")
            paste(stage, read(cast["file"]), offset, .35)
            paste(stage, read(hit["file"]), offset + .49, .50)
        reviews.append(save(f"{school}-spell-impact.mp3", stage))
        segments.extend(stage)
        segments.extend([0.] * int(.65 * RATE))
    reviews.append(save("four-school-impact-comparison.mp3", segments))
    (OUTPUT / "four-school-impact-review.json").write_text(json.dumps({
        "title": "WyrmForge four elemental sound identities",
        "sampleOrder": list(SCHOOLS),
        "provenance": "Existing manifest-checked JC Sounds CC BY 4.0 cast and hit OGG recordings",
        "note": "Each school has two cast+impact variations over a quiet Wet Forest soundbed, not live gameplay",
        "reviews": reviews,
    }, indent=2) + "\n")
    print("Generated", *(entry["file"] for entry in reviews))


if __name__ == "__main__":
    main()
