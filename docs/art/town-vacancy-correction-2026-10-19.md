# Refuge town vacant buildings — 19 October 2026

## Regression corrected

PR #131 added opaque black shapes, backdrop filters and feathered masks over locked buildings. They covered parts of the town and never removed people or actual lights. They have been removed.

The town now has a real image-based state for **each** of Arcane Nexus, Codex and Hall of Fame, parallel to the existing blacksmith treatment. Each initially locked building shows its own transparent, pixel-aligned vacant plate. The scene switches to the unchanged occupied/lit painting when that building unlocks. The World Gate stays unlocked and visually unchanged.

## Committed runtime artwork

- `src/Wyrmforge.Presentation.Web/wwwroot/art/town-vacant-nexus.webp`
- `src/Wyrmforge.Presentation.Web/wwwroot/art/town-vacant-codex.webp`
- `src/Wyrmforge.Presentation.Web/wwwroot/art/town-vacant-legends.webp`
- [Full dormant town visual proof](previews/refuge-closed-2026-10-19.webp)

All plates are exactly 2172×724 RGBA WebP. Their alpha boundaries replace only the appropriate building and immediate doorway; there are **no** CSS brightness, grayscale or backdrop-filter effects. Dormant plates contain edited pixels with painted figures removed by neighboring-texture transfer and warm/violet emission locally extinguished. Lighting in the always-open town gate and its public courtyard is intentionally preserved.

`tools/art/build_town_vacancy.py` is the retained editable source pipeline. Install `pillow numpy opencv-python-headless` in a Python environment and run `python tools/art/build_town_vacancy.py` if the approved original panorama changes. Keep the committed generated runtime plates in sync.

## Behavior and verification

- Before unlock: Nexus, Codex and Hall of Fame are individually vacant, visually altered in the image assets, and not clickable. The vacant blacksmith stays as before.
- After unlock: only the relevant building switches back to the lit and populated painting; hotspot is enabled.
- The World Gate, central characters, architecture, camera proportions and swipeable left/center/right town panels are unchanged.
- Browser regressions check matching plate paths, loaded native dimensions, absence of black backdrop filters, locked hotspots and the fully unlocked case.
- CI and code checks run on the PR. The full-town proof was inspected at native panorama scale. Physical iPhone Safari swipe/crop is not yet independently tested and should be confirmed during normal device QA.

This is the actual implementation rather than a proposal. If any remaining light source or texture-transfer artifact is noticed on a phone, correct the precise building's `lamps` / `figures` coordinates in the source script; never reintroduce a black cover.
