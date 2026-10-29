# G4 physical-device approval — GitHub Pages only

This protocol uses the **existing public HTTPS GitHub Pages deployment**, with an isolated G4 opt-in version. The player must **not** download artifacts, run Python/PowerShell, host a local IP address, set up a tunnel, or publish the draft engine to the ordinary game.

## Where to play

- **G4 GPU mobile candidate:** https://pjotrcasteel.github.io/Wyrmforge/g4-preview/?arenaGpu=1&gpuQuality=mobile&g4Review=1
- **G4 Canvas comparison, same game build:** https://pjotrcasteel.github.io/Wyrmforge/g4-preview/?g4Review=1
- **Normal production game (not the G4 test):** https://pjotrcasteel.github.io/Wyrmforge/

The G4 and Canvas comparison paths share one **pinned** experimental build. The ordinary game keeps the production Canvas renderer and must never be replaced by an unaccepted G4 renderer. A new G4 candidate is available only after the pinned Pages deployment passes.

**Important, 29 October 2026:** The iPhone owner rejected G4 candidate `d594948` as nearly black, confirmed by Chromium CI screenshot. [Repair PR #413](https://github.com/pjotrcasteel/Wyrmforge/pull/413) improves authoritative hunter/ambient night visibility and WebKit copy behavior; [Pages PR #414](https://github.com/pjotrcasteel/Wyrmforge/pull/414) prepares the new pinned candidate. Until the updated Pages workflow is green, the URL may still show the rejected build. **Do not use an old screenshot as approval.**

## iPhone Safari and Android Chrome review

1. On a real phone (not desktop emulation), open the **GPU mobile candidate** directly in the normal browser. Note the phone model, OS version, battery before/after and whether battery saving/reduced motion is enabled.
2. Start **Free Play → First Hunt**. Before recording, verify that **the mage, enemies, near-ground textures, surrounding walkable area, tree/wall layering and spell lighting are genuinely visible at normal screen brightness**. A near-black scene with an operating HP/score HUD is a **failed rendering gate**. Do not continue a performance run on an invisible Hunt.
3. Expand the small bottom-right **G4** recorder → **Start**. Move/aim/cast/fight for 5–10 minutes. Verify sprite edge sharpness and consistent school VFX, stable camera, ground detail, footprints/occlusion, unlit areas, shadows and absence of flicker or black frames.
4. Open the recorder → **Stop** → **Export JSON** (or **Copy summary** if the download is unavailable). Take an actual gameplay screenshot, preferably in a well-populated moment. Note battery percent, perceived device warmth, stalls and input lag.
5. Repeat the same flow on the **Canvas comparison** URL with similar game actions. Do not claim the browser FPS difference is controlled without a matched scene/seed. Repeat on the other platform if available.

## Evidence to return

Provide the GPU and Canvas JSON reports, one regular screenshot from each, iOS/Android model/browser/version, observed heat and battery change, and explicit **"GPU visuals approved"** or **"GPU visuals rejected"** with the reason. A brief moving video is useful for stutters and occlusion if practical.

The JSON measures **requestAnimationFrame timing** (p50/p95/p99; per-minute warm-up trends), sampled CPU submission and GPU-upload counts, renderer-fallback/missing frames and runtime errors. It cannot measure genuine GPU time, GPU VRAM, GPU temperature, battery power draw or thermal throttling directly. Those require physical instrumentation or user observations.

The G4 milestone remains **unaccepted** until mobile visual quality and sustained real iOS/Android performance meet agreed budgets. G5 default renderer cutover, the painted Town, AN0–AN6 and the AI/Arena engines are independent and unaffected.
