# Arcane Web: minor, medium and major specialization (0.0.172)

## Product contract
The Arcane Nexus has three separate responsibilities:
- **Main Spell:** improve the signature spell's base damage and unlock one mutation slot per level. Equipped mutations change how that spell behaves.
- **Research:** discover/craft mutations, including future cross-school hybrids. Research never directly grants skill-tree points.
- **Arcane Web:** spend character-level points only in the currently followed school. Earlier learned bonuses continue to apply when relevant after changing school; mutation-linked effects must respect actual equipped spell/mutation compatibility.

The Web is meant to be a grand, authored network of meaningful paths, not a symmetrical icon wheel. Six approved outer school emblems and generous node spacing remain canonical. Death/Necromancer and Binding/Summoner are still future authored schools; do not fake playable branches.

## Implemented first vertical slice
- Minor nodes cost 1 point, medium nodes cost 2, major nodes cost 3. Existing one-point Fireball mutation-enhancing notables keep their original price and therefore display as minor. Do not migrate or reset players' saved nodes.
- Pyromancer has twelve new connected nodes across **Conflagration** and **Immolation**. Alternate routes reconnect to existing Fire nodes, using authored coordinates with world-space separation greater than 150 pixels between Fire node centers.
- Conflagration currently uses existing playable MutationRadius, MutationDuration, and Damage modifiers. Immolation uses existing MutationDuration and Damage modifiers. **Dedicated IgniteChance and BurnDamage stats are not claimed to be implemented here.** They need tagged Fire combat integration before their own nodes can ship.
- The two new major nodes have real modifier definitions and consume 3 points. No placeholder socket art claims usable mutation amplification.
- The point chip and accessibility-sized map controls live inside the Web from the preceding floating HUD work (#282), included in this branch.
- The C# selection, shortest-path planning, School-only investment, refund reservations, saved builds and 24-point cap retain their existing behaviors.

## Next gameplay slice: generic amplifier sockets
A major amplifier socket must **reference exactly one mutation already equipped into a Main Spell slot**. It must not grant a mutation, an additional Main Spell slot, or free research. Its assignment must persist with the character/loadout and become inactive when the assigned mutation is unequipped or incompatible. Use tagged effect capabilities (e.g. area, duration, repetition) rather than switch statements hard-coded to Fireball mutations. Apply amplification to the assigned mutation's effect only, prevent recursion and cap multipliers. No crafting UI belongs in the Web.

## Acceptance checklist
- Node ownership, routes, effect bonuses and tier costs validated by domain tests.
- Browser at 320px and 390px checks all three tiers, named regions, 90px-or-greater world-space separation, no crossed routed paths, no toolbar consuming map height.
- Touch pan, pinch zoom, keyboard access, six school landmarks and saved build behavior retained.
- GitHub validation/WebKit/browser CI must pass before merge; CI emulation does not replace physical iPhone acceptance.

## Change isolation
This is the first expansion of the four authored branches. Frost, Storm, Arcane, Death and Binding are not described as already rebuilt; expand each with its own authored geometry and school-specific combat stats in later slices.
