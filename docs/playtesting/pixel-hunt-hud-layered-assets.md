# Pixel Hunt HUD — modular, runtime-driven art

## Art contract
- `orb-frame.svg`: transparent-center, native 64×64 pixel-grid bronze/obsidian frame. Shared by both orbs.
- `health-liquid.svg`: 48×48 red crystal facets *without* HP numbers. Drawn at fixed size, then clipped by `--health-unfilled` (0% full, 100% empty).
- `resource-empty.svg`: 48×48 muted violet *empty* interior. No mana/resource gauge or fake numerical value.
- `spell-frame.svg`: transparent-center native 48×48 frame.
- `spell-fireball.svg`, `spell-ward.svg`, `spell-locked.svg`: native 32×32 pixel art, independent of cooldown.
- `xp-frame.svg`: native 32×16 nine-slice bronze track. Purple EXP fill is a separate element.

All art uses finite integer pixel regions and `shape-rendering="crispEdges"`. The in-game CSS uses `image-rendering: pixelated` and never scales health artwork vertically as HP changes.

## Data wiring
- Simulation HUD health and maxHealth -> `healthCrystalPresentation` -> `--health-unfilled`, text, ARIA state.
- Simulation primary and contextual spell descriptors -> `createSpellBadge` -> relevant art (non-Fire schools use existing school atlas).
- Simulation cooldown durations and remaining times -> existing `cooldownPresentation` -> pie shade and refill ring.
- Simulation level and experienceToNext -> level text and EXP width.
- No upper status/encounter bar. No real secondary resource exists, so the right orb is permanently empty.

## Acceptance
1. Fresh Fire Hunt, 320×568 and 390×844: artwork is crisp and fully inside safe-area; no filled static screenshot layer.
2. At 100/50/0 HP, ruby texture is whole/half/absent while bronze ring and white numeric HP stay visible.
3. Right purple orb remains fully unfilled, with no fake value.
4. Primary auto-cast shows Fireball pixel glyph and authoritative cooldown. Defensive Warding Pulse replaces locked glyph when actually prepared and uses its own cooldown.
5. EXP progress increases dynamically, with no old top encounter strip or version label covering it.
6. Check screenshot on iPhone Safari before player-test branch promotion.
