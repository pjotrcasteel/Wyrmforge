# Ashfang pixel-art study — normal form

## Current Aseprite status

Start with aseprite/CLAUDE-ASEPRITE.md and Ashfang-Tier-I.aseprite in the same folder. Six editable turnaround frames share a 72×48 canvas with aligned height and emissive drafts. The notes below record earlier stages and include the source sheets for animation authoring.

First draft for visual review, not yet approved or runtime-ready. Front, right-facing side and back share a coarse volcanic-dragon direction: four legs plus wings, ragged red membranes, charcoal hide, orange fissures and a long spiny tail. PNG has RGBA alpha spanning 0–255; no alpha-edge cleanup or in-game size validation has been completed. The enlarged 2172x724 sheet is NOT a native-resolution sprite atlas. Proposed logical footprint was roughly 64px body height / 96px wingtip height; generation is not an exact pixel-grid or scale guarantee. Lock native frame bounds and silhouette after owner review. Reconcile horn count, wing tears, feet, tail and emission between facings before slicing or animation.

Do not overwrite the existing approved GitHub Ashfang source or its runtime assets with this exploratory study. Repository already contains a substantial Blender/rendered-sprite pipeline. Main-branch files inspected 2026-11-04, search revision b83e9b458a1eded44ebc6d6bef229e090362caa4:
- Original concept: https://github.com/pjotrcasteel/Wyrmforge/blob/main/user_handover_files/concepts/Fire/10-ashfang-the-cinder-wyrm.png
- Existing animation catalog: https://github.com/pjotrcasteel/Wyrmforge/blob/main/art/source/bosses/ashfang/ANIMATION-CATALOG-003.md
- Existing source status: https://github.com/pjotrcasteel/Wyrmforge/blob/main/art/source/bosses/ashfang/PAUSED.md
- Existing integration notes: https://github.com/pjotrcasteel/Wyrmforge/blob/main/art/source/bosses/ashfang/RUNTIME-INTEGRATION.md

Catalog lists 41 motions at eight directions, source24fps/export12fps: locomotion and transition clips; pounce; left/right/combo claws; bite; left/right tail; roar; breath start/loop/end/sweep; takeoff/fly/hover/glide/banks/air breath/land; hit/stagger/recover; two deaths. Those are repository-authored assets, not newly produced or independently validated in this pack. Existing integration notes describe C# decisions and committed warning/strike/recovery phases. Follow the actual live behavior contract when mapping attacks; do not infer new damage from conceptual effects. Original concept also describes phase escalation, flame sweep, aerial pressure, scorching charge and burning terrain. These are concept requirements, not proof every attack is currently implemented.

Next: review this normal-form design, then settle the visibly escalated phase-2 design and build attack references against current C# authority. No new Aseprite, height maps, emission masks or attacks have been created for Ashfang in this pack yet. Treat all molten orange paint as provisional until the emissive contract is authored. Source pipeline attribution must be retained if reusing the existing Zagmatorah-derived assets; see repository ATTRIBUTION.txt. This study uses the provided Wyrmforge concept as reference and does not package that 3D source.

## Approved Tier I scale and phase-two review draft
User selected the FIRST half-size version, retaining the sharper features and heavier scales. Current normal baseline is normal-half-size-approved.png. The later lean youngling redesign was not selected. The larger original sheet is superseded. Tier I should feel young through restrained scale, with larger later tiers left open, while retaining the selected anatomy. Grey human is a scale guide only; remove it from production exports. Do not reuse earlier proposed 64/96px targets as approved native bounds. User requested half the size relative to the preceding large comparison; this is a visual scale decision, not a runtime world-unit measurement.

