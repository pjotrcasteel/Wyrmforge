# Ashfang live Hunt integration

Owner authorized gameplay integration on 23 October 2026 after selecting the 2x visual baseline. Preserve that exact world-cell scale (448.53076140099125), inherited tier multipliers, rig, source animation and palette. Current main reconciled before implementation; concurrent town, progression and ground work preserved.

Implemented on the task branch: 18 gameplay/transition motions in all eight directions (3,272 exact native frames, 144 cropped atlases), the shared live Hunt renderer, ground depth sorting, reactive C# predator attacks and a shadow-only aerial fire-rain phase. The owner explicitly authorized the added live melee/aerial kit. All 41 editable source actions and the earlier proof remain preserved. Local live-browser validation passes, and independent remote atlas backups are verified. This is a playable branch implementation, not a production deployment or physical-phone acceptance.

## Reactive AI and transitions

Owner clarified that the encounter must use live species-specific decisions and coherent action transitions. Shared C# utility/steering primitives now preserve Hollow chase and Frostling surround behavior while Ashfang scores claw, bite, pounce and breath against range, path availability, phase and last action. Warning captures target/direction; strike cannot home after commitment; recovery is vulnerable. New timings/ranges are provisional, damage remains the catalog strike value. Animation graph consumes authoritative windup/strike/recovery fractions, uses authored start/stop bridges, and never crossfades translucent dragon silhouettes.

Research: Mike Lewis, [Choosing Effective Utility-Based Considerations](https://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter13_Choosing_Effective_Utility-Based_Considerations.pdf), motivates range/context skill scoring. [Epic Behavior Tree User Guide](https://dev.epicgames.com/documentation/unreal-engine/behavior-tree-in-unreal-engine---user-guide) motivates per-creature memory and task/decision separation. Implemented in native C# with existing game geometry and snapshots; no engine code, game assets or encounter scripts copied.

Checkpoint validation: web build passes; five JS state/graph tests, three domain policy tests and five focused C# signal/dodge/recovery tests pass. Found and fixed a snapshot-helper overload that broke an existing reflection-based Elder test. The broader 33-test run had 31 passes before those two fixes; final rerun and real browser acceptance remain. Native core exports complete; action/start-stop exports continue. Development Hunt now supports manual input via play=true and optional cast=false for non-damaging observation, using the same live renderer/AI as normal Hunts.

## Aerial boss phase — owner addition

Owner requested an off-screen flyover with only a shadow visible and fire raining from above, as part of an epic boss fight. Implement a C#-owned takeoff → overhead fire-rain → landing → punishable recovery sequence, with warned ground impacts, no invisible target/hitbox during overhead flight, and normal combat resuming after landing. All new tuning is provisional. Source takeoff/landing use foundation003; do not bake fire into character sprites. Validation and exports are pending.


## Reproduce runtime assets

Use the existing backed-up pixel-style-002 Blender source and motion-library-018/motions.json with render-animations.py, at 512px and 24 samples. Render groups to artifacts/ashfang/runtime-001 (walk,run,land,breath_start,breath_loop,breath_end,death), runtime-001-actions (bite,pounce,walk_start,walk_stop,run_start,run_stop), and runtime-001-flight (takeoff). Idle,claw_right,fly,roar reuse the byte-validated fine native proof002. Then run `python tools/ashfang-zagmatorah/pack-runtime.py`. It checks every native pixel against the fixed palette/binary alpha, checks unclipped bounds, crops without scaling, hashes every cropped frame and writes identical export/web bundles. Native render manifests preserve source hashes and frame/socket/contact records. Runtime animation uses the source event fractions, fixed world cell and inherited tier radius scale.

The automatic browser receipt uses `node tools/ashfang-zagmatorah/review-runtime.cjs` against the web app on loopback port8880. It drives real C# Hunt simulation and real keyboard input; no fabricated combat snapshots. The prior static proof on port8879 is preserved.


## Final local validation

- Web build passes with zero warnings/errors. All 629 Application tests, 375 Domain tests and 365 JavaScript tests pass. Focused C# tests cover a locked warning, a dodged strike, one-hit/recovery semantics, defeat identity, aerial targeting immunity and warned rain/landing.
- Actual Edge browser at 402×874: 415 live samples, manual keyboard movement, reactive melee/pounce, shadow-only overhead flight with real C# hazards, pause/pose stability and exact 448.53076140099125 world cell. A second live casting fight reaches victory and the death animation (178 samples). No browser/render/image errors; eight-atlas texture cache bound holds. See reviews/runtime-001/browser-report.json and phone screenshots.
- All 288 export/web references to 144 unique runtime atlases match independently downloaded Git LFS SHA256/size records; source002 was already retrieved independently and reopened with textures. See reviews/runtime-001/remote-receipt.json.
- Normal Hunt rendering uses the new dragon by default. The developer encounter is a repeatable direct route into that same renderer/AI with isolated rewards. `http://127.0.0.1:8880/hunt-lab?wyrm=Ashfang&ascendant=false&play=true&cast=true` enables manual play; omit play=true to watch the agent. Practice invulnerability is explicitly a developer option. Ordinary Hunts retain legal damage and progression.
- Remaining: physical iPhone acceptance, balance/play-feel review, broader art polish and conversion of the other 23 source motions when gameplay needs them. Arbitrary runtime bone blending is not possible in a sprite renderer; the implemented graph uses authored pixel transitions, distance-based gait phase and phase-aligned attack/recovery playback, without translucent crossfade ghosts. No production deployment or merge performed.
