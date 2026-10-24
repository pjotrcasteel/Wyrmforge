# WyrmForge — Sound audition 1: ordinary interface press

Status: **Worn Vellum chosen for the normal UI press; richer Codex opener remains a draft listening candidate**. This revision integrates useful source recordings from original draft PR #128 into current `main` without restoring stale audio.js files or replacing the semantic Hunt and building sound design.

## Candidate presets (all physically recorded, licensed CC0)

- **Worn Vellum (initial default):** two distinct leather/handling recordings `handleSmallLeather.ogg` and `handleSmallLeather2.ogg` from Kenney's RPG Audio. Short, soft, no note/chime.
- **Weathered Stone:** the existing `ui.ogg` derived from rubberduck's `item_stone_01.ogg`. Remains accessible as an alternative/fallback.
- **Cold Iron:** Kenney's `metalClick.ogg`, dry and mechanical.

The archived PR originally explored complete menu/action presets. **Worn Vellum is now the selected default, and only one contextual interaction—the Codex opening—is changing in this checkpoint**. Hunt exit/arena entry, other Town doors, upgrade, music and combat SFX stay as on current main, and the existing global handler continues to suppress double audio when the Sound Atelier itself is clicked.

The selectable material is stored in `wyrmforge.audio.ui.material.v1` and played through the existing Web Audio `ui` category, volume preference, effect envelope and limiter. The original semantic event remains `ui`; later iOS/Android players can consume the same manifest data. Raw Ogg recordings are copied unchanged by their verified Git object SHA. Material source attribution is in `manifest.json`.

## Codex opening — first contextual sound-design demonstration

The **Codex** does not sound like the Blacksmith or Arcane Nexus door. An authored `codex-open` event plays **Kenney's real old-book opening** (primary, gently low-passed), followed 120 ms later by a quieter **Worn Vellum leather handling** layer at 32% of the primary cue's scaling. Two source recordings share the existing `ui` bus, respecting its cap of two simultaneous voices and avoiding any extra bell. The Codex category tabs retain the ordinary Worn Vellum click rather than stacking a second effect. The event is also available in Sound Atelier via **HEAR CODEX OPEN**. These are in-game mix choices, *not* a pre-rendered sound effect baked into game assets.

The iPhone MP3 preview in `docs/audio/previews/codex-open.mp3` is a separate audition approximation created from exactly the same recorded samples. The game itself uses the declared per-layer gain/envelope/mixer profiles in the manifest.

The new preference `wyrmforge.audio.ui.material.v1` is registered as `SaveDomain.Preferences` in `SaveLayout` to satisfy the persistent-save-key contract and avoid the previously failed .NET CI test.

## Human listening gate before merge

1. In Settings → Sound Atelier, tap each of Worn Vellum, Weathered Stone and Cold Iron at a realistic phone-speaker volume.
2. Repeat each at least 20 times. Reject sharp, delayed, or annoying sounds rather than choosing by the loudest.
3. Navigate Town, Arcane Nexus and Settings for five minutes. Test explicit button actions and no double taps/chimes.
4. Repeat on headphones and iPhone speaker; verify first tap/gesture, mute, background return and persisted material selection.
5. Rate comfort/fatigue, tactile character, mobile clarity and Gothic fit 1–5, then record KEEP / REVISE / REPLACE.
6. Keep the PR draft until the actual game is auditioned. Tests prove licenses, assets and event mappings, **not subjective sound quality**.

## Technical acceptance for the Codex action

- The actual unlocked Codex Town building maps to `codex-open`, while locked remains silent.
- `codex-open` is a distinct UI bus event, not an override of global click or every Town door.
- Exactly two verified Kenney CC0 Ogg files layer in the portable manifest; all other town/hunt cues retain their mappings.
- Category changes inside the Codex use the chosen Worn Vellum UI press.
- No extra save state beyond `SaveLayout.Preferences`. Preview does not force a hunt/gameplay transition.

## Research basis

- Matt Uelmen, *Audio Content for Diablo and Diablo 2* (2001): live/source-recorded instrumentation and distinctive feedback; especially repeated skill effects must avoid becoming annoying.
  https://www.gamedeveloper.com/audio/audio-content-for-i-diablo-i-and-i-diablo-2-i-tools-teams-and-products
- Kevin Regamey, GDC 2023 *The TUNIC Audio Talk*: define direction from actual mechanics and audition in-game.
  https://www.gdcvault.com/play/1029369/The-TUNIC-Audio
- FMOD Studio *Working with Instruments*: multi-instrument shuffle/variants reduce obviously artificial repetition.
  https://www.fmod.com/resources/documentation-studio?page=working-with-instruments.html&version=1.10

## Next sound

Next: separately audition meaningful confirmation/back cues without replacing the existing upgrade resonance; then environmental ambience/creature deaths. Do not couple this with mage, Fireball, lighting, or Hollowed/Ashling art PRs.
