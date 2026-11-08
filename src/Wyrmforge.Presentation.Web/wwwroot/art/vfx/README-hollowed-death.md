# Hollowed H4 — authored death impact (8 November 2026)

The owner approved creative improvements without replacing existing animated rigs. H4 adds a **confirmed-kill splat** followed by a **body-timed ground impact**, exclusively for Hollowed.

Art: uses the same already-decoded **CC0 PVFX Foundry** indexed sprite atlases shipped and recolored for H2 (gothic blood/ash) and H3 (soil/ash/stone dust). No duplicate image downloads, new 3D rig, procedural limbs, glowing magic decals or terrain material changes.

**Source of truth**: C# `deathBursts` identity, kind, `bodyRadius`, position and `progress` drive a one-shot presentation-only effect. A repeated or paused snapshot never creates additional kills. Clocks reset on new encounters. The 32-event bounded queue draws at most 16 killing-blow accents and 32 contact puffs per frame, with a lifespan of 1.45 seconds.

**Art-directed timing**:
- Initial killing-blow blood-and-ash: <= 300ms, muted and anchored to the upper body.
- Approved authored 4-frame death: foot impact at **540ms**, the end of the three early frame durations 140+180+220ms.
- Approved Blender fracture: sharp early impact at **380ms**; original fracture embers, rig and emissions remain authoritative.
- Original 24-frame body collapse: heavier landing at **780ms**.
- Ground contact sends two mismatched asymmetric source-sprite dust puffs, 360ms maximum, with soil, ash and stone palettes, suppressed on lava and heavily reduced in reduced-motion mode.
- Once matching H2/H3 atlas art is available, Hollowed no longer emits the old bright generic white death ring; other enemy kinds keep their original cues.

**Integration**: updates in `arena.js` from the same C# snapshot, draws after GPU composition and before night shading; never updates terrain albedo, heightfield or collision. H1 claw, H2 hit, H3 footsteps/crawl, approved corpse animations and the first-Hunt loading screen stay unchanged.

**Lab**: `/enemy-lab?kind=Hollow&count=3&autoplay=false&cast=true`. Enable **Autocast** so actual Hollowed can die; compare the **Hollowed death VFX** checkbox on/off at the same seed. Test a single enemy then 8+ enemies on iPhone Safari. Acceptance: two-stage impact follows the corpse instead of floating above it, doesn't overpower dark lighting, and never spawns extra bones, kill effects or terrain patches.

Unit test: `node --test tests/javascript/hollow-death-vfx.test.mjs`.
