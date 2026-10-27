# WyrmForge — WORK EXECUTION HANDOVER: AN0–AN6, the One Universal Animation Foundation
**Owner directive:** 27 October 2026  
**Execution type:** Implement, test, render, validate, document, and open a reviewable PR. NOT a planning-only response.  
**Repository:** https://github.com/pjotrcasteel/Wyrmforge  
**Current exploratory branch:** fix/hollowed-animation-polish-20261027  
**Existing exploratory draft:** https://github.com/pjotrcasteel/Wyrmforge/pull/385  
**Canonical roadmap:** docs/canon/roadmap.md (the active unified engines policy; AN0–AN6)  
**Canonical art specification:** docs/canon/art-and-animation.md  
**Reference footage:** https://youtu.be/C2eVIKeCH8E — Deniz Canbulut, “zombie walk animations,” 16 seconds, four distinct walking performances. Use for analytical inspiration only.  
**Preferred execution model:** GPT-6.1 Sol, Medium reasoning in ChatGPT Work if available; otherwise Sol Medium available in Work. Astra Low only if a proven difficult blocker cannot be resolved with Sol. Availability varies.  
**Delivery:** reusable animation engineering FOUNDATION + ONE exceptional Hollowed end-to-end reference, NOT six Hollowed characters or a new collection of attacks.

## 0. The briefest possible executive instruction

YOU OWN AN0–AN6 AS ONE EXECUTION TASK. Start work immediately. Do not stop at a plan, a status report, a couple of commits, or the first successful CI check. Audit existing source and reuse the shared components already present. Redesign the inadequate authoring and pose-blending approach, implement real contact-aware whole-body motion, prove it on ONE original fiery cape-free Hollowed, verify gameplay boundaries and mobile-scale presentation, write an actionable API/source workflow handover, and leave an unmerged, reviewable PR for owner approval. Keep progressing independently through small validated checkpoints. Only interrupt for a genuine permission blocker, missing source, a dangerous destructive action, or the final subjective art-approval gate. Do not silently merge, release, publish, or claim visually accepted art.

Success is not “a generated GIF” or “a green workflow.” The reference animation must look physically credible to a human and the new foundation must be reusable by regular GPT-6 High chats without editing its internals.

## 1. Why Work is being assigned this, and what is REJECTED

We have iteratively authored and reviewed fiery Hollowed motion, short torn cloth, running/attack blends, pass-by turns, and three attack candidates. The owner says the anatomy is a workable starting point and the internal embers are worth keeping. The new heavy double-arm maul and lunging bite are **explicitly rejected** as unrealistic, static and physically impossible. Do not present them again as approved, simply re-time their frames, or treat the current authored IK as robust.

Technical diagnosis from the actual source at PR #385:

- tools/sprite-lab/author-hollow-attack-motion.py manually resets each bone to a baseline, applies a small number of coarse pose-channel rotations and constructs wrist targets by scripted 2-bone positioning. It cannot independently guarantee stable elbow poles, proper parent-space transforms, no shoulder penetration, valid reach, or realistic support transfer.
- tools/sprite-lab/author-hollow-moving-attack.py samples a looping walk and overlays upper-body attack deltas. This keeps the leg loop *moving*, but disregards when the creature must brace, shift weight, push off, recover from a lunge or plant a foot to turn.
- Source turn test rotates roughly 158 degrees after impact. A root yaw rotation without a real support pivot/turn step can be visually impossible.
- The existing sprite-layer compositor uses semantic masks and native-pixel attachment points; composited sprites cannot reveal occluded anatomy or make an invalid 3D pose physically plausible.
- Early previews mislabeled duplicated view angles; later direction checks fixed those and demonstrated why successful automation is NOT proof of visual quality.
- Full-body alpha crossfades are a transition fallback, NOT a credible source-motion biomechanics solution.
- Some tests confirm continuous phase and frame bookkeeping without checking world-space planted foot behavior or joint biomechanics. Strengthen them.

