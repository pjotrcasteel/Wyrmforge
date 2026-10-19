# Refuge buildings — shared Active / Vacant artwork states (19 October 2026)

## Scope

Implement the approved two-state town art *in the real Blazor game*, not as a detached screenshot. The common contract is `TownBuildingVisuals.Resolve` in `Features/Forge/TownBuildingVisuals.cs`. A building independently has either **Active** or **Vacant** according to its existing authoritative unlock predicate. Touch targets and the lock notice follow the same flags.

| Building | Vacant image | Active image | Unlock |
| --- | --- | --- | --- |
| Arcane Nexus | `town-vacant-nexus.webp` | base town panorama | complete first hunt |
| Blacksmith | base panorama + `town-vacant-forge.webp` smoke-removal layer | clipped original `refuge-town-panorama.png` | secure first Essence |
| Codex | `town-vacant-codex.webp` | base town panorama | complete first hunt |
| Hall of Fame | `town-vacant-legends.webp` | base town panorama | complete two hunts |
| World Gate | never vacant | unchanged base panorama | always active |

The images are pixel-aligned, full-resolution 2172×724 source art layers and use the shared `town-building-layer` CSS, with a single state attribute. The original architecture, banners, camera position and walkable public square do not change. No global black, gray, blurred or backdrop-filter layer may be introduced.

## Generating a truly unpowered building

`tools/art/build_town_vacancy.py` is the single authoring implementation for all four dormant plates. Every plan supplies an authored building outline and local light/figure coordinates; **the algorithm is shared**. It performs neighboring-paint texture transfer for characters, and removes high-intensity orange, violet, white, **blue and cyan** emissive highlights from lamps, windows, sigils and stall props. It preserves the underlying brushwork. When a building becomes active, its vacant painted layer is no longer rendered; no runtime tint or per-frame Canvas CPU work occurs.

To regenerate after editing source artwork: `python -m pip install Pillow numpy opencv-python-headless`, then `python tools/art/build_town_vacancy.py`. Commit the four generated `wwwroot/art/town-vacant-*.webp` files and the combined art proof at `docs/art/previews/refuge-closed-2026-10-19.webp`. Keep the artist-facing code and shipped binary files together.

The desired vacant treatment matches the user's approved phone reference: no magic bottles radiating light, no fire or worker, closed/inert facade and darkened light sources, without losing architectural readability.

## Validation

- Both starting and veteran progression states must have the correct independently switched layers, with the same `active / vacant` semantics for hotspots.
- A locked location remains tappable **only to explain the unlocking requirement**, with no door-open sound, navigation or magic glow.
- Every dormant plate has the native panorama dimensions and alpha outside its building. World Gate and other buildings are never dimmed by a neighboring plate.
- Capture portrait 320px / 390px views of all three town slices and evaluate the dormant/active transitions. Native iPhone Safari acceptance is still a human visual checkpoint; browser CI alone does not certify the physical device.

### Delivery record

Feature branch: `feature/shared-town-building-visual-states`; version 0.0.130. The art outputs and workflow evidence must be checked before merging to main.

## 0.0.131 — device review correction

The phone screenshots identified baked-in smoke at the Nexus chimney, light still visible in wall-mounted sconces and windows, a lit Codex brazier, and smoke on other locked chimneys. Merely reducing blue magic in 0.0.130 was not sufficient. The artist's shared generator now has localized `smoke`, `cold_sources` and `cold_flames` controls for each building, sharing one processing algorithm. To avoid the black ovals and blurred brown smears rejected during QA, source cores are intensity-gated and chimney plumes are feathered with neighboring original texture. A separate Forge vacant plate suppresses its chimney smoke without changing the always-lit World Gate or occupied Forge.

The native 2172×724 combined proof is `docs/art/previews/refuge-closed-2026-10-19.webp`. The coordinate-map debug proof was used for matching user-circled sources and is not loaded at runtime. Game assets use ?v=131 to avoid stale Safari WebP caching. Mobile browser regressions must assert four vacant plates, the previous unlock notices, and independent occupied restoration. Native iPhone approval remains a manual device check.
