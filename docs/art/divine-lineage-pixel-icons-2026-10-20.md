# Six canonical Divine lineage pixel icons — integration checkpoint (20 October 2026)

Status: **implemented on the feature branch; visual/device acceptance pending**.

## Canonical artwork and provenance

The product owner approved the six-card pixel-art sheet in the ChatGPT design conversation (20 October 2026):
- Fire: orange-red flame; Frost: cyan crystalline snowflake; Storm: **yellow lightning**.
- Arcane: violet star/orb; Necromancy: green skull; Summoner: **bear** portrait (bound creature).
- Gothic, restrained, low-resolution pixel-art identity. Do not use 12 old placeholder sigils or replace the owner's emblems with other icon fonts.

The original approved sheet is a 1536×1024 PNG named `a_dark_minimalist_ui_style_pixel_art_illustration.png` in the owner's design conversation. To conserve mobile payload, the real game uses a crop **from that exact artwork**, not a redrawn approximation. The crop coordinates, explicit school order, nearest-neighbour resampling and WebP settings live in `tools/art/extract_divine_lineage_sigils.py`. Retain the original source independently; the source PNG was provided in the design conversation and is not embedded into this Git branch.

Runtime atlas: `src/Wyrmforge.Presentation.Web/wwwroot/art/divine-lineage-sigils.webp`
- Canvas: 192×128px; three columns and two rows of 64×64px paintings.
- Order: Fire, Frost, Storm / Arcane, Necromancy, Summoner.
- Uploaded Git blob SHA-1: `db30de8baab758fb6de32935d0cbaf98a2ae90ca` (exact locally extracted bytes).
- UI CSS uses `background-size:300% 200%`, explicit per-school positions and `image-rendering:pixelated`. Labels, frames, focus affordances and lock state are native HTML/CSS, not blurry baked text.

## Actual player path

Refuge World Gate → Free Play → New Hunt → Six named Wyrm lineage tiles.
- Fire and Frost remain enabled and launch existing Tier-I regions.
- Storm, Arcane, Necromancy and Summoner are visible but disabled, with darkened original art. Do not suggest their hunt arenas or magic schools have shipped.
- Choosing Fire/Frost leads to the existing Tier-I to Tier-V screen, with the selected icon in its heading. Tier II–V remain disabled.
- The World Gate selects *which Wyrm is hunted*, **not** the player's separate Divine school affinity. Character creation and school respec remain separate future work.
- This feature touches no town painting, monster sprite or simulated spell effect. Current alternative town-work PRs are unaffected.

## Evidence and acceptance gates

- Browser regression: `Mobile_WorldGate_FollowsFreePlayLineageAndTierSteps` at 320×568 and 390×844 checks six sigils, image URL, successful decode of the actual 192×128 atlas, Fire/Frost enablement, four disabled options, successful Tier-I launch and mobile overflow.
- Frost browser regression checks the selected canonical snowflake in the tier heading and that the snow region still launches.
- Requires GitHub `Validate Wyrmforge`, `Browser smoke` and `Focused magic comparison` green on PR HEAD. Run workflow builds before merging.
- Must inspect CI screenshots at 320/390px, and later verify on physical iPhone Safari. Chromium success alone is not physical-device visual acceptance.
- Higher res art refinements or context-wide reuse in character creation should use the same six canonical silhouettes (not a redesign), with the character development stream integrated independently.

## External reference principles (not copied)

- Last Epoch individual skill identity and specialized icons: recognizable category at glance, not dozens of undifferentiated glyphs.
- Diablo II item/skill tiles: strong silhouettes against a dark backdrop; preserve signal at phone size.
- Nearest-neighbour pixel sprite rendering: avoid smoothing the edges and introducing inconsistent textures.

No third-party copyrighted icons were copied. The game icon pixels originate from the owner-approved generated sheet.