Preserve successful work: cape-free original species identity, four upright starting morphologies, two truly legless future candidate models, shorter ragged cloth, 8 directions, natural internal fire in eyes/mouth/wounds, creature-specific anatomy, existing approved Ashling appearance, authoritative C# combat, shared sprite controller, GPU lighting and native-pixel mobile rendering. Never revive the long-caped Hollowed. NEVER invent a secondary lighting system for fire.

## 2. Mandatory research before coding: use evidence, not guesses

Watch/analyze the owner video with time sampling and compare four real motion characters:

1. Reach-and-drag: unequal foot strikes, one lagging foot, hip drop onto a supporting leg, off-axis spine, one active reaching arm and one passive limp arm, delayed head.
2. Staccato/twitchy: distinct short contact steps, abrupt but controlled upper-body jolts, bent arms, head/jaw snap, purposeful irregular timing rather than high-frequency random noise.
3. Hunched stumbler: COM driven ahead of the current support foot, knees catch a forward near-fall, arms counterbalance, recovery step follows root momentum.
4. Broken-neck shuffler: strong lateral neck damage, slow dragging contacts, lateral pelvis sway, passive arms with physical follow-through.

Use credible animation references (not just generic generated poses): Blender 4.5 IK/constraints and animation rigging docs, the 12 principles of animation as applicable, practical game locomotion and root-motion/in-place blending guidance, support polygon/foot-lock/grounding, swing-vs-stance gait mechanics and 3D limb constraints. Original-reference sources are educational only; do not import copyrighted video models or animation clips into the game without rights. Record source URLs and a brief takeaway table in a small design note. Stay focused: research should lead directly to implementation decisions, not a sprawling literature report.

MANDATORY DECISION: What part should be solved by *offline source authoring* versus the *reusable lightweight runtime*? Prefer robust Blender joint/IK/foot-marker authoring plus compiled deterministic metadata/samples, and a small engine-compatible runtime state/compositor. The runtime must not become an expensive per-enemy 3D physics or pose solver on mobile merely to imitate rendered 2D sprites.

## 3. Architecture invariants: ONE ENGINE

There must be exactly one reusable animation/motion subsystem, not a new Hollowed-only engine. Inventory and extend (or consolidate) the existing implementations:

- src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-animation.js — existing shared animation state, normalized frame/progress, facing/phase/action.
- src/Wyrmforge.Presentation.Web/wwwroot/js/sprite-layer-compositor.js — existing native-pixel semantic region/attachment compositor and bounded tile caching.
- src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-sprites.js, hollow-motion.js, hollow-combat-layers.js — presentation adapters; the last is provisional and should not become a rival engine.
- src/Wyrmforge.Presentation.Web/wwwroot/art/enemies/hollow-rigged/animation-profile.json and layers.json — real profile/metadata entry points.
- src/Wyrmforge.Application/Runs/Simulation/Enemies/RunSimulation.Enemies.cs and related combat files — authoritative C# movement, collisions, timing, attack/contact damage, intent, stable IDs and deterministic simulation. Confirm real implementation before changing signatures.
- tools/sprite-lab/author-hollow-attack-motion.py, author-hollow-moving-attack.py, hollow-source-embers.py, hollow-ragged-silhouette.py — exploratory Blender authoring code, NOT validated reusable biomechanics.
- art/source/enemies/hollow/rigged-poc/model/local-appearance-004/rigged-pixel-v3/hollow-rigged.blend — original moving source; actual cape-free reach variations live under rigged-hollow-zombie-reach-v3-*/hollow-rigged.blend. These may be Git LFS blobs: pull actual bytes; fail if only pointer files.
- Existing tests/javascript/Hollow and browser tests, .github/workflows/hollow-*.yml, docs/art/shared-sprite-animation-layers-2026-10-20.md, docs/canon/architecture-and-quality.md and docs/canon/roadmap.md.

Ownership contracts:

