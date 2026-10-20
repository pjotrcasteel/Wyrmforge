# WyrmForge — Dark Fantasy Audio Rebuild

> **Historical / supporting document (not canonical).** For current rules use [WyrmForge canonical documentation](../canon/README.md). This file preserves dated research, assets, implementation evidence or prior proposals; do not treat its status or plan as present-day product authority.


Status: **Research and listening gate — not approved for release.** Supersedes the procedural tone aesthetic of 0.0.108. The browser audio engine and iPhone silent-mode fix remain useful; the generated PCM samples are not the desired creative direction.

## North stars

- **Diablo (1996):** Matt Uelmen's twelve-string acoustic guitar, low flutes/ocarina, sampled acoustic material, heavily treated electric guitar and lonely, long-form ambience. The guitar does not need to be cheerful or the melody triumphant.
- **Diablo II (2000):** Found-object Foley, distinctive physical hits/loot, blended live instruments and samples, evolving industrial/ambient soundscapes and long percussion-led track crossfades.
- **StarCraft (1998):** The power of a recognizable instrument vocabulary per faction, not just a generic fantasy orchestra. Glenn Stafford's guitar-driven Terran palette is especially instructive; do not bring science-fiction synthesizer motifs into WyrmForge.
- **WoW mage / Skyrim combat:** Qualitative references for full-bodied elemental casting and environmental space. Never sample or remix copyrighted game audio.

Primary references:
- https://www.gamedeveloper.com/audio/audio-content-for-i-diablo-i-and-i-diablo-2-i-tools-teams-and-products (Matt Uelmen, 2001)
- https://www.gamedeveloper.com/audio/how-audio-design-enhances-diablo-2 (Diablo II sound-team interview)
- https://news.blizzard.com/en-gb/article/20722027/the-sounds-of-koprulu (Blizzard on StarCraft music identity)

**Target:** evocative, mature, melancholy and tactile. Never cheap beeps, generic triumphal fanfares, busy orchestral loops or recurring rewards every half second. Evoke the era and emotional purpose but do not reconstruct copyrighted melodies, performances, signature riffs or sound recordings.

## Licensed human-made candidate soundtrack — listen before adoption

These tracks are *candidates* surfaced from the source authors' descriptions and public license pages. They have NOT been auditioned/approved by the WyrmForge team or ingested as binary assets yet.

| Slot | Candidate / creator | License at source | Link | Why audition |
|---|---|---|---|---|
| Refuge / menu | **Osare (Unrest Theme)** — Brandon Morris (Augmentality) | CC0 (also offers OGA-BY 3.0) | https://opengameart.org/content/osare-unrest-theme | Guitar, bass, flute and melancholy; listener compared the result to Tristram |
| Alternate Refuge | **Town in Ruins Loop** — Brandon Morris | CC0 (also OGA-BY 3.0) | https://opengameart.org/content/town-in-ruins-loop | Quiet, tragic return-from-hunt mood |
| Hunt exploration | **Cave Theme** — Brandon Morris | CC0 (also OGA-BY 3.0) | https://opengameart.org/content/cave-theme | A longer mysterious atmospheric RPG composition |
| Dungeon tension | **Forgoten Tomb Ambience** — kindland | CC0 | https://opengameart.org/content/forgoten-tomb-ambience | Dark, chains, tomb depth; use low in mix rather than repeat at full volume |
| Ancient shrine / ritual | **Dark Shrine Loop** — qubodup / yd | CC0 | https://opengameart.org/content/dark-shrine-loop | Dark ceremonial palette for Wyrm or Refuge encounters |
| Optional environmental underlay | **Loopable Dungeon Ambience** — JaggedStone | CC0 | https://opengameart.org/content/loopable-dungeon-ambience | Low-frequency cave wind and drips, below music and combat cues |

**Not recommended as a default repeat loop:** fast 160 BPM metal battle tracks; orchestral boss fanfares; short chiptune loops. A separate intermittent high-energy composition can be introduced after baseline listening.

## Licensed sound effects to audition

| Candidate pack | License | Link | Candidate usage |
|---|---|---|---|
| **JC Sounds — Fantasy SFX Pack Vol 1**, 58 authored effects | CC BY 4.0 — **credit JC Sounds and link source/license**; edits must be marked | https://opengameart.org/content/jc-sounds-fantasy-sfx-pack-vol-1 | Fire/ice/electric buildup + launch + impact, movement and shields. First to audition for spell quality. |
| **80 CC0 RPG SFX**, rubberduck | CC0 | https://opengameart.org/content/80-cc0-rpg-sfx | Secondary monster, general magic and impact layers |
| **Magic Spell SFX**, JaggedStone | CC0 | https://opengameart.org/content/magic-spell-sfx | Alternative arcane casting, less important than recorded physical timbre |
| **Kenney — Impact Sounds** | CC0 | https://kenney.nl/assets/impact-sounds | Physical hit layers under the magic, only if auditioned |

