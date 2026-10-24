# WyrmForge — Sound audition 1: ordinary interface press

Status: **draft, requires listening approval**. This revision integrates useful source recordings from original draft PR #128 into current `main` without restoring stale audio.js files or replacing the semantic Hunt and building sound design.

## Candidate presets (all physically recorded, licensed CC0)

- **Worn Vellum (initial default):** two distinct leather/handling recordings `handleSmallLeather.ogg` and `handleSmallLeather2.ogg` from Kenney's RPG Audio. Short, soft, no note/chime.
- **Weathered Stone:** the existing `ui.ogg` derived from rubberduck's `item_stone_01.ogg`. Remains accessible as an alternative/fallback.
- **Cold Iron:** Kenney's `metalClick.ogg`, dry and mechanical.

The archived PR originally explored complete menu/action presets. **Only the ordinary UI press is changing in this checkpoint**. Hunt exit/arena entry, door, upgrade, music and combat SFX stay as on current main, and the existing global handler continues to suppress double audio when the Sound Atelier itself is clicked.

The selectable material is stored in `wyrmforge.audio.ui.material.v1` and played through the existing Web Audio `ui` category, volume preference, effect envelope and limiter. The original semantic event remains `ui`; later iOS/Android players can consume the same manifest data. Raw Ogg recordings are copied unchanged by their verified Git object SHA. Material source attribution is in `manifest.json`.

## Human listening gate before merge

1. In Settings → Sound Atelier, tap each of Worn Vellum, Weathered Stone and Cold Iron at a realistic phone-speaker volume.
2. Repeat each at least 20 times. Reject sharp, delayed, or annoying sounds rather than choosing by the loudest.
3. Navigate Town, Arcane Nexus and Settings for five minutes. Test explicit button actions and no double taps/chimes.
4. Repeat on headphones and iPhone speaker; verify first tap/gesture, mute, background return and persisted material selection.
5. Rate comfort/fatigue, tactile character, mobile clarity and Gothic fit 1–5, then record KEEP / REVISE / REPLACE.
6. Keep the PR draft until the actual game is auditioned. Tests prove licenses, assets and event mappings, **not subjective sound quality**.

## Research basis

- Matt Uelmen, *Audio Content for Diablo and Diablo 2* (2001): live/source-recorded instrumentation and distinctive feedback; especially repeated skill effects must avoid becoming annoying.
  https://www.gamedeveloper.com/audio/audio-content-for-i-diablo-i-and-i-diablo-2-i-tools-teams-and-products
- Kevin Regamey, GDC 2023 *The TUNIC Audio Talk*: define direction from actual mechanics and audition in-game.
  https://www.gdcvault.com/play/1029369/The-TUNIC-Audio
- FMOD Studio *Working with Instruments*: multi-instrument shuffle/variants reduce obviously artificial repetition.
  https://www.fmod.com/resources/documentation-studio?page=working-with-instruments.html&version=1.10

## Next sound

Once the everyday press is approved: separately audition `ui-confirm`/back and major menu interactions, then revisit environmental/monster death audio. Do not couple this with mage, Fireball, lighting, or Hollowed/Ashling art PRs.
