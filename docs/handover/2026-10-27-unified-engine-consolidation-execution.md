# WyrmForge — EXECUTE unified-engine consolidation after Hollowed (ENG0–ENG4)

**Created:** 27 October 2026  
**Repository:** https://github.com/pjotrcasteel/Wyrmforge  
**Current canonical authority:** [Roadmap — unified engines](../canon/roadmap.md#locked--one-reusable-engine-per-responsibility-owner-decision-27-october-2026) and [architecture](../canon/architecture-and-quality.md#locked--unified-engine-ownership-and-event-authority-27-october-2026)  
**Task:** Implementation and validation, **NOT merely planning, reporting or another handover**.

## Paste into a new ChatGPT Work / high-effort implementation chat

> **EXECUTION TASK. IMPLEMENT ENG0–ENG4 END-TO-END IN THE REAL WYRMFORGE REPOSITORY. DO NOT STOP AFTER EVERY COMMIT.**
>
> Read `AGENTS.md`, the canonical roadmap engine section, canonical architecture and this handover. Check real `main`, all relevant PRs, branch heads, CI and current running/deployed behavior first. Use connected GitHub plus repository build/test and real browser validation tooling available in Work. **Do not implement blindly on an old snapshot.**
>
> **Hard trigger:** do not modify Hollowed art or animation concurrently. Wait until the *current* cape-free Hollowed animation/variety work (especially PR #385 and any parallel polishing work) is genuinely finished **and owner visually approved**. If not accepted, preserve it and do only source-based preparatory audit/docs; report the precise blocker rather than claiming ENG0–ENG4 was implemented. If acceptance has occurred, proceed immediately.
>
> **Owner's binding architecture rule:** exactly **one reusable engine/contract family per responsibility**: authoritative C# gameplay/physics, shared GPU LightingEngine, unified C# Agent/AI, shared sprite/rig animation controller, shared cosmetic 2.5D physics/debris solver, shared event-driven VFX, and one audio/haptic runtime. A modular engine may contain specialized profiles/adapters/backend renderers; do not invent one mega-engine, nor separately code generic engines for each spell, creature, region or elemental school.
>
> **Gameplay truth remains in C#.** On a confirmed Fireball hit/death/destructible event, provide stable source event identity and traits/timing/position so AI-observation (where relevant), animation, visual physics, GPU lighting, VFX and audio respond **as consumers**. Do not have independent JavaScript effects decide damage, hit timing, deaths, loots, collision, ability legality, run RNG or saves. Avoid duplicate events, competing lights, incorrect source lifetimes or repeated sounds.
>
> **Execution cadence:** deliver coherent, small, reversible, tested vertical slices. **Commit and push each coherent slice to your feature branch; update the same PR and continue working automatically through every unblocked ENG milestone.** A successful checkpoint is not a reason to stop or ask me to type “continue.” Reconcile upstream changes before each integration; never destroy another chat's branches, overwrite assets, break releases, or force-merge unaccepted work. Only stop for a real technical blocker that cannot be worked around, a conflicting owner-level decision, or required **final visual approval**. Do not promise background/asynchronous work.
>
> **Finish means code, tests, PR evidence, real runtime captures and a truthful status**, not adding documentation alone or declaring a green unit suite equal to mobile acceptance. If a physical-device check is unavailable, leave that explicit gate open without claiming completion; finish all unblocked changes first.

## Verified starting position (27 October 2026; MUST re-check)

| Engine | Repository foundation | Current verification |
|---|---|---|
| C# gameplay / physics | `src/Wyrmforge.Application/Runs/Simulation/`, deterministic snapshots, damage/collision/targeting | Existing production authority; preserve saves/behavior |
| GPU lighting | `src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/{engine,registry,frame-loop,lit-sprite}.js`; PRs [#332](https://github.com/pjotrcasteel/Wyrmforge/pull/332), [#344](https://github.com/pjotrcasteel/Wyrmforge/pull/344), [#345](https://github.com/pjotrcasteel/Wyrmforge/pull/345) merged | [#381](https://github.com/pjotrcasteel/Wyrmforge/pull/381) is draft arena GPU cutover behind `?arenaGpu=1`; actual live Hunt default Canvas, G4/G5 acceptance open |
| AI | C# AI0 [#348](https://github.com/pjotrcasteel/Wyrmforge/pull/348) and AI1 [#362](https://github.com/pjotrcasteel/Wyrmforge/pull/362) merged | AI2–AI6 [#364](https://github.com/pjotrcasteel/Wyrmforge/pull/364) draft, opt-in/fallback; not released |
| Animation | `wwwroot/js/{sprite-animation,sprite-layer-compositor,rigged-sprites}.js` and creature profiles; [#165](https://github.com/pjotrcasteel/Wyrmforge/pull/165) merged | Profile-driven support/action regions and direction; not true arbitrary skeletal interpolation; Hollowed [#385](https://github.com/pjotrcasteel/Wyrmforge/pull/385) is unapproved draft as of handover |
| Cosmetic physics | Current limited baked Hollowed fracture [#369](https://github.com/pjotrcasteel/Wyrmforge/pull/369) and planned FXP1–FXP6 | FXP2 solver NOT done; [#374](https://github.com/pjotrcasteel/Wyrmforge/pull/374) Fire+Explosive trait/aftermath draft |
| VFX | `wwwroot/js/arena-spell-vfx.js`, `arena-frost-vfx.js`, `arena-lightning-vfx.js`, `ashfang-vfx.js`, related boss/effect modules | Multiple adapters; one generic lifecycle/registry not verified |
| Audio | `wwwroot/js/audio.js` WebAudio mixer, `sound-events.js` semantic events, canonical audio/haptics | Runtime exists; sound design [#128](https://github.com/pjotrcasteel/Wyrmforge/pull/128) is open draft, not approved |

**Town:** The original painted 2D Town stays live. Relighting PR [#368](https://github.com/pjotrcasteel/Wyrmforge/pull/368) is paused; do not migrate/replace it or make its T0–T2 approval a prerequisite for arena G4/G5. Mobile GPU work remains in current lighting branch [#381](https://github.com/pjotrcasteel/Wyrmforge/pull/381).

## Implement ENG0–ENG4 sequentially; no per-commit interruption

### ENG0 — inventory actual owners; preserve baselines

1. Verify Hollowed acceptance trigger. Fetch latest `main`, PR #385 and all relevant animation branches, PR #381, #364, #128, #374; do not assume this handover's statuses remain current.
2. Trace one real Fireball cast → projectile/impact → C# damage/death/aftermath → authoritative snapshot → render/animation/light/VFX/audio. Also trace Hollowed hit/turn/recovery, Ashling move/attack, and a destructible crate/barrel.
3. Enumerate duplicate, overlapping or independently deciding event/lifecycle code, per-creature and per-element routing, JS-local light emulation, timing mismatches, magic values, obsolete demo paths and performance leaks. Separate **content adapters** (allowed) from **alternative generic engines** (not allowed).
4. Write/maintain an implementation-owned audit matrix listing concrete files, current authority, consumers, parity risks and tests. Do not mark a capability shipped solely because a PR exists.

### ENG1 — minimal event contract and lifecycle normalization

5. Select the existing C# snapshots/events as source of truth. Where a real gap is demonstrated, add compact versionable event/adapter descriptors: event ID, source/target IDs, simulation tick/time, world-space location/direction/height, normalized element/damage traits, impact strength/status and source lifetime. **Names here are conceptual—reuse existing classes rather than introducing duplicates.**
6. Make idempotent presentation consumption: one event cannot trigger two debris bursts, two lights, duplicate sounds or repeated animation actions after snapshots/reconnect/replay. Specify expiration, pause/resume, death/despawn, scene exit, reset, reduced-effects, deterministic seeded cosmetic variation.
7. Keep AI decisions inside shared C# agent/simulation contracts; cosmetic physics in JS or GPU may use separate timestep, but gameplay physics/collision must not move out of C#.

### ENG2 — apply the rule to **existing engines first**

8. **Animation:** preserve the existing shared controller and authored 8-facing sprite/rig profiles; centralize action state/facing/priority/transitions where genuinely duplicated; never blend broken anatomy or warp flattened PNGs. Test moving attacks, turn while attacking, attacked-while-running, interruption, death and injured/legless cases against current owner-approved Hollowed and Ashling. Correct profile integration, not individual one-off actor loops.
9. **Audio/haptics:** use `sound-events.js` → one `audio.js` runtime. Consolidate semantic event IDs, repeat suppression, phase/variation control, voice limits and disposal. Do not overwrite the unmerged [#128](https://github.com/pjotrcasteel/Wyrmforge/pull/128) listening work or claim its cues accepted. Preserve mute, volume and iOS session handling.
10. **VFX:** funnel existing spell, elemental and boss effect triggers through a tiny common event/profile/lifecycle registry if justified by actual duplication. Keep specialized render functions as content adapters. Reuse single GPU light emitter registration and the future generic FXP2 debris interface; **do not implement the entire post-focus VFX or physics backlog now**.
11. **Lighting:** reuse `LightingEngine` registries and authoritative snapshot bridge; integrate via existing [#381](https://github.com/pjotrcasteel/Wyrmforge/pull/381) rather than a second renderer. Do not change production Canvas default until G5 acceptance. Fix source event/direction/coordinate and registration duplication with regression coverage.
12. **AI:** reconcile shared AI contracts from [#348](https://github.com/pjotrcasteel/Wyrmforge/pull/348), [#362](https://github.com/pjotrcasteel/Wyrmforge/pull/362) and existing [#364](https://github.com/pjotrcasteel/Wyrmforge/pull/364). No parallel behavior tree/new AI stack; species-specific profiles remain intentionally distinct.

### ENG3 — integration/regression/mobile evidence

13. Add representative contract/regression tests in existing C#/MSTest and JS suites: one Fireball impact/death exactly once; one moving/turning/attacking Hollowed; one Ashling; one destructible; zero extra HP/loot/action; no replay duplication, replay/pause/reset stability, disposals and per-scene teardown.
14. Validate compile/unit/JS/CI, browser smoke, 320px/390px in-Hunt screenshots and performance budgets. Use real GPU lighting/actor/VFX scenes rather than isolated lab screenshots as G5 evidence. Mark real iOS/Android device tests pending unless physically performed.
15. Preserve neutral fallbacks and original Gothic lighting/materials; do not rewrite the 2D Town, drag AI into presentation, or accept fake shadows/lighting/animation from unrelated Canvas helpers.

### ENG4 — finish/merge safely and reconcile roadmap

16. Push each slice to one dedicated integration branch/PR or carefully update **existing owned branches** after rechecking conflicts and owner scope. Do not force-merge others' drafts. Keep diffs focused; ensure explicit preservation of unrelated fixes.
17. Wait for relevant CI to complete, investigate failures and fix; check remote branch head and PR diff; merge documentation/behavior-preserving accepted PRs when safe. Do not merge visual art/effects without required owner signoff.
18. Update canonical roadmap with **evidence-based** ENG0–ENG4 completion and the precise still-open G4/G5, AI2–AI6, FXP1–FXP6, ANIM1–ANIM4, VFX1–VFX4 and AUD1–AUD3 work. Distinguish implemented vs tested vs merged vs visually approved vs deployed.
19. Provide a final compact delivery report with PRs, commit SHAs, tests, screenshots and remaining approval blockers **only after doing every unblocked step**. A PR opened or a commit pushed is not the finish line.

## Mandatory acceptance scenarios

- **One Fireball hit:** real C# damage record once; coordinated GPU light / reaction animation / VFX / sound once and physics debris when appropriate; zero JS extra damage.
- **Hollowed and Ashling:** same animation controller and effect contracts; different genuine authored motion and species behaviors; action/turn/walk blend preserves feet and C# timing, including variant body plans.
- **Destructible:** one authoritative C# prop damage/destruction/drop; the same generic event path can drive debris, fire, lighting and sounds without object-specific engine duplication.
- **Frost/Storm readiness:** a new data-driven elemental profile does not require a new solver, lighting renderer, animation controller or mixer; VFX-specific art/render adapters are acceptable.
- **Pause/replay/scene exit:** no orphan lights, endless active pieces, looping impact sounds or stale animated states.
- **Mobile:** frame/memory/thermal/LOD/reduced-motion checks are recorded, with precise unverified-device caveats.

## Definition of done

ENG0 inventory backed by actual source; ENG1 event contracts only as needed; ENG2 live reusable adapters implemented with parity; ENG3 tests/real live-game captures and budgets; ENG4 PR and canonical status reconciled. Preserve current approved assets, C# authority, saves, Town painting, lighting/AI WIP, draft audio/physics and Hollowed approval gate.

**DO NOT:** merely summarize/plan; stop after every commit; assume background execution; use an obsolete caped Hollowed asset; ship draft PR #128/#364/#374/#381/#385 without the relevant gates; implement a new physics/VFX framework without first proving shared contracts and integrating existing adapters.

**Execution-order promise to honor:** finish the Hollowed owner-approved animation improvements **first**; then implement this existing-engine consolidation; then complete the lighting G4/G5 and AI2–AI6 focus milestones; only afterward begin deferred content systems unless the owner explicitly changes priorities.