phase-2-enraged-DRAFT.png is NEW, awaiting owner review. Same small Tier I identity: braced crouch, molten chest/neck/flank/tail seams, lit membrane veins, hotter eyes/mouth and a few small dorsal vents. No intended growth or change to collision dimensions. Generated phase-two art has some silhouette/size and pixel-density drift versus the normal reference; reconcile and register both on final native frames before claiming equal bounds. Preserve wing tears, horns, limb count and tail anatomy across views. Phase two is visually exaggerated heat and behavior, not a larger tier. Imagegen created this as an edit of the approved normal sheet with transparent-background requested; no per-frame alpha-edge cleanup or runtime validation done. Do not use glowing membrane veins to justify a new damage effect. Native frame bounds, attack animation, material maps and Aseprite remain pending for this pack.

## Locomotion before attacks
Normal-form front, side-right and back walk sheets now included under locomotion/, eight pose references each. See locomotion/README.md for limitations and frame-authoring requirements. These do not constitute a finished walk animation. Idle/run and phase-two locomotion remain pending. Phase-two turnaround was approved by owner ("Love it").

## Idle source sheet and Claude ownership
Owner explicitly assigned slicing, timing and validation to Claude; continue creating art without blocking each next sheet on those tasks. Idle sheet: idle-front-side-back-4-poses-DRAFT.png, rows FRONT / SIDE-RIGHT / BACK, four breathing poses per row, left-to-right. Relaxed exhale -> inhale -> full inhale -> settling exhale. Feet intended planted; shoulders/chest breathe, wing joints settle and tail moves subtly. Preserve approved half-size Tier I baseline in game; sheet enlargement is for inspection only.

Generated sheet includes a visible brown background/halo despite transparency request. Claude must remove that background and edge contamination before any texture export. Do not mistake background glow for an emitter. Also reconcile plate/horn/wing contours and exact planted foot positions against approved normal turnaround and walk sheets, normalize per-view scale and pivot, then slice/tag/time in Aseprite and validate loop continuity. These are assigned integration tasks, not checks already completed. Only original source PNG is included; no destructive cleanup applied here. Idle/run playback has not been created in this pack. Next source-art task: run cycle before attacks.

Generation brief (built-in image generation): twelve coarse pixel idle poses, four front / four right-side / four back, normal Tier I heavy charcoal dragon, four legs plus oxblood wings, sparse orange seams, subtle breathing and planted feet; preserve approved anatomy and omit human, flames, text, floor and shadows. Background transparency was requested but not achieved visually.

## Normal-form run source added
run-front-side-back-6-poses-DRAFT.png: three rows FRONT / SIDE-RIGHT / BACK, six poses per row, chronological left-to-right. Intended motion is a low driving gallop: reach/contact -> forequarter load -> hind gather/plant -> hind push -> short suspension -> gather/reach. Wings tuck toward body and settle rather than flap; tail balances extension. Sparse normal-form seams only, not phase-two heat. Match approved half-size world scale independently of this enlarged sheet.

Claude owns slicing, intentional durations, fixed pivot/native frame bounds, gait correction, alpha cleanup and looping/mobile validation. This is an unsliced source sheet, not a validated animation. Reconcile generated plate contours, wing tears, horn shapes and per-view scale; front/back limb occlusion and side hindleg contacts need checking against four-legged anatomy. No runtime changes or hit events are defined by run poses. Phase-two locomotion, start/stop/turn transitions, materials and an Ashfang Aseprite project remain pending. Normal idle, walk and run now all have source poses in this pack.

Generation brief (built-in image generation): 18 coarse pixel normal Tier I run poses, six each front/right-side/back, four legs plus separate tucked oxblood wings, low grounded gallop, charcoal scales and sparse orange seams, transparent background, no human/text/effects. Source used approved half-size normal turnaround.

## Phase-two enraged idle source
idle-enraged-front-side-back-4-poses-DRAFT.png: rows FRONT / SIDE-RIGHT / BACK, four poses each left-to-right. Tense exhale -> inhale -> peak breath -> settling exhale. Retain normal Tier I size, body anatomy and intended planted contacts. Approved phase-two features: hotter branching seams, lit membrane veins, bright eye/jaw and sparse small dorsal vent flames. Breath should affect posture, with gentle vent-flame variation, not whole-body emission strobing. No intended growth, new hit region or idle damage.

