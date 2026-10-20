# WyrmForge — Ancient Resonance

> **Historical / supporting document (not canonical).** For current rules use [WyrmForge canonical documentation](../canon/README.md). This file preserves dated research, assets, implementation evidence or prior proposals; do not treat its status or plan as present-day product authority.

Sound identity 1.0 · Prototype 0.0.108

## Intent
**Ancient magic should feel physical, textured and costly.** The Wyrmrealm has breath, stone,
weather and forgotten metal; it does not beep. During a long hunt, the player should forget
that the effects are playing until one important moment demands their attention.

This is an **authored proposal**, not a claim that a particular frequency universally causes
pleasure or reward. Listener preference is contextual; repeat exposure and phone speakers matter.

## Research and rationale
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

## The sonic vocabulary
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

## Playback and mixing contract
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

## Listening and acceptance plan
1. Preview the same cue at least 20 times; it should remain unobtrusive.
2. Play a full 2-minute opening hunt with Arcane + Storm. Verify that casting does not dominate.
3. Trigger a power burst following an upgrade; it should be materially stronger than a routine hit.
4. Compare with and without iPhone Silent Mode, and test a 320px portrait device.
5. Rate **fatigue, clarity, fantasy character, sense of power** from 1–5. Gather qualitative
   descriptions: 'metallic?', 'arcade-like?', 'magical?', 'warm?', 'dry?'. Keep future iteration based on listening.
6. Delay background score/music until effects and ducking are satisfactory. No dependence on third-party
   asset URLs or external playback services.

## Next iterations (after listening feedback)
- Replacement-quality recordings for organic layers (foley, wind, ice, deep Wyrm resonance),
  with provenance/licensing retained per sample.
- Contextual enemy identity and 3D-ish stereo spatial placement for larger screens/headphones.
- Music identity, dynamic encounter layers, refuge ambience and transition mix automation.
- Accessibility: optional reduced high-frequency intensity, mono mix and prominent warnings.
