# Hollowed H1 — genuine anatomical geometry / visual self-review (28 Oct 2026)

**Scope:** New isolated Hollowed source only, [draft PR #391](https://github.com/pjotrcasteel/Wyrmforge/pull/391). **H1 NOT ART APPROVED; nothing merged or deployed.** The universal animation engine, PR #387, existing attacks, Ashling and production renderer/gameplay remain read-only.

## Actual newly produced, editable source geometry

[Successful original Blender run #40780379798](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40780379798) / [source and real eight-angle artifact #12857341065](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40780379798/artifacts/12857341065).

- Starting point: legally obtained **CC0** 3D Horror Game Monster (City Building Game Art), original main **70-bone** source rig; 1,854 skin vertices and 58 source rig groups.
- Existing asymmetric, lowered arm source-rest pose retained from previous H1 study. No animated attack, frame key, engine change, or runtime import.
- Original connected skin gained a **true shape-key 3D depression** at the thorax: **81 skin vertices** affected and maximum **0.15753m** recess. It is an actual deformed surface, not merely a decal. Important: this is a depression, **not yet a Boolean through-hole or retopologized deformable cavity**.
- **Seven curved, tapered 3D rib meshes** placed from actual first-hit skin intersections, with two ends recessed into the torso. Muted weathered bone, emission off. Distinct source meshes remain rigidly attached to the existing chest bone. This does not prove full future deformation quality.
- The first six additional **talon mesh objects floated** in real eight-angle Blender review, an unacceptable regression. **REJECTED and replaced** by a new original source shape key using **151 connected existing finger-skin vertices**, **12 original finger-group names**, no detached talon meshes. The original hand skin, topology, UV and source weights remain intact; no floating fingers in the subsequent genuine 8-angle render.
- Technical QC is green. **Not artistic approval**: the ribs still read somewhat like individual bone bars at native resolution and the face was not distinctive.

## Skull source study and deliberate rejection

[Successful Blender skull source run #40781522531](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40781522531) / [source and 8-angle artifact #12857761696](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40781522531/artifacts/12857761696).

New source script `sculpt_asymmetric_skull_h1_blender.py` adds a *reversible* shape key (166 connected head skin vertices) and two real first-hit dark orbital material regions (33 left faces, 31 right faces, 63 unique faces). No extra disconnected skull pieces, no animations and unchanged source rig.

**Self-rejected visual quality**:
- The first placement created actual ugly black holes on the skull **crown**, a measurement error.
- Lowering the positions moved the dark cavities toward the anterior face, but the resulting sockets span too much of the low-poly face and read like a **cartoon hollow mask**; still not Ashling-level. **The orbital study is NOT selected as the new master sculpt**.
- At native 96px, the shape is still a fairly ordinary smooth humanoid with exposed rib bars and poorly differentiated head/claws. Technical green never means visual quality passed.

**Conservative retained source:** `horror-anatomical-h1/hollowed-h1-real-anatomy-ribs-claws-UNAPPROVED.blend` from the successful connected-claw run. Its source design is still incomplete. The separate skull attempt is preserved ONLY as a rejected evidence iteration. Do not deploy or merge either.

## Next actual sculpt milestone (art required, not another effect-only fix)

Do not enlarge black orbital material circles or add disconnected face pieces. A professional source anatomy/retopology pass is needed:
- Human skull with actual brow, cheek, nasal bridge, uneven mandible and mouth planes, anatomically grounded in the source rig.
- Multilayer torn ribcage with believable inner tissue, embedded bone ends and material depth; avoid uniform floating or too-white rib bars.
- Separate **source-only deformation QC** at shoulders, jaw, elbows, wrists and fingers through the *existing armature* without importing attack clips or touching PR #387.
- Native 96px high-contrast silhouette and neutral clay reviewed next to the actual approved Ashling. Only after it is genuinely convincing should H1 be offered for owner review with **real Blender image/GIF**.

All new files and CI steps must remain within the isolated Hollowed art directories. No automatic promotion after CI. **H1 OPEN, ART REJECTED.**
