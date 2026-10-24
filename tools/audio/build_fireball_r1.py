#!/usr/bin/env python3
"""Fireball R1: deterministic ORIGINAL WyrmForge Foley-style offline authoring.

No old game files or third-party audio are read, ever. Combustion, pressure, gust
and sparks are designed as offline physical noise textures, not gameplay synthesis.
All sounds are unapproved audition candidates.
"""
import hashlib
import json
import subprocess
import tempfile
import wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/audio/recorded"
PREVIEWS = ROOT / "docs/audio/previews"
RATE = 32000


def blank(seconds):
    return np.zeros(round(seconds * RATE), dtype=np.float64)


def colored(rng, n, lo, hi):
    return sosfilt(butter(3, [lo, hi], btype="bandpass", fs=RATE, output="sos"),
                   rng.standard_normal(n))


def shape(n, anchors):
    return np.interp(np.arange(n) / RATE, [p[0] for p in anchors],
                     [p[1] for p in anchors])


def place(dst, src, at, gain=1):
    pos = round(at * RATE)
    size = min(len(src), len(dst) - pos)
    if size > 0:
        dst[pos:pos + size] += src[:size] * gain


def cinders(rng, seconds, count, loud):
    dst = blank(seconds)
    for _ in range(count):
        pos = int(rng.uniform(.02, max(.03, seconds - .09)) * RATE)
        length = int(rng.uniform(.008, .058) * RATE)
        if pos + length >= len(dst):
            continue
        pop = colored(rng, length, 550, 6800) * np.exp(-np.linspace(0, 6, length))
        dst[pos:pos + length] += pop * rng.uniform(.18, 1) * loud
    return dst


def design(take):
    r = np.random.default_rng(95107 + take * 37)
    d = .75
    n = round(d * RATE)
    t = np.arange(n) / RATE
    pressure = colored(r, n, 45, 210) * (t >= .42) * np.exp(-np.maximum(t - .42, 0) / .115)
    cast = (.55 * colored(r, n, 65, 560) * shape(n, [
        (0, .005), (.11, .12), (.29, .33), (.40, .53), (.52, .08), (.75, 0)]) +
        .50 * colored(r, n, 670, 6700) * shape(n, [
        (0, 0), (.20, .008), (.35, .035), (.395, .13), (.47, .24), (.59, .06), (.75, 0)]) +
        .72 * pressure + cinders(r, d, 22, .048))
    d = .83
    n = round(d * RATE)
    t = np.arange(n) / RATE
    gust = shape(n, [(0, 0), (.05, .13), (.19, .53), (.39, .49),
                     (.59, .28), (.76, .10), (.83, 0)])
    flight = ((.35 * colored(r, n, 100, 830) + .17 * colored(r, n, 900, 4900)) *
              gust * (.88 + .12 * np.sin(2 * np.pi * (7 * t + 3 * t * t))) +
              cinders(r, d, 18, .025))
    d = 1.55
    n = round(d * RATE)
    t = np.arange(n) / RATE
    pulse = lambda start, decay: (t >= start) * np.exp(-np.maximum(t - start, 0) / decay)
    bloom = shape(n, [(0, .03), (.012, 1), (.22, .88),
                      (.65, .52), (1.35, .12), (1.55, 0)])
    hit = (.95 * colored(r, n, 35, 155) * pulse(.02, .20) +
           .36 * colored(r, n, 85, 1100) * pulse(.035, .36) +
           .27 * colored(r, n, 950, 6600) * pulse(.008, .19) +
           .60 * colored(r, n, 135, 2500) * shape(n, [
           (0, .02), (.012, .84), (.05, .9), (.15, .61),
           (.35, .15), (.7, .05), (1.55, 0)]) +
           cinders(r, d, 90, .058)) * bloom
    d = 3.9
    n = round(d * RATE)
    t = np.arange(n) / RATE
    fading = shape(n, [(0, 0), (.2, .26), (.9, .34), (1.6, .33),
                       (2.3, .24), (3.3, .12), (3.9, 0)])
    burn = ((.06 * colored(r, n, 500, 5800) +
             .13 * colored(r, n, 60, 450)) * fading *
            (.52 + .12 * np.sin(2 * np.pi * .83 * t) +
             .12 * np.sin(2 * np.pi * 1.63 * t + .7)) +
            cinders(r, d, 110, .035) * fading)
    # First two takes remain identical to the already-liked R1 A/B recordings.
    # Additional physical textures vary their spectral body, pressure and ember density
    # beyond the independently seeded non-repeating noise and cinder impulses.
    if take >= 3:
        profile = {
            3: (5200, 1.07, 0.88, 0.81),
            4: (4400, 0.92, 1.12, 1.17),
            5: (6800, 1.12, 1.03, 0.93),
            6: (5700, 0.96, 1.16, 1.06),
        }[take]
        cutoff, ignition_weight, impact_weight, ember_weight = profile
        cast = sosfilt(butter(2, cutoff, btype="lowpass", fs=RATE, output="sos"), cast) * ignition_weight
        flight = sosfilt(butter(2, min(6500, cutoff + 320), btype="lowpass", fs=RATE, output="sos"), flight)
        hit *= impact_weight
        burn *= ember_weight
    return {"cast": cast, "flight": flight, "hit": hit, "burn": burn}


