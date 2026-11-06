# Wyrmforge mob artwork handover for Claude

## Goal and delivery status
Continue transforming the approved gothic mob artwork into genuine low-resolution animated Aseprite assets for the existing Wyrmforge game. This archive is the consolidated delivery; all prior artwork remains preserved. Do not describe these generated sheets as finished runtime sprites.

Eight editable Aseprite SOURCE STUDIES exist: Hollowed, Ashling, Ash Priest, Ash Slinger, Mire Hound, corrected Penitent, Bell Warden (both forms in one project) and Drowned Wraith. These eight studies each have a SINGLE timeline frame containing complete source sheets, NOT sliced animations. Height and Emissive are hidden draft layers. Ashling includes its complete attack sheet and Ash Priest its complete casting sheet as hidden unsliced reference layers. Canvas sizes retain generated source resolution and are NOT 32x32. Do not export the whole source-study canvas as a runtime frame. Files were structurally checked (chunk sizes and decompressed RGBA cels), not opened in Aseprite.

## Approved art selection
- Hollowed: human rabid undead, not rabbit. Use hollowed-front-side-back.png and attacks/claw-swipe.png. Rabbit, simplified and earlier detailed drafts are history only.
- Ashling: ashling-approved-front-side-back.png; feral goblin/animal, low crouch, muzzle, torn ears, scorched oxblood flesh, ember eyes/cracks. Approximately half Hollowed height. Attack pounce-rake.png has drifted toward a heavier spiny beast; reconcile to approved turnaround before production rather than silently replacing approved identity.
- Ash Priest: ragged oxblood hood/robes, skull-like goblinoid face, horn stubs, lantern staff, bells; support heal/resurrection cast.
- Ash Slinger: feral Ashling-like ember thrower, basket, right throwing hand; projectile separate.
- Mire Hound: approved SECOND cleaned attack sheet lunging-bite-approved.png, matching gaunt canine turnaround.
- Penitent: ONLY corrected pale hood, visible skull, ragged pale tabard, left shield and lowered right sword. Use corrected turnaround and shield-bash-corrected.png. Earlier masked brute and fiery Penitent second form are superseded. Implemented Penitent has no second phase.
- Bell Warden: original concept has right-hand bell and left-hand chained lantern. Use normal Smash and TOP THREE rows of normal Toll/Rally source sheets; their bottom rows are obsolete subtle phase two. Use phase-2-approved-front-side-back.png and the three phase-2-approved attack sheets plus transformation-approved.png for the approved exaggerated molten phase two. See its README. Earlier two-handed-bell concept is superseded.
- Drowned Wraith: approved blue-grey drowned female spirit with wet hair, chains, cross, ragged spectral dress; use turnaround and emerge-strike-retreat.png.
- Reliquary has a layered both-form source study. Ashfang has a six-frame, native-size draft covering both forms and three facings. See Ashfang/aseprite/CLAUDE-ASEPRITE.md for the editable project and materials.

## Aseprite production workflow
Start with Hollowed, then Ashling. Inspect actual PNG alpha, locate each character/frame, slice into consistent cells and establish ground/root anchors. Generated sheet layouts are approximate; do not assume exact equal cells. Preserve full source sheets on reference layers. Work at a true logical pixel resolution, 32x32-inspired for common mobs; larger miniboss cells allowed. Do not simply downscale an entire sheet and call it finished.

Author/clean each animation pose so anatomy, equipment handedness and volume remain consistent. Fix clipped edges, stray colored/alpha pixels and frame-size drift. Create tags such as attack_front, attack_side, attack_back with consistent timing; derive timing from authoritative C# attack contracts. Side faces right. Add idle/walk/hit/death animations later; those are not yet complete here. No automatic horizontal flip when asymmetric equipment changes sides. Review actual looping GIF/MP4 at native and mobile scale; still contact sheets do not prove animation quality.

## Material layers and engine contract
Colour/albedo, Height and Emissive must be pixel-registered for EVERY final frame. Current generated material maps are approximate REFERENCE DRAFTS with contour/position drift, not production maps. Preserve them for guidance but author final maps from locked geometry.
- Height means local surface relief, not world elevation or simply grayscale brightness. Knee holes, light teeth or ember light must not become tall merely because bright. Hollowed height study still has this problem at the knee tear.
- Derive normals from final authored relief with the engine's actual coordinate convention and physical scale. Verify light directions before export. Inspect current engine material loader; do not guess shader channels or introduce a separate lighting pipeline.
- Emissive black=off, colored pixels specify emission colour. ONLY eyes, ember wounds, lantern interiors, hot bell cracks and intentional flames emit. Ashling red skin is not all emissive. Map intensity is separate from the dynamic light emitter's energy/radius. Emissive glow alone does not illuminate nearby terrain.
- Keep material maps linear where required by current engine conventions; verify colour-space handling and alpha edges. Roughness/specular can be added based on engine support.
- Separate body/equipment layers in cleaned projects; current source studies retain flattened reference art and do not already provide isolated body/equipment cels.

