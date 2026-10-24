# Audio, atmosphere and haptics

> **Canonical WyrmForge specification · updated 20 October 2026.** Physical Gothic sound identity, author/asset credits and future mobile feedback.
> [Canonical index](README.md) · Only explicitly marked **LOCKED/approved** requirements are commitments. Proposed values, old milestones and drafts are not evidence of shipped code. Verify current `main`, PRs and tests.

## Approved sonic priorities and limits

- **Order of work:** (1) distinguish menu presses, Hunt launch and town doors (no generic intrusive bell); (2) environmental ambience and convincing monster deaths; (3) distinct Fire/Frost/Storm/Arcane magic impact and tails; (4) restrained phone haptics; (5) mix polish and additional moments. Prioritize auditions *in the real game* on phone speakers.
- Hear wood, iron, stone, fabric, wind, human-recorded performances and different acoustic spaces rather than cheap synthesized beeps. Music should support eerie Diablo I/II / classic StarCraft-era atmosphere **without reproducing their protected sound recordings, melodic signatures or samples**.
- No ear-fatiguing button bell for World Gate, arena launch or every confirmation. Town doors sound like opening doors; starting a Hunt needs its own meaningful transition. Playback respects browser gesture rules, interruption, mute, category volume and a continuous music crossfade.
- **Haptics are additive and optional:** a short UI confirmation, restrained spell-impact feedback and meaningful event cues; never every damage tick. Respect device setting, OS reduced-motion/feedback, power and possible WebView/native platform adapters. Sound and haptics cannot be the only way to understand gameplay.
- Only approved recordings with clear license are included. **Preserve attribution in the shipped product** where required and the checked-in source/manifest checksums. This is not permission to adopt unauditioned candidate tracks. Phase-1 proposed Foley remains pending [PR #128](https://github.com/pjotrcasteel/Wyrmforge/pull/128).


### First UI Foley audition (24 October 2026, draft PR #128)

The ordinary interface press has a deliberately narrow, non-tonal recorded-Foley audition. The chosen routine navigation sound is **Worn Vellum** (two different Kenney CC0 leather-handling recordings), with **Weathered Stone** (existing rubberduck CC0) and **Cold Iron** (Kenney CC0) selectable in Settings → Sound Atelier. Selection persists on the device. These are candidate source recordings, **not approved final sound design**. They are not the sounds for Hunt departure, most occupied buildings, unlocks, or spell impacts; those retain separate event identities.

On an iPhone speaker, compare the three at moderate volume, repeat the ordinary press at least twenty times, then navigate menus for five minutes. Check immediate tap feedback, low fatigue, no extra bells or double-clicks, mute, saved selection and headphones. Record keep/revise/replace. Do not merge on CI alone. Source recordings and Git blob provenance are in the recorded audio manifest. This focused change rebases the earlier Phase-1 candidate onto the current universal-lighting-era `main` without changing combat or music.

## Recorded audio inventory and required attribution

First imported playback prototype: **0.0.109**. Enhanced recorded mage spell layers: **0.0.110**.

All audio in `src/Wyrmforge.Presentation.Web/wwwroot/audio/recorded/` consists of human-produced music and sound effects obtained from the source distribution pages below. The build records source SHA-256 checksums and the complete processed-cue mapping in `audio/recorded/manifest.json`.

### Music — CC0

- **Osare (Unrest Theme)** by Brandon Morris (Augmentality), [original recording](https://opengameart.org/content/osare-unrest-theme). Used as the Refuge / menu theme. Distributed as CC0 on OpenGameArt.
- **Cave Theme** by Brandon Morris (uploaded as Brandon75689), [original recording](https://opengameart.org/content/cave-theme). Used in the Hunt. Distributed as CC0 on OpenGameArt.

The full compositions are retained as originally published Ogg Vorbis files. Browser playback crossfades the music; it does not alter the embedded composition.

### Effects — CC BY 4.0, attribution required

**JC Sounds — Fantasy SFX Pack Vol 1**  
Author: **JC Sounds**  
Source: https://opengameart.org/content/jc-sounds-fantasy-sfx-pack-vol-1  
License: **Creative Commons Attribution 4.0 International**  
License URL: https://creativecommons.org/licenses/by/4.0/

Used for authored fireball, ice-shard and electric spell effects, physical strikes, protective magic and healing/reward cues. **Modifications:** select clips have been trimmed to short game-event windows, downmixed to mono, resampled to 32 kHz, high/low-pass filtered, gain-adjusted and encoded as Ogg Vorbis. The game may apply minor playback-rate variation and category volume/ducking at runtime. No endorsement by JC Sounds is implied.

### Effects — CC0

**80 CC0 RPG SFX** by **rubberduck**  
Source: https://opengameart.org/content/80-cc0-rpg-sfx  
License: **CC0 1.0 Universal**  
License URL: https://creativecommons.org/publicdomain/zero/1.0/

Used for Arcane, creature, physical item and gem sounds. Modifications: short clip selection, mono downmix, resampling, filtering and conversion.

### Blizzard and other reference games

Diablo I/II, original StarCraft, World of Warcraft, Skyrim, Enshrouded and Path of Exile are **creative style references only**. No sound recording or composition from these games is bundled, sampled, reconstructed or implied to be licensed.

### Import and integrity

The canonical metadata is generated by `tools/audio/import_licensed_audio.py`. Every imported file is self-hosted under `wwwroot/audio/recorded` and the runtime will not hotlink from third parties. This avoids runtime dependencies on asset-host availability and allows a later professional art/audio review to replace any specific cue without rewriting gameplay events.

**Creative approval:** This is a first recorded-assets candidate; code/build checks do not certify the soundtrack's artistic suitability. Conduct a proper listening comparison on iPhone speakers and headphones before declaring a final identity.

### Layered mage recordings (v0.0.110)

For each of Arcane, Fire, Frost and Lightning, v0.0.110 additionally imports three distinct cast takes, two or three hit takes, and one optional buildup from **JC Sounds — Fantasy SFX Pack Vol 1** (CC BY 4.0). These are different human-produced samples, not synthetic pitch variants. The exact original WAV filenames, transcoded Ogg filenames, and per-file SHA-256s are preserved in `audio/recorded/manifest.json` under `variants`, `hitVariants` and `buildup`.

**Further modifications:** separate attacks and impacts are trimmed to short playable windows and given an approximately 160 ms or shorter release fade on conversion; playback additionally applies a smooth gain envelope and, on selected casts, a quiet buildup layer. Attribution, modification notice and license terms remain those stated above.

### Upgrade-reward listening revision (v0.0.111)

The **upgrade revealed** cue now points to rubberduck's existing CC0 `item_gem_01.ogg` recording (also used for the normal relic pickup); it no longer uses JC Sounds' Magic Shield activation. The **upgrade chosen** cue retains JC Sounds' CC BY 4.0 `Healing Chime_01.wav` source with new runtime mix adjustments. Both are played at reduced relative gain, with gentle low-pass filtering and dedicated envelope releases. No new third-party asset or license was introduced.


### Hunt entry bell removal (19 October 2026)

The recorded `hunt-start` cue previously used JC Sounds' `Magic Shield_Activation_01.wav`, producing a repeated bell-like sound when entering from the town gate and when choosing ordinary arena map nodes.

It now uses **Kenney — RPG Audio**, `doorOpen_1.ogg` (CC0), a physical door-opening recording.
Official source: https://kenney.nl/assets/rpg-audio
Verified Ogg mirror: https://github.com/Mcamento8/open-game-sfx-index/blob/main/audio/rpg-audio/doorOpen_1.ogg
SHA-256 of the original and deployed Ogg: `4ab93bab96522d8eb109ff96dc57cb6765deb02448fe14c10472084be5bb2a0b`.

Playback applies reduced gain, a low-pass filter and short fades. The game event name stays `hunt-start`, so both browser and future native mobile adapters can keep the same semantic trigger. The generic menu click is suppressed on hunt entry controls to prevent double playback.

This is a narrow regression fix; the broader three-palette audition remains in draft PR #128 for human listening approval.


### Semantic transition redesign — 19 October 2026

Following listening feedback, we no longer map a *door* sound to `hunt-start`. Physical doors have the distinct `building-open` event; the hunt signals a hunter leaving the Refuge, followed by separate `trail-enter` events for successive arena nodes and `threat-reveal` for rare dangerous arrivals.

**Research** supporting this decision:
- FMOD's event-based design separates *gameplay intent* from sample selection and sound output: https://www.fmod.com/docs/2.04/studio/authoring-events.html
- *Diablo II* sound designers used grounded Foley and precise material details to support world credibility: https://www.gamedeveloper.com/audio/how-audio-design-enhances-diablo-2
- Power Up Audio's GDC talk on *TUNIC* stresses deriving sounds from actual gameplay and defining creative direction before choosing samples: https://www.gdcvault.com/play/1029369/The-TUNIC-Audio
- Real smartphone speakers need their own review, particularly as low-frequency weight may be inaudible: https://aes.org/publications/elibrary/elibrary-page/?id=13399
- Wwise documents layered composition (Blend Containers) and sample variation via Shuffle/Random Containers: https://www.audiokinetic.com/en/public-library/2024.1.4_8780/?id=creating_random_container&source=Help
- Gaetan Troutet's game-audio lecture on restraint cautions that every extra sound consumes the listener's attention: https://blogs.napier.ac.uk/sounddesign/2026/04/20/gaetan-troutet-game-audio-sound-design/

**New portable semantic events (candidate mixes, subject to listening on real devices):**

| Event | Physical recordings | Meaning |
| --- | --- | --- |
| `building-open` | Kenney `doorOpen_1.ogg` | Enter a town building |
| `hunt-start` | Kenney `footstep00.ogg`, `cloth1.ogg` and `footstep02.ogg` | Commit to a new expedition |
| `trail-enter` | Kenney `footstep02.ogg` | Move into the next arena node |
| `threat-reveal` | Kenney `creak1.ogg` | Dangerous encounter or elite reveal |
| `wyrm` | Existing rubberduck creature roar | Wyrm entry; unchanged |

The recordings are from **Kenney RPG Audio (CC0)**, official source https://kenney.nl/assets/rpg-audio,
with exact Ogg bytes from https://github.com/Mcamento8/open-game-sfx-index/tree/main/audio/rpg-audio .
Their individual SHA-256 hashes are in `audio/recorded/manifest.json`, which is the portable semantic contract.
No third-party recordings are streamed at runtime. Different Foley layers are delayed and mixed through Web Audio today; native iOS/Android implementations can consume the same manifest without depending on browser APIs.

A sound is not artistically approved just because hash/semantic tests pass. In-game listening must confirm the player's impression is `departing into danger`, rather than `opening a door` or `clicking an icon`. Reject and rework the candidate if it is too weak through a phone speaker.

---

## Sonic vocabulary and mixing research (candidate/quality constraints, not automatically approved assets)

Sound identity 1.0 · Prototype 0.0.108

### Intent
**Ancient magic should feel physical, textured and costly.** The Wyrmrealm has breath, stone,
weather and forgotten metal; it does not beep. During a long hunt, the player should forget
that the effects are playing until one important moment demands their attention.

This is an **authored proposal**, not a claim that a particular frequency universally causes
pleasure or reward. Listener preference is contextual; repeat exposure and phone speakers matter.

### Research and rationale
- Fastl/Zwicker's psychoacoustic work links perceived sensory pleasantness to loudness,
  sharpness, roughness, tonalness and other attributes. Our repeated sounds consequently avoid
  piercing upper harmonics and large sustained broadband energy.
- Auditory discrimination and contrast matter more to WyrmForge than maximizing loudness.
  Every quiet attack leaves acoustic headroom for player damage, an evolution and Wyrm arrival.
- Microsoft's Xbox Accessibility Guideline 105 recommends separate category volume
  controls and distinct important cues. We provide Interface, Combat and Moments levels.
- WyrmForge still communicates everything visually when muted; sound cannot own gameplay truth.

Further reading:
- https://link.springer.com/chapter/10.1007/978-3-031-25566-3_6
- https://series.publisso.de/en/journals/zaud/volume7/zaud000073
- https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/105

### The sonic vocabulary
| Event family | Timbre | Emotion | Relative importance |
|---|---|---|---|
| Menu/UI | Stone/wood tap, under 120 ms | Restraint and tactility | Very low |
| Arcane | Hollow woven resonance + gentle breath | Mysterious and intelligent | Low |
| Ember | Rolling air + warm bass | Dangerous but organic | Low |
| Frost | Soft glass partials + snowfall | Clean, cold, almost brittle | Low |
| Storm | Filtered crackle + chest impact | Electric without screeching | Low |
| Hit / kill | Short weighted impact, muted texture | Readable hit confirmation | Low |
| Player hurt | Slower, heavier thump | Caution, immediate focus | High |
| Upgrade | Dark body then ascending tempered resonances | Progress and power | High |
| Power burst | Bass shockwave + muffled outward air | Impact and reward | High |
| Wyrm arrival | Long low layered shifting formants | Scale, dread | Very high |
| Victory | Sparse rising resonance, room to decay | Relief and accomplishment | Very high |
| Defeat | Falling body and released breath | Loss, not punitive | High |

Harmony gravitates around **D minor**: D, F and A, with restrained octave/fifth relationships.
We avoid six-note shiny reward fanfares. Repeating spell cues are quiet and never form a melody
at normal attack rates.

### Playback and mixing contract
- `sound-design.js` is a *deterministic offline sample renderer*. Authored PCM is cached in
  `AudioBuffer`; the game loop only maps semantic events to playback requests.
- `audio.js` owns device startup, saved preferences, sample caching, per-category voice limits,
  alternating variants, cooldowns, gain staging, compressor/limiter and priority ducking.
- Combat cues are quieter than moments. Moment events briefly duck routine combat audio.
- Sample peak headroom is enforced in sound-rendering tests. A sound can be muted or suppressed
  without affecting simulation or server state. CPU and voice usage are bounded.
- `navigator.audioSession.type = 'playback'` remains necessary for iOS Safari Silent Mode;
  it is configured before the audio context starts.
- The Sound Atelier is **menu-only**, not a new gameplay tab. It allows repeated, direct A/B
  auditioning of the palette on a real iPhone speaker with stored category volume preferences.

### Listening and acceptance plan
1. Preview the same cue at least 20 times; it should remain unobtrusive.
2. Play a full 2-minute opening hunt with Arcane + Storm. Verify that casting does not dominate.
3. Trigger a power burst following an upgrade; it should be materially stronger than a routine hit.
4. Compare with and without iPhone Silent Mode, and test a 320px portrait device.
5. Rate **fatigue, clarity, fantasy character, sense of power** from 1–5. Gather qualitative
   descriptions: 'metallic?', 'arcade-like?', 'magical?', 'warm?', 'dry?'. Keep future iteration based on listening.
6. Delay background score/music until effects and ducking are satisfactory. No dependence on third-party
   asset URLs or external playback services.

### Next iterations (after listening feedback)
- Replacement-quality recordings for organic layers (foley, wind, ice, deep Wyrm resonance),
  with provenance/licensing retained per sample.
- Contextual enemy identity and 3D-ish stereo spatial placement for larger screens/headphones.
- Music identity, dynamic encounter layers, refuge ambience and transition mix automation.
- Accessibility: optional reduced high-frequency intensity, mono mix and prominent warnings.

---

## Dark-fantasy research and listening gate (historical proposals)

Status: **Research and listening gate — not approved for release.** Supersedes the procedural tone aesthetic of 0.0.108. The browser audio engine and iPhone silent-mode fix remain useful; the generated PCM samples are not the desired creative direction.

### North stars

- **Diablo (1996):** Matt Uelmen's twelve-string acoustic guitar, low flutes/ocarina, sampled acoustic material, heavily treated electric guitar and lonely, long-form ambience. The guitar does not need to be cheerful or the melody triumphant.
- **Diablo II (2000):** Found-object Foley, distinctive physical hits/loot, blended live instruments and samples, evolving industrial/ambient soundscapes and long percussion-led track crossfades.
- **StarCraft (1998):** The power of a recognizable instrument vocabulary per faction, not just a generic fantasy orchestra. Glenn Stafford's guitar-driven Terran palette is especially instructive; do not bring science-fiction synthesizer motifs into WyrmForge.
- **WoW mage / Skyrim combat:** Qualitative references for full-bodied elemental casting and environmental space. Never sample or remix copyrighted game audio.

Primary references:
- https://www.gamedeveloper.com/audio/audio-content-for-i-diablo-i-and-i-diablo-2-i-tools-teams-and-products (Matt Uelmen, 2001)
- https://www.gamedeveloper.com/audio/how-audio-design-enhances-diablo-2 (Diablo II sound-team interview)
- https://news.blizzard.com/en-gb/article/20722027/the-sounds-of-koprulu (Blizzard on StarCraft music identity)

**Target:** evocative, mature, melancholy and tactile. Never cheap beeps, generic triumphal fanfares, busy orchestral loops or recurring rewards every half second. Evoke the era and emotional purpose but do not reconstruct copyrighted melodies, performances, signature riffs or sound recordings.

### Licensed human-made candidate soundtrack — listen before adoption

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

### Licensed sound effects to audition

| Candidate pack | License | Link | Candidate usage |
|---|---|---|---|
| **JC Sounds — Fantasy SFX Pack Vol 1**, 58 authored effects | CC BY 4.0 — **credit JC Sounds and link source/license**; edits must be marked | https://opengameart.org/content/jc-sounds-fantasy-sfx-pack-vol-1 | Fire/ice/electric buildup + launch + impact, movement and shields. First to audition for spell quality. |
| **80 CC0 RPG SFX**, rubberduck | CC0 | https://opengameart.org/content/80-cc0-rpg-sfx | Secondary monster, general magic and impact layers |
| **Magic Spell SFX**, JaggedStone | CC0 | https://opengameart.org/content/magic-spell-sfx | Alternative arcane casting, less important than recorded physical timbre |
| **Kenney — Impact Sounds** | CC0 | https://kenney.nl/assets/impact-sounds | Physical hit layers under the magic, only if auditioned |

The actual sources must be downloaded from author-approved distribution pages, binary-integrity checked and transcoded into short mobile-friendly files. Do not claim human authorship for files whose provenance is uncertain. No Blizzard audio is permitted.

### WyrmForge sound identity, proposal

#### Score: "The Wyrmrealm remembers"
- **Refuge:** fragile plucked strings and breath, long phrases, rarely resolving harmony. This is fragile safety, not a happy hub.
- **Trails:** 60–80% atmosphere (wind, spatial drips, intermittent dissonant drones), 20–40% sparse evolving motifs. Keep a meaningful but understated pulse as the player moves and survives.
- **Pressure escalation:** low percussion, rhythmic scraping or dark guitar textures; do not speed up background music with every enemy or turn an endless hunt into a boss-fight crescendo.
- **Wyrm arrival:** a noticeable drop in normal music, then a low rumble/ritual accent before a distinctive combat layer. Wyrms must have recurring sonic signatures.
- **After victory / Refuge return:** give 1–2 seconds of air/space; allow earned melody and soft quiet. Reward should feel like relief.
- **Death:** let the world fall away; avoid scolding, comical sting or overly bright downward chimes.

#### Magic
- **Arcane:** wispy suction, resonating dimensional movement, dense non-pitched impact.
- **Fire:** low rushing flare, hot crackle and physical impact. Not a tiny click.
- **Frost:** wind rush + granular ice + high-frequency crack only at contact.
- **Storm:** fast crack + rolling residual electricity and mid-bass impact, constrained so it remains tolerable at high cast rates.
- Each school needs *cast / travel or sustain / hit* layering when the simulation can signal distinct phases.
- Repetition: rotating recordings and constrained concurrency; prioritize hits, damage and Wyrms over launch spam.

### Music director implementation contract

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

### Listening gate: no release until tested

A/B original 0.0.108 sound against **real licensed** elements. In the first candidate pass only:
- One evocative Refuge/menu music option and one Hunt exploration ambience.
- Four spells with cast + impact recordings, instead of 17 synthetic stand-ins.
- Preview each asset individually in a non-production listening area; actual in-game pressure test follows.
- A 5–10 minute looping test: Can the player tolerate regular combat? Is anything too repetitive? Does the music support rather than distract?
- Test iPhone Safari with Silent Mode, and 320px portrait; compare against headphones if available.
- Record a qualitative decision **keep / revise / replace**, along with `fatigue`, `believability`, `magical power`, and `emotional immersion` rated 1–5.

Do not promote the prototype to main solely because build and browser CI pass. Sound quality is a human listening gate.
### Historical document status — updated 15 October 2026

This was an **initial research candidate / listening plan** in PR #94. That PR's docs were later merged for provenance, but actual **recorded licensed** music and sound entered the game independently in 0.0.109 and 0.0.110. Many tracks and SFX listed here as candidates have since shipped; therefore the historical unreviewed/not-downloaded fields of `licensed-audio-candidates.json` are **not** an up-to-date asset inventory, license approval, or permission to download/reuse those entries.

For actual shipped sources, attribution, modifications and hashes, see [recorded audio credits](../audio/recorded-audio-credits.md), the real `wwwroot/audio/recorded/manifest.json`, and the current browser audio code. New assets still require licensing evidence and listening approval. General direction remains original, mature Diablo/StarCraft-era atmosphere, without copying copyrighted Blizzard audio. Other art/backlog decisions: [handover](../handover/2026-10-15-project-art-and-backlog.md).