- C# simulation owns world-space actor trajectory, root heading and turn limits as gameplay, attack start/contact/damage/death and target/AI choices, collision, deterministic sequencing and save/replay. Animation may *request* an authored action/plant but may never spawn its own hit, change enemy speed invisibly or teleport the authoritative entity.
- ONE presentation animation state consumes authoritative snapshots and descriptive creature metadata, with monotonic attack tokens and phases; same engine works for wizard, Hollowed, Ashling, bosses and crawler-specific supports.
- Offline Blender authoring can use IK, validated bone constraints and contact markers; compiled 8-direction sprite/normal/emissive/depth/material/landmark outputs go through the existing atlas and universal GPU LitSprite pipeline.
- ONE universal GPU lighting engine owns internal embers/light spill. Animation only produces pose-locked sockets/emitter descriptors; no separate glow overlay/render path.
- ONE AI engine owns decision policy. Future physics engine owns generic environmental/cosmetic dynamics and C# authoritative gameplay constraints. Contact-aware animation is *not* a parallel collision/physics engine.
- Keep geometry/art and skinning compatible with existing approved creatures. No surprise rewrite of Ashling, bosses, mage, Town, lighting or AI.

Avoid a grand redesign of every system. Small shared interfaces and adapters on top of current code beat a speculative new package hierarchy.

## 4. Implementation milestones — finish every foundation item

### AN0 — Reconcile current truth and produce a short technical baseline

Inspect main, active PRs and latest branch HEAD; identify owner conflicts and avoid touching unrelated work. Preserve PR #385 as DRAFT; it contains BOTH usable exploratory art and rejected maul/bite. Make a dedicated foundation branch from the verified source head (ideally stack on #385 and target that PR's branch so old work is not lost; document the eventual merge/rebase order). Do not let two agents concurrently edit the same files. Record exact old motions and failures with a compact 96px source animation diagnostic: one normal walk, one attack, one pass-by turn. Label accepted/rejected accurately. Inventory LFS Blender files, source rig versions, dimensions, action frame rates, existing C# contact semantics and platform pipeline. Verify normal CI baseline and note pre-existing failures without assuming green.

Deliver: docs/animation/AN0-current-system-audit.md (or equivalent), failure reproduction commands, contact/rig measurements and a short reuse-vs-replace decision.

### AN1 — Real generic rig/anatomy/animation-source contract

Design the minimal reusable body schema including version, model identity and topology; limb presence/missing segments; named spine/pelvis/head/shoulders/elbows/hips/knees/wrists/ankles; parent transforms and bind/rest conventions; contact effectors (foot, hand/palm, knee if needed); collision and root/pelvis pivot markers; supported actions, left/right ownership; joint-axis/pole constraints; motion sample timing; optional injury profile; pose/emissive socket offsets. Evolving existing JSON/profile schema is preferred over incompatible replacement.

Make validation fail closed on absent required bones, wrong IK chain parent-space transforms, wrong source armature/skinning, camera direction duplicates, missing actual face emission and phantom limbs. Support a normal biped AND schema/fixtures representing physically legless crawling (without producing two fully animated crawlers yet). Avoid claiming an arbitrary multi-body gait physically works simply because metadata can describe it.

Deliver: versioned schema/validator, loader/editor/export functions, representative clean biped + crawler/missing-arm unit fixtures and documentation of migration/fallback for old profiles.

### AN2 — Supported, physically sensible gait and turns

Implement an authorable and testable gait model based on *actual* foot/hand support:

- Extract/store ground contact timing and contact world positions from genuine source/Blender data (walking, dragging, shuffling; later crawling).
- Delineate stance, toe-off, swing and landing; maintain planted support in position over the relevant authored interval, respecting C# displacement; prevent skating, floor clipping and sudden pose resets.
- Model purposeful pelvis/COM shifts, torso delay, compensating shoulders/head and follow-through. The COM projection/support region must be measurable; distinguish intentional unstable stumble from an accidental nonsensical pose.
- Use joint anatomical limits and real Blender IK chain constraints/pole vectors for biped hands/feet. Never invent missing limbs; no arm penetrating chest or bone stretching. Plan support handling for crawlers with alternating planted hands.
- Deterministic turn: pre-turn reweight -> foot/palm plant -> pelvis/root yaw progression -> trailing recovery step. A 158-degree facing change may span multiple supported contacts and gameplay ticks rather than instantly spinning feet.
- Avoid low-frequency robotic sine loops, perfectly mirrored limbs, constant global smoothstep ease, unrelated noisy twitches, the permanent hovering forearm and the “walking upper body over frozen foot plant” failure.

