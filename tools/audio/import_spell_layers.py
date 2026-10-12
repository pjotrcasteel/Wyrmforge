#!/usr/bin/env python3
"""Pin and import layered human-recorded mage sounds (CC BY 4.0) as local Ogg files.

This is a one-time asset preparation tool, not a build-time internet dependency.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
AUDIO = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/audio/recorded"
MANIFEST = AUDIO / "manifest.json"
SOURCE_URL = "https://opengameart.org/sites/default/files/fantasy_sfx_pack_vol_1.7z"
EXPECTED_SHA256 = "7ae22fe73c05e2725db32f61a3bd391e05dbc2a46f8ed0b18fa0a0fa0bf198f4"

# Each variant is a real, different performance, not a pitch shift of one identical file.
# Original filenames are matched against the known, SHA-256 pinned JC Sounds archive.
SELECTIONS = {
    "arcane": {
        "casts": ["Teleport_In.wav", "Teleport_Out.wav", "Magic Shield_Activation_01.wav"],
        "hits": ["Magic Shield_Activation_02.wav", "Mana Drain_End.wav"],
        "buildup": "Mana Drain_Start.wav",
    },
    "fire": {
        "casts": ["Fireball Launch_01.wav", "Fireball Launch_02.wav", "Fireball Launch_03.wav"],
        "hits": ["Fireball Impact_01.wav", "Fireball Impact_02.wav", "Fireball Impact_03.wav"],
        "buildup": "Fireball_Buildup.wav",
    },
    "frost": {
        "casts": ["Ice Shard Projectile_Launch_01.wav", "Ice Shard Projectile_Launch_02.wav", "Ice Shard Projectile_Launch_03.wav"],
        "hits": ["Ice Shard  Projectile_Impact_01.wav", "Ice Shard  Projectile_Impact_02.wav", "Ice Shard  Projectile_Impact_03.wav"],
        "buildup": "Ice Spell_Buildup.wav",
    },
    "lightning": {
        "casts": ["Electric Spell_Launch_01.wav", "Electric Spell_Launch_02.wav", "Electric Spell_Launch_03.wav"],
        "hits": ["Electric Spell_Hit_01.wav", "Electric Spell_Hit_02.wav", "Electric Spell_Hit_03.wav"],
        "buildup": "Electric Spell_Buildup.wav",
    },
}


def command(*args: str) -> str:
    return subprocess.check_output(args, text=True, stderr=subprocess.STDOUT).strip()


def download_pinned(path: Path) -> None:
    request = Request(SOURCE_URL, headers={"User-Agent": "WyrmForge-LicensedAudioImport/0.0.110"})
    digest = hashlib.sha256()
    with urlopen(request, timeout=90) as response, path.open("wb") as output:
        total = 0
        while chunk := response.read(65536):
            total += len(chunk)
            if total > 22_000_000:
                raise RuntimeError("Unusually large archive: import aborted")
            digest.update(chunk)
            output.write(chunk)
    if digest.hexdigest() != EXPECTED_SHA256:
        raise RuntimeError("Audio pack changed upstream; review license and bytes before importing")


def convert(source: Path, destination: Path) -> None:
    duration = float(command("ffprobe", "-v", "error", "-show_entries", "format=duration",
                             "-of", "default=noprint_wrappers=1:nokey=1", str(source)))
    length = max(0.08, min(duration, 2.1))
    end_fade = min(0.16, length / 4)
    # Always fade, including where short samples are truncated; never hard-cut a waveform.
    filt = f"highpass=f=55,lowpass=f=11500,volume=0.82,afade=t=out:st={length - end_fade:.3f}:d={end_fade:.3f}"
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(source),
                    "-t", f"{length:.3f}", "-vn", "-ac", "1", "-ar", "32000", "-af", filt,
                    "-c:a", "libvorbis", "-q:a", "4", str(destination)], check=True)
    if destination.stat().st_size < 800:
        raise RuntimeError(f"Empty imported sound: {source.name}")


def entry(src: Path, dest: Path) -> dict:
    return {
        "file": dest.name,
        "source": src.name,
        "library": "fantasy",
        "author": "JC Sounds",
        "license": "CC-BY-4.0",
        "sha256": hashlib.sha256(dest.read_bytes()).hexdigest(),
    }


def main() -> None:
    if not MANIFEST.exists():
        raise RuntimeError("Import recorded base audio before importing layered mage sounds")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        archive = root / "fantasy.7z"
        download_pinned(archive)
        directory = root / "unpacked"
        command("7z", "x", "-y", f"-o{directory}", str(archive))
        sources = [path for path in directory.rglob("*.wav") if path.is_file()]

        def resolve(suffix: str) -> Path:
            matches = [p for p in sources if p.name.endswith(suffix)]
            if len(matches) != 1:
                raise RuntimeError(f"Expected one source for {suffix}, found {len(matches)}")
            return matches[0]

        for school, groups in SELECTIONS.items():
            cue = manifest["cues"][school]
            cue["variants"] = []
            cue["hitVariants"] = []
            for kind, target in (("casts", "variants"), ("hits", "hitVariants")):
                for index, suffix in enumerate(groups[kind], 1):
                    src = resolve(suffix)
                    dest = AUDIO / f"{school}-{kind[:-1]}-{index}.ogg"
                    convert(src, dest)
                    cue[target].append(entry(src, dest))
            src = resolve(groups["buildup"])
            dest = AUDIO / f"{school}-buildup.ogg"
            convert(src, dest)
            cue["buildup"] = entry(src, dest)
            print(f"Imported {school}: {len(cue['variants'])} casts, {len(cue['hitVariants'])} impacts, 1 buildup")

    manifest["version"] = 2
    manifest["mixVersion"] = "0.0.110"
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
