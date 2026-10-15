# WyrmForge — asset and screen audit

Branch: `art/runtime-pixel-pipeline-v1` · Viewports: 1440×900 desktop, 390×844 iPhone (Chromium device emulation, DPR 2)
Evidence: `docs/art/screens/before/*` and `docs/art/screens/after/*` (captured by `tools/art/capture-screens.mjs`), magnified review sheets in `docs/art/previews/`.

## 1. Provenance (read first)

Every runtime asset added on this branch is **original pixel art authored as deterministic code** in
`tools/art/sprites/*.mjs` and rasterised by a dependency-free Node pipeline (`tools/art/lib/png.mjs`,
`tools/art/lib/painter.mjs`, `tools/art/build-art.mjs`). No image-generation model, stock pack, scraped
art or third-party sprite sheet was used, and the concept images in `art/` were used only as mood reference
(palette, silhouette density, wall/rune motifs) — nothing was traced or sampled from them.
`manifest.json` carries this provenance note. Re-running `node tools/art/build-art.mjs` reproduces the
committed PNGs byte for byte; `--check` (also run by `tests/javascript/art-pipeline.test.mjs`) fails if they drift.

## 2. Baseline findings (before)

| Screen | Finding | Severity |
|---|---|---|
| Hub (both) | Flat dark gradient; no sense of place. Nav uses unicode glyphs (✦ ◆ ▣ ♜) that render differently per OS font. | High |
| Primary magic choice | Small unicode glyphs from `SpellCatalog` (e.g. ◈) — font-dependent, no school identity, clash with the pixel game below. | High |
| Arena ground | Flat two-tone wash with faint rectangle "slabs"; no material, no biome identity beyond tint. | High |
| Territory barriers | Purple chevron hazard band plus floating `SEALED` text; reads as UI, not as a wall. | High |
| Landmarks | Code-drawn house outline with large text title (`ABANDONED WAYSTATION`) on the play field. | Medium |
| Mage | Code-painted, single facing; walking north still shows the face. | Medium |
| Enemies | Code-painted 4 kinds, always face right; frozen/hit only tint. | Medium |
| Wyrms | Code-painted silhouette, no wing animation. | Medium |
| Pickups / caches / exit | Diamonds and text labels (`HEAL`, `+3 XP`, `NEXT TRAIL`). | Medium |
| Map / Run hub / Build atlas | School emoji in pills and region headings. | Low |
| Console | 404s during a run and a `WyrmrealmMapView` JS-interop error. Pre-existing, not art related, not addressed here. | Info |

## 3. What changed (after)

**Runtime atlases** (`src/Wyrmforge.Presentation.Web/wwwroot/art/`, 184 frames, ~1 art px = 1 world unit, nearest-neighbour):

| Atlas | Frames | Contents |
|---|---|---|
| `actors.png` | 78 | Mage S/N/E × idle, walkA, walkB, windup, release, followThrough, surgeRelease × normal/hit (W mirrors E). Enemies hound, wraith, crawler, revenant × 3 walk phases × normal/hit/frozen, with collision `radius` metadata. |
| `wyrms.png` | 20 | Arcane/fire/frost/storm wyrm × phase 1/2 × two wing frames + frozen. |
| `tiles.png` | 5 | Seamless 64px valley, ash, ridge, road, flagstone tiles. |
| `environment.png` | 59 | Wall cap/face/foot per biome, portcullis, rubble, lit/dim runes per school, 9 landmark ruins + slab/rubble, decals, edge props, XP shards, caches, waystone exit. |
| `icons.png` + `icons.css` | 22 | UI icons as `.px-icon .px-{id}` at 1× (`.px-sm`), 2× (default), 3× (`.px-lg`). |
| `hub-backdrop.png` | — | 480×270 rainy keep, forest and moon for the hub. |

**Integration** (all paths keep the previous code-painted renderer as a fallback when art is not loaded):

- `art-atlas.js` — async loader, frame lookup, anchored/mirrored/scaled `drawArtFrame`, cached tile patterns.
- Terrain — biome tile pattern + soft gradient wash, seeded ground decals, forest/scrub edge band, ruin sprites
  for landmarks without floating titles.
- `arena-territory-walls.js` — closed barriers become 2.5D curtain walls (cap, face, foot) with school runes
  that gutter on a deterministic rhythm and a portcullis on gates; depth-sorted by foot line with actors. Opened
  gates leave rubble. Collision remains the exact C# rectangle.
- Mage — four facings from movement, turning toward an active cast; N facing draws the staff behind the body.
- Enemies — sprites with shadow, mirrored by travel direction, hit/frozen variants.
- Wyrms — sprites scaled to radius with flap animation (static under reduced motion).
- Shards, caches, exit — sprites; `HEAL` / `+3 XP` / `NEXT TRAIL` / `SEALED` text removed when art is ready.
- UI — hub backdrop with CSS rain and translucent menu; pixel icons in hub nav, primary-choice cards, map, run hub, build atlas.

## 4. Verification

- `node --test tests/javascript/*.test.mjs` — 106 pass (14 new in `art-pipeline.test.mjs`: generator determinism,
  PNG/manifest consistency, frame completeness for every renderer request, CSS coverage, loader fallback,
  draw anchoring/mirroring, facing rules, wall projection, rune determinism, decal/edge seeding).
- `dotnet test Wyrmforge.slnx -c Release` — Domain 145, Application 289 pass.
- `tests/Wyrmforge.Browser.Tests` against the published build — 47 pass.
- Visual review of before/after captures at both viewports.

Note: on this machine NuGet's vulnerability audit cannot reach a private feed (NU1900 as error);
local runs used `-p:NuGetAudit=false`. CI was not run from this branch.

## 5. Known limitations / follow-ups

1. Edge trees are baked into the cached terrain texture, so actors never walk *behind* them (they sit outside combat lanes).
2. The faint rectangular "slab" outlines from the old terrain painter still show through the tile wash; remove or replace with flagstone decals.
3. Wyrm wing flap is subtle at 1×; a third frame or larger wing delta would read better.
4. `wall.rubble` is dark against ash ground.
5. Thick barriers show a large flat walkway top on narrow screens; acceptable, but a crenellation pass would help.
6. No spell/projectile sprites yet — spells remain the existing code-drawn VFX (they read well and are lighting-coupled).
7. iPhone was verified only via emulation, not on a physical device.
8. Pre-existing console 404s (in-run) and the map interop error remain.
