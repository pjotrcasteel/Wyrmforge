# Arcane Web mutation amplifier sockets — 0.0.173

## Behavior and ownership
Main Spell owns its levels and equipped mutation slots. Research owns discovery and hybrid crafting. The Web owns passive node investment and amplifier slots. An amplifier is **not** another mutation slot.

Crown of Ash (major, Conflagration) grants an **Area ×1.20** socket; Heart of the Furnace (major, Immolation) grants a **Duration ×1.25** socket. Both keep their previous base passive modifiers. The Web inspector lets a mage bind one compatible mutation already equipped in Main Spell. Currently implemented mutations include Detonation (Area), Scorched Earth (Duration) and two potency-class mutations for future sockets. Unimplemented mutations have no pretend active capabilities.

The binding is a generic `(NodeId, SpellId, MutationId)` identity, not a Fireball-only state structure. Effect descriptors publish capabilities (Area, Duration, Potency, SecondaryTrigger), so a future researched Frostfire hybrid can participate once its actual effect tags and simulation are implemented.

## Combat
The run snapshots the assignment alongside the Fireball recipe. Amplifier factors are resolved **once at run preparation**, never per frame. A learned Web node and a matching equipped mutation are required. No equipped mutation means factor 1 (dormant). Refunding a node also makes it dormant without destroying the assignment.

Detonation's explosion radius is increased at the **mutation-specific source** before combination with other splash sources. Scorched Earth's burning ground duration is increased only when Scorched Earth creates that ground. General Fireball damage, other mutations and other schools do not accidentally inherit these factors. The generic factor budget caps multiplication at ×1.50 and no amplified output is ever fed back into itself.

## Persistence and compatibility
- Existing `wyrmforge.arcaneBuild.v1` saves deserialize with `Amplifiers == null`; default behavior is unchanged.
- Updated builds store amplifier assignments in the existing build save; independent added keys are unnecessary.
- Hunt loadouts optionally store amplifier bindings without breaking old version-1 saves.
- Save and loadout application preserve school-specific investments and existing research restrictions.
- A run cannot change prepared mutation/assignment state after committing the primary spell.

## Tests and acceptance
- Domain MSTest covers compatibility, locked nodes, missing equipment, wrong spell, stale assignments, caps and loadout roundtrips.
- Application MSTest confirms hunt preparation snapshots and rejects post-start mutations.
- Browser test assigns Detonation at Crown of Ash and confirms persistence across reload.
- Real browser/mobile screen layout and existing 320/390px WebKit gesture suites remain regression gates.
- Merging depends on successful validation and browser CI. A physical iPhone remains the final tactile/visual acceptance target.

## Next
Add further non-Fire spell and hybrid effect descriptors only when those actual effects exist. New schools should have bespoke branches, not copied Pyromancer layouts. `SecondaryTrigger` needs an independently bounded combat effect implementation before it is offered as a selectable Double Effect socket.
