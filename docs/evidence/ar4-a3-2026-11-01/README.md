# AR4-A3 genuine playable Hunt screenshots — 1 November 2026

The first five PNG files were recovered byte-for-byte from the successful GitHub Actions browser shard 1 job [124776634927](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/41282177259) (source commit `adabc7bd9019a51a4aa3f00d6530450dcd2e781a`). The job emitted PNG bytes between `AR4_IMAGE_BEGIN/END` markers; the recovered files have verified PNG signatures and 320×568 or 390×844 dimensions.

| Screenshot | Resolution | What it actually proves |
| --- | --- | --- |
| [Forest fork semantic](ar4-forest-fork-semantic-320.png) | 320×568 | C# semantic terrain baseline in playable Hunt |
| [Forest fork original soft albedo](ar4-forest-fork-native-wf32-320.png) | 320×568 | Original WF32 soil/grass/mud source under the same C# site |
| [Mountain pass original soft albedo](ar4-mountain-pass-native-wf32-390.png) | 390×844 | Mountain pass geography and partial soft source coverage |
| [Mountain monastery region from player spawn](ar4-mountain-monastery-native-wf32-390.png) | 390×844 | Same mountain-monastery kind, **not** the building itself |
| [Mountain pass while player/camera move](ar4-mountain-pass-moving-camera-390.png) | 390×844 | Real C# movement and anchored material compositing |
| [C# monastery-footprint spectator review](ar4-mountain-monastery-csharp-focus-390.png) | 390×844 | The genuine monastery building footprints in frame; this is a **spectator camera**, not player traversal |

**Known deficiencies; owner gate still open:** source looks soft/noisy at mobile scale; rock/cliff surfaces are explicitly flat diagnostics; original P1i 1024×1568 source does not cover the bottom ~26% of the 390×844 world's 1014×2110 surface; the initial monastery capture does not contain the building. These images verify the integration seam, not production-ready 2.5D art, source-extension acceptance, Lighting 1.0 or actual phone performance.

The sixth PNG was captured in [browser run 41283929513](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/41283929513), shard 1 (successful), on code commit `29c393fbbea7ee277aa38ac2d5243e34a3490150`. Opt-in `?arenaTerrain=materials&ar4ReviewFocus=monastery` uses the actual normalized C# monastery obstacle outlines to frame the building without teleporting the hunter. The capture is explicitly labeled `AR4 SPECTATOR · C# MONASTERY`; tests check unchanged site/seed/obstacle identity. It reveals the monastery as flat diagnostic rectangles, **not** finished 2.5D stone architecture. Do not treat spectator framing as traversed gameplay or an approved art gate.

PR [#459](https://github.com/pjotrcasteel/Wyrmforge/pull/459) stays **draft**. No merge or AR4-B acceptance without the owner's explicit approval.
