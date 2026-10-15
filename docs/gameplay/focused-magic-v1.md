# Focused magic — first playable slice

A mage owns one primary cast. Learning another spell does not add a second automatic attack stream. A deliberate spell choice changes the primary; previous ranks and learned magic remain available as knowledge for combinations. This gives a larger cast gesture, its projectile and its impact room to read.

## Rules implemented

- Arcane Orb is the initial primary.
- Choosing a new spell or a spell rank upgrade focuses that spell. Cards for an inactive spell explicitly name the primary they replace.
- A mastered retained spell can return through a separate **Switch primary** draft choice without inventing another rank.
- Reinforce choices favor the active primary; Venture can pivot to retained knowledge after unlearned schools have been explored.
- Only the active primary has its cast clock advanced and scheduled. Switching away and back does not reset its outstanding cooldown.
- The combat HUD displays the primary only. The snapshot retains all learned spells and explicitly marks the active one.
- Learning requirements does not automatically activate a combination. The player must select the separate synergy skill.

## First combination: Frostfire

After learning Fire Bolt and Frost Shard, a separate Frostfire choice becomes available. While either is focused, one projectile carries both freezing and burning. The projectile retains the primary spell's damage, cadence, speed, mastery/evolution and earned volley effects. Frostfire adds Burning for 3.5 seconds; a Fire Bolt host also receives the learned Frost Shard rank's freeze duration. A Frost Shard host keeps its native freeze. Existing boss duration rules continue to apply.

Fire Bolt's existing shatter interaction still multiplies damage against an already-frozen enemy. Its first combined hit freezes/burns; subsequent hits can shatter. Burning continues while the target is frozen. This slice does not inherit the secondary spell's full damage or its mastery nova.

The projectile captures its combination identity and additional statuses when cast. An in-flight shot keeps them if the player later switches focus. Chain continuations retain the captured payload. Render snapshots carry a generic combination ID; Frostfire currently renders as a cold exterior with a fire core, rather than a second independent ice projectile.

Stormglass now allows a focused Chain Lightning to apply its frost knowledge itself; later discharges can use the existing frozen-target bonus. Arcane Conduit remains an explicitly selected on-hit combination proc. Combination infusions apply to the focused host, so a secondary proc does not inherit an unrelated inactive host's combination.

## Motion and presentation

The separate art study is being updated with a larger torso recoil, a visible staff arc and a casting-arm sweep. Fire I, Fire III and one Frostfire cast are compared in its focused-magic review video. This gameplay change does not replace the live placeholder mage with unfinished analytical art.

Injury stays visual only. This slice adds no injury-dependent movement speed, damage, cast delay or cooldown. Primary ownership is per spell ID, allowing multiple different spells within one school. Future combination skills can define their own primary, secondary knowledge requirements and composite visual identity rather than mapping every spell to one generic school animation.

## Validation and release scope

Application tests cover one cast stream with eight learned spells, explicit switching, preserved ranks, cooldown retention, no accidental frost/burn from merely learning the prerequisite, a single Frostfire projectile applying both statuses, burning damage during freeze and retained payload after switching. Upgrade readout tests cover explicit primary replacement and correct mastered-rank text.

Local validation: 245 application tests, 131 domain tests, 5 upgrade-presentation tests and 53 JavaScript tests passed. The web Compile target passed. A full local WebAssembly asset build failed to start the SDK's ComputeWasmBuildAssets task host (MSB4216); CI must validate packaging before merge. No real-browser playtest is claimed.

This is a gameplay draft. Total output changes from the previous many-spell scheduler, so encounter pace, skill offer frequency, status uptime, echoes and earned multi-projectile effects need a live balance pass before release. Existing earned volleys, echoes, relic/essence procs and explicitly selected combination effects remain; this slice removes independently scheduled learned base spells, not every possible multi-projectile upgrade. It has not been merged or deployed.
