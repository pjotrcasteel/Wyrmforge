# Frost region roster v1 (Rimeclaw's glacier)

- **Status:** F1 shipped. The region is still **Planned**; the kinds are `HabitatOnly` and no habitat lists them yet, so no live run spawns them.
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

References: Hades' Wretched Witch / Gungeon lane tells (lanes), Risk of Rain and Hades pack orbiting (Packling ring), Celeste/Zelda ice physics (black ice slide).

## Implementation

- Domain: `HunterChillState`, `FrostlingPacklingBehaviorState`, `ShardcasterBehaviorState`; `EnemyRealm` on `EnemyDefinition`.
- Application: `RunSimulation.Frost.cs` (lances, blooms, patches, Chill, slide, telegraphs, snapshots).
- Elites: realms without an affix table defer the champion to the next spawn. Frost affixes arrive in F4.
- Rendering: `arena-frost-vfx.js` (lane/skitter/glaze telegraphs, black ice, splinter bloom, lance, the chill rime with one crystal per stack). Sprites: `tools/art/sprites/enemies.mjs` kinds 10–11.

## Plan

- **F2:** Whitefang Stalker (Snowblind Feint cloud, flank pounce, Tendon Chill), Cairn Sentinel (Frost Brace stance, Avalanche Step slowing shock ring).
- **F3:** Hoarfrost Cantor (Rime Hymn frost armour, Reknit thralls, interruptible Stillness Verse), Mirror Wisp (Glass Step teleport, decoy double, Shiver Cut).
- **F4:** Bell of Winter and Reliquary of Glass (elites/bosses), Frost elite affixes, Frost habitats and pack recipes, Rimeclaw lair, frost ground palette, `glacier-region` → Playable (provisional access rule: Ashfang slain), and a World Gate region picker.
- All numbers are provisional; balancing waits for the final pass (owner decision 2026-10-18).
