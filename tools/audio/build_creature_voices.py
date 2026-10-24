#!/usr/bin/env python3
"""Produce CC0 Hollowed/Ashling audition candidates from verified original performances.

The production pipeline is offline; the game plays compact, self-hosted OGGs.
Do not consider this a creative approval. Preview on phone before merging.
"""
import hashlib
import json
import math
import subprocess
import tempfile
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCES = ROOT / "tools/audio/creature-sources"
AUDIO = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/audio/recorded"
PREVIEWS = ROOT / "docs/audio/previews"
RATE = 24000

SOURCE_META = {
    "zombies-cc0": {
        "key": "zombies-cc0",
        "url": "https://opengameart.org/sites/default/files/zombies.zip",
        "sourcePage": "https://opengameart.org/content/zombies-sound-pack",
        "author": "artisticdude",
        "license": "CC0",
        "originalSha256": "8096ceeb4dac35d9eef9bfe0cc6649778d1eebf141b208d394ac338b9e5be314"
    },
    "monsters-cc0": {
        "key": "monsters-cc0",
        "url": "https://opengameart.org/sites/default/files/monster_sfx_pack.zip",
        "sourcePage": "https://opengameart.org/content/monster-sound-effects-pack",
        "author": "Ogrebane",
        "license": "CC0",
        "originalSha256": "f39c5ae356b1fc01284057ee48e35ec1a52fcc84bfa959b77d0a696adc8459e4"
    },
    "ash-fire-cc0": {
        "key": "ash-fire-cc0",
        "url": "https://opengameart.org/sites/default/files/fire-1_0.ogg",
        "sourcePage": "https://opengameart.org/content/fire-crackling",
        "author": "AntumDeluge",
        "license": "CC0",
        "originalSha256": "f922929805bc6afdf0a35727fa3998033db544c1b6f62ed3aeab94341ed6ddeb"
    }
}

# Index numbers are first-pass candidates, deliberately distinguishable recordings.
# Listen to the generated A/B MP3 before selecting final actions.
DESIGN = {
    "hollow-approach": ("zombies-cc0", [1, 2], 1.0, 2400, 0.74),
    "hollow-hit": ("zombies-cc0", [8, 9], 0.42, 3100, 0.72),
    "hollow-death": ("zombies-cc0", [21, 22], 1.35, 2200, 0.73),
    "ashling-approach": ("monsters-cc0", [1, 2], 0.86, 2500, 0.66),
    "ashling-hit": ("monsters-cc0", [4, 5], 0.42, 3200, 0.70),
    "ashling-death": ("monsters-cc0", [8, 10], 1.28, 2800, 0.74),
}

MIX = {
    "approach": {"gain": 0.57, "lowpassHz": 2600, "attackSeconds": 0.02, "releaseSeconds": 0.22},
    "hit": {"gain": 0.66, "lowpassHz": 3200, "attackSeconds": 0.008, "releaseSeconds": 0.12},
    "death": {"gain": 0.70, "lowpassHz": 2800, "attackSeconds": 0.018, "releaseSeconds": 0.24},
}


def run(*command):
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def duration(path):
    result = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                      "-of", "default=noprint_wrappers=1:nokey=1", str(path)], text=True)
    return float(result.strip())


def clip_source(category, number):
    if category == "zombies-cc0":
        return SOURCES / "zombies" / f"zombie-{number}.wav"
    return SOURCES / "monster_sfx_pack" / f"monster-{number}.wav"


