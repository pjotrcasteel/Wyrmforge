# Frost region roster v1 (Rimeclaw's glacier)

- **Status:** F1 and F2 shipped. The region is still **Planned**; the kinds are `HabitatOnly` and no habitat lists them yet, so no live run spawns them.
- **Sources:** amendment §11.5 (progressive world content), `user_handover_files/concepts/Frost/01–09`, owner direction (2026-10-18): "don't make an exact copy so it feels like a recoloring; make Ice feel different".

## Identity: Fire pressures, Frost boxes in

The Cinder kin threaten with damage over time and pressure: burning ground, embers, pounces. Frost threatens your **space and tempo**:

- **Chill** (hunter status) slows instead of burning. Each stack gives 8% slow, up to 5 stacks (40%). Stacks hold for 1.6 s, then thaw one every 0.5 s. A 0.2 s gate stops a single attack from stacking several times. Chill **never** fully freezes the hunter (control loss reads as unfair on mobile; Hades/Diablo IV use slows, not stuns, on the player).
- **Black ice** changes footing rather than dealing damage. On a patch, velocity eases toward input (grip 2.6/s), so you slide. It adds 1 Chill every 0.6 s.
- **Lanes, not blobs.** Frost attacks are ruler-straight lines and their end-points, so they box the hunter in. Fire attacks are circles and arcs.
- **Red edge rule.** Every attack keeps the shared red danger edge across realms. Black ice is a footing hazard, so it gets a cold edge.

## F1 kinds

| Kind | Role | Behaviour | Counterplay |
|---|---|---|---|
| **Frostling Packling** (10) | Pressure, cost 1 | Packs circle on a shared ring (r 92, slot by golden angle) instead of rushing. Each in turn telegraphs a short skitter-bite: 6 damage, ×1.75 against a chilled hunter, +1 Chill. Against a chilled hunter its cooldown runs twice as fast: the pack smells the slow. | Keep Chill off and the pack stays polite; break the ring with knockback. |
| **Shardcaster** (11) | Artillery, cost 2 | Planted caster that keeps 200–320 px away. It casts on a rhythm of Lance, Patch, Lance, Lance, Patch… then glides sideways. **Ice lance:** a long telegraphed lane (9 damage, +1 Chill) that stops at walls; a **splinter bloom** (r 40, 8 damage, +1 Chill) erupts 0.75 s later wherever the lance stopped. **Black ice:** a glaze mark that becomes a 7 s patch (at most 4 patches). A hit of 30% health during the aim interrupts the cast. | Step out of the lane *and* away from its end; burst it during the aim. |

## F2 kinds

| Kind | Role | Behaviour | Counterplay |
|---|---|---|---|
| **Whitefang Stalker** (12) | Ambusher, cost 2 | Prowls at ~190 px, then works toward the point **behind your heading**. A **Snowblind Feint** (0.3 s) dashes sideways and leaves a snow cloud (r 46, 2.4 s, drawn above actors so it hides things; standing in it adds 1 Chill every 0.8 s). The pounce lane locks when the feint ends, then a 0.5 s windup and a 170 px pounce: 10 damage and **Tendon Chill** (+2). No contact damage during the feint. | Keep turning to face it; sidestep the locked lane; knockback or a Warding Pulse defuses the windup. |
| **Cairn Sentinel** (13) | Pressure, cost 3, depth 2+ | Slow armoured march. Within 160 px it plants a **Frost Brace** (1.1 s): facing locks, frontal hits (±60°) take ×0.3 and it is immovable. It ends with an **Avalanche Step**: a frontal wave across the same ±60° arc out to 170 px (9 damage, +2 Chill, only the wave's edge hits, once). During the 1.1 s recovery every hit takes ×1.25. | Flank it: neither the brace nor the wave reaches its sides or back. Punish the recovery. |

The Sentinel wave started as a full ring; a ring growing from the centre leaves no safe answer, so it became a frontal wave that rewards the same flank that beats the brace (For Honor guard stance, Dark Souls shield knights).

References: Hades' Wretched Witch / Gungeon lane tells (lanes), Risk of Rain and Hades pack orbiting (Packling ring), Celeste/Zelda ice physics (black ice slide).

## Implementation

- Domain: `HunterChillState`, `FrostlingPacklingBehaviorState`, `ShardcasterBehaviorState`, `WhitefangStalkerBehaviorState`, `CairnSentinelBehaviorState`; `EnemyRealm` on `EnemyDefinition`.
- Application: `RunSimulation.Frost.cs` (lances, blooms, patches, snow clouds, avalanche waves, Chill, slide, telegraphs, snapshots). The brace multiplier only applies to projectiles and splashes (accepted limitation).
- Elites: realms without an affix table defer the champion to the next spawn. Frost affixes arrive in F4.
- Rendering: `arena-frost-vfx.js` (lane/skitter/glaze telegraphs, black ice, splinter bloom, lance, the chill rime with one crystal per stack, flank-pounce lane, avalanche front, avalanche wave, snow cloud). Sprites: `tools/art/sprites/enemies.mjs` kinds 10–13.

## Plan

- ~~F2~~ shipped (see above).
- **F3:** Hoarfrost Cantor (Rime Hymn frost armour, Reknit thralls, interruptible Stillness Verse), Mirror Wisp (Glass Step teleport, decoy double, Shiver Cut).
- **F4:** Bell of Winter and Reliquary of Glass (elites/bosses), Frost elite affixes, Frost habitats and pack recipes, Rimeclaw lair, frost ground palette, `glacier-region` → Playable (provisional access rule: Ashfang slain), and a World Gate region picker.
- All numbers are provisional; balancing waits for the final pass (owner decision 2026-10-18).
