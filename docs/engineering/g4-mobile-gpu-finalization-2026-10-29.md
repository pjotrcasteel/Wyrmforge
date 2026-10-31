# G4 mobile GPU optimization — 29 October 2026

Canonical scope: [roadmap G4 / G5](../canon/roadmap.md). Implementation branch: [PR #409](https://github.com/pjotrcasteel/Wyrmforge/pull/409), stacked on the ongoing shared LightingEngine/Hunt integration [PR #381](https://github.com/pjotrcasteel/Wyrmforge/pull/381).

## Non-negotiable boundaries

G4 optimizes the **single shared LightingEngine** for mobile-first 2.5D pixel-art rendering. G5 separately owns production Hunt renderer adoption and mandatory real moving-Hunt/owner approval. G4 does not authorize default GPU enablement, a new GPU/Canvas lighting engine, runtime 3D meshes, a Town relighting/replacement project, AN0–AN6 changes, or gameplay/AI ownership changes. Until signoff, keep the painted Town and default Canvas Hunt.

## This code checkpoint

- The normal Hunt GPU Canvas consumes its WebGL frame immediately. For **that opt-in adapter only**, request a non-preserved WebGL drawing buffer; the generic lighting lab keeps its original preserved-buffer behavior.
- Sample both the CPU capture-to-texture input and the WebGL-to-game-Canvas output with nearest-neighbor filtering. A 320px GPU frame composited at 390px must retain discrete sprite pixels, not use Canvas interpolation; all Canvas state is restored after rendering or failure.
- Retired scratch-canvas LRU entries and final pool disposal release bitmap backing memory immediately by resetting dimensions. Keep the existing four-size cap and correct render/camera transforms.
- The first cloister-only cache does **not** cover the four observed expensive wall resources in the real-Hunt proof: those are **territory masonry with animated lit/dim runes**. A subsequent correction now computes their exact discrete rune-frame state using the **same rune-state function as the existing wall painter**, retaining smooth time progression but reusing the GPU texture between lit/dim transitions. The revision includes wall geometry, world size, biome style, school and authored atlas generation. Gate opening/removal and changing rune appearance invalidate normally; unrelated animated foliage and VFX remain dynamic.
- The earlier successful real-Hunt proof showed four territory wall uploads totaling **722,500 / 883,600 / 810,000 px** in the 320/mobile, 390/balanced and 390/mobile sampled frames respectively, about **58–63%** of the dynamic upload budget. This is an addressable cost, **not an achieved saving**: actual rune transitions still repaint and benchmark scenes differ. See [prior measured proof run 40895370603](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40895370603).
- The existing renderer-owned mobile/balanced/high shadow/light tiers, authoritative C# light IDs, source expiry, static-capture revisions, diagnostics, texture-upload accounting and fallback remain in place.
- Node regressions specifically exercise buffer policy, sampling, Canvas state restoration, invalid quality, released staging pixels, source-revision invalidation and unchanged art.

This slice is a **measurable mobile-renderer improvement attempt**, not proof of improved FPS, GPU time, battery life, or total VRAM usage. The desktop-hosted Chromium 390px baseline in PR #381 was roughly 1.4–1.5 million dynamic pixels uploaded per frame and poor CPU submission frame time. The new rune-state-aware territory wall cache should reduce repeated uploads in comparable wall-heavy Hunts between actual animated frame changes, and its repeated-upload reduction is now confirmed in Chromium; moving actor artwork remains legacy Canvas-captured pending G5 asset adoption.

## Exact-head Chromium proof — completed

The implementation head `95d2b507855c1eb79de12ac287b50146fb159551` passed [shared-GPU proof 40932535977](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40932535977) and [Gothic Night review 40932535989](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40932535989). Genuine moving-Hunt diagnostic artifacts were compared with the passed pre-rune-cache proof [40929996097](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40929996097).

| Chromium viewport | Before texture pixels/frame | With rune-aware cache | Reduction | Before sample FPS | After sample FPS |
| --- | ---: | ---: | ---: | ---: | ---: |
| 320 mobile | 1,160,822 | 286,784 | 75.3% | 36 | 44 |
| 390 balanced | 1,434,762 | 408,584 | 71.5% | 18 | 18 |
| 390 mobile | 1,383,150 | 629,484 | 54.5% | 18 | 20 |

The final capture's top-five uploads contained **no territory wall** at 320/mobile or 390/balanced; the 390/mobile sample contained exactly one wall experiencing an actual rune transition. Other 320/390 browser smoke, true shadow/zero-light assertions, and the .NET browser test build passed. The comparison uses different randomly generated Hunt seeds, gameplay state and CI load; it demonstrates removed repeated uploads, **not a controlled FPS uplift**. GPU timing, VRAM and thermals are not measured by this evidence, and production G5 render adoption remains deliberately opt-in.

## Acceptance / evidence checklist (not all satisfied)

1. Verify exact-head JS regressions, .NET build, WebGL black-world/shadow/emissive proof and real 320/390px opt-in Hunt/browser smoke. Prefer CI artifacts containing actual full-frame screenshots and unmodified pixel crops over lab illustration.
2. Compare default Canvas vs opt-in GPU **in the same running Wet Forest Hunt**, including mage, Hollowed/Ashling, foliage, wet ground, stationary lantern/source, moving Fireball, cast and receive occlusion, zero world light, zoom/camera travel, atlas transitions, telegraphs, FPS and top texture uploads. Look for silhouettes, nearest sampling, light leaks and stale/blank frames.
3. Collect iOS Safari and Android Chrome **on real representative devices**, for the same sustained interaction: frame-time distribution, input latency, CPU submission, GPU time (when available), actual GPU/heap memory, battery/power and thermal throttling. The existing JS diagnostics are approximate and are **not a GPU timer query or hardware power meter**.
4. Record before/after measurements against agreed device budgets; if the non-preserved compositing path fails on a target browser, revert/guard that optimization instead of hiding a blank framebuffer behind fallback or declaring success.
5. Keep G4 unaccepted until native mobile source/art sampling, quality tiers, culling and physical performance evidence pass. Keep G5 adoption/production switch separate and on the original draft branch.

## Status

Code is committed on PR #409; the exact functional head has passed [run 40932535977](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40932535977). This document makes no physical-device or visual owner-approval claim. No cross-engine changes.


## G4 finishing pass: main-ground cache and shadow-camera CPU churn — 30 October 2026

Two generic renderer-level issues remained after the iPhone projection fix:

1. **Tile-free GPU preview was not truly tile-free.** `drawArenaEnvironment`
   accepted `flatColorsOnly` but passed **no** such argument to the main
   `terrainTexture()` call. Other same-frame consumers (reflections and
   elevation layers) requested the flat terrain. This could maintain both a
   **full-size painted floor and flat floor cache simultaneously**, loading
   painted material images and paying for additional terrain preparation
   even though G4's selected floor was `flat-ground-v1`. The main world draw
   now passes the flag, using the same world cache as reflections/elevations.
   The explicit `g4PaintedGround=1` comparison and normal Canvas production
   painted floor remain unchanged.
2. **Redundant shadow-camera projection updates.** Every applied C# lighting
   frame rebuilt the perspective/orthographic projection of every selected
   point/spot/directional source, even with an unchanged radius. The shared
   `LightingEngine` now initializes new shadow cameras once and updates
   their projection only if the authoritative light range changes. This
   preserves dynamic caster movement, source identity, light expiry, shadows
   and all quality-tier view limits. A regression exercises 120 same-radius
   frames, a changed projectile range, and all three light classes.

3. **Avoid allocating new fog on every frame.** Dynamic fog near/far and
   its environment-tinted color now update the existing Three.js fog object
   instead of reconstructing fog and temporary colors for every GPU snapshot.
   The zero-ambient diagnostic still disables fog entirely, and subsequent lit
   worlds can re-enable it. This does not add atmospheric lighting or override
   the existing Gothic Night balance.

This removes redundant CPU work and a source-art cache path; **it does not
demonstrate any particular iPhone FPS uplift or GPU-time saving**. The Hunt
still rasterizes and uploads dynamic layers when they actually change.
Run the shared GPU browser proof and pinned Pages release validation, then
compare real-device p95/FPS against prior iPhone evidence. Ashling-eye
emissive work remains explicitly **outside this branch**.

**G4 acceptance:** The user's current iPhone screenshot establishes that
native actor proportions are visually restored, but Android thermal/power,
sustained device performance, Trail 2 darkness, and Fireball/Hollowed lighting
checks remain separate open gates. Do not close G4 or enable G5 production GPU
based only on hosted Chromium checks.


## Rejected iPhone G4 preview and shadow/frame repair gate — 30 October 2026

The owner **rejected** the public `g4-preview` build pinned at
`0fc77a0`: shadows were not visible and tearing returned. The rollback
workflow still automatically selected tile-free ground when `arenaGpu=1`;
that published version must not be described as a verified working candidate.
The later draft #381 restores painted terrain by default, but remains unmerged.

[Draft repair PR #441](https://github.com/pjotrcasteel/Wyrmforge/pull/441)
stacks only on the existing G4 branch. Its G4 reviewer now stages all GPU,
terrain, actors, overlays and UI on an offscreen 2D surface before one final
visible frame presentation. `g4StageFrames=0` remains a deliberate A/B
opt-out; production Canvas and the later G5 default are unchanged.

A new **same-frame shadow pixel differential** temporarily disables one
actual C#-authored GPU light's shadow after a frame render, reads pixels
with/without that single shadow, then restores and re-renders the untouched
presentation state. The real 390px Fireball browser proof now requires at
least 64 visibly changed pixels, instead of merely counting shadow views.
The comparison introduces no synthetic lights/casters or gameplay changes.

**Unaccepted:** PR #441's exact-head JS/.NET/WebGL workflow must pass, its
authentic live-Hunt captures need visual review, and physical iOS Safari must
show readable terrain, visible moving shadows and stable fully presented frames.
Desktop-hosted Chromium and a WebGL-disabled cloud browser cannot substitute
for owner iPhone acceptance. Keep G4 draft, never silently merge to production,
and keep Town/AI/animation/physics unchanged.