## Combat source of truth
Repository https://github.com/pjotrcasteel/Wyrmforge . Inspect AGENTS.md and current code before implementation. PenitentBehaviorState owns directional blocking, shield bash and guard break. BellWardenBehaviorState owns Smash, Toll, Rally and half-health crack. Bell Warden cycle Smash/Toll/Smash/Rally; cracked toll fans into three lanes and gaps shorten. Fire exaggeration is approved VISUAL art direction, not permission to add unimplemented damage. Drowned Wraith concept includes extra moves that may not exist in code; implement animations for current authoritative behavior first. C# owns damage, movement, timings and encounter rules; visual effects cannot invent hits.

## Remaining verification
No runtime integration, performance proof, animation playback validation or actual mobile in-game captures have been completed for these assets. Only eight mobs have artwork folders. Make honest status reports, provide images/playback for visual approval, preserve source art, and update this single archive or its repository-backed source coherently.

## Ash Priest project update
Ash-Priest/aseprite/Ash-Priest-source-study.aseprite has Colour, Height_DRAFT, Emissive_DRAFT and Cast_Reference_UNSLICED. Same single-frame limitation. Preserve staff hand and length, lantern vertical hang, horns, bells and robe continuity when slicing and redrawing. Current height map is approximate and overbright in some material details; emissive positions and alpha require registration. Lantern nearby illumination needs an engine emitter separate from the mask. Ash Slinger source study is now included; Mire Hound is now included; next project: corrected Penitent.

## Ash Slinger project update
Ash-Slinger/aseprite/Ash-Slinger-source-study.aseprite includes Colour, Height_DRAFT, Emissive_DRAFT and Throw_Reference_UNSLICED. One timeline frame; no animation tags yet. Maps are generated approximations, not registered production masks. Preserve anatomical right throwing arm across facings. Held ember and its emission must disappear on release (frame 4 in reference); flying projectile is separate engine entity. Basket coals continue glowing. Author emitter positions from final registered frames; do not illuminate all red skin. Validate anatomy, geometry and alpha as elsewhere.

## Mire Hound project update
Mire-Hound/aseprite/Mire-Hound-source-study.aseprite contains Colour, Height_DRAFT, Emissive_DRAFT and Bite_Reference_UNSLICED, using the preferred second cleaned bite sheet. Single-frame source study, not animation. Ensure matching four-legged anatomy, muzzle length, ear damage, tail and scar locations between turnaround and bite frames; generated sheets differ and need reconciliation. Height map is approximate and too bright at teeth/scars in places; correct using relief rather than albedo. Only eyes and shoulder ember scars emit; back turnaround has none. Next mob is the corrected pale-hooded Penitent, never the superseded masked brute.

## Corrected Penitent project update
Penitent/aseprite/Penitent-source-study.aseprite contains Colour, Height_DRAFT, empty Emissive_OFF and Bash_Reference_UNSLICED. This is a single-frame source study, not an animation. Current approved Penitent has no glowing eyes, wounds, sword or shield: emission is explicitly OFF. Export black for required emission texture or omit according to engine defaults; never infer emission from pale cloth or metal highlights. Height map is approximate with residual albedo influence and contour drift, requiring authored corrections. Use left-arm shield and right lowered sword, skull under pale hood. Do not reinstate superseded brute/fire Penitent. Next project: Bell Warden with both forms in the same project.

## Bell Warden both-form project update
Bell-Warden/aseprite/Bell-Warden-both-forms-source-study.aseprite contains 12 named source layers in ONE timeline frame. Molten turnaround visible by default. Normal Smash colour/height/emissive maps share an approximate sheet layout; molten turnaround has its own height/emissive drafts. Materials do NOT cover every attack pose. Normal Toll/Rally layers contain both old forms: use top three rows only, disregard obsolete lower rows. Current molten Smash/Toll/Rally and transformation are separately named unsliced layers. Every sheet has different scale/layout: do not assume these layers overlay each other or represent timeline animation. Generated maps have contour/registration drift; molten emission may include reflected armor edge highlights and must be cleaned to true sources only. Normal emitter mask may omit visible clapper glows or eyes; verify frame by frame. Molten height omits shoulder flames intentionally; flames should not become solid relief geometry. Both-form identity also varies between generated sheets and must be reconciled. Preserve right bell/left lantern. Cracked wider toll is engine logic, not a new damage behavior. Next source study: Drowned Wraith.

