# Compact Arcane Hunt HUD — November 8, 2026

## Approved direction

- Replace the full top combat HUD with a compact, centered bottom action HUD in the existing Arcane Nexus style.
- Left crimson crystal: **real current/max health**, filled to the authoritative fraction; amber/red tint and meter height indicate danger.
- Primary round slot: actually committed auto-cast spell, with its real remaining cooldown and cast-ready ring.
- Secondary round slot: the actually prepared contextual auto-defence (currently Warding Pulse), or a visibly locked shield before Hunter level 3; show its real independent recovery countdown. Its cast still consumes the next primary cast, as before.
- Right violet crystal: **empty**. Reserved for a future real secondary resource. No invented mana/energy number or fill.
- Under both orbs/spells: Hunt level and experience bar. Actual current XP and XP-to-next are rendered beneath, not above.
- No permanent top HUD or floating objective strip. Encounter phase announcements remain transient and the world gate retains its own directions.
- Use the existing Arcane Nexus socket-rim asset and its muted copper, near-black plum and pixel-art treatment.

## Non-goals

Do not add a resource system, change cooldown balance, select a defensive spell for the user, persist a new preference, alter terrain or physics, or move combat/camera.

## Manual acceptance

1. iPhone Safari portrait at 390×844 and small viewport 320×568: verify the old top bar is absent, and the four circles and EXP bar stay inside the safe area without horizontal overflow.
2. Fresh First Hunt: red health orb displays current/max HP and decreases as actual damage resolves; blue/purple right orb is blank; defensive slot clearly shows locked.
3. Verify the primary icon corresponds to the committed class spell, not a hardcoded Fireball. Attack a Hollowed; the primary ring starts at zero and recharges using the real cast interval.
4. On a Hunter level 3+ profile with Warding Pulse prepared, the defensive icon replaces locked art; trigger it via crowd pressure and verify that the cooldown circle follows the genuine 7-second recovery.
5. Kill enemies and earn EXP. The purple track and numeric EXP update; leveling up refreshes LV and the bar.
6. Verify there is no floating trail objective strip or version watermark, and that upgrade confirmation, tutorial hints, retreat, damage numbers, map choice and Refuge overlays remain usable.
7. Repeat at landscape width and with reduced motion.

## Automated tests

- `node --test tests/javascript/compact-hunt-hud.test.mjs`
- Existing browser smoke tests updated for the new bottom HUD and protected HUD/upgrade layout.
- Full C# simulation tests unchanged except that the authoritative snapshot now exposes cooldown clocks (no rule changes).