def render_clip(key, original, max_duration, cutoff, level, dest):
    original_length = duration(original)
    clip_duration = min(max_duration, original_length)
    if clip_duration < 0.15:
        raise ValueError(f"Too short for a playable take: {original}")
    exit_fade = min(.16, clip_duration * .28)
    filters = (f"highpass=f=85,lowpass=f={cutoff},volume={level},"
               f"afade=t=in:st=0:d=0.01,afade=t=out:st={clip_duration-exit_fade:.4f}:d={exit_fade:.4f}")
    with tempfile.TemporaryDirectory() as temp:
        dry = Path(temp) / "dry.wav"
        run("ffmpeg", "-y", "-v", "error", "-i", str(original), "-t", str(clip_duration),
            "-af", filters, "-ac", "1", "-ar", str(RATE), str(dry))
        if key.startswith("ashling-"):
            # A fine fiery texture belongs to ash-body creatures only; not a second monster voice.
            fire = SOURCES / "fire.ogg"
            mix = f"[0:a]volume=0.90[voice];[1:a]highpass=f=260,lowpass=f=3600,volume=0.085[ember];[voice][ember]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.9[out]"
            run("ffmpeg", "-y", "-v", "error", "-i", str(dry), "-stream_loop", "-1", "-i", str(fire),
                "-filter_complex", mix, "-map", "[out]", "-t", str(clip_duration),
                "-ac", "1", "-ar", str(RATE), "-c:a", "libvorbis", "-q:a", "4", str(dest))
        else:
            run("ffmpeg", "-y", "-v", "error", "-i", str(dry), "-c:a", "libvorbis", "-q:a", "4", str(dest))
    if not dest.read_bytes().startswith(b"OggS") or duration(dest) < .1 or dest.stat().st_size > 120000:
        raise ValueError(f"Invalid or bloated audio clip: {dest}")


def build_preview(keys):
    raw = bytearray()
    silence = b"\x00\x00" * round(RATE * .43)
    for key in keys:
        for variant in range(2):
            path = AUDIO / f"{key}-{variant+1}.ogg"
            raw.extend(subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(path),
                                                "-f", "s16le", "-ac", "1", "-ar", str(RATE), "pipe:1"]))
            raw.extend(silence)
        raw.extend(silence * 2)
    with tempfile.TemporaryDirectory() as tmp:
        wave_path = Path(tmp) / "preview.wav"
        with wave.open(str(wave_path), "wb") as writer:
            writer.setnchannels(1)
            writer.setsampwidth(2)
            writer.setframerate(RATE)
            writer.writeframes(raw)
        output = PREVIEWS / "hollowed-ashling-voices.mp3"
        run("ffmpeg", "-y", "-v", "error", "-i", str(wave_path), "-c:a", "libmp3lame",
            "-q:a", "3", str(output))
        if output.stat().st_size < 15000:
            raise ValueError("MP3 preview unexpectedly small")
    return output


def main():
    AUDIO.mkdir(parents=True, exist_ok=True)
    PREVIEWS.mkdir(parents=True, exist_ok=True)
    manifest_path = AUDIO / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    for source in SOURCE_META.values():
        source_file = SOURCES / ("zombies.zip" if source["key"] == "zombies-cc0"
                                 else "monsters.zip" if source["key"] == "monsters-cc0" else "fire.ogg")
        if digest(source_file) != source["originalSha256"]:
            raise ValueError(f"Unverified CC0 original: {source_file}")
    existing = {item["key"] for item in manifest["sources"]}
    manifest["sources"].extend(item for item in SOURCE_META.values() if item["key"] not in existing)

    for cue, (library, takes, maximum, cutoff, level) in DESIGN.items():
        if cue in manifest["cues"]:
            raise ValueError(f"Existing cue unexpectedly overwritten: {cue}")
        variations = []
        for i, number in enumerate(takes):
            original = clip_source(library, number)
            dest = AUDIO / f"{cue}-{i+1}.ogg"
            render_clip(cue, original, maximum, cutoff, level, dest)
            meta = SOURCE_META[library]
            variations.append({
                "file": dest.name, "source": f"{original.parent.name}/{original.name}",
                "library": library, "author": meta["author"], "license": "CC0",
                "sha256": digest(dest), "sourceKeys": [library] + (["ash-fire-cc0"] if cue.startswith("ashling-") else []),
                "mix": MIX[cue.split("-")[-1]],
            })
        manifest["cues"][cue] = {
            **{k: variations[0][k] for k in ("file", "source", "library", "author", "license", "sha256")},
            "variants": variations,
            "intent": f"Audition candidate for {cue}; sparse and non-intrusive with two different CC0 performances."
        }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    keys = list(DESIGN)
    preview = build_preview(keys)
    (PREVIEWS / "hollowed-ashling-audition.json").write_text(json.dumps({
        "order": keys, "variantsPerCue": 2, "sources": list(SOURCE_META.values()),
        "preview": preview.name, "cues": {key: manifest["cues"][key] for key in keys},
    }, indent=2) + "\n")
    print("Rendered", len(keys) * 2, "mobile-friendly OGG clips and", preview)


if __name__ == "__main__":
    main()
