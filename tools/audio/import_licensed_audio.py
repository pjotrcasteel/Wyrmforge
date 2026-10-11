#!/usr/bin/env python3
"""Import documented, human-authored CC0/CC-BY fantasy audio as self-hosted game assets.

Run in a GitHub Actions environment with ffmpeg and 7z. Never silently substitute generated
samples when an approved source cannot be downloaded, decoded, or identified.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from urllib.request import Request, urlopen
import zipfile

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/audio/recorded"
SOURCES = {
    "osare": ("https://opengameart.org/sites/default/files/42b4b.ogg", "CC0", "Brandon Morris (Augmentality)", "https://opengameart.org/content/osare-unrest-theme"),
    "cave": ("https://opengameart.org/sites/default/files/cave%20themeb4.ogg", "CC0", "Brandon Morris", "https://opengameart.org/content/cave-theme"),
    "fantasy": ("https://opengameart.org/sites/default/files/fantasy_sfx_pack_vol_1.7z", "CC-BY-4.0", "JC Sounds", "https://opengameart.org/content/jc-sounds-fantasy-sfx-pack-vol-1"),
    "rpg": ("https://opengameart.org/sites/default/files/80-CC0-RPG-SFX_0.zip", "CC0", "rubberduck", "https://opengameart.org/content/80-cc0-rpg-sfx"),
}
AUDIO_SUFFIXES = {".ogg", ".wav", ".mp3", ".flac", ".aif", ".aiff"}
# Match assets by semantic filename, not by nondeterministic ZIP archive order.
CUES = {
    "arcane": ("rpg", ("spell_01",)),
    "fire": ("fantasy", ("fire", "launch")),
    "frost": ("fantasy", ("ice", "launch")),
    "lightning": ("fantasy", ("electric", "launch")),
    "impact": ("fantasy", ("sword", "hit", "metal")),
    "enemy-down": ("rpg", ("creature", "die")),
    "hurt": ("rpg", ("creature", "hurt")),
    "wyrm": ("rpg", ("creature", "roar")),
    "ui": ("rpg", ("item", "stone")),
    "upgrade-open": ("fantasy", ("magic", "shield")),
    "upgrade-choice": ("fantasy", ("healing",)),
    "power-burst": ("fantasy", ("electric", "hit")),
    "trail-clear": ("fantasy", ("healing",)),
    "reward": ("rpg", ("item", "gem")),
    "hunt-start": ("fantasy", ("magic", "shield")),
    "victory": ("fantasy", ("healing",)),
    "death": ("rpg", ("creature", "die")),
}


def download(url: str, path: Path) -> str:
    request = Request(url, headers={"User-Agent": "WyrmForge-Open-Asset-Import/1.0 (CC0 and CC BY)"})
    with urlopen(request, timeout=90) as response, path.open("wb") as target:
        total = 0
        digest = hashlib.sha256()
        while chunk := response.read(65536):
            total += len(chunk)
            if total > 22_000_000:
                raise ValueError(f"File larger than approved limit: {url}")
            target.write(chunk)
            digest.update(chunk)
    if total < 3000:
        raise ValueError(f"Not an audio file/archive: {url} ({total} bytes)")
    print(f"Source verified: {url} ({total} bytes, sha256={digest.hexdigest()})")
    return digest.hexdigest()


def import_archive(name: str, archive: Path, target: Path) -> None:
    target.mkdir(parents=True, exist_ok=True)
    if name == "rpg":
        with zipfile.ZipFile(archive) as zip_file:
            for item in zip_file.infolist():
                if not item.is_dir() and Path(item.filename).suffix.lower() in AUDIO_SUFFIXES:
                    path = target / Path(item.filename).name
                    with zip_file.open(item) as src, path.open("wb") as dest:
                        shutil.copyfileobj(src, dest)
        return
    subprocess.run(["7z", "x", "-y", f"-o{target}", str(archive)], check=True, stdout=subprocess.DEVNULL)


def find_audio(directory: Path) -> list[Path]:
    return sorted(path for path in directory.rglob("*") if path.is_file() and path.suffix.lower() in AUDIO_SUFFIXES)


def select_sound(files: list[Path], words: tuple[str, ...]) -> Path | None:
    def norm(file: Path) -> str:
        return file.stem.lower().replace("-", "_").replace(" ", "_")
    exact = [file for file in files if all(word in norm(file) for word in words)]
    if exact:
        return exact[0]
    # Some packs group files in a directory named for their element.
    matching = [file for file in files if all(word in str(file).lower().replace("-", "_") for word in words)]
    return matching[0] if matching else None


def convert(source: Path, target: Path, *, duration: float = 1.8) -> None:
    subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(source),
        "-t", str(duration), "-vn", "-ac", "1", "-ar", "32000",
        "-af", "highpass=f=65,lowpass=f=12500,volume=0.80",
        "-c:a", "libvorbis", "-q:a", "4", str(target)
    ], check=True)
    if target.stat().st_size < 500:
        raise RuntimeError(f"Audio conversion yielded empty file: {source}")


def main() -> None:
    for exe in ("ffmpeg", "7z"):
        if not shutil.which(exe):
            raise RuntimeError(f"Required import utility unavailable: {exe}")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    provenance = []
    with tempfile.TemporaryDirectory() as temp:
        base = Path(temp)
        catalog: dict[str, list[Path]] = {}
        sha: dict[str, str] = {}
        for key, (url, license_id, creator, page) in SOURCES.items():
            archive = base / (key + (".7z" if key == "fantasy" else ".zip" if key == "rpg" else ".ogg"))
            sha[key] = download(url, archive)
            provenance.append({"key": key, "url": url, "sourcePage": page, "author": creator,
                               "license": license_id, "originalSha256": sha[key]})
            if key in ("rpg", "fantasy"):
                import_archive(key, archive, base / key)
                catalog[key] = find_audio(base / key)
                print(f"{key} source files: " + ", ".join(str(p.relative_to(base / key)) for p in catalog[key]))
                if not catalog[key]:
                    raise RuntimeError(f"Empty licensed {key} archive")
            else:
                shutil.copyfile(archive, OUTPUT / f"music-{key}.ogg")
        selection = {}
        for cue, (library, tokens) in CUES.items():
            source = select_sound(catalog[library], tokens)
            if source is None:
                print(f"WARNING no exact {cue} match ({tokens}) in {library}; keeping previous sample for now")
                continue
            target = OUTPUT / f"{cue}.ogg"
            convert(source, target, duration=1.6 if cue not in ("wyrm", "power-burst") else 2.5)
            selection[cue] = {"file": target.name, "source": str(source.relative_to(base / library)),
                              "library": library, "author": SOURCES[library][2], "license": SOURCES[library][1],
                              "sha256": hashlib.sha256(target.read_bytes()).hexdigest()}
        for necessary in ("arcane", "fire", "frost", "lightning"):
            if necessary not in selection:
                raise RuntimeError(f"Core spell {necessary} is missing — do not ship a synthetic replacement")
        manifest = {"version": 1, "music": {
            "menu": "music-osare.ogg", "hunt": "music-cave.ogg"
        }, "cues": selection, "sources": provenance,
            "attribution": "JC Sounds · CC BY 4.0 · https://opengameart.org/content/jc-sounds-fantasy-sfx-pack-vol-1 (edited: trimmed, filtered, resampled and converted)"}
        (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        print(f"Imported {len(selection)} recorded effects and 2 music compositions")

if __name__ == "__main__":
    main()
