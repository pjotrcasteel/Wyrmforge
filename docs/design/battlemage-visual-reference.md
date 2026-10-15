# Legion Breaker — verified Battlemage visual reference for WyrmForge

**Status: source identity, transcript and video visuals reviewed on 2026-10-15; art direction accepted as a design reference, not artwork to reproduce.** This is a design RFC, not a deployed feature.

- User-selected gameplay video: **https://www.youtube.com/watch?v=WePyhtxZ4t0**
- Video title: *Highly Anticipated BATTLEMAGE Incremental is Here and It's Great!*
- Uploader: Idle cub; published 2026-10-14; duration 2h44m55s.
- Actual game: **Legion Breaker**, developed by **Baffled Engineer**, released October 13, 2026.
- Official page: https://store.steampowered.com/app/4425980/Legion_Breaker/
- Developer's visual/UI evolution: May v0.4.0 overhaul introduced distinct battlefields and combat UI; June v0.5.0 improved upgrade-screen visuals and clarity (https://steamcommunity.com/app/4425980/allnews/).
- Data provenance: video metadata and **full timestamped visual walkthrough** retrieved from connected vidIQ's `video_watch`; English transcript also reviewed. The creator explicitly admires the *clean pixel art*, mist and glowing pixels, and says shot lighting contributes materially to the look. Timed observations below are from analysis of the provided video. They are reference observations, not assertions that WyrmForge already renders these features.
- Prior itch demo credits list character/environment art by **SanctumPixel**. Do not copy sprites/tiles/screenshots or infer rights for the commercial release: https://baffledengineer.itch.io/legion-breaker

## What is actually visible in the referenced footage

