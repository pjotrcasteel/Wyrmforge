# Fireball R1 — entirely new audio, no placeholder reuse

**Unapproved audition candidate**. Original offline authored physical-noise sound: ignition/cast, flying heat, rupture/impact and lingering combustion. Two independently seeded takes. Authoring uses Python, NumPy, SciPy and FFmpeg. It never reads or remixes any of the old WyrmForge audio files. Runtime receives compressed mono Ogg; iPhone reviewers receive MP3.

The builder replaces the draft `fire` cast and hit entries when the Ogg assets are ready. It discards the legacy Fireball buildup. The flight and burning-ground sounds are samples pending authoritative gameplay event wiring; do **not** claim those phases are integrated.

Main review: `docs/audio/previews/fireball-r1-ab-comparison.mp3`, plus two complete versions and isolated R1 components. They must be heard on phone speaker and headphones; an approved recording is not implied by technical CI.

**Non-negotiable:** Existing `fire.ogg`, `impact.ogg`, `enemy-down.ogg`, older spell variants and music remain **legacy placeholders**. They cannot appear in new sound demonstrations and must be replaced or explicitly retired before this audio rebuild merges.
