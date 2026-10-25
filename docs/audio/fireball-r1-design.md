# Fireball R1 — entirely new audio, no placeholder reuse

**Unapproved audition candidate**. Original offline authored physical-noise sound: ignition/cast, flying heat, rupture/impact and lingering combustion. Six independently seeded takes per stage, including the previously approved-direction A/B originals. Authoring uses Python, NumPy, SciPy and FFmpeg. It never reads or remixes any of the old WyrmForge audio files. Runtime receives compressed mono Ogg; iPhone reviewers receive MP3.

The builder replaces the draft `fire` cast and hit entries when the Ogg assets are ready. It discards the legacy Fireball buildup. The flight and burning-ground sounds are samples pending authoritative gameplay event wiring; do **not** claim those phases are integrated.

Main review: `docs/audio/previews/fireball-r1-six-take-reel.mp3` with all six full versions. The earlier A/B MP3 and complete takes A/B remain available, unchanged. Production Fireball cast and impact select from independent six-item shuffle bags: no immediate repeat, and every take gets heard before reuse. They must be heard on phone speaker and headphones; an approved recording is not implied by technical CI.

**Non-negotiable:** Existing `fire.ogg`, `impact.ogg`, `enemy-down.ogg`, older spell variants and music remain **legacy placeholders**. They cannot appear in new sound demonstrations and must be replaced or explicitly retired before this audio rebuild merges.


## First gameplay synchronization pass

A FireBolt projectile spawning now triggers its newly authored hot-wind flight sound directly from the simulation snapshot, not a preview-only fixed timer. Persistent fire is tracked through its own read-only `BurningGroundRenderSnapshot`, with a stable ID assigned only when the existing Rank II+/Scorched Earth logic actually registers burning ground. The sound tracker emits one burning-ground onset per fresh patch ID and never triggers from unrelated essence visuals, repeated frames or pause/resume. No combat damage or duration rule changes.

**Limitation:** the onset of the 3.9-second combustion tail follows the real patch; a future pass must fade/stop it at the precise ground lifetime boundary, especially for duration mutators. The PR remains a draft, and no old recorded source is reused.


The user considers all six current recordings acceptable and deliberately cohesive: do not make further cosmetic variations merely to increase perceptible difference. Casts, impacts, flight and ground-fire cues all use separate six-item non-repeating shuffle bags. Accurate in-game playback and remaining placeholder replacement now take priority over additional audio takes.