Claude: match native frame bounds, body scale, foot pivot and fixed anatomy to normal idle and approved turnaround; do not overlay enlarged sheets assuming pixel registration. Brown backdrop/halo remains despite transparency requested: remove background and edge contamination, keep actual source glows and vent flames separated from diffuse/background. Check foot placements, horn/wing-tear/plate continuity and side versus front vent visibility. Height/emission maps not yet authored for these poses; flames are not solid height. Slice/time and validate playback as already assigned by owner. This is source art only, not a completed animation project. Phase-two walk and run remain next; attacks and transitions/materials/source project remain pending.

Generation brief (built-in image generation): twelve coarse pixel phase-two idle poses, four each front/right-side/back, based on approved enraged identity and normal idle pose ordering. Same small four-legged dragon plus two oxblood wings, tense breathing with planted feet, molten seams/wing veins/vent flames; transparency requested, background still visible in output.

## Phase-two walk and run source sheets
Added walk-enraged-front-side-back-8-poses-DRAFT.png (3 rows x8) and run-enraged-front-side-back-6-poses-DRAFT.png (3 rows x6). Rows FRONT / SIDE-RIGHT / BACK, chronological left-to-right. Enraged walk is intended as a tense grounded four-beat gait with overlapping support; run as low driving gallop with tucked wings. Same approved small Tier I world scale and anatomy, brighter branching seams/wing veins and restrained vent flames. Vent flame tips may trail with motion, but no damage trail or new collision shape is implied.

Both forms now have idle/walk/run SOURCE POSES. Claude owns slicing/native-grid authoring, scale/pivot matching, timing, gait and loop/mobile validation. No timeline animation or runtime integration is claimed. Match phase-two walk timing to normal eight-pose sequence where viable, not by assuming sheets already register. Known generated drift: feet/plates/horns/wing tears/glow patterns between poses and forms; back run has extra bright nape/spine glow needing reconciliation with approved phase-two turnaround. Side walk foot progress remains subtle and far-leg occlusion needs review. Preserve independent four-leg anatomy; do not approve gait from sheet pose count alone. Normalize sheets against approved small creature comparison and remove fringe pixels/background contamination when exporting.

No per-frame height/emissive materials yet; author final maps after locked geometry. Lit membrane veins/seams belong to emission, dark scales remain nonemissive; vent flames are not solid relief. No new combat effects are authorized. Start/stop/turn transitions, attacks, phase-shift performance, hit/death sheets and Ashfang Aseprite/materials still pending in this pack. Existing repository animation library remains separate and untouched. Next art task: fire-breath wind-up/release/recovery with committed C# attack timing.

Generation briefs (built-in image generation): phase-two eight-pose walk and six-pose run per direction, front/right-side/back. Approved enraged identity plus normal run reference. Coarse pixel art, four legs plus separate wings, charcoal/oxblood/ember palette; no growth, no humanoid/cute redesign; transparency requested.

## Long fire-breath build-up
Normal side performance source now included under attacks/. Owner wants long powerful cinematic anticipation. Proposed wind-up3.2s, release/sustain/taper1.4s, recovery0.9s; these are authoring suggestions, not implemented current combat values. See attacks/CLAUDE-FIRE-BREATH.md for exact pose timing, C# reconciliation, VFX separation and source defects. Front/back and phase-two breath remain pending.

## Fire separated from body
Owner confirmed independent fire VFX. Use attacks/fire-breath-side-body-only-12-poses-DRAFT.png for body source; vfx/fire-breath-right-6-poses-DRAFT.png for external breath source. Earlier composite is reference only. See attacks/CLAUDE-FIRE-BREATH.md for mouth sockets, independent sustain loop, C# lifetime/damage authority and remaining cleanup.

