# Hollowed — new visual model, source only (v1)

**NOT A MODEL RELEASE.** This directory is reserved for genuinely new, editable 3D anatomical source art. See [H0 audit](../../../../../docs/art/evidence/hollow-rebuild-v1/README.md) and [draft PR #391](https://github.com/pjotrcasteel/Wyrmforge/pull/391).

## Owner's updated visual reference (29 October 2026) — takes precedence

The owner explicitly selected a new **front / side / back feral undead image**.
See [exact design criteria and implementation acceptance](../../../../../docs/art/evidence/hollow-rebuild-v1/owner-reference-2026-10-29.md).
It includes long tangled hanging hair, visibly charred back spines, a snarling
burnt skull with glowing **interior** facial wounds, hooked claws, strapped legs
and **short tattered leather waist panels**. This intentional short waist
wrapping *overrides* the earlier blanket prohibition on any skirt-like fabric.
A cape, long coat, robes and obscuring back cloth are still rejected.

The previous bald skull study is **not** owner-approved. It is an editable
starting point only. The first procedurally assembled appearance study is
also **not** a claim of final character fidelity or acceptance; the reference
is a high-detail appearance direction, not ready-to-rig topology. No runtime
migration or animation work is permitted here.

## Previous H0 baseline direction (historical, superseded where conflicting)

**Feral, rabid, anatomically corrupted human undead**, at the same polish and readable material quality as the approved Ashling, but with no demon anatomy. Strongly recognizable skull and jaw, true shoulder/ribcage/pelvis volume, damaged asymmetric limbs, planted weight and authored claws. No cape, coat, robes, skirt, backpack silhouette, detached fabric strands, stray glowing particles, or orange face dots.

Important: the discarded earlier Hollowed mesh is **not** a sculpt base. Its anatomical proportions and cloth must not return through imports, sculpt retopology, mesh cleanup or old render scripts.

## Planned source inventory — not yet created

- `hollow-new-model.blend`: entirely new authored Blender mesh, UVs, skin/semantic rest pose and local material shader nodes
- `albedo.png`, `normal.png`, `roughness.png`, `emission-mask.png`: aligned original material sources as appropriate, unlit albedo not baked fire
- `manifest.json`: source provenance, units, camera, authored scale, rest pose, hash inventory and explicit owner approval status
- `hollow-new-model.glb`: portable authoring export, *not* a replacement for editable .blend
- `README.md`: current source milestone and visual QC index

No such models/textures are claimed to exist merely because filenames appear here.

## Acceptance order

1. Three truly distinct 3D body sculpts at equal scale, genuine 4-way clay renders, inspect at native 96px. Reject generic round skulls, stick/mannequin joints, blocky props, large belly or obvious old coat. Independently select strongest to refine.
2. Connected anatomically sound deformable geometry with real backside and no disconnected fragments; prove kneeling/reaching static deformation only.
3. Restrained, distinctive dead flesh/aged bone/char source, then true occluded interior ember material.
4. Eight independent facing views, source/wireframe proof, neutral clay, native 96px inspection and side-by-side actual approved Ashling; owner inspection once at completed H6.
5. Final `.blend` verified reopenable from a clean checkout; all large binaries tracked with verified LFS handling. No runtime cutover or automatic H7.

**Absolute animation engine prohibition:** PR #387, all universal animation engine source/contracts/controllers/tests and existing C# gameplay remain read-only. Source-side semantic bones/rest pose and a written *future* retarget map are permitted; any engine modifications, retarget integration, existing clip edits and runtime replacement remain separately unauthorized **even after art approval**.
