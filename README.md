# Wyrmforge

## Prototype 0.0.168 — Routed Arcane paths and debug character reset

- Arcane Web uses school stems, branching milestones and curved connections between schools, with no decorative spokes through skills. Stable progression and saved builds retain their rules.
- Phone gestures use one touch stream, stable map height and cancellation-safe taps. Wheel/trackpad scrolling pans; Ctrl/pinch and buttons zoom.
- Settings → Debug → Reset character clears this device’s Wyrmforge saves and settings after confirmation, then returns to the welcome screen. Other projects on the same origin are preserved.
- [Implementation and verification receipt](docs/playtesting/2026-10-22-web-paths-and-debug-reset.md).

## Prototype 0.0.166 — Readable, pannable specialization map

- Specialize opens on the active school at reading scale, with wider node/cluster spacing and drag/pinch navigation from nodes or empty space. Whole-Web overview is optional.
- Removed the extra school strip and crafted-spell panel; research/crafting actions are disconnected from Web node details for now. Saved builds sit beneath the map. Learning, bonuses, reservations and old saves retain their rules.
- [Navigation correction and verification receipt](docs/playtesting/2026-10-22-specialize-navigation.md).

## Prototype 0.0.159 — Six-school Arcane Web construction

- Six school sectors surround the Wyrmheart, with the active school north and camera shortcuts for inspection.
- Learn only in the active school; previously learned stats continue contributing. Inactive-school refunds warn once per visit and reserve their points until returning to that school.
- Four Fireball mutation enhancement nodes affect their matching equipped mutation in real combat. Initial numbers remain tunable.
- Legacy builds and saved schools are preserved. Death/Binding content and school-switching UI remain future work. [Construction and validation receipt](docs/playtesting/2026-10-22-arcane-school-wheel.md).

## Prototype 0.0.157 — One visual language for the Arcane Nexus

- Research and Arcane Web inherit the approved Fireball chamber's bronze frames, warm lettering, dark masonry and metal sockets, consistent with Refuge's materials.
- Research uses the original Divine pixel emblems in its tray and live circle. Its actions stay below the research rather than covering it. Fireball's artwork stays specific to Fireball.
- Phone Web controls, sockets, loadouts and node details share the same treatment. Skill graph, progression, saves and town paintings are preserved.
- [Implementation, actual phone-size captures and validation](docs/playtesting/nexus-style-cohesion-2026-10-22.md): 321 JavaScript, 950 .NET and 104 browser checks pass. Physical Safari review remains separate.

## Prototype 0.0.141 — Animated Ashling

- Ashling now hops in eight directions, launches into fire-infused claw attacks, and collapses into a held corpse. Small fiery eyes fade during death.
- Shared full-body motion windows preserve planted attack poses while facing and gait phase continue. Simulation movement, damage and death authority remain unchanged.
- [Integration and validation evidence](docs/art/ashling-runtime-integration-2026-10-20.md).

## Hotfix 0.0.140 — Night-only Refuge, rollback of damaged v0.0.139 images

- Reverted all eight v0.0.139 daytime and nighttime vacancy image changes **byte-for-byte** to the previous v0.0.138 artwork. No new generation, image processing, or redesign.
- Temporarily removed the Day/Auto/Night preference controls; the town always uses the original night panorama and original nighttime vacancy layers, regardless of local browser clock or saved choice. Daytime assets remain in the repo but cannot load in the live town.
- Gameplay unlock conditions, hit targets, the World Gate, NPC plans, and the eight approved canonical building source images are unchanged.
- Further visual repairs require explicitly approved per-building artwork, one at a time. This hotfix intentionally does not claim to improve the old art.


## Prototype 0.0.139 — Repair vacant Refuge artwork

- Replace independently regenerated vacancy patches with pixel-registered corrections of the current day/night panorama. Each locked building retains its exact geometry and working interaction while its powered fixtures are dimmed, chimney plumes are removed, and the Hall entrance is repaired from same-scene wood.
- No modifications to the eight owner-approved canonical source building PNGs. Shared environment and the World Gate remain unchanged. Reproducible art generation and visual proof in `tools/art/repair_refuge_vacancy.py` and `docs/art/previews/refuge-{day,night}-all-vacant.webp`.
- Full real-device iPhone Safari acceptance remains separate from GitHub CI.


**Canonical product documentation:** [docs/canon/](docs/canon/README.md). Intended gameplay, art, audio, UX, modes and engineering rules each have one current topic home. The prototype changelog below is historical delivery evidence, not a second design specification.

## Prototype 0.0.139 — Faster first launch and stable cache reuse

- Slow first launches no longer trigger a forced reload after 9 seconds. The initial WASM download continues normally, with a clear slow-start notice; a manual **Try Again** remains for actual failures.
- Blazor boot resources use their .NET-provided SHA-256 integrity hash as a stable URL cache key, so unchanged DLL/WASM assets can be reused across releases. Unhashed resources remain deployment-versioned.
- Record the startup duration as a browser performance measure `wyrmforge:boot`. JS regression tests check the boot-resource and retry contracts.

## Prototype 0.0.138 — Refuge Day / Night / Auto lighting

- Settings now provides **Auto / Day / Night**. Auto follows the browser/device local time (day 07:00–18:59); the override persists and does not change gameplay progress or building vacancy rules.
- Uses the approved matching daylight panorama and authored daylight vacancy layers; preserves the canonical nighttime art.
- Implemented and tested in [the town lighting record](docs/art/town-day-night-device-clock-2026-10-20.md).


## Prototype 0.0.138 — Fire-first character creation

- Choose your magic: **Fire is the only available new-character school** until its Tier-I signature and mutation gameplay are fully implemented and accepted. Frost, Storm, Arcane, Necromancer and Summoner remain visible and locked.
- Character creation removes the long lore explanation and speculative respec instructions. Only the direct choice and character name remain.
- Existing non-Fire characters remain intact; the gate is for **new** characters only. The World Gate still independently chooses Hunt region.
- Six-school mutation canon is documented in the authoritative design §3.0.

## Prototype 0.0.137 — Gameplay night town and swipe-only navigation

- The accepted night panorama now uses the player's persistent building unlocks, opens real destinations, and explains locked buildings without toggling game state.
- WEST / GATE / EAST preview controls, temporary building switches, and Settings preview shortcuts are removed. Swipe, desktop drag and accessible keyboard navigation remain.
- World Gate, author-approved images and all Divine school creation behavior from v0.0.136 are preserved. [Night town integration](docs/art/refuge-night-panorama-preview-2026-10-20.md).


## Prototype 0.0.136 — Character school creation and elemental icon cleanup

- Choose a permanent Divine magic school once during character creation, before entering Refuge. Four schools have working signatures; Necromancer and Summoner remain reserved.
- Arena uses the character's saved signature automatically, without an additional First Oath after launching each Hunt. Existing preferred-primary saves migrate safely, and loadouts never respec the Divine school.
- World Gate reuses the approved pixel paintings with hard square cutoffs and baked labels masked away; each tile has just one accessible label.
- Wyrm lineage and Hunt tier remain independent from the character school. Full respec remains intentionally locked/TBD.
- [Compatibility and QA](docs/handover/2026-10-20-character-school-and-sigil-fix.md).

## Prototype 0.0.135 — Moving attacks and directional sprite layers

- Hollow attacks retain their walking support animation while pursuing the player, and turn through existing directional views without restarting either clip.
- Shared profiles control locomotion stride, action regions, priorities and turning speed; the accepted sprite PNGs remain unchanged. Other enemies retain their current presentation until their anatomy profiles are validated.
- [Implementation and validation evidence](docs/art/shared-sprite-animation-layers-2026-10-20.md).

## Prototype 0.0.134 — Animated Hollow in combat

- The accepted Hollow now uses eight real directions for its pixel walk, claw attack and death in ordinary hunts and Enemy Lab.
- Movement follows travelled distance; contact shows the one-shot claw and recovery while C# retains damage authority. Actual death events play the full collapse, hold the corpse, then fade it.
- [Integration and validation status](docs/art/hollow-runtime-integration-2026-10-20.md).

## Prototype 0.0.133 — Canonical six-school pixel icons in the real World Gate

- The actual approved Fire, Frost, **yellow Storm**, Arcane, Necromancy and **bear Summoner** pixel illustrations now power the six World Gate choices. No Unicode placeholder icons, AI redraws or separate HTML mockups.
- Runtime uses a real **192×128 WebP atlas** (6×64×64 icons), nearest-neighbour rendering and readable HTML labels. Fire and Frost launch existing Tier-I Hunts; the four remaining lineages show their icon/name in a dark disabled state without pretending their regions are playable.
- The selected Fire/Frost artwork also appears in the Wyrm-tier header. Real gameplay, saves, Wyrm encounters and the character-school-selection roadmap are unchanged.
- Mobile regression tests verify six glyphs, the atlas's actual decoded size, disabled states, navigation and 320/390px views. [Asset provenance and validation status](docs/art/divine-lineage-pixel-icons-2026-10-20.md). Real iPhone Safari visual acceptance is still separate from Chromium CI.

## Prototype 0.0.132 — Six-lineage World Gate and Divine magic foundations