The actual sources must be downloaded from author-approved distribution pages, binary-integrity checked and transcoded into short mobile-friendly files. Do not claim human authorship for files whose provenance is uncertain. No Blizzard audio is permitted.

## WyrmForge sound identity, proposal

### Score: "The Wyrmrealm remembers"
- **Refuge:** fragile plucked strings and breath, long phrases, rarely resolving harmony. This is fragile safety, not a happy hub.
- **Trails:** 60–80% atmosphere (wind, spatial drips, intermittent dissonant drones), 20–40% sparse evolving motifs. Keep a meaningful but understated pulse as the player moves and survives.
- **Pressure escalation:** low percussion, rhythmic scraping or dark guitar textures; do not speed up background music with every enemy or turn an endless hunt into a boss-fight crescendo.
- **Wyrm arrival:** a noticeable drop in normal music, then a low rumble/ritual accent before a distinctive combat layer. Wyrms must have recurring sonic signatures.
- **After victory / Refuge return:** give 1–2 seconds of air/space; allow earned melody and soft quiet. Reward should feel like relief.
- **Death:** let the world fall away; avoid scolding, comical sting or overly bright downward chimes.

### Magic
- **Arcane:** wispy suction, resonating dimensional movement, dense non-pitched impact.
- **Fire:** low rushing flare, hot crackle and physical impact. Not a tiny click.
- **Frost:** wind rush + granular ice + high-frequency crack only at contact.
- **Storm:** fast crack + rolling residual electricity and mid-bass impact, constrained so it remains tolerable at high cast rates.
- Each school needs *cast / travel or sustain / hit* layering when the simulation can signal distinct phases.
- Repetition: rotating recordings and constrained concurrency; prioritize hits, damage and Wyrms over launch spam.

## Music director implementation contract

1. A single `IMusicDirector` / JS audio service owns state, not individual Blazor pages.
2. States: `Menu`, `Refuge`, `HuntLow`, `HuntPressure`, `WyrmApproach`, `WyrmCombat`, `RunEnd`.
3. Separate Music / Ambient / Combat / Interface / Moments buses with persisted independent volume/mute.
4. Browser audio must start only after an iOS gesture; keep the existing `navigator.audioSession.type = 'playback'`.
5. Music cues are streamed/decoded lazily, not loaded with all asset packs at startup. Same-origin hosted and independent from OpenGameArt uptime.
6. Transition crossfades approximately 4–8 seconds, percussion/ambience first where appropriate. No hard musical cuts unless a Wyrm dramatic entrance warrants it.
7. On pause/visibility changes, avoid duplicate music loops or reset; on death fade down without muting the audible death cue.
8. Define adaptive intensity through controlled layers or gain curves; avoid pitch/speed changes that make music seem sped up.
9. iPhone portrait and headphones must sound clear; test with speakers at moderate volume. Cap peaks and keep spell effects from masking music.
10. Credits / provenance file is machine-readable: source URL, author, license, local filename, imported date, SHA-256, changes/trim info.

## Listening gate: no release until tested

A/B original 0.0.108 sound against **real licensed** elements. In the first candidate pass only:
- One evocative Refuge/menu music option and one Hunt exploration ambience.
- Four spells with cast + impact recordings, instead of 17 synthetic stand-ins.
- Preview each asset individually in a non-production listening area; actual in-game pressure test follows.
- A 5–10 minute looping test: Can the player tolerate regular combat? Is anything too repetitive? Does the music support rather than distract?
- Test iPhone Safari with Silent Mode, and 320px portrait; compare against headphones if available.
- Record a qualitative decision **keep / revise / replace**, along with `fatigue`, `believability`, `magical power`, and `emotional immersion` rated 1–5.

Do not promote the prototype to main solely because build and browser CI pass. Sound quality is a human listening gate.
## Historical document status — updated 15 October 2026

This was an **initial research candidate / listening plan** in PR #94. That PR's docs were later merged for provenance, but actual **recorded licensed** music and sound entered the game independently in 0.0.109 and 0.0.110. Many tracks and SFX listed here as candidates have since shipped; therefore the historical unreviewed/not-downloaded fields of `licensed-audio-candidates.json` are **not** an up-to-date asset inventory, license approval, or permission to download/reuse those entries.

For actual shipped sources, attribution, modifications and hashes, see [recorded audio credits](recorded-audio-credits.md), the real `wwwroot/audio/recorded/manifest.json`, and the current browser audio code. New assets still require licensing evidence and listening approval. General direction remains original, mature Diablo/StarCraft-era atmosphere, without copying copyrighted Blizzard audio. Other art/backlog decisions: [handover](../handover/2026-10-15-project-art-and-backlog.md).