def encode(name, signal, folder):
    folder.mkdir(parents=True, exist_ok=True)
    sound = np.tanh(signal * .85)
    peak = float(np.max(np.abs(sound)))
    if peak:
        sound *= min(1.0, .73 / peak)
    fade = min(320, len(sound) // 8)
    sound[:fade] *= np.linspace(0, 1, fade)
    sound[-fade:] *= np.linspace(1, 0, fade)
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "master.wav"
        with wave.open(str(path), "wb") as out:
            out.setnchannels(1)
            out.setsampwidth(2)
            out.setframerate(RATE)
            out.writeframes(np.asarray(sound * 32767, dtype="<i2").tobytes())
        is_game = folder == ASSETS
        ext = "ogg" if is_game else "mp3"
        target = folder / (name + "." + ext)
        codec = ["-c:a", "libvorbis", "-q:a", "4"] if is_game else ["-c:a", "libmp3lame", "-q:a", "3"]
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(path),
                        *codec, str(target)], check=True)
    return {"file": target.name, "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
            "seconds": round(len(signal) / RATE, 3)}


def main():
    manifest_path = ASSETS / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    designed = {}
    comparison = blank(12.6)
    six_reel = blank(6 * 6.45)
    for take in range(1, 7):
        parts = design(take)
        for phase, samples in parts.items():
            name = f"fireball-r1-{phase}-{take}"
            designed[name] = encode(name, samples, ASSETS)
            if take == 1:
                encode(name, samples, PREVIEWS)
        full = blank(5.9)
        for phase, position, gain in [("cast", .20, 1), ("flight", .72, .63),
                                      ("hit", 1.36, 1.1), ("burn", 1.52, .37)]:
            place(full, parts[phase], position, gain)
        encode(f"fireball-r1-full-{take}", full, PREVIEWS)
        if take <= 2:
            place(comparison, full, .25 if take == 1 else 6.45, .85)
        place(six_reel, full, (take - 1) * 6.45 + .25, .85)
    encode("fireball-r1-ab-comparison", comparison, PREVIEWS)
    encode("fireball-r1-six-take-reel", six_reel, PREVIEWS)
    origin = {"author": "WyrmForge original audio", "license": "Original",
              "source": "tools/audio/build_fireball_r1.py"}
    def make(phase, take, gain):
        item = designed[f"fireball-r1-{phase}-{take}"]
        return {**item, **origin, "mix": {"gain": gain, "lowpassHz": 4700,
                                          "attackSeconds": .006, "releaseSeconds": .18}}
    casts = [make("cast", n, .72) for n in range(1, 7)]
    hits = [make("hit", n, .82) for n in range(1, 7)]
    manifest["cues"]["fire"] = {**origin, "file": casts[0]["file"], "sha256": casts[0]["sha256"],
                                 "variants": casts, "hitVariants": hits}
    manifest.setdefault("authoredFireballStages", {})["R1"] = {
        "approved": False, "oldAudioSourceUsed": False,
        "flight": [designed[f"fireball-r1-flight-{n}"] for n in range(1, 7)],
        "burn": [designed[f"fireball-r1-burn-{n}"] for n in range(1, 7)]}
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    (PREVIEWS / "fireball-r1-audition.json").write_text(json.dumps({
        "approved": False, "oldAudioUsed": False,
        "origin": "new authored offline physical-noise design",
        "stages": ["ignition", "flight", "impact", "burning ground"],
        "takeCount": 6,
        "comparison": "fireball-r1-six-take-reel.mp3",
        "firstTwoPreserved": True,
        "note": "Six independent takes per stage; cast/hit mapped in game. Flight/burn require authoritative gameplay events."
    }, indent=2) + "\n")
    print("Original Fireball R1: six independent takes per stage, 24 original Oggs; no legacy audio used")


if __name__ == "__main__":
    main()
