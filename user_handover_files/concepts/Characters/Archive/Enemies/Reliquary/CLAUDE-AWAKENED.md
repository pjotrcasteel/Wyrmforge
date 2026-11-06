# Reliquary Awakened visual contract for Claude

Status: stronger awakened turnaround approved by user (Awesome/Perfect). All three awakened cast reference sheets and revised exposed-core transition draft are included. Earlier subtle transition is superseded as target, preserve only as motion reference. Materials and Aseprite project remain unfinished.

## Required phase distinction
Normal: narrower stoop, staggered low censers, dark torso under closed robes, dim orange windows.
Awakened: upright menacing stance, wider arm silhouette, censers raised to upper torso height, robe panels split outward, long ember-lit relic cage exposed in torso. Bright gold-white eyes/jaw, distinct lit crown tips, brighter two censer cores with controlled vent flames. Maintain same skull mask, spoked crown, chains, two hands/two censers and overall anatomical scale. New draft has greater crown/censer shape changes; reconcile them to original rather than inventing equipment.

Phase must remain distinguishable at 320/390px viewport size even with bloom disabled; silhouette plus exposed bright core are primary. Render actual in-game captures and playback, not only enlarged contact sheets.

## Light implementation (art direction, tune in actual engine)
Use separate authored emission masks for each final registered animation frame: eye/jaw, crown tips, core, both censer interiors and intentional flames only. Do not emit all gold chains or red robes. Cage ribs and metal frames remain dark against the core. Do not bake nearby terrain lighting into albedo.
Create two moving local light emitters at the censer cores, plus a smaller central emitter for awakened core; crown accents may be emission-only to control mobile cost. Anchor positions to authored per-frame/skeletal sockets, not a static point at the feet. Avoid emitter flicker or jumping when direction changes. Set radii in engine world units, not source-image pixels.
Suggested normalized intensity curve relative to each state's idle (starting tuning values, NOT tested): anticipation 1.15, charge 1.5, release 2.0, recovery 1.0. Awakened idle can start around 1.5 times normal. Keep clamped, smooth changes tied to authoritative phase progress, not animation frame-rate. Ward/Seal pale-gold charge; Corruption may use a darker orange-red charge only after visual review. Preserve red danger telegraph readability, avoid white clipped bloom and strobing. Subtle continuous flicker belongs to visual layer and must never alter timing or hits.

## Combat authority
Current ReliquaryBehaviorState: Ward cast 1.1s, Corruption 0.9s, Seal 0.8s, recovery 1.3s; phase shift 2s at 50% HP cancels an active rite. Normal ritual Ward/Corruption/Seal/Corruption; shifted Ward/Seal/Corruption/Seal/Corruption; gaps 2.4s to 1.7s. Check current code before integration. Light escalation creates no new damaging ability. Ground ward, corruption field and seal/blast remain separate authoritative entities/effects.

## Remaining fixes
Normal cast sheets have scale, censer visibility/handedness and turn-direction inconsistencies; Seal side release appears to switch casting arm. Clean before production. Awakened turnaround is not registered to normal or prior casts. Need approved final normal/awakened poses, revised 2s transition ending at new cage form, three phase-two cast sheets, height/emissive maps per final frame, real sliced/tagged Aseprite and mobile moving-light verification. Current references are not production assets.

## New sheets and concrete cleanup
All three awakened casts now exist as generated reference drafts. Revised transformation reveals the central cage from dark to bright but starts with crown tips already lit; author a genuinely dim normal starting state and delay crown ignition until later. Awakening intensity must ramp without a full-screen flash. Seal side release still appears to use the near/left arm rather than consistent anatomical right; correct before slicing. Some poses conceal censer chains/lanterns and generated crowns vary in scale. Red/orange edge halos in sheets are not intentional emissive geometry; clean alpha fringes. These are not playback-validated animations.

## Reliquary both-form source project and material drafts
Reliquary/aseprite/Reliquary-both-forms-source-study.aseprite contains 14 named layers in ONE timeline frame: normal and awakened colour turnarounds, four material drafts, all six casts, exposed-core transformation draft and hidden superseded subtle shift. Toggle one source sheet at a time. These enlarged concept sheets vary in size/layout and do not share production registration. They are NOT native 32x32 sprites or sliced/tagged animations. No runtime integration or moving-light/playback verification has been done.

Height and emissive drafts cover the turnarounds only; author materials for every final animation frame. Generated masks have contour drift, noise/fringes and residual albedo influence. Awakened emission also contains lit chain-like details near censers: remove these unless actual luminous geometry is explicitly intended. Nonemitting chains, metal, robes and cage ribs must be black. Back view must not grow facial emission. Height describes relief, never flame brightness; the inner relic core sits behind raised cage ribs. Do not use these maps directly as production textures.

Normal emits from eyes and both censer cores; awakened adds exposed gold-white core, lit crown tips and jaw. Keep this silhouette and source distinction readable at mobile scale without relying solely on bloom. Follow CLAUDE-AWAKENED.md for cast timing, sockets, phase transition and provisional lighting values. Preserve the known continuity issues and correct them on locked final frames. Ashfang remains uncreated. Nine mobs now have source studies; production slicing, native-resolution cleanup, frame-aligned materials, tags and playback remain outstanding.
