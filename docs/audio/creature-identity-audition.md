# Creature sound audition — Hollowed and Ashling

Status: **draft, not approved**. These recorded vocal candidates are separate from the creature sprite rig and lighting workstreams. No actor sprites, animation, physics, combat mechanics or Wyrm design are modified.

The first production pass uses 12 compact mono recordings: two different source takes each for approach, hit and death for the Hollowed and Ashling. A sparse proximity check plays an occasional approach sound for the *nearest* creature within 230 world units; at most one voice per family per 6.5 seconds. Hit flash **rising edges** and death bursts with Kind/EntityId select exact SFX at most once per state transition. Creature sounds route through the same recorded combat bus and limit as current combat.

Source samples are original CC0 Zombie vocals by artisticdude, original CC0 Monster vocals by Ogrebane, and original CC0 fire crackle by AntumDeluge (fire layer for Ashling only). SHA256 checksums of each entire source archive, source page URLs and exported Ogg file hashes live in the manifest. Builder: `tools/audio/build_creature_voices.py`.

## iPhone listening

[Open single 12-take MP3 comparison](https://raw.githubusercontent.com/pjotrcasteel/Wyrmforge/audio/phase1-menu-foley-audition/docs/audio/previews/hollowed-ashling-voices.mp3)

The clip order is: Hollowed approach A/B, hit A/B, death A/B; Ashling approach A/B, hit A/B, death A/B. Each action is separated by silence. These names mean intended gameplay use, **not a claim that every recording is already a suitable performance**.

Listen on phone speaker and headphones, then in-game while Fireball, impacts and the Wet Forest bed are running. Reject if voices sound goofy, like another species, or too loud; reject if impact grunt plays repeatedly during a 90ms hit flash or if 20 deaths become a choir. Test pause/resume, mixed enemy packs, missing sound assets and muted volume. Later footsteps/animation attacks need reliable movement/attack state events and are not part of this pass.

## Preservation

The new events use `EnemyKind.Hollow=0` and `EnemyKind.Ashling=2`, with fallback `enemy-down` for other kinds. Unrelated rendering, physics, Town, music, Fireball and game loop update cadence are unchanged. The engine still supports sound-off play and the established mobile audio unlock.
