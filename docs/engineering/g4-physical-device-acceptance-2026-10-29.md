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
2. **Before any game menus**, the G4 test page shows one full-screen choice: **Share performance results privately** or **Keep private on this phone**. Tap either button once. Nothing uploads without the first choice. There are no sharing controls hidden in the Hunt. After the choice, start **Free Play → First Hunt** and verify the mage, enemies, ground and spell lighting are visible. A near-black scene with an operating HUD is a failed visual gate.
3. **Recording starts automatically in the real Hunt** whenever the G4 review URL is used. Move/aim/cast/fight for 5–10 minutes or until death. Verify sprite edge sharpness, ground detail, occlusion, lighting and absence of black frames. You do not need to press Start.
4. **On death, victory or navigation, G4 keeps the last timing summary on the phone.** It also checkpoints measurements locally every five seconds. The compact bottom-right G4 panel survives the destroyed Hunt screen and displays the last run's frame rate and p95. There is no JSON export step.
5. With **Share performance results privately** selected on the first screen, a compact, privacy-allowlisted timing report is sent after each Hunt. With **Keep private on this phone**, nothing uploads. Every new G4 test-page load shows this one choice again, so you can change it without entering a Hunt. No raw device user-agent, exact viewport, per-frame traces or movement coordinates are uploaded; accepted collector reports are retained for up to 30 days.
6. Take an actual gameplay screenshot if judging graphics, and note battery percent, perceived device warmth, stalls and input lag.
5. Repeat the same flow on the **Canvas comparison** URL with similar game actions. Do not claim the browser FPS difference is controlled without a matched scene/seed. Repeat on the other platform if available.

## Evidence to return

No file export is required. With private delivery consent enabled, the frame pacing summary goes directly to the existing WyrmForge playtest collector and remains visible on the phone after the Hunt. Send one genuine gameplay screenshot for visual approval and say **"GPU visuals approved"** or **"GPU visuals rejected"**, with any visible issues. If the collector cannot be reached, the local last-run summary remains on the phone. Performance, battery and thermal device acceptance are separate human observations.

The JSON measures **requestAnimationFrame timing** (p50/p95/p99; per-minute warm-up trends), sampled CPU submission and GPU-upload counts, renderer-fallback/missing frames and runtime errors. It cannot measure genuine GPU time, GPU VRAM, GPU temperature, battery power draw or thermal throttling directly. Those require physical instrumentation or user observations.

The G4 milestone remains **unaccepted** until mobile visual quality and sustained real iOS/Android performance meet agreed budgets. G5 default renderer cutover, the painted Town, AN0–AN6 and the AI/Arena engines are independent and unaffected.