| Visual principle | Specific source moment | What the footage shows |
| --- | --- | --- |
| Small, readable mage | [early battle 01:10](https://www.youtube.com/watch?v=WePyhtxZ4t0&t=70s) | Fixed orthographic 2D horizontal arena, mage at left firing bright cyan projectiles rightward. Small humanoid silhouette, weapon/magic source visibly distinct. |
| Atmospheric but quiet terrain | [mist at 04:06](https://www.youtube.com/watch?v=WePyhtxZ4t0&t=246s) | Dark, desaturated natural ground and sparse foliage with low-opacity ground fog; minimal floor detail competes with actors. |
| Enemy hierarchy | [early skeletons 00:22](https://www.youtube.com/watch?v=WePyhtxZ4t0&t=22s), [boss 58:43](https://www.youtube.com/watch?v=WePyhtxZ4t0&t=3523s) | Pale skeletal fodder, more distinctive elites, very large boss silhouettes and readable boss HP. Body shapes communicate threat before textual labels. |
| Magic at an actual position | [cyan missiles 03:04](https://www.youtube.com/watch?v=WePyhtxZ4t0&t=184s) | Bright compact teardrop shots with fading pixel trails; local glow reaches terrain and near enemy sprites. |
| Fire mastery escalation | [fireball impact 20:36](https://www.youtube.com/watch?v=WePyhtxZ4t0&t=1236s), [22:08](https://www.youtube.com/watch?v=WePyhtxZ4t0&t=1328s) | Warm orange spherical projectile, larger area burst on collision; spectacle tied to a game event, not orbiting decoration around the mage. |
| Storm's distinct identity | [lightning 42:25](https://www.youtube.com/watch?v=WePyhtxZ4t0&t=2545s) | Very brief, high-contrast vertical lightning strike: different silhouette, duration and cadence from fireballs. |
| Upgrade-tree visual language | [tree at 00:44](https://www.youtube.com/watch?v=WePyhtxZ4t0&t=44s), [42:22](https://www.youtube.com/watch?v=WePyhtxZ4t0&t=2542s) | Bright rune glyphs connected by branch lines on a dark background; locked/unlocked progression is apparent visually. |
| Strong environmental identity | [snow region at 34:40](https://www.youtube.com/watch?v=WePyhtxZ4t0&t=2080s), [ashen at 73:08](https://www.youtube.com/watch?v=WePyhtxZ4t0&t=4388s), [stone citadel at 133:50](https://www.youtube.com/watch?v=WePyhtxZ4t0&t=8030s) | Palette and border materials change substantially between dark wooded glade, icy region, burnt landscape and weathered stone monuments; scenery marks progression while ground stays uncluttered. |
| Clarity at large scale | [08:35](https://www.youtube.com/watch?v=WePyhtxZ4t0&t=515s) vs [34:39](https://www.youtube.com/watch?v=WePyhtxZ4t0&t=2079s) | Wider framing to keep increasingly large enemy hordes in view. Enemies remain classifiable by silhouette and scale. |
| Combat memory | [02:20](https://www.youtube.com/watch?v=WePyhtxZ4t0&t=140s), [24:20](https://www.youtube.com/watch?v=WePyhtxZ4t0&t=1460s) | Scattered defeated-bone remnants remain in the scene, hinting at battle history without replacing important silhouettes. |

### The look we are borrowing

1. **Pixel-silhouette discipline.** Actor shape, pose, recognizable staff and enemy archetype must register before small interior pixels do.
2. **Quiet environment, saturated actors and magic.** Desaturated, low-frequency ground textures and cohesive hand-authored props; bright magic is the intentional contrast. No unbounded violet ground geometry, repeated paving grids or faux architectural noise.
3. **Light physically belongs to the cast.** Fire makes warm local light, frost a cool steady pool, storm a brief directional flash and arcane a haunting violet spill. Illuminate mage robe, staff, nearby enemies, fog, wet stone and walls at real world coordinates, not fake screen overlays.
4. **One effect silhouette per magical behavior.** A traveling Fire Bolt, a Frost shard, a Storm strike, a single combination and a rank-5 Surge must be identifiable from their **motion/shape**, not just hue or particle count.
5. **Visual achievement communication.** Bosses, improved spells and successful discoveries materially change art or animation; not only damage numbers and run-length labels.
6. **Upgrade shapes and clear hierarchy.** A small set of readable, consistent illustrative runes + short labels; fewer visible choices with progressive disclosure on iPhone, unlike copying a sprawling desktop node tree.

### Do NOT copy

- **The 2D left-to-right lane/camera**: WyrmForge requires freely roaming around diverse, recognizable 2D environments. Never auto-zoom out until the phone-scale mage becomes unreadable.
- **The incremental economy, 3–4 hour campaign or automatic regimented spell scheduler**: WyrmForge is designed for 100+ self-directed hunts, one committed primary and earned magical combinations.
- **The low-movement mage animation literally.** Legion Breaker's short cast motion is appropriate for a mostly fixed turret mage; our user explicitly wants powerful wind-up/release/follow-through motion. Honor weight and anticipation without slowing movement or introducing long lockouts.
- **Every single screen-height beam or very large burst.** On a phone, prominent attacks must respect the visible playable area and warning silhouette; bosses and enemies must remain readable.
- **Its existing sprites, tiles, UI or sound**. Make original art using observed artistic principles.

## How this changes the WyrmForge plan

### Visual pillar 1 — Original mage sprite bible

- Keep the already approved **slate-blue hood, pale collar and staff**. Re-author in one consistent pixel scale with defined idle, walk, windup, release, recovery, Surge and damage frames.
- At 390px mobile width, test silhouette at *actual on-screen size*, not an enlarged asset preview. A player must see which way the mage faces and whether the staff is charged with the next cast.
- Cloth motion lags staff release; each school changes source light, not the underlying robe color. Body movement is forceful while gameplay mobility remains constant.

### Visual pillar 2 — One environment scene that is actual architecture

- Build a **ruined monastery / wet cloister** slice from legible walls, entrance, floors, damaged arch supports, waterline and scattered purposefully placed rubble. Not randomized columns, repetitive squares or fantasy cave arches.
- Dark mossy/slate palette, subtle ground fog, low-contrast wet stone; damaged protective rune carvings belong on actual masonry, not floating 300px circles in the middle of combat.
- Each depth/biome uses a different controlled palette and identifiable physical materials, like the source video's wooded, ice, ash and stone chapters, while keeping WyrmForge's independently designed geography.

### Visual pillar 3 — One-school vertical spell-light showcase

- Start **Fire Bolt** at rank I / rank II / Surge / a future Frostfire combination; reuse current C# cast-projectile-impact data.
- Explicit VFX phases: anticipation at staff -> moving ember projectile -> collision burst -> scorch/debris -> smoke that dissipates. Each stage has appropriate warm light on robe, enemy and environment.
- Use a strict bloom and on-screen coverage budget: peak spell light should *heighten*, not drown, silhouettes; reduced-motion keeps identity.
- Upgrade animations must advance *mechanical identity*: Rank II's actual behavior, Surge intensity and a combination's freeze/burn interplay. Never draw fake effects unrelated to damage/status.

### Visual pillar 4 — Picture-first UI for an eventual 100-hunt system

- Use the recognizable rune-and-line *principle* for discovering family relationships, but default mobile screens to a **one-recipe rail**, not a giant full skill tree.
- On the Hunt Hub: one illustrated pursuit, current primary/loadout, immediate BEGIN HUNT. On upgrades: one before/after spell silhouette and a one-line effect. In the Lab: one animated test dummy, three slots, clear valid/unknown/blocked states.
- Same artwork IDs and icon silhouettes across Codex, Forge, reward cards and actual VFX. No emoji-placeholder art in final UI.

## Single playable vertical slice acceptance criteria

1. Compare screenshot of **current live mage** with redesigned mage at 390px viewport; silhouette is identifiable at actual size.
2. Compare **monastery** wide shot against original WyrmForge environment and against source principle: dark, coherent architecture + uncluttered traversal; no floor matrix or meaningless runes.
3. Show Fire Bolt I, II and Surge with camera and scene unchanged; player can correctly tell which is more powerful without looking at damage values.
4. Verify *actual light spill* on mage, adjacent masonry and nearest enemy at cast, projectile and impact positions.
5. Validate at least 15 dense combat encounters for VFX occlusion, meaningful FPS/budget, hit readability, safe area, and user-facing text.
6. Playwright pixel regression tests and deterministic combat tests; no gameplay rule regressions. Release only after user reviews the art slice; the main GitHub Pages branch is unchanged by this document.

## Product distinction that matters

Developer and reviewer descriptions suggest Legion Breaker is a short incremental progression game. WyrmForge's long-term retention should **not** adopt repetitive identical battlefield loops or guaranteed flat upgrades. Its differentiator remains endless experimentation with carefully validated spell compositions, gradually harder self-directed hunts, Wyrm knowledge and meaningful optional discoveries.
