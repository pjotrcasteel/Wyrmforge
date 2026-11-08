# Hollowed H3 — grounded footsteps and emergence

Source: user-supplied `FX (2)(1).zip`, PVFX Foundry strict:
`effects/smoke/dust-puff/strict/grid/sprite-sheet.png`.
Source SHA-256: `9282f6c04ebf9b23f994ece611e16a6f0787f21fdd6b54adc290d2fd58d35e2a`.
Runtime SHA-256: `397dff03baa3377fefad423e376f1f21aa0dd3a44bce0bf6d36bc159456fff58`.
License: **CC0 1.0 Universal** (PVFX Foundry / Pixel VFX Studio).

The first 8 strict source frames are nearest-neighbor downsampled from 72×40 to 36×20 and exactly remapped into **soil, ash and stone** Gothic pixel palettes (three rows, 288×60). The lossless 4-bit indexed PNG is 2,376 bytes. The source animation's geometry and frame order are retained.

`hollow-ground-vfx.js` is a *presentation-only adapter*: it consumes the existing Hollowed animator's travelled distance, current authoritative enemy snapshot, C# `emergeProgress` and read-only C# terrain material frame. The 16.64-unit half-stride matches `HOLLOW_RUN.stride / 2`. Real snapshots can emit one foot scrape on each completed half-stride, alternating feet. Repeated render frames, standing still, attack, freeze, pause, teleport resets and emergence never create false footstep events. A maximum of 40 short-lived puffs exists per scene; particles expire in 0.42 seconds.

An emerging Hollowed instead displays a **single restrained loose-earth puff** behind its *already authored* crawl-out animation, alongside the existing flying chips. It does not replace, modify, rerender or procedurally reconstruct the two owner-approved C#-timed crawl-out clips. On soil it is muted, on ash smokier, on stone cool grey, and on lava absent. The position uses the actual C# ground height (`raisedActor`), the same depth-sorted Canvas/GPU actor pass and existing terrain occlusion; it NEVER changes the terrain cache, VFX lighting, collision, combat, drops or progression.

Lab comparison: `/enemy-lab?kind=Hollow&count=3&autoplay=false&cast=false` and toggle **Hollowed ground VFX** on/off. For footstep inspection enable Movement agent or move away from the Hollowed; `count=8` for GPU/stress. C# field ambush is the authoritative way to test the two existing emergence animations in real Hunts.

Tests: `node --test tests/javascript/hollow-ground-vfx.test.mjs` covers distance/duplicate/freeze/attack/pause gating, 3 terrain palettes and lava, emergence, deterministic replay reset, 64-Hollowed budgets, PNG integrity and nearest-neighbor draw.
