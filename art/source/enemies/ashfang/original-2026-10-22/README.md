# Ashfang original-source production

Owner-approved production plan, 22 October 2026. This is an original-geometry
restart, not a continuation of the rejected V48/V59 body. Product authority:
[creatures](../../../../../../docs/canon/creatures-and-encounters.md) and
[art](../../../../../../docs/canon/art-and-animation.md).

Original card: `user_handover_files/concepts/Fire/10-ashfang-the-cinder-wyrm.png`,
SHA-256 `dfc6593f74ed4d0edff3a549344860893dd93d8c599dd3ea43135a161dc889ba`.
No source card edits. Previous work remains on #186 and #293 and in the separate
recovery checkout. Do not import its geometry, weights or scale constraints.

## Production decisions

- Build low, powerful four-legged anatomy with a separate wing pair; no biped
  redesign. Long predatory head, deep chest, muscular shoulder/hip attachments,
  massive articulated wing roots, balancing tail and clear grounded paws.
- Card hero and turnaround establish anatomy; pixel strip establishes gameplay
  presentation. Do not confuse the card's promotional scale with Tier-I footprint.
- Deathwing references: mass, heat and threat only. Exclude metal chin, rivets,
  recognizable skull/horn arrangement, armor and silhouette. Attached artwork
  stays a local study reference, not a distributed texture or modeling base.
- Observed: horned predatory skull, jaw/teeth, powerful chest, four walking legs,
  independent ragged membrane wings, long tail, overlapping dark armor, molten
  seams. Inferred: hidden underside, full mouth interior, exact skeletal layout,
  secondary joint attachments and folds. Review inferred construction explicitly.
- Dark charcoal/obsidian, burnt crimson, red membrane; localized chest/throat
  heat. Clay first. No fire, armor noise or material detail to disguise anatomy.
- Blender units: meters, Z-up, original facing -Y, ground Z=0. Units are authoring
  conventions, not physical boss-size or collision commitments.
- Camera study starts at 34 degrees elevation, fixed orthographic projection.
  Unchanged current mage at 320/390/440 CSS px; initial grounded width 20-25%.
  This is a review target, not a gameplay or final camera change.

## Gates and preservation

M0: original source/research, tool/storage receipts, remote retrieval.
M1: skull-neck-chest study then complete original clay anatomy, full views,
closed/open jaw, relaxed/extended wings, elevated/native-size studies.
M1 requires explicit owner acceptance before M2 detail. No new rig, motion or
export can bypass an unsuccessful anatomy review. M2-M8 follow the approved
plan: sculpt/retopo/UV/materials, rig/deformation, excellent walk, other grounded
actions, flight/fire, lifecycle, eight directions, separate runtime integration.

Native files and unique failed revisions are permanent. New revision paths must
not exist before creation. Keep working and immutable milestone sources, shaders,
textures, geometry, future rig/actions and camera/light settings. Before destructive
edits save/reopen a preceding snapshot. Push each coherent slice and before long
rendering; verify head and independently retrieve/checksum native sources.

Owner storage answer: existing GitHub LFS allowance, no paid overage. Remaining
numeric quota is not exposed by the connection. Do not adopt large-source LFS
uploads until remaining allowance and billing cap are verified. Bounded initial
studies use ordinary Git: each compressed native file <8 MiB, total new native
sources <=20 MiB for this slice; stop if exceeded. No history rewrite or cleanup.

No imported/free/neural dragon geometry. New authored geometry provenance is
recorded in production.json. Study references are not asset licenses.

## Research register

Reviewed before primary anatomy:

- IUCN Crocodile Specialist Group, The Crocodilian Body:
  https://www.iucncsg.org/pages/The-Crocodilian-Body.html
  Transfer: jaw-closing mass, intermeshing conical teeth, region-specific scutes;
  do not blindly impose crocodilian body posture on a six-limbed dragon.
- Bat Conservation Trust, Flight teachers pack:
  https://cdn.bats.org.uk/uploads/pdf/Resources/Welsh-EdPack/04-Flight-Eng.pdf?v=1551107159
  Transfer: articulated elongated fingers support a flexible curved membrane;
  no flat triangular wing substitute. Fantasy wing-root musculature is inferred.
- Weta FX Smaug production study (consulted in planning):
  https://www.wetafx.co.nz/films/case-studies/smaug
  Transfer: skeleton/performance/surface development in connected layers;
  no borrowed mesh, film imagery, design or performance files.
- Framestore dragon production account (consulted in planning):
  https://www.framestore.com/fr/projets/how-train-your-dragon
  Transfer: real-animal structure and heft while preserving source identity;
  no protected dragon design or assets.

Before later stages, recheck two independent sources for that stage and record
useful concrete principles: Cornell/BCT (flight); Animation Mentor/Ren et al.
(contacts and mass); Blender/CG Cookie (topology); Khronos/Adobe published PBR
guide (materials, no Adobe software); PBRT/Framestore (fire); Saint11/Blender
(pixel conversion). Sources and techniques are not proof that output is good.

## Commands

Run standard Python `tools/ashfang/preflight.py --output NEW_REPORT.json` for
read-only hardware/tool/card checks. Use Blender bundled Python for bpy work.
Native review/validation CLI is implemented incrementally; unsupported production
operations must report unimplemented rather than generate placeholder success.
See CONTINUITY.md for actual commands, revision hashes, evidence and next task.