- World Gate presents **six** Wyrm lineage choices (Fire/Frost enabled, four anonymous disabled) in two rows of three, rather than twelve empty lineages. This is a **Hunt lineage/region** choice, not the character's permanent school affinity.
- Hunt tiers I–V are derived from the existing WyrmTier contract; **only Tier I is playable**. Five future mutation-mastery tiers are a separate domain concept and must not affect currently earned spell ranks.
- The six Divine magic schools and their signature/mutation direction are defined in the [single authoritative design](docs/canon/magic-and-combat.md#30-divine-magical-archetypes-signatures-mutations-and-tiers--locked-20-october-2026). The existing four spell/lesser-Wyrm pairs remain unchanged; Necromancer and Summoner are reserved.
- **Not shipped:** new character creation or school-respec flows, Fireball rework, ten playable mutations per school, and higher-tier encounters. [Implementation checkpoint](docs/handover/2026-10-20-divine-magic-foundation-status.md).

## Prototype 0.0.132 — Unified night Refuge town preview (draft)

- Use **one 1672×941 authored nighttime plaza panorama**, navigated as three West / Gate / East camera views on portrait phones, instead of stacked isolated building cards.
- Tap Arcane Nexus, Blacksmith, Codex and Hall of Fame to independently toggle **Active / Vacant** artwork inside the same town; this is a temporary, non-persistent visual preview and **does not open building menus or change progression**. The World Gate still opens its normal flow.
- Five approved night-overview source compositions are archived in `user_handover_files/concepts/town/night/` (high-quality WebP) separately from the eight immutable building concept PNGs. Four derived RGBA layers permit all 16 vacancy combinations with no CSS blackout overlays.
- Old building menus remain accessible for regression through Settings > Town preview destinations. Runtime and source night assets have been pushed directly to GitHub; [implementation notes and QA plan](docs/art/refuge-night-panorama-preview-2026-10-20.md).
- **Status:** release candidate awaiting CI and mobile visual acceptance before GitHub Pages deployment.


## Prototype 0.0.131 — Canonical Refuge town screen

- Town now renders the owner's **eight approved active/vacant building paintings** for Blacksmith, Arcane Nexus, Codex and Hall of Fame directly in the real game. Each first-party runtime asset is an exact copy of the canonical approved PNG.
- Desktop shows west buildings, the original central World Gate, and east buildings as a single art-led screen. Phones swipe through three full-height districts and have accessible district navigation. No painted static NPCs or black CSS vacancy overlays.
- Existing unlock predicates, vacant lock notices, click audio rules, Hall of Fame leaderboards and World Gate's Free Play/Campaign flow are preserved.
- [Implementation and validation record](docs/art/refuge-canonical-buildings-game-screen-2026-10-20.md). Physical iPhone visual acceptance is still required.


## Prototype 0.0.130 — Unified active and vacant town buildings

- All locked buildings use the same `Active / Vacant` rendering contract driven by their existing progression unlocks. Blacksmith, Nexus, Codex and Hall of Fame switch independently.
- The painted dormant-art generator now suppresses cyan/blue magic alongside white, violet and warm lamps/windows; people and powered props are removed from individual building layers, **never via a CSS black haze**.
- The World Gate remains permanently active; tapping a vacant building still explains the unlock requirement without opening it.
- [Art pipeline and acceptance notes](docs/art/shared-building-states-2026-10-19.md). Physical iPhone Safari acceptance is still required.

## Prototype 0.0.129 — Vacant building interaction feedback

- Vacant Arcane Nexus, Blacksmith, Codex and Hall of Fame buildings still use their authentic dark, unoccupied paintings.
- Tapping a locked building shows a compact, dismissible in-world notice explaining the actual unlock requirement. Locked locations do not navigate or trigger the opening-door sound.
- The Hall of Fame correctly requires **two completed hunts**; Arcane Nexus and Codex require one, while the Blacksmith requires a secured Essence.
- Mobile browser regression coverage taps all four dormant locations and confirms that the player remains in Refuge. The new branch requires GitHub CI and physical iPhone Safari confirmation before visual acceptance.

## Prototype 0.0.128 — Mobile World Gate and Wyrm selection

- Town World Gate now opens the original twin-arch Free Play / grayscale Campaign scene instead of immediately launching combat.
- Free Play leads through New Hunt (Endless Hunt/Arena visible but disabled), Fire/Frost element selection, and Tier 1. Ten dark anonymous sigils reserve room for future lineages; higher Wyrm tiers are locked rather than presenting unimplemented encounters as playable.
- Both Fire and Frost can be selected from the first hunt; the existing region and Wyrm combat simulation remain authoritative. The choice is persisted before launching the run.
- Portrait 320px/390px flow coverage and corrected legacy run-start browser tests. See [World Gate implementation and validation](docs/art/world-gate-mobile-2026-10-19.md).

## Prototype 0.0.127 — Vacant building light-source fidelity

- Refine each authored dormant building plate to extinguish lit windows, purple magic, and stall lighting in the artwork itself instead of dimming the town with CSS.
- Keep blacksmith vacancy, permanently open World Gate, and independent building unlock states unchanged. The new asset version prevents browsers retaining old town artwork.
- [Before/after implementation and visual QA](docs/art/town-vacancy-correction-2026-10-19.md). Phone Safari acceptance remains a separate device check.

## Prototype 0.0.126 — Town building black-wash regression correction

- Remove the black CSS overlays entirely; replace them with three **real transparent artwork plates** for the locked Arcane Nexus, Codex and Hall of Fame. Vacant plates eliminate painted pedestrians and suppress their warm/violet building lights while preserving stonework.
- Keep the correctly vacant blacksmith and its original populated/lit unlock artwork intact. Each other building independently returns to the original lively painting on unlock, with the same hit-target rules.
- Building patches are generated reproducibly from the original 2172×724 panorama by `tools/art/build_town_vacancy.py`. [Art implementation and full-town visual proof](docs/art/town-vacancy-correction-2026-10-19.md). Physical iPhone Safari review is still an outstanding device QA check, not an omitted game feature.

## Prototype 0.0.125 — Combat recovery and longer hunts

- Automatic targeting remains the default. Held mouse/right-touch/gamepad aim takes temporary precedence; tap-to-aim expires after 350 ms, then automatic targeting resumes. A small ground rune shows the direction.
- Hunt route budgets scale by difficulty depth: shortest legal routes contain 6/8/10/12 battles before the Wyrm. Optional branches retain protected rewards and existing capped refinements.
- Mire Hound and Whitefang gain eight travel-driven canine trot frames and distinct pounce/recoil/recovery poses. Recovered painted Hollow, Mire Hound and Ashfang sheets are integrated with native-art fallback.
- `/enemy-lab` runs every implemented Fire/Frost enemy through the actual simulation and renderer without saving progress. [Seeded hunt evidence](docs/playtesting/hunt-length/README.md) and [aim rules](docs/playtesting/hybrid-aim-2026-10-19.md).
- **Art milestone remains partial:** other generated enemy sheets and earlier recordings were lost before publication. Those enemies retain their native art; this version does not claim the full all-roster card-quality overhaul.

## Authoritative product design and development continuation

**Canonical topic index (single source of truth):** [WyrmForge Unified Authoritative Product & Technical Design — 18 October 2026, v1.2](docs/canon/README.md).

The living canonical documents are now split by topic in `docs/canon/`, including the [priorities](docs/canon/roadmap.md). The former combined handover is [archived](docs/archive/2026-10-20-unified-master-design-v1.3.md). Agents must follow the topic documents, not layer dated handovers.

**Animated character production:** follow the [art-card-to-spritesheet production algorithm](docs/art/card-to-spritesheet-production.md) for source preparation, rigging, walking/attack/hurt/death, transitions, rendering, export, visual acceptance and integration. This is a documented procedure; its new rigged-character pipeline is not yet implemented or proven with an accepted Hollow asset.

**Implementation/status evidence, not additional product specifications:** [dated project, art, UX and GitHub handover](docs/handover/2026-10-15-project-art-and-backlog.md), [17 October design reconciliation record](docs/design/design-amendment-2026-10-17-reconciliation.md), the existing [historical gameplay roadmap](docs/roadmap/wyrmforge-gameplay-next-level.md), [approved image references](art/README.md), and current GitHub branches, PRs, CI and code. Verify progress against today's repository; do not restart completed work or interpret old status snapshots as current design decisions.


## Prototype 0.0.117 — Health clarity and unmistakably different territories

- **Remove the clickable health help question mark and modal entirely.** In combat, the green health bar, visible heart + HP current/maximum, and severity coloring (healthy / wounded / critical) convey the status immediately without interrupting movement. The health bar also exposes an accessible progress value.
- **Same-biome encounters no longer reuse one universal road template.** Every route node gets a deterministic `causeway`, `sanctuary`, or `rift` district, with different gate widths and wall thicknesses in the canonical simulation. Adjacent opening stages rotate districts.
- **Large-scale district composition:** broken ancient highway and paving versus massive ceremonial plazas and radial stonework versus full-height fractured-earth trenches and shattered crossing slabs.
- **Large elemental landforms:** exposed glowing lava basins, frozen ice shelves, branching lightning impact fields, or enormous distorted ritual circles. These occupy substantial portions of the world, not a handful of small marks.
- Separate original landmark layouts for each district, preserving the broader map's biome while giving every encounter a place identity.
- World-space camera, accessible supply caches, monster pathing, wave unlocks and final exit stay canonical and functioning as before.
- Automated checks cover district uniqueness, actual differing Canvas pixels on portrait browser emulation, health HUD without help controls, full .NET and existing movement/touch/browser regression suites. Physical iPhone screenshot inspection remains the visual quality gate.

## Prototype 0.0.116 — Recognizable Living Territories (environment slice A)

- The world-space combat territory now reads like an actual place: a continuous weathered causeway, broken paving, deliberate central courtyard and three large themed landmarks per biome.
- Ashen calderas have a black pyre, ruined forge and burned convoy. Ridges have a fallen watchtower, ossuary and banners. Valleys have a broken chapel, abandoned waystation and flooded altar.
- Original elemental devastation is geometric as well as chromatic: Fire scorches, Frost splinters ground into plates, Storm splits it into branching lightning wounds, and Arcane corrupts the terrain in ritual rings. Scarring intensifies at stages nearer the Wyrm.
- Seeded regional ground strata and atmospheric motes add scale and motion without importing art assets, changing canonical combat RNG or creating misleading solid walls.
- Canvas ground illustration is baked into the existing bounded terrain texture cache; per-frame animation is restricted to lightweight ambient motes. HUD, real physics barriers and the existing camera remain unchanged.
- [Living Territory visual language, game reference research and next slices](docs/design/living-territories-0.0.116.md). The next step is a real Wyrm flyover and lasting elemental impact, then dramatic area unlocks.
- Automated tests validate deterministic recipes, distinct biomes, escalating corruption, camera/gate composition and mobile browser Canvas rendering. Physical iPhone Safari visual approval is still required.

## Prototype 0.0.115 — The Living Territory

- The roaming combat world now has **real ruined-stone chokepoints**, not just painted landscape. Canonical seeded wall and gate geometry collides with the hunter and enemies.
- An early northern barricade physically opens at the encounter director's BreathingRoom phase (after the second wave); a southern region opens at Surge. Once open, both stay open.
- Clearing the opened routes reveals a useful optional XP cache to the north and health cache to the south; health is only consumed if needed. The original final-wave northern exit remains a physical destination.
- The monster spawn system keeps new enemies inside the hunter's reachable region while a gate is shut, preventing inaccessible stragglers from blocking progression.
- Enemy pursuit steers toward open choke throats when crossing regions. The active C# state owns collision, navigation and wave phase; the browser just renders the results.
- Dark elemental masonry gains Fire/Frost/Storm/Arcane damage cues without uniform scenery tint. Basic seed variance keeps exact crossings from repeating.
- Acceptance gates: deterministic geometry/phase/path/spawn tests, real JavaScript rendering contract, original touch/camera regression suite, balance runs and browser smoke. Physical iPhone testing still required before claiming complete device coverage.

## Prototype 0.0.114 — Roaming territory and compass-guided exits

- Combat trails are actual multi-viewport worlds, not fixed canvas-sized arenas. The player, enemies, experience, hazards and caches use canonical world-space positions.
- A camera follows the hunter, revealing ancient roads, ruins and elemental scars as they move. The viewport remains a display only; there is no web-page scrolling during gameplay.
- Enemies appear around the visible hunter instead of the distant world boundary, retaining playable wave pressure.
- Once the final encounter is defeated, the distant northern passage opens and a compass arrow guides the hunter to it. Reaching the passage unlocks the normal route decision.
- World coordinates and camera geometry remain separate, with deterministic tests of boundaries, movement and exit direction on portrait viewports.
- Browser and native builds share the C# simulation state; scrolling and arrow drawing are presentation details.

## Prototype 0.0.113.1 — Safari movement hotfix

- Combat touch gestures have their own non-passive touch tracking, preventing native page scrolling and preserving input after Safari cancels pointer capture.
- Movement on iPhone no longer depends on uninterrupted Pointer Events; mouse and keyboard controls remain supported.
- An isolated terrain drawing error cannot terminate the simulation loop or silently disable all movement.
- Regression coverage includes touch cancellation and actual hunter position change on a mobile browser viewport. Physical iPhone Safari confirmation is still needed.

## Prototype 0.0.113 — Living gothic battlefield

- The empty combat grid becomes seeded dark-fantasy scenery: ancient roads, rubble, broken monoliths, scorched approaches, oppressive shadows and distinct valley/ridge/caldera treatments.
- Actual C# environment state governs two side supply alcoves per combat trail: an XP cache opens at breathing room and a health cache opens at the surge. These grants change real run state, not JavaScript overlays.
- The last wave opens a real passage. Players walk north into the exit before choosing the next route; automated self-play agents understand the exit too.
- Seeded decorations and supplies use dedicated deterministic randomness, with zero calls to combat RNG. Existing enemy pressure, attacks and loot distributions stay unchanged.
- This is a *screen-based world foundation*, not yet a scrolling open map or collision-aware larger territory. The next environmental slice introduces a persistent world-space arena, following camera and meaningful chokepoints.
- **Tone:** gothic Diablo I/II-inspired menace and violent combat weight, with StarCraft-like dark cinematic tension in future original/licensed soundtrack work. Never copy protected artwork, samples or music.

## Prototype 0.0.112 — Mobile control reliability and health guidance

- Arena input now resets when iOS loses pointer capture, the browser loses focus, or a hunt becomes backgrounded; cancelled gestures no longer leave stale movement.
- Touch movement responds to shorter deliberate swipes and ignores a second finger taking control of the virtual stick.
- The active hunt locks background page scrolling while map and decision panels retain their own scrolling.
- The combat HUD provides an optional, dismissible explanation of HP, recovery and Refuge healing. No health or difficulty balancing was changed.
- Automated JavaScript regressions cover pointer lifecycle, keyboard focus, cancellation, backgrounding and scroll behavior. Actual iPhone Safari touch verification remains a release gate.
- Only engineering changes are described here; small private playtest cohorts and individual feedback are not published.

## Prototype 0.0.111 — Warm upgrade moments

- New spell / level-up reveal uses a delicate CC0 gemstone sound instead of the jarring combat-oriented Magic Shield activation.
- Confirming an upgrade uses a quieter CC BY 4.0 healing chime with softened high frequencies, a gradual attack and a longer release.
- Both moments remain separate, previewable entries in Sound Atelier; the spell casts, soundtrack and existing iPhone Silent Mode playback stay unchanged.
- Source licenses and per-cue mix profiles are documented in `audio/recorded/manifest.json`. Audio quality remains a listening decision, not a claim made by automated tests.

## Prototype 0.0.110 — recorded mage magic and reliable music

- **Continuous soundtrack:** menu and hunt music are started inside a trusted iPhone tap and remain active, with a smooth 4.8-second scene crossfade via Web Audio gains; the soundtrack is no longer re-started from asynchronous DOM callbacks.
- **Recorded mage spell layers:** Arcane, Fire, Frost and Lightning each use three distinct human-recorded casting takes, separate impact variations and a quieter occasional buildup layer. No recycled beeps or copied third-party game recordings.
- **Natural release:** menu, reward, transition and spell cues fade gently instead of cutting off at their end; important moments remain audible above routine attacks.
- **Rebalanced mix:** a stronger separate soundtrack bus, quieter routine combat, persisted individual category levels and a one-tap **HEAR SOUNDTRACK** control in Sound Atelier.
- Every imported sample has a source filename, CC BY 4.0 attribution and SHA-256 manifest entry. See `docs/audio/recorded-audio-credits.md`.
- CI verifies each cast/impact is a distinct recording, actual music activation in a browser, mobile layout and the existing gameplay.

## Prototype 0.0.109 — Recorded dark-fantasy soundtrack and elemental magic

- **Actual audio recordings** replace procedural beeps: separate authored Fireball, Frost, Lightning and Arcane sounds, physical hits, Wyrm and reward effects. No proprietary game audio is sampled.
- **Recorded soundtrack:** Brandon Morris's CC0 *Osare (Unrest Theme)* accompanies the menu/Refuge, and *Cave Theme* accompanies hunts. The music transitions gently rather than restarting with every effect.
- Music, Combat, Interface and Moments have independent persisted mixing controls in Sound Atelier. iPhone Silent Mode audio playback support remains in place.
- Audio files are shipped **self-hosted** under `wwwroot/audio/recorded`; `manifest.json` documents source URLs, authors, licenses, SHA-256s and cue bindings. JC Sounds' elemental sound effects are credited under CC BY 4.0 in `docs/audio/recorded-audio-credits.md`.
- This is the first recorded-audio **listening candidate**, not the final composition. The classic Diablo/StarCraft era is an emotional reference, while WoW, Skyrim, Enshrouded and Path of Exile guide the weight and clarity of spell and impact audio.

## Prototype 0.0.108 — Ancient Resonance: first sound identity

- Replace short oscillating beeps with a deterministic, layered **Ancient Resonance** palette: breath, stone, glass, restrained elemental energy and low, weighty Wyrm cues. No third-party copyrighted samples are bundled.
- Preserve all existing combat/upgrade/hunt audio events and the iPhone Silent Mode playback fix. Original sampled waveforms are cached in Web Audio buffers, with three subtle repeat variations and controlled spectral brightness.
- Prioritize important moments above repeated combat: cooldowns, per-bus voice limits, lightweight dynamic compression, moment ducking and independent saved Interface / Combat / Moments volume controls.
- Add a main-menu **Sound Atelier** with 12 individually auditionable cues, plus the existing SFX mute and test-tone button. No additional in-combat buttons or tabs.
- Keep the sonic palette modular so hand-recorded or professionally produced SFX can replace individual events without changing gameplay.

## Prototype 0.0.107 — iPhone Silent Mode audio fix

- Set the supported browser AudioSession to `playback` before Web Audio starts, allowing demo SFX with the iPhone's Silent Mode enabled (Apple WebKit issue 237322).
- Give testers a dedicated `TEST ♪` button next to the saved sound preference. Test tones are scheduled directly on tap; the small status label reports whether the browser audio context is running.
- Retry browser activation after touch, keyboard and focus restoration. Unsupported AudioSession implementations keep their standard audio behavior.

## Prototype 0.0.106 — Demo sound design

- Original, lightweight Web Audio sound effects for four spell schools, impact and kills, taking damage, opening/choosing upgrades, trail clears, the upgrade power burst, Wyrm appearances, hunt start and run outcomes.
- Combat audio follows actual simulation snapshots with per-event cooldowns and a bounded voice budget. Audio never influences the deterministic run state.
- A touch-friendly SFX ON/OFF control persists the player's preference. Browser sound playback starts only after a user gesture; unsupported or blocked audio never prevents play.
- These sounds are intentionally replaceable prototype assets. No third-party sound files or licences are bundled, and no background music is included yet.

## Prototype 0.0.99 — The unfolding hunt

- A dark hunter’s chart replaces the compact parchment diagram: geometric terrain, landmark trails, school accents and a copper travelled path. The map scrolls toward the hunter after each clear; the lair starts off-screen. Header and reward panel stay fixed, with manual scrolling and reduced-motion support.
- Six shorter trails replace four long encounters. Three opening routes lead into wider forks, committed stretches and occasional crossovers. The final assault and school guarantees remain.
- [Campaign pacing evidence](docs/playtesting/unfolding-hunt-0.0.99.md): in the extended matched sample, 9/64 fresh agents reach and defeat a Wyrm, previously 0/64. Human engagement remains unverified.

## Prototype 0.0.98 — Reliable opening trail recovery

- Depth 1 common trails restore 10% of maximum health when cleared; rare trails retain their 12% recovery. The existing map preview displays the reward. Deeper routes keep their existing recovery variety.
- Recovery is capped at maximum health and cannot revive a defeated hunter. Enemy pressure, XP and draft rules stay unchanged.
- [Matched portrait samples](docs/playtesting/trail-recovery-0.0.98.md): fresh median survival rises from 42.4s to 45.0s, with no additional trail clears. The first-hunt milestone remains open.

## Prototype 0.0.97 — Earlier opening upgrades

- The first two run-level upgrades cost 6 and 10 collected XP, previously 10 and 15. Level three onward keeps its existing costs. Opening reinforcement arrives sooner without adding XP or changing enemy pressure.
- Collected XP still counts in full toward Hunter progression, including XP spent on run levels.
- [Matched portrait samples](docs/playtesting/opening-xp-0.0.97.md): fresh first upgrades rise from 47/64 to 57/64, second upgrades from 25/64 to 47/64. CI records these cohorts for gameplay PRs. The first-hunt milestone remains open.

## Prototype 0.0.96 — Useful opening reinforcement

- The first two normal upgrade drafts prioritise an existing spell upgrade in the Reinforce slot. If route attunement already took that upgrade, immediate damage or cast speed takes its place. Later drafts retain their broader rune pool.
- Chosen-school guarantees, content unlocks, crowd pressure, spell stats and evolution drafts remain intact.
- [Matched portrait simulations](docs/playtesting/opening-drafts-0.0.96.md): fresh second-trail clears rise from 1/64 to 4/64; no fresh agent reaches a Wyrm yet. The first-hunt milestone remains open.

## Prototype 0.0.95 — Compact nickname and side-by-side combat HUD

- The player nickname is a small top-left label with a pencil button. Its editor opens on demand; the nickname persists in a one-year SameSite cookie, migrating the previous local save.
- Shared client/server nickname validation rejects common Dutch/English profanity and simple digit/separator disguises while allowing ordinary names. Existing flagged leaderboard rows are hidden.
- The trail panel sits to the right of player vitals again. Compact spell badges wrap within their own panel, and phase cues follow the actual HUD height.

## Prototype 0.0.94 — Player identity and clean overlays

- Edit the saved player nickname on the main screen. Completed hunts save locally and submit scores automatically with the actual release version; failed submissions retry with their original ID. The board refreshes while open.
- Eight distinct vector spell icons have separate rank badges; evolved spells retain a highlighted border and accessible lineage name.
- Enemy status badges stay inside the arena and clear while paused or ended, preventing them from appearing above upgrade choices. Run depth now renders correctly.
- Leaderboard retry tests and mobile browser checks cover name persistence, vector badges and paused status rendering.

## Prototype 0.0.93 — Use the first reward before the crowd surges

- Depth-one crowds ramp through 8 / 10 / 14 / 22 enemies. Spawn interval multipliers taper through 1.75 / 1.60 / 1.30 / 1.00. Deeper hunts, phase gates, kill quotas and the final trail retain their pressure.
- Upgrade cards lead with the behaviour gained: piercing, a wider bolt, impact blast, freezing nova, forked lightning or the actual freeze duration / chain target count.
- Ordinary upgrades use a compact icon-and-effect confirmation, replacing generic new-spell copy. It appears below the combat HUD, passes touches through, and respects reduced motion. Evolution retains its existing ceremony.
- [Matched simulation results and first-hunt limitations](docs/playtesting/first-reward-payoff-0.0.93.md).

## Prototype 0.0.92 — Time to escape a stacked hit

- Actual health loss grants 0.35s of damage protection. Simultaneous damage uses the strongest source, so overlapping enemies cannot add their contact hits together and a weak hit cannot hide a heavier attack.
- Enemy and Wyrm contact damage is delivered in spaced hits at the existing single-source damage-per-second rate. Contact still kills if the hunter stays inside danger; the grace period freezes during menus.
- Existing wards and reductions remain in the damage path. No text or input-blocking overlay is added; the existing hurt and health-ring feedback responds to each actual health loss.
- [First-hunt survival evidence and limitations](docs/playtesting/first-hunt-survival-0.0.92.md).

## Prototype 0.0.91 — A foothold before the first reward

- The first trail at depth one caps its crowd at eight and spaces spawn batches 75% further apart. Phase timing, kill quotas and later trail pressure remain intact.
- Arcane Orb II now pierces one extra target; rank III retains its wider bolt. Frost Shard hits for 16 instead of 12, with a 0.70s base freeze instead of 0.53s.
- BalanceLab accepts portrait arena dimensions and a fresh-hunter mode with zero Atlas points and the actual base unlock pool.
- [Matched before/after simulation results](docs/playtesting/opening-balance-0.0.91.md) show improvement while retaining the limitations of heuristic agents.

## Prototype 0.0.90 — Damage and critical-health awareness

- Damage briefly colors the player and reveals a nearby health ring. Sustained contact cannot create rapid repeated flashes.
- Below 35% health the amber ring and restrained edge tint persist; below 15% a red broken outer ring remains visible even with almost no health left.
- Critical tint breathes slowly, respects reduced-motion preferences, and leaves the arena centre clear. Paused/ended runs suppress the effects; recovery clears the low-health warning.
- All cues render on the existing arena canvas and cannot intercept pointer input. Regression tests cover damage, thresholds, healing, pause/death, health-cap changes and the shipped mobile renderer/input flow.

## Prototype 0.0.89 — Relic setup and payoff

- Emberheart turns burning kills into spreading explosions; Duelist Lens turns chilled/frozen kills into shattering, slowing bursts. Both scale with spell damage and their school upgrades, with distinct artless fire/frost feedback.
- Relic caches offer a school-relevant power option when unlocked and unowned, alongside survival/mobility alternatives. Route caches use the chosen school; other caches use the strongest learned school. Unlock gates remain intact.
- Results show the strongest burst relic's actual damage, kills and activations; detailed totals survive replacing a relic. These totals exclude passive stat bonuses and damage-over-time, rather than claiming total relic contribution.
- Lightning now triggers generic on-hit relic rules. Vitalstone heals its maximum-health increase only on acquisition, preventing checkpoint swap healing.
- Deterministic regression tests cover dense chains, overkill attribution, status/radius gating, unequipped relics and queued bursts crossing a Wyrm phase break. Simulated runs and agent critiques identify mechanical problems; they are not proof of human enjoyment.

Wyrmforge is an experimental C# action roguelite about shaping a mage, hunting Wyrms, stealing their Essence and deciding how deep to risk a run. Mechanics and architecture come before final art.

## Prototype 0.0.86 — Hunter progression and trail rewards

Collected hunt XP also advances a permanent **Hunter level**, separate from the temporary combat level. Quest claims grant Hunter XP and specific relic caches. Hunter levels unlock one Arcane point each, up to the current 24-point Atlas budget; levels 5, 10, 15 and 20 also grant a relic cache. Home shows the Hunter level and XP; results show XP earned and actual points gained; the quest screen names the next reward. Existing saves keep their Atlas budget and allocations without inventing historical XP. Claims, XP, point budget and unopened caches persist in a single save record.

Trail clears wait for **Continue**. Every cleared elemental trail gives an immediate upgrade draft with a guaranteed choice from that school, independently of the next XP level. Active trail level-ups also guarantee that school. When all school spells and supporting runes are maxed, a school damage attunement remains available. The four trails now progress through skirmish, horde, ambush and heavy assault, with different spawn directions and a final Brute insertion; trails two and four guarantee relic caches.

Relic drafts offer power, survival and mobility roles when the remaining unlocked pool permits it. Relics have concise, numeric effects, including burn, shock and echo rules. Full slots require an explicit replacement that equips immediately; the previous relic stays in the pack for Refuge. Earned XP survives retreat; quest progress banks on defeat or extraction. Developer hunts remain isolated from permanent progression.

[Progression and encounter research](docs/playtesting/hunter-progression-0.0.86.md)

## Prototype 0.0.85 — Mobile game menus

A compact main menu replaces the dashboard rail and mobile tab bar. Begin Hunt stays prominent; chapter gates, available Arcane points and secured Essence appear beside their destinations. WyrmForge uses a rune mark, restrained gold accents and serif headings without requiring artwork. Forge and Codex show one category at a time; preparation, offerings, Ascendant rites and goals remain available on dedicated screens.

The full connected Arcane Atlas and in-run route map are preserved. The Atlas uses the space freed by navigation, with 44-pixel zoom controls and a bottom inspector. Safe-area padding and short-portrait/landscape layouts support mobile browsers and future store wrappers. Native iOS/Android packaging is a later delivery; this release ships the web UI.

## Prototype 0.0.84 — First Hunt: chapter unlocks, route transitions and Hall of Fame

New accounts begin with an actual guided First Hunt rather than a menu full of unexplained systems. The Build/Arcane Atlas, Forge and Codex are initially padlocked, leaving the Run as the first action. A First Hunt ends when the player dies or slays their first Wyrm; manual abandonment does not complete the tutorial. The game fades to black, rumbles, says **IT DOESN'T END HERE**, returns to the Run Hub and opens the Atlas and Codex with a simple padlock animation. One Arcane point becomes available and is called out in the HUD and Run Hub.

The Forge remains locked until a player returns with a secured Wyrm Essence. The completed second run unlocks the **Hall of Fame** and a score comparison. Fictional starter names are prominently marked **LEGEND · DEMO** and live only in the browser; real opt-in scores are written to the separate Cloudflare D1 leaderboard table. Publishing a pseudonym requires express consent; scores are **COMMUNITY · UNVERIFIED** until we have server-authoritative run validation. No private feedback reports are exposed. In an outage, an explicitly published score can be retained on that device only and must be labeled local-only.

Existing WyrmForge accounts with progress migrate past onboarding with their prior access. Arcane build budget and allocated nodes now persist across refresh. The underlying combat still collects loose XP and removes remaining minions/projectiles when a trail finishes; a power burst/blackout now holds the transition before the next route map. Both animations honor reduced-motion preferences. Playtest feedback also guards against accidental duplicate sends and preserves retry identity without storing comment text in the receipt.

## Prototype 0.0.83 — Development Hunt Trials (no grind)

The existing public **[Balance Lab](https://pjotrcasteel.github.io/Wyrmforge/balance-lab)** now includes an isolated Wyrm encounter test bench for developers.

- Directly start any of the four ordinary Wyrms, or both implemented Ascendant encounters (Ashfang and Stormcoil), at Depth II without playing the earlier routes.
- Choose the opening phase, seed, existing Arcane build and heuristic agent. Every trial gets the associated school spell at Rank III with an actual base evolution, rather than artificially granting saved Forge or player power.
- Run the *actual combat simulation* headlessly in **portrait (390 × 844) and landscape (844 × 390)** with the same seed. The agent makes movement decisions. Report victory, death, phase-two reach, minimum HP, damage, simulated time, signature warning frames, player overlaps with pending/armed warnings and observed attack windows.
- A mobile-friendly, seeded attack-location preview shows the real signature planner's geometry. A **Watch autopilot cinematic** link launches a separate [Hunt Lab](https://pjotrcasteel.github.io/Wyrmforge/hunt-lab) using the **real canvas renderer, animated entrance, phase breaks and Wyrm AI** with agent-driven movement—without asking a human to play or risk a save. Invulnerable practice can help capture more attacks but must never be treated as fair survival evidence.
- Developer trials bypass persistent progression and never grant Great Hunt oaths, Essence, trophies, or playtest telemetry. All ordinary-game startup, achievements and saves remain untouched.
- This supports iteration on difficulty and mobile reachability without repeatedly losing a real run. It cannot objectively determine subjective fun, cinematic appeal or real-touch comfort; those remain complementary visual/playtest gates.

The original headless self-play and Combat Lab are retained. The remaining Rimeclaw/Voidweaver Ascendants and later Elder Wyrms can enter the same bench when their actual combat content is implemented.

## Prototype 0.0.82 — Ascendant Stormcoil: Stormbound Halo

**The next playable Great Hunt challenge** builds on the existing oath, Mastery and Ascendant architecture instead of adding a prestige currency.

- Seal the **Oath of the Unbroken Sky** to invoke **Ascendant Stormcoil** from the Run Hub; the Ashfang rite remains available and choosing either deselects the other. Ordinary runs and Depth I remain unchanged.
- At the Depth II gate, a chosen Ascendant forces its corresponding Wyrm once per run. Stormcoil receives an extended, school-colored cinematic reveal and a distinct **Skybreak Crossing** signature: a warning corridor of lightning runs horizontally, then vertically; phase two adds an angled third crossing. Telegraphs and strike radii are scaled for portrait and landscape movement.
- Winning permanently awards the **Stormbound Halo** trophy, celebrated post-run and displayed at the Great Hunt altar. Saved Ashfang crowns and sealed oaths remain compatible with the existing v1 save record.
- All four ordinary Wyrms retain their signatures. The other two Ascendants are **not** represented as playable yet; Rimeclaw, Voidweaver and Elder Wyrms remain future milestones.
- Deterministic attack geometry, exclusive rite selection, persistent reward semantics and mobile/browser coverage are included. Balance and actual player experience remain subject to feedback; no flat account stat bonuses are awarded.
- The existing consent-only 0.0.81 playtest collector stays live. Reports include game version; first-cohort feedback must be interpreted carefully if testers played different deployed versions.

**Next:** validate mobile readability and intensity in human testing while returning to the two remaining distinct Ascendant encounters, then Elder Wyrms. Keep Build Evolution open for future mechanical branches.

## Playtest feedback insights — scheduled aggregation

The external playtest collector can now produce an automatic, privacy-safe development summary without exposing individual tester records. A scheduled GitHub workflow queries aggregate counts, ratings and recent-run metrics through Cloudflare D1, excludes the owner's synthetic integration test, and publishes only aggregate data after a ten-report privacy threshold.

- [Automated insight pipeline and privacy boundaries](docs/playtesting/insights-automation.md)
- Once the first cohort reaches the threshold, review `playtest-insights/docs/playtesting/insights/latest.md` on the separate GitHub branch.
- The public report contains no verbatim comments or reproduction seeds. Access those only through the existing private Cloudflare owner tools when necessary.

## Prototype 0.0.81 — Private, consent-only feedback collector

- A separately deployable Cloudflare Worker + D1 database accepts **only reports sent via the explicit in-game consent checkbox**, validates/sanitizes the `wyrmforge.playtest.report.v1` schema and saves them for up to 30 days.
- Anonymous report intake uses exact-origin CORS, capped request bodies, an hourly HMAC rate limiter, no raw IP storage, idempotent report IDs and no analytics tracking SDK.
- Owner-only admin endpoints aggregate feedback and allow private export/deletion. The administrator token is never shipped with the game.
- The Send button appears only once `WYRMFORGE_FEEDBACK_ENDPOINT` is set for GitHub Pages. Share/download JSON remains usable at all times and on failure.
- Deployment needs a Cloudflare account with a real D1 database and provisioned GitHub secrets. **Building this milestone does not automatically provision an external Cloudflare account or enable intake**. See [collector deployment guide](docs/playtesting/collector-deployment.md).
- Shared C# gameplay and planned native iOS/Android adapters are unaffected.

### 0.0.80 — Community playtesting and evidence

Before another Wyrm chapter, WyrmForge now has a built-in, mobile-first playtest loop.

- Run Hub and post-run screens offer a one-minute feedback survey for external testers (enjoyment, clarity, replay intent, trouble area and optional comments).
- The browser keeps **local-only** anonymized run and funnel evidence: recent run outcomes and seeds, trail/Wyrm gates, depth, Essence, evolved spells and sparse frame-performance samples.
- Testers decide whether to include run data and explicitly **share a JSON report** through the native phone share sheet, or download it to send to the playtest organizer. No server-side telemetry or automatic uploading is represented as enabled.
- Reports can be deduplicated and summarized offline with `python3 tools/playtesting/analyze.py playtest-reports/`. Reports are ignored by Git.
- `docs/playtesting/community-round-1.md` sets the first external testing protocol and pass/fail gates.
- `docs/design/mobile-platform-roadmap.md` establishes iOS and Android releases as explicit future goals without forking deterministic C# gameplay.

**Next release depends on feedback evidence.** Keep Ascendant/Elder Wyrms, Build Evolution expansion and native packaging on the roadmap, but prioritize blockers revealed by testers.

### 0.0.79 — The First Ascendant: Crown of Embers

The first playable Great Hunt rite begins after the Oath of the First Flame is sealed. The Run Hub exposes an opt-in Ascendant Ashfang encounter; regular hunts and early progression remain unchanged.

- Invoke the rite in the Run Hub to guarantee **Ascendant Ashfang at the Depth II Wyrm encounter**. The Depth I fight remains ordinary, so building/evolving a spell and reaching the second depth are part of the challenge.
- Crownfall is a distinct signature: sequential rows of warning circles leave one shifting safe lane; the second phase adds a third wave. Distinct gold telegraphs, crowned Wyrm silhouette, longer entrance and phase-break presentation communicate the upgrade.
- Victory earns the **permanent Crown of Embers trophy** in the Great Hunt altar. It saves within the existing v1 Great Hunt record as an optional field, with no new currency or power inflation. The rite remains replayable.
- Existing Ashfang Essence and Spell Mastery systems continue to work. Defeats are captured in the run summary at kill time and credited once, with abandoned runs excluded from persistent progress.
- Normal runs do not opt into the challenge and retain their original seeded combat behavior. Portrait and landscape Crownfall safe-lane tests and a mobile unlocked-rite browser check protect accessibility.

The three remaining Ascendant encounters and Elder Wyrms are intentionally not misrepresented as implemented. Build Evolution remains expandable.

### 0.0.78 — Mobile combat HUD and post-run clarity

- The score, health, experience and spells now share one responsive HUD surface alongside the current trail objective. Encounter progress stays live; there are no overlapping floating blocks.
- The Exit text button becomes an accessible running/retreat icon with a 44px mobile touch target. The action still abandons the run.
- Post-run results lead with score, build, journey, earned Mastery and cinematic unlocks; Replay and Return are visible without first scrolling on a typical phone.
- Spell/relic/synergy inventory and the three long-term pursuit goals remain available in optional expandable report sections rather than filling the entire initial results screen.
- Mobile browser coverage checks aligned HUD sections, retreat affordance, immediately visible results actions, expanded report access and return to Forge.

### 0.0.77 — The Great Hunt: Four Ancient Oaths

The Forge now holds a living Great Hunt altar. Its four permanent, Wyrm-specific oaths connect ordinary hunts and existing Spell Mastery to long-term aspirational seals. No new currency, flat account-stat inflation or disconnected prestige loop is introduced.

- Each Wyrm demands four **independent deeds**: slay it, secure any of its Essences, defeat it at Depth II+ with a matching-school Rank III evolved spell **already evolved at kill time**, and awaken its associated Wyrmforged Spell Lineage.
- Deeds persist across meaningful runs in `wyrmforge.greatHunt.v1`. Existing Forge discoveries backfill historical kills and secured Essence; unreconstructable evolved duels are never fabricated.
- One Great Hunt pursuit now appears alongside a Forge goal and a Spell Mastery goal in the three-horizon hunt board. The Codex and a collapsible Forge sanctum altar let hunters inspect every oath, its exact conditions and the next actionable step.
- Completing an oath earns a permanent illuminated ceremonial seal, with a post-run discovery reveal and an enduring Forge/Codex trophy. The progression unlocks the **preparation** for its Ascendant route; it does **not** pretend an Ascendant boss is playable yet.
- Deep evolved duels are captured at the exact Wyrm defeat moment, maintaining deterministic simulation and preventing retroactive Rank III/evolution credit.
- Mobile-friendly selectable sigils, concise altar stage and reduced-motion treatment; no combat viewport overlays.
- The next combat milestone turns prepared Ascendant seals into **distinct mechanically new encounters**, then progresses toward Elder Wyrms. Build Evolution remains extensible.

### 0.0.76 — Spell Mastery & Wyrmforged Lineages

Persistent spell growth now gives the next few hunts a specific purpose. Repeated **meaningful** use of a spell and a matching Wyrm feat awaken a rare new evolution that enters future Rank III crossroads. This is a new *possibility*, never a flat permanent damage bonus.

- **Four new Wyrmforged evolutions:** Fire Bolt → Wyrmfire (Ashfang); Frost Shard → Glacial Requiem (Rimeclaw); Chain Lightning → Tempest Ascendant (Stormcoil); Arcane Orb → Void Constellation (Voidweaver).
- Each lineage requires **four meaningful hunts** featuring its spell at Rank II+ and **defeating its associated Wyrm with that spell at Rank III**. Both objectives can progress in any order.
- A meaningful hunt must clear at least one trail; abandoned runs and instant restarts award no mastery. A run awards mastery at most once, with duplicate game-over notifications guarded.
- Spell mastery survives reloads using a versioned local save key and can be restored independently of existing Forge and Codex data.
- The Codex shows evocative clues, progress toward both requirements and only reveals the evolved form once earned.
- The Run Hub, Forge's Hunt Ledger and post-run results now mix Forge objectives with long-term spell mastery goals instead of showing only Essence tasks.
- An earned lineage receives a large post-run discovery moment and immediately becomes eligible for future evolution choices. The normal two-base-branch choice remains intact for fresh players.
- Great Hunt / Ascendant Wyrms and mastery coverage for additional spells remain later content/endgame work; this milestone establishes the proven long-term unlock loop.

### 0.0.75 — Forge 2.0

The Forge now provides **three actionable next hunts** before and after a run, and within the Forge itself. Goals are based on actual discovered Wyrm lineages, required secured Essence, and unfinished masteries—not daily chores or flat account-stat rewards.

- Completing one of the four Wyrm masterwork lines permanently unlocks a third evolution for its spell: **Ember Tempest** (Cinder Needle), **Thunder Crown** (Ball Lightning), **Crystal Divide** (Ice Lance), or **Mirror Choir** (Aether Dart).
- The new branches are excluded from runs until forged. The Codex hints at locked Forge blueprints, while the Forge previews the exact new possibilities.
- Each Forge mastery gets a clear celebration showing what was unlocked.
- The Run Hub, Forge and post-run report expose up to three immediate hunt/Essence/Forge targets, with a clear ready-to-forge state.
- Existing saved Forge masterworks automatically confer their new evolution blueprints; no save migration is necessary.
- Spell Mastery, hidden Wyrmforged Lineages and the Great Hunt remain future layers in the established roadmap. Build Evolution stays open for more mechanical depth.

### 0.0.74 — Build Evolution

0.0.74 turns Rank III from the end of a spell's run progression into a crossroads. Every current spell now has two mutually exclusive evolutions that change how it behaves for the rest of the run.

### Spell evolution

- Reaching Rank III immediately opens a dedicated **Spell Evolution** choice instead of consuming another level or waiting for a random future draft.
- The two branches are shown together; choosing one closes the other for that run.
- All 8 current spells have two base branches, creating 16 distinct evolved forms.
- Evolutions are spell-scoped and stack with global runes, Atlas passives, relics, Synergies and Essence instead of replacing those systems.
- Evolutions can alter damage, cadence, projectile count, speed, radius, pierce, chain count/falloff, splash, Frost nova radius and status behavior.
- The HUD uses the evolved icon, the run report records the evolved form, and choosing an evolution now gets its own skippable, school-themed transformation and confirmation.
- Balance Lab records evolution activation and per-evolution outcomes so sister branches can be compared instead of balanced by intuition alone.

### Base evolution branches

- **Arcane Orb:** Rift Spear / Star Swarm
- **Fire Bolt:** Meteor Heart / Phoenix Volley
- **Frost Shard:** Shatterglass / Winter Bloom
- **Chain Lightning:** Tempest Web / Thunderhead
- **Cinder Needle:** Wildfire Needles / Ashstorm
- **Ice Lance:** Permafrost Spear / Hailbreaker
- **Ball Lightning:** Storm Core / Overcharge
- **Aether Dart:** Phase Barrage / Markstorm

These sixteen are the always-available base evolution vocabulary. Future **Wyrmforged Lineages** can add new branches into the same crossroads without changing the run flow.

### Long-term motivation contract

WyrmForge's persistent progression must create **new possibilities, discoveries and aspirational goals**, not a mandatory account-level stat treadmill. The target experience is:

**Goal → Run → Progress → Achievement → Celebration → New possibility → New build idea → Goal**

After the meta-game is complete, a player returning from a run should normally be able to name at least three meaningful things they want to pursue next. The existing roadmap builds toward that:

- **0.0.74 Build Evolution** establishes meaningful run-level transformations and the branch system future Lineages can extend.
- **0.0.75 Forge 2.0** should make secured Essence unlock possibilities and visible goals: evolution branches, spell/relic pools, offerings, challenge access and discovery—not permanent flat damage.
- Later existing content/endgame work should layer spell Mastery history, hidden Wyrmforged Lineage requirements, Codex hints, Wyrm feats, Ascendant/Elder hunts and Great Hunt-style objectives on the same progression model.
- Major discoveries should be celebrated loudly and immediately create a new thing the player wants to try.

The detailed contract is documented in `docs/design/long-term-progression.md`.

### 0.0.73 — Wyrm Hunt 2.0

0.0.73 makes the Wyrm at the end of a depth a distinct encounter rather than a larger enemy with different numbers. Existing entrances, arenas, movement styles, attacks and protected 50% phase breaks remain, but every Wyrm now adds a signature movement puzzle that escalates in phase two.

### Signature hunts

- **Ashfang — Cinder Sweep:** captures the hunter's position and erupts a delayed line of fire through it. The answer is lateral movement; phase two adds another eruption and tightens the cadence.
- **Stormcoil — Tempest Cage:** forms a ring of lightning around the captured position. Phase two closes the pattern with more strikes and shorter recovery.
- **Rimeclaw — Glacial Wall:** cuts across the arena's short axis with one deliberate escape gap. Segment radius adapts to the arena shape so the gap remains fair on mobile and desktop.
- **Voidweaver — Rift Echo:** strikes the captured position and its mirrored point; phase two adds a delayed center echo.
- Signature schedules are deterministic for seeded runs and coexist with each Wyrm's existing movement, normal attack and environmental pressure.
- Phase two increases signature damage, radius, strike count and/or cadence without replacing the Wyrm's original identity.

### Hunt readability and evidence

- Signature telegraphs have distinct visual languages instead of reusing one generic warning circle.
- The boss bar names the active signature mechanic.
- Entrances introduce the signature and each Wyrm has its own phase-two callout.
- Balance Lab now separates **Wyrm reach** from **conditional Wyrm win rate** and reports first-Wyrm outcomes individually, so pre-hunt failures and specific hunt problems can be analyzed independently.
- Signature profiles, phase timing and all four deterministic pattern planners are unit-tested.

### Future Build Evolution direction — not part of 0.0.73

The planned Build Evolution / Forge work keeps **Spell Lineages / Wyrmforged Evolutions** alive as a future system. Repeated meaningful use of a spell plus thematic Wyrm achievements may unlock new evolutionary possibilities for future runs rather than permanent flat-stat power. Example direction: mastering Fireball across many runs and defeating a Fire Wyrm with a Fireball-centered build could unlock a Wyrmfire lineage. This is deliberately postponed until the Build Evolution milestone.

### 0.0.72 Combat Director

0.0.72 turns route combat from a continuous spawn timer into deliberate, deterministic encounter pacing. Each combat trail now advances through **Pressure → Escalation → Breathing Room → Surge → Climax** according to kill-objective progress rather than elapsed run time.

### Combat Director

- Encounter phases are driven by objective progress, so slow/control builds are never punished merely for taking longer.
- Pressure begins slightly restrained, Escalation tightens cadence, Breathing Room pauses new spawns briefly, Surge raises pressure and Climax closes the trail decisively.
- Swarm preserves its mass identity with larger late batches; from Depth 2 its climax may add a Brute.
- Stalker Pressure inserts deliberate Rift Stalker complications during escalation/surge instead of becoming a generic faster spawn stream.
- Mixed pressure combines the normal roster with late complications, using Brutes only when they are depth-eligible.
- Existing route modifiers, stage/depth scaling, active-enemy caps and threat-budget composition remain authoritative.
- Enemy health, damage and school values are intentionally unchanged in this milestone.
- The combat HUD exposes the active encounter phase so pacing transitions are readable during play.

### Balance and browser evidence

- Self-play now records Wyrms reached, first-Wyrm timing, breathing rooms and climaxes.
- Balance reports expose Wyrm reach separately from extraction, distinguishing pre-hunt encounter failures from Wyrm-fight failures.
- The browser smoke suite now captures active combat on both 390×844 mobile and 1440×900 desktop viewports in addition to the Arcane Atlas.
- Director phase transitions and pattern-specific complications are unit-tested and remain deterministic.

### 0.0.71 encounter pacing fairness

0.0.71 removed a hidden anti-control feedback loop from encounter scaling. Enemy health, speed and spawn cadence previously increased with total elapsed run time, so slower/control builds faced stronger and faster enemies precisely because they took longer to clear a kill objective. Pressure now scales with route stage and depth instead.

### Encounter pacing fairness

- Enemy health no longer scales continuously with elapsed run time.
- Enemy speed no longer scales continuously with elapsed run time.
- Spawn cadence no longer accelerates merely because the player took longer to clear a route.
- Within a depth, route stages 1–4 now deliberately ramp health, speed and spawn cadence.
- Depth multipliers, route modifiers, encounter archetypes, active-enemy caps and horde batch sizes remain intact.
- This preserves the horde feel while removing the positive feedback loop that punished slower Frost/control builds.
- Stage-pressure rules are explicit and unit-tested so future balance work can reason about them independently of simulation time.

### School identity balance

- **Arcane Reservoir** now adds +1 projectile pierce alongside ×1.20 projectile speed.
- **Prismatic Volley** seeks separate nearby enemies instead of fanning all projectiles around one target.
- **Astral Barrage** uses the same seeking behavior with five projectiles.
- **Arcane Echo** now triggers every 4th cast instead of every 6th; its normal echo remains 60% damage and Echo Chamber still produces two full-damage echoes.
- **Deep Freeze** now triggers every 3rd hit and freezes for 1.75 seconds.
- **Absolute Zero** converts that control into ×2.5 damage against Frozen enemies.
- **Winter Shell** prevents damage for 0.65 seconds when the ward triggers, so continuous contact damage is treated as one meaningful hit window rather than dozens of 50ms ticks.
- Fire and Storm passive values are intentionally unchanged in this pass. Balance Lab measures whether identity improvements close the gap before any ceiling nerfs are considered.

### Passive fidelity fixes

- **Detonation** now creates an actual area explosion every 4th hit instead of only multiplying the direct target's damage.
- **Volcanic Heart** upgrades that Detonation explosion to a larger radius and ×2.5 damage.
- **Ice Armor** now grants a real 1.35-second barrier that reduces incoming damage by 40%; previously its barrier flag was visual only.
- **Winter Shell** now begins charged, absorbs one full hit, and independently recharges after 5 seconds instead of accidentally interacting with Ice Armor's short barrier.
- **Arcane Echo** explicitly fires one 60%-damage echo every 6th cast.
- **Echo Chamber** now fulfills its Keystone promise by firing two full-damage echoes on the Arcane Echo trigger.
- Shared passive-effect resolution is unit-tested, while Winter Shell readiness and Detonation splash are covered through the live simulation.
- No Fire/Storm/Frost/Arcane travel-node percentages are changed yet; Balance Lab reruns after these correctness fixes decide whether number tuning is still required.

### Baseline integrity

- **KeystoneRoute** compares eight single-school Keystone routes at exactly **10 Arcane points** each.
- **FullBuild** compares four adjacent two-school hybrid plans at exactly **20 Arcane points** each.
- Reports include cohort and spent Arcane points so unequal-budget comparisons are visible instead of implicit.
- Tests fail if a cohort drifts to mixed budgets.
- Balance interpretation now explicitly requires comparing builds within the same cohort and agent.
- The first 0.0.67 data remains useful as instrumentation validation, but is not used to nerf/buff builds.

### Self-play and balance instrumentation

- A public `IRunAgent` contract receives player-visible run observations and makes movement, route, draft, relic, Essence and Refuge decisions.
- Four deterministic heuristics model different play styles: Casual, Kiter, Greedy and BuildFocused.
- Six representative Arcane builds cover single-school and hybrid Keystone goals.
- `RunSelfPlayDriver` executes the real `RunSimulation` without renderer shortcuts and records kills/min, XP/min, health pressure, damage taken, level cadence, peak enemies, routes, Wyrms, Essence and decisions.
- `Wyrmforge.BalanceLab` runs build × agent × seed batches and exports JSON, CSV and Markdown summaries with medians, P90 depth and outcome rates.
- Pull-request validation produces a small balance artifact; main builds can produce a larger baseline matrix through the Balance Lab workflow.
- Playwright browser smoke runs the published Blazor app at phone and desktop sizes, checks mobile overflow, captures the Arcane Atlas and route preview, and uploads screenshots plus traces.
- A developer-only `/balance-lab` screen can run a deterministic headless trial interactively next to Combat Lab.
- 0.0.67 intentionally makes **no gameplay balance changes**; it establishes the baseline first.

### Arcane readability fixes

- Minor nodes show their effect directly inside the circle: e.g. cast speed, spell damage, vitality or projectile speed plus the value.
- Hybrid travel nodes show both minor effects as compact icon/value rows.
- Travel-node names and long descriptions no longer float over the graph, eliminating the overlap visible on mobile.
- Notables, Masteries and Keystones keep a short school icon + name on the Atlas and reveal their full effect on tap.
- Route preview now includes a **Minor bonuses on this path** aggregate before the defining landmarks.
- Intermediate Travel nodes are summarized instead of repeated as verbose route cards, making a planned Keystone path much easier to evaluate.

### Arcane planning fixes

- Tapping an Arcane node no longer spends a point.
- Any node, including distant Keystones, can be inspected before committing.
- The Atlas previews the cheapest valid connected route and its total point cost.
- Every node on the preview lists its actual effect and individual cost.
- Route allocation is explicit and atomic: either the whole planned route fits or nothing changes.
- Planned paths are highlighted separately from reachable and already-traversed paths.
- The mobile inspector is dismissible and no longer permanently covers the lower Atlas.
- Travel-node effects become visible when they are part of a planned route.
- Refuge Return/Descend comparison cards are now the actual actions, removing the duplicated choices below.

### Previous gate fix sequence

1. **Mobile Overlay Contract** — one iOS-safe scrolling model for Level Up, Relic Cache, Wyrm Harvest, Refuge and Run Summary.
2. **Experience Shards** — enemies drop physical XP that must be collected instead of granting XP directly on death.
3. **Horde Encounter Pacing** — larger encounter targets and composition-driven spawn batches.
4. **Combat Impact** — stronger kill, pickup and level-up feedback at horde density.
5. **Arcane Atlas** — bring the spatial/fantasy language of the Wyrmrealm map into the Arcane Web.
6. **Fun Ugly Gate** — repeated mobile/desktop playtests and a pass/fail decision.

The first fix establishes a shared overlay contract: the viewport layer owns scrolling, cards never create nested scroll traps, dynamic viewport height and safe-area insets are honored, and iOS momentum scrolling remains enabled.

The second fix moves XP into the battlefield. Enemy deaths now drop physical Experience Shards valued by enemy threat, shards magnetize toward the player within collection range, compact without losing XP when the loose-shard cap is reached, and remaining route XP is vacuumed before the next map decision. Level progression therefore follows **kill → collect → level → draft** instead of granting XP invisibly at death time.

The third fix replaces five-kill skirmishes with encounter-specific horde objectives. Depth-one Stalker, Mixed and Swarm trails require 12, 16 and 20 kills respectively and scale with depth. Spawning now happens in pattern-specific batches—largest for Swarm, smallest for Stalker pressure—behind a deterministic active-enemy cap that grows from 22 at Depth 1 to 52 at Depth 4. The XP curve is retuned around the larger kill volume so draft pacing does not explode with the new density.

The fourth fix strengthens combat impact without adding final art. Chasers, Rift Stalkers, Skitters and Brutes now have distinct battlefield silhouettes and colors, higher-threat enemies produce heavier death bursts, XP collection creates player-centered pickup pulses, loose shards visibly pulse, and the level-up draft has a stronger transition moment. The intent is to make pack clears and collection readable at horde density without filling the screen with damage numbers.

The fifth fix turns the Arcane Web into the **Arcane Atlas**. It borrows the Wyrmrealm map's spatial language: chart contours, elemental territories, travelled paths and landmark hierarchy. The Wyrmheart becomes the visual origin, Keystones read as destinations rather than large buttons, and mobile controls float over the Atlas instead of consuming a toolbar row. On phones the contextual node inspector becomes a compact bottom sheet above game navigation so the Web owns most of the viewport.

### Moment feedback

Short non-blocking callouts now mark the events that should matter during combat:

- entering a Rare trail;
- learning a new spell;
- reaching a spell mastery rank;
- awakening a Synergy;
- claiming a Rare rune;
- taking a relic;
- stealing Wyrm Essence;
- successfully securing Essence;
- healing at Refuge;
- descending into a deeper layer.

Common numerical upgrades remain quiet so the important moments keep their weight.

### Wyrm harvest and extraction

The Wyrm harvest flow now makes the risk sequence explicit:

**Wyrm slain → choose Essence → hold evacuation → Refuge secures the haul**

Selecting an Essence immediately starts evacuation and clearly marks that Essence as **at risk**. Completing the ritual changes the run HUD to **secured**, making the extraction rule visible without needing prior knowledge.

### Route and Refuge decisions

- Rare route inspection explicitly calls out stronger enemies, doubled route score and the relic cache.
- Entering a Rare route gets a dedicated run moment.
- Refuge now compares **Safe Now** against **Risk Next** before the action cards:
  - return to the Forge with secured Essence;
  - or keep secured Essence safe while risking the next haul for deeper rewards.
- Descending gets a clear transition callout with the new depth.

### Run story

The end-run report now summarizes the run as a story rather than only a ledger:

- dominant build identity;
- depth reached;
- Wyrms slain;
- Synergies awakened;
- rare trails cleared;
- Essence secured.

The detailed spell, rune, relic and Wyrm sections remain available underneath.

## Current top-level flow

**Run → Build → Forge → Codex**

- **Run** is the home screen and entry point into the Wyrmrealm.
- **Build** is the 49-node Arcane Web used to define pre-run intent.
- **Forge** owns secured Essence, lineage discoveries, Forge Mastery and Wyrm Offerings.
- **Codex** owns discovery/reference information for Synergies, spells, relics and Wyrms.

## Current run loop

1. Allocate a connected path through the Arcane Web.
2. Optionally carry a forged Wyrm Offering.
3. Choose routes through the Wyrmrealm.
4. Draft Reinforce, Converge and Venture rewards.
5. Adapt the build around spells, runes, Synergies and relics actually offered.
6. Build Resonance and attract a Wyrm.
7. Kill the Wyrm and choose one Essence.
8. Survive evacuation to secure that Essence at Refuge.
9. Return safely or descend with the previous haul banked and the next haul at risk.
10. Bring secured Essence back to the Forge for horizontal progression.

## Current systems

- 49-node Arcane Web with 24 points, hybrid paths, Masteries and Keystones.
- Structured three-role roguelike level-up draft with rarity and build-aware weighting.
- 8 spells across Fire, Frost, Storm and Arcane, each with two base Rank III evolution branches.
- 16 spell evolutions plus 12 temporary run upgrades.
- 8 relics.
- Status/interactions including Burning, Frozen, Chilled, Shocked and Arcane Mark.
- Cross-spell Synergies and Resonance.
- Four enemy archetypes and threat-budget encounter composition.
- Branching Wyrmrealm routes, modifiers, hazards and Rare trails.
- Four difficulty depths with finite trials.
- Four Wyrms: Ashfang, Stormcoil, Rimeclaw and Voidweaver.
- Essence Vault, Arcane Codex, four Forge lineages and 12 Forge Masteries.
- Seeded runs, replay support, run summaries and Combat Lab tooling.

## Balance workflow

Quick validation:

```bash
dotnet run --project src/Wyrmforge.BalanceLab/Wyrmforge.BalanceLab.csproj -c Release -- \
  --runs-per-combination 10 \
  --max-seconds 720 \
  --output artifacts/balance
```

The report contains raw per-seed runs plus grouped build/agent summaries. Compare builds inside the same agent first, then inspect suspicious seeds individually; the agents intentionally value survival, tempo and risk differently.

## Gate target

The complete loop remains:

**Forge → Arcane Web → route choice → run draft → Wyrm hunt → Essence risk → Refuge → descend/extract → Forge**

The gate passes when the prototype is enjoyable enough that starting another run is an attractive choice despite placeholder visuals. If a pillar fails, the next milestone targets only that failing pillar instead of adding content to hide it.

## Technology

- .NET 10
- C#
- Blazor WebAssembly
- HTML5 Canvas through thin JavaScript rendering/input adapters
- MSTest
- GitHub Pages

Gameplay rules remain in C# Domain/Application code. JavaScript handles Canvas rendering, input, diagnostics, Arcane Web viewport interaction and browser storage only.

## Local development

```bash
dotnet restore Wyrmforge.slnx
dotnet build Wyrmforge.slnx
dotnet test Wyrmforge.slnx
dotnet run --project src/Wyrmforge.Presentation.Web/Wyrmforge.Presentation.Web.csproj
```

## Foundation rules

1. A mechanic must be fun before it becomes pretty.
2. Mobile input and responsive layout are first-class requirements.
3. New content must create decisions or combinations, not merely inflate a list.
4. Persistent progression widens future possibilities rather than creating a mandatory permanent-stat treadmill.
5. Pre-run power comes from connected Arcane Web pathing and opportunity cost.
6. Run drafts present competing intentions, not three equivalent random cards.
7. Route choices influence later decisions as well as the immediate encounter.
8. Important state changes deserve feedback; common noise should stay quiet.
9. Extraction converts survival into a decision; secured loot requires successful evacuation.
10. Stop at assessment milestones and improve cohesion before expanding the feature surface again.


### 0.0.100 — generated territories and road choices

Hunts now generate seeded river, ridge and caldera territories with unequal encounter placement. Two major forks offer 2–4 committed roads: at least one short road (2 fights), medium roads (3), and occasional long detours (5) with a guaranteed additional relic cache. The quickest hunt has eight fights; detours add encounters and upgrades. Encounter icons remain readable on the map, and route previews show road length and rewards. Terrain and landmarks are structured data rendered as artless SVG, ready for a future art layer.
