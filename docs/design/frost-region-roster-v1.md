# Frost region roster v1 (Rimeclaw's glacier)

- **Status:** F1, F2 and F3 shipped. The region is still **Planned**; the kinds are `HabitatOnly` and no habitat lists them yet, so no live run spawns them.
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

## F3 kinds

| Kind | Role | Behaviour | Counterplay |
|---|---|---|---|
| **Hoarfrost Cantor** (14) | Support, cost 3 | Keeps 220–340 px back, near its pack. **It never heals and never shoots** (unlike the Ash Priest's single-target heal). Chants breakable rites: **Stillness Verse** (1.2 s, only if you are within 130 px: 4 damage, +3 Chill); **Reknit** (1.4 s: a fallen Frostling leaves a **rime husk** for 9 s, and the Cantor pulls it back up as a thrall at 50% health and 0.8 speed; at most 2 per Cantor; a thrall that falls again shatters for good); **Rime Hymn** (1.6 s, needs 2+ unarmoured allies in 200 px: each gains a **rime crust** of 35% max health for 10 s that soaks damage first; never the Cantor itself or other Cantors). Losing 15% health during a chant, a shove or a Warding Pulse **silences** it for 1.6 s. | Go for the Cantor first and break its chant with a burst. |
| **Mirror Wisp** (15) | Ambusher, cost 2 | Always visible but **veiled**: half opacity, and while drifting or shimmering it takes ×0.5 damage. Every ~4.2 s a **Glass Step**: it shimmers (0.55 s) at a reflective spot (a **black-ice patch** 60–320 px from you when one exists, else 56 px beside you), then steps through. It leaves a **reflection double** (16) where it stood (3.5 s, harmless, not a hostile, pays nothing). A 0.45 s windup locks the **Shiver Cut**, a ±50° arc out to 74 px (8 damage, +1 Chill); then it is **exposed** for 0.9 s (×1.4 damage). | Watch the landing diamond, step out of the arc, punish the exposed window, ignore the double. Black ice makes it more dangerous: Frost kin combine. |

The Wisp's step point was first 90 px from you, outside its own 74 px cut, so it could never hit; it now lands at 56 px, so the cut reaches you unless you move during the windup.

The Sentinel wave started as a full ring; a ring growing from the centre leaves no safe answer, so it became a frontal wave that rewards the same flank that beats the brace (For Honor guard stance, Dark Souls shield knights).

References: Diablo necromancer corpse use (husks), Hades' Satyr Cultist chants and Path of Exile totems (breakable support rites), Hollow Knight shade decoys and Nioh's Yuki-onna (Wisp), Hades' Wretched Witch / Gungeon lane tells (lanes), Risk of Rain and Hades pack orbiting (Packling ring), Celeste/Zelda ice physics (black ice slide).

## F4b set piece: the Bell of Winter (17)

The Frost lair road. It shares the Bell Warden's road semantics (entrance toll, no horde, no elite or Reliquary, the road opens when it falls) but fights the other way round: **it never calls reinforcements**; it closes the ground instead. Unique, radius 40, ×18 health, 0.42 speed; it only walks between moves. Its moves cycle **Slam → Toll → Slam → Recall**, and every move has a long tell and a long recovery: panic and greed are both punished.

| Move | Tell / recover | Effect | Counterplay |
|---|---|---|---|
| **Permafrost Slam** | 1.3 s / 2.2 s | A crater 60–140 px ahead (90 px radius: 24 damage, +2 Chill). It leaves 3 **permafrost scars** (230 px long, 15 px half-width, 10 s; at most 8, oldest first), fanned out with the first one toward you. A scar is black ice: no grip, and it chills. If you are beyond 260 px, it tolls instead. | Step out of the crater; plan your footing around the scars. |
| **Winter Toll** | 1.1 s / 1.6 s | 3 freezing rings from the bell, 0.45 s apart, each rolling from 50 to 360 px in 1.3 s (24 px band: 9 damage, +1 Chill, once per ring). Every ring has 3 **open lanes** (±17°). The first ring never opens straight at you, and each later ring turns by half a lane step. | Stand in a lane, then shift to the next one. |
| **Icicle Recall** | 1.4 s / 1.9 s | Marked icicles fall 0.85 s later (40 px: 14 damage, +2 Chill): one on your spot at the tell, plus one on the middle and one on the tip of every scar. **The scars are used up.** On an empty floor (or in Deep Winter) four more ring your spot. At most 10. | Leave the marks; the floor is clear again afterwards. |

**Rime (half health):** overflow damage stops at 50%. The bell rimes over for 2 s, a free window: it does not move or act, and hanging icicles melt. Then comes **Deep Winter**: 4 rings, 4 scars, recall always rings you, and 0.9 s between moves. Its fall thaws every scar, ring and icicle.

Why: the Fire Warden pressures you with lanes to outrun and a rally of adds; the winter bell **boxes you in** with ground that stays and walls you can only cross through their gaps (Hades' Asterius and Theseus lanes, Enter the Gungeon bullet-ring gaps, Dark Souls' Bell Gargoyles/Old Iron King for the bell set piece, Elden Ring's frost-ground persistence). The scars → recall loop makes the floor itself the rhythm: it fills up, then it is called down and cleared.

## F4c rare boss: the Reliquary of Glass (18), Crystal Ward (19), false form (20)

The Frost Reliquary. It shares the Fire Reliquary's encounter (the sigil, hush and emergence on a Frost Reliquary habitat: Mirror mere, Cairn barrows, Buried hamlet; the reward and the withdraw clock). Where the Fire Reliquary pressures with seals and corruption, the glass one **boxes you in**: it builds walls of light and cages and hides among copies of itself. Unique Support, radius 27, ×15 health, 0.5 speed, light contact damage; immovable by Warding Pulse; it keeps 220–340 px away. Rites run from a fixed order, **Ward → Prison → Veil → Prison** (after the shift **Ward → Veil → Prison → Prison → Veil → Prison**), with 1.2 / 1.0 / 0.9 s casts, a 1.2 s recovery and a 2.2 s gap (1.6 s after the shift). A Ward rite is skipped while 3 crystals stand; a Veil rite is skipped while already veiled.

| Rite | Effect | Counterplay |
|---|---|---|
| **Crystal Ward** | Raises a crystal pylon (kind 19, ×2.6 health, unmoving) 110 px from the caster; at most 3 standing and 9 per fight. While any crystal stands, the Reliquary takes ×0.35 damage. Each crystal **kindles a tether** to the Reliquary (0.9 s dashed thread), then it burns: crossing a lit tether (7 px half-width) deals 7 damage and +1 Chill, at most once a second per pylon. | Break the crystals first: they shield it and they wall the arena. |
| **Glacial Prison** | One cage gathers over **you** (tracking, 1.2 s), plus one per standing crystal, fanned 150 px ahead of you (where a retreat would run). A cage is 72 px; after it rises it stands for 4 s. Crossing its wall either way deals 10 damage and +2 Chill (0.6 s cooldown); standing inside chills. At most 6. | Keep moving while it gathers; don't fight from inside a cage. |
| **Refraction Veil** | Shatters into a ring of mirrored forms (kind 20; 2, or 3 after the shift) 120 px around a seeded true slot; the true body moves there. All of them move alike and look alike: only **the true body's lanterns are lit**, the false forms' are dead. A false form breaks in one hit. Hitting the true body **breaks the veil**: the forms shatter and it is **exposed** (1.8 s stagger, full damage). After 7 s the veil fades and every remaining false form closes a prison: the first on you, the others 150 px toward each form. | Find the lit lanterns; strike the true body fast, or the copies become cages. |

**Shatter (half health):** overflow stops at 50%; a 2 s shatter (it drops any veil), then the deeper rite order with shorter gaps and three false forms. Its death or withdrawal clears every crystal, tether, form and cage.

Why: the Fire Reliquary is a damage race through wards; the glass one turns the arena against you, as the concept asks (crystal wards, mirror deceptions, prison zones). References: Path of Exile totems and Diablo's Pylons (breakable empowering pylons), Hollow Knight's Soul Tyrant / Dark Souls' Pinwheel and Dancer clones with a tell (find the true body), Hades' Theseus walls and the Zelda/Elden Ring cage traps (prisons that punish standing still).

## Implementation

- Domain: `HunterChillState`, `FrostlingPacklingBehaviorState`, `ShardcasterBehaviorState`, `WhitefangStalkerBehaviorState`, `CairnSentinelBehaviorState`, `HoarfrostCantorBehaviorState`, `MirrorWispBehaviorState` (+ `MirrorDoubleState`); `EnemyRealm` on `EnemyDefinition`.
- Application: `RunSimulation.Frost.cs` (lances, blooms, patches, snow clouds, avalanche waves, Chill, slide, telegraphs, snapshots) and `RunSimulation.FrostRites.cs` (Cantor rites, rime husks and crust, Wisp step, doubles and cut). The brace multiplier only applies to projectiles and splashes (accepted limitation). Rime crust soaks all `DamageTarget` damage.
- Elites (F4a): six Frost affixes, one per non-unique kind. **Rimehowl** (Frostling: +2 Chill per bite), **Splinterwright** (Shardcaster: the lance blooms along its lane every 90 px), **Twinfang** (Whitefang: a second pounce after a 0.3 s recover), **Barrowlord** (Cairn Sentinel: a second avalanche ring 0.45 s later), **Choirwarden** (Cantor: hymn radius ×1.8), **Thousandface** (Mirror Wisp: a second double, 46 px aside). Mirror doubles never become elites.
- F4b: `BellOfWinterBehaviorState` (Domain); `RunSimulation.BellOfWinter.cs` (scars, rings, icicles, telegraphs, snapshots), with the bell road in `RunSimulation.BellWarden.cs` choosing its set piece per region school (`BellRoadKind`). Permafrost counts as black ice in `PlayerOnBlackIce`. Rendering: `arena-winterbell-vfx.js` (scars, laned rings, icicle marks and drops, winter telegraphs); the bar and entrance in `arena-bellwarden-vfx.js` follow the snapshot `variant` ("fire"/"winter"). Sprite: kind 17, a gaunt horned keeper dragging an icicle-fringed bell.
- F4c: `GlassReliquaryBehaviorState` (Domain; reuses `ReliquaryPhase`); `RunSimulation.GlassReliquary.cs` (crystals, tethers, false forms, prisons, telegraphs, snapshots). `RunSimulation.Reliquary.cs` now picks its Reliquary per habitat school (`ReliquaryKind`) and reports a snapshot `Variant` ("fire"/"glass") with `Veiled`/`Exposed`. Rendering: `arena-glass-reliquary-vfx.js` (tethers, prison floors and bars, the lantern tell, glass telegraphs); the sigil, hush, emergence and bar in `arena-reliquary-vfx.js` follow `RELIQUARY_THEMES`. Sprites: kind 18 (pale celebrant, gilt halo, a yoke of four crystal lanterns), 19 (crystal pylon), 20 (kind 18 with dead lanterns).
- Rendering: `arena-frost-vfx.js` (lane/skitter/glaze telegraphs, black ice, splinter bloom, lance, the chill rime with one crystal per stack, flank-pounce lane, avalanche front, avalanche wave, snow cloud, rime hymn / stillness rings, reknit thread, glass-step diamond, shiver-cut arc, rime husk, rime crust). Sprites: `tools/art/sprites/enemies.mjs` kinds 10–16. F3 also fixed `ENEMY_KIND_COUNT` in `arena-enemy-art.js` (was 10, which clamped every Frost kind to the Bell Warden sprite in-game).

## Plan

- ~~F2~~ and ~~F3~~ shipped (see above).
- ~~**F4a:**~~ Frost habitats (Frozen road, Snowbound pines, Whiteout plain, Buried hamlet, Cairn barrows, Mirror mere, Glacier approach, Glacier lair) and pack recipes (Packling litter, Whitefang hunt, Shard line, Cantor rite, Cairn wall, Wisp veil; last stand: Whiteout), Frost elite affixes, Frost territory names (Snowbound vale, Rimewall heights, Glacier basin), the snow biome (tiles, drifts, ice patches, snow pines, cairns, icefall, buried sledge, pale walls), `glacier-region` → Playable as **The Hoarfrost Reaches** (provisional: opens once Ashfang is slain; Ashfang is Absent there) and the World Gate region picker. A hunter's first hunt in a new region culminates in its home Wyrm but is a full hunt (`regionOpening`), unlike the tutorial First Hunt.
- ~~**F4b:**~~ Bell of Winter (the Frost lair road; see above).
- ~~**F4c:**~~ Reliquary of Glass (the Frost rare boss; see above). The Frost roster is complete.
- All numbers are provisional; balancing waits for the final pass (owner decision 2026-10-18).
