# G4 mobile GPU optimization — 29 October 2026

Canonical scope: [roadmap G4 / G5](../canon/roadmap.md). Implementation branch: [PR #409](https://github.com/pjotrcasteel/Wyrmforge/pull/409), stacked on the ongoing shared LightingEngine/Hunt integration [PR #381](https://github.com/pjotrcasteel/Wyrmforge/pull/381).

## Non-negotiable boundaries

G4 optimizes the **single shared LightingEngine** for mobile-first 2.5D pixel-art rendering. G5 separately owns production Hunt renderer adoption and mandatory real moving-Hunt/owner approval. G4 does not authorize default GPU enablement, a new GPU/Canvas lighting engine, runtime 3D meshes, a Town relighting/replacement project, AN0–AN6 changes, or gameplay/AI ownership changes. Until signoff, keep the painted Town and default Canvas Hunt.

## This code checkpoint

- The normal Hunt GPU Canvas consumes its WebGL frame immediately. For **that opt-in adapter only**, request a non-preserved WebGL drawing buffer; the generic lighting lab keeps its original preserved-buffer behavior.
- Sample both the CPU capture-to-texture input and the WebGL-to-game-Canvas output with nearest-neighbor filtering. A 320px GPU frame composited at 390px must retain discrete sprite pixels, not use Canvas interpolation; all Canvas state is restored after rendering or failure.
- Retired scratch-canvas LRU entries and final pool disposal release bitmap backing memory immediately by resetting dimensions. Keep the existing four-size cap and correct render/camera transforms.
- A newly whitelisted immutable cloister masonry capture revision caches the unchanged wall bitmap: 4 wall cutouts shown in the prior successful Chromium proof were **180,625 px each at 320/mobile, 220,900 px each at 390/balanced, and 202,500 px each at 390/mobile**, all repainted and reuploaded every frame before this change. Caching those four specific objects would remove 722,500 / 883,600 / 810,000 uploaded pixels per comparable frame respectively (**~58–63% of those measured baseline-frame uploads**), if scene contents are otherwise identical. Those are **potential reductions inferred from actual previous-head evidence, not measured post-change results**; artifact [prior proof run 40895370603](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40895370603). Wall kind, geometry and world dimensions invalidate; dynamic territory masonry and forest props stay uncached.
- The existing renderer-owned mobile/balanced/high shadow/light tiers, authoritative C# light IDs, source expiry, static-capture revisions, diagnostics, texture-upload accounting and fallback remain in place.
- Node regressions specifically exercise buffer policy, sampling, Canvas state restoration, invalid quality, released staging pixels, source-revision invalidation and unchanged art.

This slice is a **measurable mobile-renderer improvement attempt**, not proof of improved FPS, GPU time, battery life, or total VRAM usage. The desktop-hosted Chromium 390px baseline in PR #381 was roughly 1.4–1.5 million dynamic pixels uploaded per frame and poor CPU submission frame time. The static wall cache should reduce that upload count in comparable wall-heavy Hunts, but exact-head frame capture and measurement are pending; moving actor artwork remains legacy Canvas-captured pending G5 asset adoption.

## Acceptance / evidence checklist (not all satisfied)

1. Verify exact-head JS regressions, .NET build, WebGL black-world/shadow/emissive proof and real 320/390px opt-in Hunt/browser smoke. Prefer CI artifacts containing actual full-frame screenshots and unmodified pixel crops over lab illustration.
2. Compare default Canvas vs opt-in GPU **in the same running Wet Forest Hunt**, including mage, Hollowed/Ashling, foliage, wet ground, stationary lantern/source, moving Fireball, cast and receive occlusion, zero world light, zoom/camera travel, atlas transitions, telegraphs, FPS and top texture uploads. Look for silhouettes, nearest sampling, light leaks and stale/blank frames.
3. Collect iOS Safari and Android Chrome **on real representative devices**, for the same sustained interaction: frame-time distribution, input latency, CPU submission, GPU time (when available), actual GPU/heap memory, battery/power and thermal throttling. The existing JS diagnostics are approximate and are **not a GPU timer query or hardware power meter**.
4. Record before/after measurements against agreed device budgets; if the non-preserved compositing path fails on a target browser, revert/guard that optimization instead of hiding a blank framebuffer behind fallback or declaring success.
5. Keep G4 unaccepted until native mobile source/art sampling, quality tiers, culling and physical performance evidence pass. Keep G5 adoption/production switch separate and on the original draft branch.

## Status

Code is committed on PR #409; GitHub GPU proof for the initial test head: [run 40929350507](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40929350507). Check its **conclusion and exact SHA** before relying on it. This document makes no physical-device or visual owner-approval claim. No cross-engine changes.