Implement an *offline diagnostic* that overlays COM, pelvis/root track, stance foot/hand, heel/toe/finger contact, joint limits, target attack reach, current facing and action phase on videos. Numerical tolerances MUST be calibrated to source/scene units and pixel-scale error; record meaningful baseline values and allowed tolerances rather than inventing ungrounded universal constants.

Deliver: shared contact/motion authoring and exported metadata, physics/joint/contact regression tests, two distinguishable original walk mechanics (normal plus the reference drag/limp or stumble) on ONE model if economical, with single-game-scale diagnostic reference.

### AN3 — Locomotion + actions + turn-to-chase through one shared animation state

The engine consumes authoritative position/facing/speed/time, attack token/progress and death/freeze/pause events. Define one source of animation phase truth (reconcile render prediction vs simulation ticks). Implement support-aware action entry and exit:

- Approach while walking/running; start anticipation without snapping or resetting stride.
- Find a physically plausible support step and brace before high-force action; allow appropriately chosen moving attacks when bracing is not required, but not an impossible planted-foot slide.
- Actual force chain: support contact -> pelvis drive -> trunk torsion -> shoulder -> forearm/claw -> follow-through -> recovery. Head, clothing and limp limbs may lag for coherent reasons.
- Allow target passing behind during wind-up/hit: attack commitment remains fixed and finishes without retargeting mid-impact. Reorient during recovery with a weighted step, then return to pursuit; never restart the attack token, play the strike backwards, or let a lower-body direction switch create a 180-degree knee/hip mismatch.
- Partial-body blending for anatomically safe actions; *full-body* authored action or coordinated root support for lunges, grabs, large attacks and crawlers. No forced upper-body-only rule if the motion requires full-body support.
- Correct prioritization of death, stun/recoil, pause/frozen states, interruption authority from C#, dropped frames, snapshots delivered out of order and resumed gameplay. Reduced motion still keeps an understandable silhouette/contact and respects combat semantics.
- Preserve game determinism, no extra damage events, no client-created enemy decisions. Runtime work must be bounded by crowd size/mobile frame budget and cache behavior.

Deliver: shared action state/profile changes, removal or consolidation of duplicate Hollow-only logic where safe, focused state/replay tests, a reviewable runtime integration example.

### AN4 — ONE truly convincing original fiery Hollowed proof

Use the CURRENT cape-free physical Hollowed source and approved shortened ragged waist-cloth silhouette, not an old caped model. Build **one** excellent source-authored attack with clear kinetic story, chosen to fit an injured, feral Gothic undead:

walking / dragging -> one visible supported wind-up -> rapid anatomically reachable claw path -> brief true contact -> follow-through -> grounded recoil -> supported turn when player passes -> chase.

Keep internal fire in both eyes, actual mouth and genuine wounds; surge on impact via existing emission/material descriptor. Fire must follow moving skinned 3D anatomy, never baked into RGB sprite pixels or applied as a second lighting engine. Distinct front/S and side/E views MUST be physically distinct; full eight-direction final source capability remains a production gate. Maintain original pixel density/lighting/nearest-neighbor details and readability at genuine game scale.

DO NOT add maul, bite, four upright family animations, both crawler attacks or a new wizard animation in this foundation task. The rejected attacks are useful regression cases, not authorization to polish them again.

Produce two comparative videos: (1) old rejected run/attack/pass-by behavior with contact overlays, and (2) new proof of same choreographed event, without camera framing tricks. MP4 H.264 for iPhone, still contact sheets and editable .blend source; GIF is optional. Include 96px original and actual 320/390px Hunt perspective. Render cheap blocking/contacts first, only expensive final lighting after contact/joint tests pass. Try creative review yourself: compare with reference and list residual flaws honestly. A successful render command is NOT a pass on feel.

If a remote runner cannot use real GPU lighting or a real physical iPhone, provide faithful local/browser evidence, report explicitly what is missing and leave the full physical device gate OPEN. Never substitute a synthetic “phone” label for a physical device result.

### AN5 — Prove reusable integration and performance

