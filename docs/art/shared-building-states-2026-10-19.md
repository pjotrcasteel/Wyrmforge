# Refuge buildings — shared Active / Vacant artwork states (19 October 2026)

## Scope

Implement the approved two-state town art *in the real Blazor game*, not as a detached screenshot. The common contract is `TownBuildingVisuals.Resolve` in `Features/Forge/TownBuildingVisuals.cs`. A building independently has either **Active** or **Vacant** according to its existing authoritative unlock predicate. Touch targets and the lock notice follow the same flags.

| Building | Vacant image | Active image | Unlock |
| --- | --- | --- | --- |
| Arcane Nexus | `town-vacant-nexus.webp` | base town panorama | complete first hunt |
| Blacksmith | existing vacant base panorama | clipped original `refuge-town-panorama.png` | secure first Essence |
| Codex | `town-vacant-codex.webp` | base town panorama | complete first hunt |
| Hall of Fame | `town-vacant-legends.webp` | base town panorama | complete two hunts |
| World Gate | never vacant | unchanged base panorama | always active |

The images are pixel-aligned, full-resolution 2172×724 source art layers and use the shared `town-building-layer` CSS, with a single state attribute. The original architecture, banners, camera position and walkable public square do not change. No global black, gray, blurred or backdrop-filter layer may be introduced.

## Generating a truly unpowered building

`tools/art/build_town_vacancy.py` is the single authoring implementation for all three dormant plates. Every plan supplies an authored building outline and local light/figure coordinates; **the algorithm is shared**. It performs neighboring-paint texture transfer for characters, and removes high-intensity orange, violet, white, **blue and cyan** emissive highlights from lamps, windows, sigils and stall props. It preserves the underlying brushwork. When a building becomes active, its vacant painted layer is no longer rendered; no runtime tint or per-frame Canvas CPU work occurs.

To regenerate after editing source artwork: `python -m pip install Pillow numpy opencv-python-headless`, then `python tools/art/build_town_vacancy.py`. Commit the three generated `wwwroot/art/town-vacant-*.webp` files and the combined art proof at `docs/art/previews/refuge-closed-2026-10-19.webp`. Keep the artist-facing code and shipped binary files together.

The desired vacant treatment matches the user's approved phone reference: no magic bottles radiating light, no fire or worker, closed/inert facade and darkened light sources, without losing architectural readability.

## Validation

- Both starting and veteran progression states must have the correct independently switched layers, with the same `active / vacant` semantics for hotspots.
- A locked location remains tappable **only to explain the unlocking requirement**, with no door-open sound, navigation or magic glow.
- Every dormant plate has the native panorama dimensions and alpha outside its building. World Gate and other buildings are never dimmed by a neighboring plate.
- Capture portrait 320px / 390px views of all three town slices and evaluate the dormant/active transitions. Native iPhone Safari acceptance is still a human visual checkpoint; browser CI alone does not certify the physical device.

### Delivery record

Feature branch: `feature/shared-town-building-visual-states`; version 0.0.130. The art outputs and workflow evidence must be checked before merging to main.