## Drowned Wraith project update
Drowned-Wraith/aseprite/Drowned-Wraith-source-study.aseprite contains Colour, Height_DRAFT, Emissive_DRAFT and Ambush_Reference_UNSLICED in one timeline frame. Material drafts cover turnaround only, not all attack poses. Eye emission plus sparse blue hem accents are provisional; saturated blue fringe in generated colour art may be artifact rather than intended glow, so inspect and approve before retaining. Height still contains albedo-like bright chain/face areas requiring correction. Engine controls emergence/fading/submersion and ripple effects separately from emissive intensity. Avoid opaque fog baked into sprites. All eight existing artwork mobs now have editable source studies. NONE has completed sliced/tagged animation production or pixel-registered all-frame materials. Next meaningful work is production cleanup and playback on Hollowed, not claiming conversion is complete. Reliquary has since been added below; Ashfang remains uncreated.

## Reliquary work in progress
Reliquary now has normal turnaround, three cast drafts, superseded subtle shift and a stronger NEW REVIEW turnaround. See Reliquary/CLAUDE-AWAKENED.md for exact phase distinction and emitter behavior. Reliquary source project and material drafts are now included; see the latest update below. Ashfang remains uncreated.

## Reliquary awakened cast update
Approved awakened turnaround renamed awakened-turnaround-approved.png. Ward/Corruption/Seal awakened references are now included plus transformation-exposed-core-DRAFT.png. See Reliquary/CLAUDE-AWAKENED.md for exact remaining continuity and emission issues. Transformation still starts too luminous at crown; do not call it finished. Reliquary source project and material drafts are now included; see the latest update below. Ashfang remains next after Reliquary materials/source packaging.

## Reliquary both-form source project and material drafts
Reliquary/aseprite/Reliquary-both-forms-source-study.aseprite contains 14 named layers in ONE timeline frame: normal and awakened colour turnarounds, four material drafts, all six casts, exposed-core transformation draft and hidden superseded subtle shift. Toggle one source sheet at a time. These enlarged concept sheets vary in size/layout and do not share production registration. They are NOT native 32x32 sprites or sliced/tagged animations. No runtime integration or moving-light/playback verification has been done.

Height and emissive drafts cover the turnarounds only; author materials for every final animation frame. Generated masks have contour drift, noise/fringes and residual albedo influence. Awakened emission also contains lit chain-like details near censers: remove these unless actual luminous geometry is explicitly intended. Nonemitting chains, metal, robes and cage ribs must be black. Back view must not grow facial emission. Height describes relief, never flame brightness; the inner relic core sits behind raised cage ribs. Do not use these maps directly as production textures.

Normal emits from eyes and both censer cores; awakened adds exposed gold-white core, lit crown tips and jaw. Keep this silhouette and source distinction readable at mobile scale without relying solely on bloom. Follow CLAUDE-AWAKENED.md for cast timing, sockets, phase transition and provisional lighting values. Preserve the known continuity issues and correct them on locked final frames. Ashfang remains uncreated. Nine mobs now have source studies; production slicing, native-resolution cleanup, frame-aligned materials, tags and playback remain outstanding.

## Ashfang started
Normal-form pixel-art turnaround draft is now in Ashfang/normal-turnaround-DRAFT.png. See Ashfang/CLAUDE-HANDOVER.md for review limitations and existing GitHub 41-motion source pipeline. Earlier statements that Ashfang is uncreated are superseded. No Ashfang Aseprite/material/attack work is complete yet. Preserve existing repository source and runtime assets.

## Ashfang Tier I scale correction and enraged draft
Approved normal-half-size-approved.png supersedes original-size draft. User selected heavier/sharper half-size version over lean youngling redesign. Phase-two-enraged-DRAFT.png is pending review. Same runtime scale intended; generated size/pixel-density drift must be reconciled. See Ashfang/CLAUDE-HANDOVER.md.

## Ashfang walk reference update
Three normal-form eight-pose walk studies in Ashfang/locomotion/. Unsliced; no timed playback or native-scale production validation. Front/back/side scale and contours need reconciliation. See its README. Phase-two visual direction approved; idle/run, attack sheets and Ashfang source project/materials remain pending.

## Ashfang idle source / validation handoff
Added four idle poses in each of front/right-side/back in one sheet under Ashfang/locomotion/. Owner assigns slicing/timing/validation to Claude. Visible brown background requires removal; source preserved. Continue run source art next. See Ashfang locomotion README for exact row order and pending tasks.

## Ashfang normal run source
Added six run poses per direction, front/right-side/back, under Ashfang/locomotion/. Normal idle/walk/run source art now present. Claude owns slicing, timing, gait/pixel cleanup and runtime validation. Phase-two locomotion and transitions remain pending.

## Ashfang phase-two idle
Added four enraged idle poses per direction in Ashfang/locomotion/. Same Tier I scale intended; Claude handles brown-background removal, registration, timing and playback. Phase-two walk/run remain next.