Tie the proof to the existing runtime path behind a feature flag, ensuring there is a working old pipeline fallback until accepted. Keep C# authoritative and AI/lighting/physics unchanged except minimal typed animation-intent/descriptor bridges. Upgrade the shared animation runtime rather than cloning a Hollow-only player.

Tests/evidence required (add cases rather than only editing assertions):

- Contact invariants: stationary planted foot/palm does not skate relative to world; no ground penetration; no knee/elbow hyperextension, reaching through torso, or appearing missing limbs.
- State transition matrix: idle -> walk, walk -> run, walk/run -> wind-up, attack -> recovery, attack -> turn while moving, turn -> pursuit, crawl -> future attack schema, death/interrupt, pause/freeze, reduced-motion and dropped/duplicated snapshots.
- Player passes to back halfway through attack: exactly one authoritative hit/contact decision; actor finishes committed action and reacquires appropriately afterwards.
- Same seed/snapshot/authoring inputs reproducible; replays and frame rate differences do not change combat outcomes; source clips and source profile versioning tracked.
- C# unit/behavior tests, JS unit tests, Blender source validation and reproducible export, browser tests, normal Hunt/mobile viewport capture, no new renderer path or lighting duplication.
- Measure CPU, GPU, atlas size/memory and cache under representative enemy counts on supported targets. If no physical iOS/Android test device, distinguish desktop/mobile-simulated from actual hardware and mark device verification OPEN.
- Approved Ashling remains pixel-identical in its existing appearance/animation path (or an explicitly documented no-effect regression); other species not altered.
- One extension example shows how later regular chats would author a **crawler or wizard** using metadata and source tools, without another global animation engine.

Deliver: green relevant tests with precise commands/status, true before/after evidence, bounded resource measurements, a short API/integration README.

### AN6 — Handover, roadmap reconciliation and human acceptance checkpoint

Write a developer-facing handover with:
- What changed, branch/commit/PR list and what remains unmerged.
- Public contracts/extension points, schema, state precedence and root/pose authority diagram.
- Exact Blender + asset export commands with necessary dependencies, version pins, LFS setup and source locations.
- Recipe for extending to a four-limbed beast, one-armed Hollowed, genuinely legless crawler, wizard casting rig and boss. Show differences in body profile and animation content only; foundation code should stay unchanged.
- Tests with pass/fail evidence, diagnostics, performance budget, known failures and mobile-device verification status.
- How a regular GPT-6 High chat can independently create ONE new animation without rebuilding the engine.
- Source-render/contact-sheet/mobile MP4 links (clickable and verified), actual game preview and unreleased artifacts.
- Gate ownership and rollout steps; preserve fallback and stop at owner's subjective visual approval before PR merge/deploy.

Update docs/canon/roadmap.md AN0–AN6 with actual outcome for every milestone: proposed / started / implemented / tested / accepted, never infer accepted from merged/rendered. Never self-approve artwork. Do NOT start AN-C1–AN-C6 content automatically.

## 5. Acceptance matrix — must be measured, not asserted

| Quality dimension | Failing behavior | Proof of success |
|---|---|---|
| Ground truth | Feet/hand slide while “planted”; body floats | Contact plots and actual 3D/phone video show grounded stance/support markers following world space |
| Balance | Hand lunges while legs skate unchanged; unsupported torso/COM | Bracing or mobile supported step aligned with actual torso impulse, validated in 3D/overlay |
| Anatomy | Elbows reverse, wrists teleport, shoulder intersects ribs, leg amputates on render | Rig joint limits and genuine topology/rig checks, continuous source joint trajectories |
| Anticipation/force | Three smooth, static reach poses masquerade as attacks | Clearly different anticipation, forceful impact spacing and recovery, evaluated in sequence |
| Turning | 158° root-spin without replant; target pass rewinds attack | Observable weight-bearing reorientation while hit commitment and chase remain correct |
| One-engine contract | Hollow/maul/bite/AI adds separate update loop or renderer | Only shared engine expanded, creature anatomy/action semantics declarative/adapted |
| Fire | Screen overlay or pixel glow that ignores skin/lighting | Emission in actual eyes/mouth/wounds, universal lit-sprite/effect contract, pose tracking |
| Compatibility | Ashling changed, saves break or C# game speed lies | Existing tests, live baseline comparison, deterministic replay and explicit no-change regression |
| Practical reusability | Next content author changes engine internals to add one move | Documented source/profile workflow and repeatable separate creature example |
| Artistic quality | CI passes, owner still sees physically impossible behavior | Owner sees mobile-scale MP4 and grants explicit visual approval; otherwise OPEN |

