# Ashfang live Hunt integration

Owner authorized gameplay integration on 23 October 2026 after selecting the 2x visual baseline. Preserve that exact world-cell scale (448.53076140099125), inherited tier multipliers, rig, source animation and palette. Current main reconciled before implementation; concurrent town, progression and ground work preserved.

In progress: native pixel exports for gameplay locomotion, entrance/landing, breath and death; snapshot-driven runtime renderer; proper foot-depth sorting; authoritative attack/death signals and focused tests. The current fight remains C# owned; do not invent damaging melee attacks for unused source motions. Preserve the proof and all 41 editable source actions. Integration is not yet validated or deployed.

## Reactive AI and transitions

Owner clarified that the encounter must use live species-specific decisions and coherent action transitions. Shared C# utility/steering primitives now preserve Hollow chase and Frostling surround behavior while Ashfang scores claw, bite, pounce and breath against range, path availability, phase and last action. Warning captures target/direction; strike cannot home after commitment; recovery is vulnerable. New timings/ranges are provisional, damage remains the catalog strike value. Animation graph consumes authoritative windup/strike/recovery fractions, uses authored start/stop bridges, and never crossfades translucent dragon silhouettes.

Research: Mike Lewis, [Choosing Effective Utility-Based Considerations](https://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter13_Choosing_Effective_Utility-Based_Considerations.pdf), motivates range/context skill scoring. [Epic Behavior Tree User Guide](https://dev.epicgames.com/documentation/unreal-engine/behavior-tree-in-unreal-engine---user-guide) motivates per-creature memory and task/decision separation. Implemented in native C# with existing game geometry and snapshots; no engine code, game assets or encounter scripts copied.
