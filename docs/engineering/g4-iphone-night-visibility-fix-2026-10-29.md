# G4 failed iPhone visual gate — night Hunt readability, 29 October 2026

## Evidence and reproduced symptom

The owner supplied **two actual Safari/iPhone screenshot captures** of the publicly deployed G4 preview at `v0.0.180 · d594948`. One shows first-Hunt entry with working HP/stage HUD over a solid-black world; the other shows Bell Warden combat with faint orange ground scratches/spell fragments but invisible player and background. **Owner visual acceptance is rejected.**

The matched Chromium `Shared GPU lighting proof` build screenshot `live-hunt-shared-gpu-390-mobile.png` in [run #40942220802](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40942220802) also shows almost total blackness outside a small orange spell patch. Existing Chromium validation checked nonblack peak pixels, not sustained readable player/terrain; that was insufficient.

Root causes supported by code: the authoritative C# Hunt GPU snapshot previously contained ambient night `0.012` and transient spells/impact lights **but no hunter visibility emitter**. Existing Canvas Gothic-night rendering applies an authored player-near visibility radius and relief, omitted by GPU. Additionally, iPhone WebKit was being asked to copy an offscreen WebGL canvas whose drawing buffer was not preserved, a portability risk on Apple mobile; this is not asserted to be the cause of the independently reproduced Chromium darkness.

## Repair limited to one lighting engine

- C# `HunterVisibilityLightingProjection` emits a single identity-stable, non-shadow-casting cool moon/visibility light at the authoritative moving hunter position. The renderer consumes it using the **same normal LightingSnapshot → shared LightingEngine** flow as every existing source. This matches the already-shipped Canvas-player visibility intent without making the whole world daytime, bypassing materials, or fabricating independent JavaScript lights.
- Preserve the Hunt WebGL copy buffer on iPhone/iPad WebKit only; the Android/desktop `preserveDrawingBuffer=false` optimization remains in effect. Pixel sampling is still nearest.
- Keep G4 review UI below the combat HUD in a minimal REC pill.
- Add source/identity/zero-light C# tests, iPhone UA buffer-policy tests, and **real running-Hunt native 320/390px Canvas pixel-readability proof**. The test verifies that the GPU has the hunter source and enough visible lit pixels around the player, instead of accepting a glowing projectile alone.

## Acceptance left open

- Required: passing exact-head build, unit tests, real-Hunt browser screenshots and proof.
- Required: deploy the new **pinned commit** only to existing public Pages `/Wyrmforge/g4-preview/`; keep the live `/Wyrmforge/` Canvas default unchanged.
- Required: owner tests **same direct HTTPS G4 Pages URL on iPhone Safari**, supplies a new screenshot and whether the moving world, mage/foes, collision depth, active effects and 5–10 minute performance are acceptable. Android Chrome physical validation remains open.
- **G4 cannot be marked accepted from the code change alone**, and G5 remains separate. No AN0–AN6/AI/AR/painted Town changes.
