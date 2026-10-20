# Night Refuge panorama — interactive preview (v0.0.132)

**Branch:** `feat/town-night-panorama-vacancy-toggles`  
**State:** runtime artwork uploaded through GitHub blobs; visual and browser validation pending.  
**Scope:** night only. The World Gate still opens its existing page; clicking any of the four buildings only toggles that building between active/vacant locally (temporary preview; no progression storage or unlocks).

## Scene geometry

- Single approved **1672 × 941** coherent panorama, **never three unrelated background images**.
- Three camera positions: West / Gate / East, using the existing `wyrmforgeTown.show(0|1|2)` and a single scrollable image surface. On iPhone portrait the image is scaled by viewport height without stretching; desktop shows the whole panorama.
- Building hit areas are anchored in percent coordinates **on the panorama** (not in separate cards), so scrolling/cropping does not detach buttons from doorways.
- Existing top player, Hunter XP and Settings overlays remain fixed; compact West/Gate/East controls remain for touch accessibility.
- No guide lines appear in production. No people are baked in. Future autonomous walking NPCs will be independently rendered over the walkable plaza.

## Image layering / independent vacancy states

| Name | Preview key | Source variant | Runtime alpha overlay | Absolute overlay bounds in source pixels |
| --- | --- | --- | --- | --- |
| Arcane Nexus | build | vacant-ArcaneNexus.png | night-vacant-ArcaneNexus.png | (0, 0)–(618, 582) |
| Blacksmith | forge | vacant-Blacksmith.png | night-vacant-Blacksmith.png | (0, 353)–(633, 941) |
| Codex | codex | vacant-Codex.png | night-vacant-Codex.png | (982, 0)–(1672, 548) |
| Hall of Fame | legends | vacant-HallOfFame.png | night-vacant-HallOfFame.png | (866, 333)–(1672, 941) |

The optimized high-quality `night-active.webp` (1672×941) is always present. Each checkbox-equivalent building tap toggles one separate alpha layer with a **softly feathered, authored artwork vacancy** over the correct footprint. No CSS `filter:brightness`, global opacity overlay, dark rectangles or card swapping. All 16 combinations are possible, and all four can be dark at once. Markers and toggles are temporary and deliberately do not write `localStorage`.

The original eight 1536×1024 individual canonical building concept PNGs remain untouched. The five approved original concept panoramas remain available in the originating artwork session. The runtime game uses a high-quality WebP for the nighttime base and four lossless alpha PNGs for vacancy; the originals should be archived in the repository separately before treating this as the long-term art-production source.

## Runtime assets uploaded

Five real binary assets are now committed to `src/Wyrmforge.Presentation.Web/wwwroot/art/town/`: `night-active.webp` and `night-vacant-{ArcaneNexus,Blacksmith,Codex,HallOfFame}.png`. The four PNGs contain transparent, authored composites; the main panorama is encoded as high-quality WebP (same 1672×941 composition) to stay within the GitHub upload transport. No manual download/unzip/git push is required.

## Acceptance

1. `node --test tests/javascript/refuge-canonical-town.test.mjs` — asset count, WebP header and PNG dimensions, original building image immutability, registered scene, local toggle and no CSS blackout.
2. GitHub `Validate Wyrmforge` and `Browser smoke` must pass. Initial browser tests from 0.0.131 expected menu navigation when clicking buildings; these are updated to test the temporary toggles and retain menu integration through Settings > Temporary menu previews.
3. Inspect screenshots for 320×568 and 390×844 West, Gate and East and 1440×900 desktop. Confirm no stretched artwork, cropped lower building, detached clickable region, severe compositing seam, or scroll click misfire.
4. Toggle in this order: Nexus vacant, Blacksmith vacant, Codex vacant, Hall vacant, Hall active, all active again. Check that state is independent and the World Gate is always clickable.
5. No merge or Pages deploy until all assets are present and visual QA succeeds.

**Important:** The four derived overlays are image-based masks built from independently generated scene variants; some subtle alignment/lighting differences remain possible at feathered edges. QA is not optional and the hero scene should not be described as final until actual mobile captures are inspected.
