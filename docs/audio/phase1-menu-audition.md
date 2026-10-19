# WyrmForge — Phase 1: Menu/action Foley audition

Status: **candidate / listening gate; not approved for production**.
Roadmap: menu/action sounds → ambient & monsters → spells → phone haptics → remaining polish.
This slice deliberately changes **no combat mechanics, music tracks, ambient layers or haptics**.

## What changed

- Three switchable, deliberately restrained physical-material palettes in the Settings **Sound Atelier**:
  - **Worn Vellum** (default): leather, book movement and a wooden/door presence.
  - **Weathered Stone**: stone tap, old hinges and physical book/door cues.
  - **Cold Iron**: quiet metal clicks and latches, plus creaking doors.
- Audition the same eight **semantic** events in each material: ordinary button, back, open, confirm, enter hunt, reveal upgrade, choose upgrade, clear trail.
- Runtime playback resolves semantic event → selected palette → licensed Ogg asset. Selection persists locally; each palette can be replaced without modifying game simulation.
- Common UI interactions resolve from `data-sound-cue`, with a plain `ui` fallback for unannotated buttons. Hunt-entry actions already playing `hunt-start` from C# opt out of the extra global click, avoiding stacked clicks.
- Existing sound engine, audio-session unlock, category volumes and music crossfade remain intact.
- A future iOS/Android adapter should consume the same semantic event and palette manifest with native playback/haptic APIs. Never call WebAudio directly from simulation/game logic.

## Recordings and license provenance

12 original Ogg recordings come from **Kenney RPG Audio**, published as Creative Commons Zero (CC0).
Official source: https://kenney.nl/assets/rpg-audio
Secondary redistribution: https://github.com/Mcamento8/open-game-sfx-index/tree/main/audio/rpg-audio
Each asset in `wwwroot/audio/recorded/menu-*.ogg` preserves its original upstream Ogg bytes.
`manifest.json` has the original filename, official source page, author, license, mirrored source path and Git blob SHA for each asset.
The existing rubberduck stone tap is reused for Weathered Stone without copying its bytes.

No audio from copyrighted reference games was imported.
Web runtime may filter, envelope and attenuate the sourced recordings; originals are preserved for future native transcoding.

## Listening gate: do not merge merely because CI passes

1. In Settings → Sounds, listen to **Button**, **Back**, **Open**, **Confirm**, **Enter hunt**, **Reveal**, **Choose** and **Clear trail** in each material.
2. Repeat the Button cue 30 times and navigate the town/Nexus/settings for 5 minutes; reject fatigue, ringing, excessive creaking or slow response.
3. Enter/leave at least three hunts and confirm only **one meaningful** entrance sound. Verify no magic-shield burst or healing bell from phase-1 menu actions.
4. Compare a moderate-volume iPhone speaker with headphones and a recent Android phone; verify first tap, silent-mode behavior, mute, restoration after backgrounding and saved palette.
5. Confirm disabled controls do not play, actions already generating a semantic event do not double-trigger, and audio problems never block navigation.
6. Human reviewer records **keep / revise / replace** and rates **tactility, fit to Gothic world, clarity, repetition fatigue and mobile translation** (1–5). No preset is canon until approved.

## Known limitations

- This is a **selection of source recordings**, not a commissioned final soundscape. Their exact perceptual quality and mixes are intentionally unapproved until listening.
- A few selected recordings are too long for possible future very rapid interactions; the review will determine which recordings require carefully authored shorter exports. Do not blindly pitch-shift or synthesize to solve this.
- Semantic `data-sound-cue` coverage is currently limited to the principal town/menu/hunt entry points. Complete explicit tagging of other settings, inventory and Nexus controls after the palette has been selected.
- Safari browser cannot supply reliable native iOS haptics. The eventual native mobile app uses the same semantic event stream with Core Haptics/Android APIs behind a platform adapter; phase 4 will implement this.
- Do not market these as exclusively custom-recorded or professionally final. They are Kenney's CC0 source recordings adapted through playback processing.

## Tests

`node --test tests/javascript/menu-audio-palettes.test.mjs tests/javascript/audio-session.test.mjs tests/javascript/recorded-audio.test.mjs`

The first test confirms profile coverage, authentic Ogg headers, source Git-blob integrity, CC0 metadata and absence of the previous chime/shield files in the candidate profiles. It does **not** stand in for a subjective listening test.