## Normal front/back fire breath added
Twelve body-only poses each, same sequence as side. Normal breath source now covers front/right-side/back; external VFX remain separate. Front/back VFX projection and hidden-mouth depth are Claude authoring tasks; standalone effect art currently side-right only. See attacks/CLAUDE-FIRE-BREATH.md. Phase-two breath next.

## Phase-two breath source added
Twelve body-only breath poses each front/right-side/back now included. Both forms have three-view breath body source art. All external flame, including dorsal vent flames, stays separate. Preserve long buildup and enraged baseline on recovery. See attacks/CLAUDE-FIRE-BREATH.md.

## Both-form breath sweep sources
Added three-view six-stage normal and enraged body-only sweep sheets. Precede with long inhale from basic breath. Separate VFX must follow mouth position AND forward axis. Check current C# sweep support and preserve authority; pose angles are not measured. See attacks/CLAUDE-BREATH-SWEEP.md.

## Normal claw family sources
Added left/right/combo normal body-only studies, six poses each front/right-side/back. Anatomical limb conventions and remaining side-view/front-combo defects are explicitly in attacks/CLAUDE-CLAWS.md. Claude owns native authoring/timing/validation; no hit events or gameplay changes implemented. Enraged variants next.

## Enraged claw source family
Added left/right/combo enraged sheets in three views, six stages each. Both forms now have claw-family references. Known rear-combo second-limb and side near/far identity defects explicitly assigned to Claude in attacks/CLAUDE-CLAWS.md. No completed animation/integration claimed. Bite source art next.

## Both-form bite source
Added six bite poses each front/right-side/back for normal and enraged. Physical neck-driven snap, distinct from breath heat buildup, with no baked VFX. Claude cleanup/timing/authority mapping in attacks/CLAUDE-BITE.md. Pounce next.

## Explosive pounce source
Both forms now have three-view eight-stage pounce sources. Owner wants a real WTF moment: held readable coil, sudden spring-driven launch, airborne silhouette and weighty landing/recovery. Claude trajectory/pivot/timing/authority and source-defect notes in attacks/CLAUDE-POUNCE.md. No new gameplay constants or impact VFX implemented. Tail next.

## Tail source family
Four left/right normal/enraged three-view six-stage body-only studies added. Right-sheet rear rows still need direction reversal and side depth distinction; explicit Claude correction assignment in attacks/CLAUDE-TAIL.md. External trails/impact VFX separate. Aerial locomotion next.

## OWNER TAKEOFF/OVERHEAD CORRECTION
Current aerial/CLAUDE-TAKEOFF-OVERHEAD.md overrides gradual visible takeoff/flight assumptions: long build-up, EXTREMELY FAST vertical acceleration out of camera TOP, then ONLY MOVING GROUND SHADOW overhead. Revised both-form eight-stage source sheets included; earlier gradual/wingbeat studies are reference-only. No runtime/shadow implementation done here. Claude must preserve separate ground shadow when actor draw is hidden, align true altitude and authoritative state, and later author return/landing.

## OWNER LANDING CORRECTION
Several strong air-braking flaps -> progressively slower approach -> extend hindlegs late -> hind then fore touchdown. Both-form revised eight-stage three-view sources added. Earlier short landing refs superseded. Details and shadow-reference limitations in aerial/CLAUDE-LANDING-BRAKING.md.

## Aerial attack sources
Both forms share the falling-cinder and impact sources under vfx/. See aerial/CLAUDE-FIRE-RAIN.md for current C# flight and hazard mapping, fixed warning boundaries and ground-shadow presentation.

## Ashfang roar and phase break
Added the three-view roar and normal-to-enraged source sheets. See Ashfang/transitions/CLAUDE-ROAR-PHASE-BREAK.md for grounded motion, emissive progression and the existing phase break mapping.

## Hit, stagger and defeat
See transitions/CLAUDE-HIT-STAGGER-DEFEAT.md for the two source sheets and Claude authoring notes.

## Grounded transitions
See transitions/CLAUDE-GROUNDED-TRANSITIONS.md for pose order, gait matching and native redraw notes.