Quantitative measures (foot skating distance, penetration, joint limit deviation, pose speed, animation CPU) must be reported with units and thresholds justified by source scale/baseline; do not claim zero slip when the analysis tool only examined atlas bounds.

## 6. Cost/time/token efficiency — VERY IMPORTANT

This user strongly prefers substantial Work execution without stop-start approval requests after every commit, while conserving allowances and minimizing repeated expensive renders.

1. Use GPT-6.1 Sol at Medium if available in Work. Prefer a cheaper available Sol Medium over constantly invoking Astra. Only escalate to Astra Low for a documented hard technical impasse; don't bounce models for routine tasks.
2. Do one *bounded* initial repo inventory: specific paths above, Git status, current CI and LFS inventory. Do not repeatedly recursively inspect the entire 10,000-item tree, regather context, reread huge canonical specs, or research general animation with no implementation result.
3. Track compact milestone state in a repository file; cite files and test commands. Reuse what is already learned between milestones rather than repeating large analyses.
4. Small local tests and viewport/contact wireframe previews BEFORE CPU/GPU full render; validate rig and motion for one direction at cheap quality; render 2 facing views for QC; only then all 8/phone lighting if prerequisites pass.
5. Use matrix/batch runs for discrete necessary test fixtures, avoid triggering duplicate workflow runs for each tiny commit. When possible push a coherent tested batch.
6. Do not regenerate four whole creatures, many attacks or every environment. One reference proof suffices.
7. Use existing GitHub CI, Blender scripts and rendering pipeline; don't download/install expensive proprietary content tools or ask to pay for assets.
8. Communicate factual milestones with commit IDs, accepted vs unaccepted state, and concrete evidence. Avoid repeated generic progress messages and unsupported completion claims.
9. Do not wait for owner responses at routine intermediate engineering decisions; pick sensible defaults, write decisions down, and continue. Pause only for true destructive/security/permission blocks or required final aesthetic sign-off.
10. If constraints prevent part of the proof, preserve working implementation, mark limitation precisely, continue all safe tasks and finish with an honest actionable partial result. Never declare “finished” merely because steps were queued.

## 7. Guardrails, ownership and rollback

- No release, PR merge, Pages deployment, user-approved art claims or removal of fallback without explicit owner sign-off.
- Do not overwrite the authoritative original source/blend, exact game asset, or approved Ashling art. Work in new versioned Blender/actions and feature-flagged exports.
- Do not spend task scope on town/lighting G4, AI2–AI6, unrelated physics, arena ground, spell mutators or general gameplay.
- Keep all new code/style compatible with the existing project (.NET 10/C# architecture and current JavaScript/Blender tools). Favor deterministic contracts, small composable modules and clear tests.
- If source rig topology prevents safe IK, fix source rig/constraints and document it instead of cheating with a separate postprocess image.
- If architectural change would cause significant cross-system regression, keep a reversible adapter and prove continuity. Avoid giant speculative rewrites.

## 8. Final response format when Work finishes

Return ONLY a concrete engineering/art delivery review, not another plan:

- A short “Implemented vs Tested vs Visual approval still pending” status for AN0–AN6.
- PR and latest commit links; explicit scope change list.
- Verified MP4s and native pixel/game-view comparisons, plus foot/hand/COM diagnostics.
- Important unit/integration/CI results and measured performance with platform truth.
- Top 3 remaining risks (if any) and the exact next action for a regular GPT-6 High content-authoring chat.
- Confirm draft/unmerged and original live fallback untouched.

**STOP AT OWNER VISUAL APPROVAL.** Subsequent regular chats own remaining Hollowed morphologies/gaits/attacks, real crawler movement, Ashling variants, wizard staff/casting, bosses and world animations. They reuse this single animation engine, NEVER implement a rival engine.
