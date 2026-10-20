# WyrmForge — Canonical Divine lineage icons in World Gate (20 October 2026)

**Status:** Implementation branch; source/art and static layout audited. CI and deployed-device acceptance to be recorded separately.

## Approved icon identities

The owner approved a consistent six-tile pixel-art icon sheet in this conversation: **Fire (scarlet flame)**, **Frost (icy blue snowflake)**, **Storm (golden yellow lightning)**, **Arcane (purple star/orb)**, **Necromancy (green skull)** and **Summoner (warm brown bear)**. These identities, symbols, colors and dark-Gothic pixel-art style are canonical; earlier smooth-rendered versions and the old Unicode glyphs are superseded.

The accepted source is the 1536×1024 image generated in the chat on 20 October 2026, originally named `a_dark_minimalist_ui_style_pixel_art_illustration.png`. The compiled 3×2 **168×112** WebP runtime atlas at `src/Wyrmforge.Presentation.Web/wwwroot/art/ui/divine-lineage-sigils.webp` consists of six centered icon crops at **56×56** native resolution and is optimized for pixel-perfect nearest-neighbor scaling. The runtime source file is stored in this repository as a real binary asset; the chat-origin 1536px illustration is not yet committed as a separate full-resolution master. Do not claim it is.

## Interaction states in the actual game

- Fire/Frost **available**: full-color original pixel icon, matching color frame, enabled Hunt lineage choice.
- Storm/Arcane/Necromancy/Summoner **locked**: the *same* canonical icons shown in grayscale/dim with a small in-world padlock; disabled buttons, still named so players can recognize future schools.
- **Selected/focus**: warm light outline and emphasis on the original colored pixel icon; after selecting Fire or Frost, the corresponding same-sprite icon appears in the tier heading.
- **Inactive / not chosen**: undistorted regular colored tile; no additional painted variant or CSS black wash over town artwork.
- The World Gate currently selects **Hunt Wyrm lineage/region**, not the character's permanent Divine magical school. Never unlock Storm/Arcane/Death/Binding regions merely by displaying their emblems.

## Sizing and extraction

- One responsive atlas minimizes image requests and ensures every identity remains identical across tile and tier heading.
- Original cell: 56×56; CSS `background-size:300% 200%` and named sprite positions reproduce all six tiles. Raster resampling must use nearest-neighbor; no browser bilinear softness.
- Game displays scale to phone width; 320px and 390px portrait browser checks required. The same cropped source can be exported to 32, 64, 128 or 256 where later contexts need a dedicated size; these are **not** claimed to be shipped separate files.
- The owner-approved art sheet is the semantic canon. Additional mutations, Wyrm tiers or school logos must follow the established six silhouette/palette vocabulary; future art requires specific approval.

## Scope and validation

Changed only World Gate UI, scoped CSS, an image asset, tests, version and documentation. No combat, persistence, character creation, existing town work or real region unlocks modified.

Relevant in-repo reference: `docs/design/WyrmForge_MASTER_DESIGN_FOR_CLAUDE_2026-10-18_v1.2.md` §3.0 (the authoritative canon); previously accepted responsive World Gate at `docs/art/world-gate-mobile-2026-10-19.md`.

## Next acceptance evidence

Record the final branch head, all CI checks, browser screenshots for 320px/390px, and actual live Pages version/commit once deployed. Physical iOS Safari inspection remains separate from Playwright and should not be marked complete automatically.
