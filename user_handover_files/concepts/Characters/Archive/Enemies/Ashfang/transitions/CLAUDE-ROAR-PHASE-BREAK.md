# Ashfang roar and phase break

Both sheets have three rows in front, right-facing side and back order. Read each row from left to right.

| Source | Pose sequence |
| --- | --- |
| roar-normal-front-side-back-6-poses-DRAFT.png | Guard, brace and inhale, head draws back, skyward roar, head lowers, guard. |
| phase-break-normal-to-enraged-front-side-back-8-poses-DRAFT.png | Normal guard, brace, chest warms, shoulders rise, skyward roar, heat reaches wing membranes, head settles, enraged guard. |

Keep all four feet planted through the roar. Make the chest, neck and shoulders carry the effort. Open the wings through their joints and settle them into the corresponding idle. Keep feet aligned to the same pivot across frames. In the rear view use visible seams, wing membranes and shoulder motion to convey the transition. Register the first and last frames to the existing normal and enraged idle art.

Keep the heat rise attached to the chest and throat before it reaches the flanks and wing veins. Give the final enraged pose a steady heat level. Author the changing intensity in the emissive layer. Put any vent flames, embers, lighting and roar effect in separate presentation layers.

The inspected renderer selects the roar clip during the hunt phase break and drives its progress from hunt state. Use the authoritative phase start, progress and end to drive the transition. The simulation already interrupts combat, resets flight and clears hazards during the phase break. Bind roar audio and separate VFX to the existing phase break event and verify a single playback per transition. [Sprite renderer](https://github.com/pjotrcasteel/Wyrmforge/blob/b83e9b458a1eded44ebc6d6bef229e090362caa4/src/Wyrmforge.Presentation.Web/wwwroot/js/ashfang-sprites.js) · [Encounter simulation](https://github.com/pjotrcasteel/Wyrmforge/blob/b83e9b458a1eded44ebc6d6bef229e090362caa4/src/Wyrmforge.Application/Runs/Simulation/Dragons/RunSimulation.Dragons.cs)

These are generated pose studies. Claude owns the native redraw, fixed scale and contact points, anatomy and contour reconciliation, slicing, timing, emissive masks and mobile playback checks. Check for drift in jaw, horns, wing span and planted claws. Use the roar sheet as an acting reference and the phase break sheet for the continuous material ramp into the approved enraged form.
