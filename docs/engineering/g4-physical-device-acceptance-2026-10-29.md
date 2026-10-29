# G4 — real iOS / Android GPU acceptance (review protocol)

**Scope:** universal G4 mobile GPU profiling only, under existing shared LightingEngine draft [#381](https://github.com/pjotrcasteel/Wyrmforge/pull/381). The G5 production renderer cutover, painted Town, AN0–AN6 animation, C# simulation, gameplay and Arena Generator remain unchanged.

The G4 `?g4Review=1` panel appears **only in a real playable Hunt**. It is not a synthetic GPU lab or AI illustration. The panel reads real animation-frame timestamps, source renderer diagnostics and bounded 1Hz texture-upload samples. Normal gameplay does not load any recording panel.

## Get the actual experimental build onto your phone

**Do not test GitHub Pages `main` for G4 yet:** G4 is in a draft branch and the GPU opt-in code is not released to Pages.

1. Open [G4/G5 PR #381](https://github.com/pjotrcasteel/Wyrmforge/pull/381) → **Checks** → the newest green **Browser smoke** run → **Playable preview (available before browser tests)** → **Artifacts**. Download the `wyrmforge-playable-preview` ZIP from that exact **latest-head** run. An older ZIP can omit the reviewer.
2. Extract the ZIP on a Windows PC and open PowerShell **inside the extracted folder** containing `preview_server.py` and `wwwroot`. Check the ZIP really contains `wwwroot/js/lighting/g4-device-review.js`.
3. Run `py -3 .\preview_server.py --directory .\wwwroot --host 0.0.0.0 --port 4173`. This binds **only for a trusted private Wi-Fi / LAN**. Approve Windows Defender firewall access **Private networks only**, never Public networks.
4. Find your PC's IPv4 address via PowerShell: `Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254*' -and $_.IPAddress -notlike '127.*' } | Select-Object InterfaceAlias,IPAddress`. Your phone and PC must be on the same trusted Wi-Fi, with client isolation disabled.
5. On the physical phone, use the URL patterns below, substituting your actual PC IPv4 address for `PC-IP`:

   - **GPU mobile candidate:** `http://PC-IP:4173/?arenaGpu=1&gpuQuality=mobile&g4Review=1`
   - **Existing Canvas reference:** `http://PC-IP:4173/?g4Review=1`
   - **Optional GPU balanced stress comparison:** `http://PC-IP:4173/?arenaGpu=1&gpuQuality=balanced&g4Review=1`

The Playable preview is a real offline-built web app. The server must remain running on the PC while the phone accesses it; you do not need to push anything to `main`. If the phone cannot connect, check PC firewall and local Wi-Fi isolation. **Never port-forward port 4173 to the internet.**

## Device review — exactly what to do

For each available target, **iPhone Safari** and **Android Chrome** (actual hardware; desktop device emulation does not count):

1. Record model, OS/browser version, battery %, battery-saving/reduced-motion settings, approximate room temperature, whether plugged in (prefer unplugged), and whether the phone is cold or already warmed up.
2. Open **GPU mobile candidate** above in portrait. Launch **Free Play → First Hunt**, verify it is a real moving game with mage, terrain and enemies. Tap **G4 PHONE TEST** (top right) → **Start**. The panel collapses so it does not block gameplay.
3. Move, turn, cast and fight for **5–10 minutes**: inspect mage and Hollowed/Ashling feet, spell lighting, fixed lamps, wall/tree occlusion, cutout shadows, wet ground, moving Fireballs, animation/atlas pixel clarity, aim sigil and low-light readability. Watch for black frames, flickering unrelated lights, fuzzy pixels, double-lit Canvas effects, loss of controls or device overheating.
4. Tap **G4 PHONE TEST** → **Stop** → **Export JSON** (or **Copy summary** if download is unavailable). Capture one **normal gameplay** screenshot and, where possible, a short moving screenshot/video. Note battery % at finish, device warmth and obvious slowdowns.
5. Repeat with the **Canvas reference** on the **same phone**, as similar a scene/actions as reasonably practical. These are *not seed-matched controlled experiments*; avoid deriving causal FPS gains from one run.
6. Repeat on the other phone platform if available. If both phones are unavailable, mark the relevant hardware gate **unverified**, not failed or passed.

The G4 JSON contains `observedFps`, p50/p95/p99 **browser frame intervals**, **per-minute FPS and p95 pacing** for detecting degradation as the phone warms, proportion over 33ms, missed GPU frames, render errors, texture-upload samples, quality tier, dimensions and DPR. It explicitly does **not** measure GPU execution, true VRAM, battery draw, power draw or thermal state; battery/heat must be recorded separately.

## What to send for explicit acceptance

Provide **the iOS and Android JSON files, a normal gameplay screenshot from each GPU session, a short video of light/shadow movement if practical, and a one-sentence judgment: "GPU visual quality approved / rejected" plus any problems.** Include phone model/browser, battery % before/after and whether it became uncomfortably warm. If you own only one platform, specify which platform is missing.

**Acceptance must explicitly cover:** native 2.5D pixel sharpness, readable active magic and silhouettes at 320/390px, correct moving source/explosion response, occluder/sprite feet ordering and no double full-bright bypass, a functioning original Canvas fallback, no unacceptable gameplay hitches, and sustained real phone performance. Recording download artifacts alone is *not* owner visual approval. A green Chromium CI run does not fill in iOS/Android evidence. A low-light dark screenshot should be reviewed as actual art, not assumed correct because zero-light tests pass.

Keep this G4 milestone and #381 draft until physical acceptance; **G5 is separate** and cannot be auto-merged through G4 review.