## Ashfang both-form locomotion source complete
Phase-two front/right-side/back walk and run source sheets now included. Both forms have idle/walk/run pose references; this does not mean finished animations. Claude owns slicing, scale/pivot matching, timing, gait cleanup and runtime validation. Attacks/source project/materials remain pending; next art is fire breath.

## Ashfang fire-breath side performance
Added twelve-pose normal right-side breath source and detailed authoring notes under Ashfang/attacks/. Requested long anticipation; proposed3.2s wind-up is unimplemented and must be reconciled with authoritative C# timing. Claude handles slicing, VFX separation and validation.

## Ashfang external fire separation
Body-only side breath source and standalone six-stage fire VFX source added. External fire MUST stay separate from creature, mouth-attached and driven by authoritative attack lifetime. Composite sheet is reference only. Full details in Ashfang/attacks/CLAUDE-FIRE-BREATH.md.

## Ashfang normal breath three-view source
Normal front/back twelve-pose body-only sheets now included alongside side. No external jet baked in. Claude handles native frame registration, mouth sockets, front/back VFX projection/occlusion and timing. Phase-two breath source remains next.

## Ashfang both-form breath body sources
Three enraged twelve-pose body-only breath sheets added. Corrected front output included; failed background-artifact variant excluded. External fire/vent VFX separate. Claude owns native cleanup, timing, socket/occlusion authoring and validation; no completed animation/runtime integration claimed.

## Ashfang breath sweep sources
Normal and enraged front/side/back six-stage body-only sweeps added. External fire stays separate; check live C# behavior before mapping sweep arc and timing. Detailed known source-art defects and socket requirements in Ashfang/attacks/CLAUDE-BREATH-SWEEP.md.

## Ashfang normal claws
Left/right strikes and alternating combo source sheets added, three views/six poses each. Keep VFX separate, preserve four-leg support and distinct anatomical limbs. See Ashfang/attacks/CLAUDE-CLAWS.md before authoring; known generated limb-identity defects remain.

## Ashfang both-form claws
Enraged left/right/combo source studies added. External slash/flame VFX separate. Claude must correct rear combo second-strike side and side-view limb identities; see Ashfang/attacks/CLAUDE-CLAWS.md. Bite is next.

## Ashfang normal/enraged bite
Three-view six-stage body-only bite references added for both forms. Contact is intended closed-jaw snap, no new damage/timing values implemented. See Ashfang/attacks/CLAUDE-BITE.md for Claude authoring tasks.

## Ashfang pounce sources
Normal/enraged three-view eight-stage body-only pounce sources added. Keep root/world trajectory distinct from pose elevation; align launch/contact/recovery to C# and keep landing VFX separate. Performance and cleanup handover: Ashfang/attacks/CLAUDE-POUNCE.md.

## Ashfang tail sources
Both-form left/right tail source sheets included, not validated animations. Known rear rightward/side-depth defects are documented for Claude in Ashfang/attacks/CLAUDE-TAIL.md. Keep one attached tail and preserve C# authority for attack arc/timing/regions.

## Ashfang owner flight correction — priority
Held takeoff build-up -> extremely fast upward exit beyond camera TOP -> ONLY moving ground shadow overhead. Both forms revised; old gradual takeoff/visible wingbeat refs superseded for active aerial phase. See Ashfang/aerial/CLAUDE-TAKEOFF-OVERHEAD.md for exact body/shadow visibility and projection contract. This is requested integration work, not implemented behavior.

## Ashfang eagle-like landing revision
Owner wants repeated flapping air-brakes before legs extend and land. Both-form eight-stage three-view source studies added. Body remains hidden with only ground shadow until deliberate return. Shadow shape reference is NOT a clean alpha mask; Claude must author/use proper renderer proxy. See Ashfang/aerial/CLAUDE-LANDING-BRAKING.md.

## Ashfang overhead fire rain
Added separate falling-cinder and ground-impact source sheets. The existing C# hazard positions, warning radii and resolution events drive the sequence. See Ashfang/aerial/CLAUDE-FIRE-RAIN.md for mappings and landing continuity.

## Ashfang roar and phase break
Added the three-view roar and normal-to-enraged source sheets. See Ashfang/transitions/CLAUDE-ROAR-PHASE-BREAK.md for grounded motion, emissive progression and the existing phase break mapping.

## Ashfang hit, stagger and defeat
Added three-view reaction and collapse source studies. See Ashfang/transitions/CLAUDE-HIT-STAGGER-DEFEAT.md for contact, cooling and state mapping.

## Ashfang grounded transitions
Added alert, turning and locomotion start/stop source sheets. See Ashfang/transitions/CLAUDE-GROUNDED-TRANSITIONS.md.
