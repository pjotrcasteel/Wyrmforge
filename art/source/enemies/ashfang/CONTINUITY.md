# Ashfang native-source recovery — 22 October 2026

Current stage: M0 recovery in progress. M1 is not accepted. The new owner brief
requires native deformable Blender production; the layered raster restart is
preserved research, not the next production route.

## Verified recovery

- Current main fetched: `1e6305662c42713aad69455036e47d87c5a451ae`.
- Existing draft PR #186 head: `f2c40bee2b358afbfbfa35a3da143e114d98b426`.
- Isolated worktree: `C:/Wyrmforge/ashfang-native-recovery`; branch
  `codex/ashfang-native-recovery`. Original main and untracked private reviews
  remain untouched. Recovery is based on #186 to retain all unique history;
  this branch must not be merged wholesale into current main.
- Recovered 58 native `.blend` projects from Git objects, plus editable ORA,
  GLB and motion sources. SHA-256 inventory: `recovery-2026-10-22/source-inventory.json`.
- Original card inspected; SHA-256
  `dfc6593f74ed4d0edff3a549344860893dd93d8c599dd3ea43135a161dc889ba`.
- RTX 5090 visible through nvidia-smi: driver 617.42, 32607 MiB VRAM.
  No rendering or OptiX benchmark performed this session. About 1.60 TB disk
  free before recovery. CIM CPU/RAM inspection denied; values not verified.
- Open PRs checked through GitHub REST: #292, #290, #288, #287, #286,
  #283, #282, #280, #218, #209, #186, #136, #128, #118. Preserve all.

## Review and provenance limits

The recovered production.json contains historical stage/approval claims. Its
own notice labels V59 rejected and the raster restart incomplete. Do not promote
older anatomy/takeoff acceptance to acceptance of a new complete character.
The V59 turnaround was visually inspected this session: flame coverage obscures
body structure; it fails as a neutral anatomy review. Preserve it as evidence.

Original `ashfang_skeleton.json`, `build_blender_armature.py`, `combat_motion.py`
and `ashfang-v23-flight-fire.gif` were not found under those names in this
checkout or the searched local attachment paths. Prior Work Library was not
available. Recovered Blender projects may contain adaptable motions; inspect
actual actions and deformation before choosing one. No native project has yet
been reopened in this session. Inventory hashes establish recovery integrity,
not editability or artistic quality.

No third-party model selected or downloaded. Existing reconstruction provenance
is retained, not newly certified. Candidate license/topology comparison,
two-source anatomical studies, resolved camera/scale plan, OptiX benchmark,
and neutral clay review are outstanding M0 gates. Blender was absent from PATH
and common install directories checked. Use a supported official portable build
and the non-mutating source inspection script before authoring.

## Next executable task

Run `blender --background --disable-autoexec <recovered-project.blend> --python
tools/sprite-lab/inspect-ashfang-native.py -- --output <new-report.json>`.
The script reads source and writes a separate report; it never saves over the
project. Inspect V48, V59 and restart GLB candidates before selecting an editable
M1 starting point. Preserve preceding files and make a remotely verified source
checkpoint before any long render or destructive topology/rig edit.

Remote recovery source is already published at #186's exact head; new recovery
documentation checkpoint and draft PR will be recorded after upload. No new
model, sculpt, animation, render, runtime integration or owner approval claimed.

## Executed follow-up and review gate

Draft recovery PR: https://github.com/pjotrcasteel/Wyrmforge/pull/293 (stacked on
#186). Pre-render remote checkpoint `78c84030c2cb8270ee32f853ef3e2c7eae1e4696`
verified with ls-remote. Official Blender 4.5.14 LTS portable archive SHA-256
`b9533d2397ac1984db4466fb23a7a4649391cca93f6e84209f9bcc60d071c8b9`, matched
the official https://download.blender.org/release/Blender4.5/blender-4.5.14.sha256.
Portable tool is in C:/Wyrmforge/artifacts/toolchains/blender-4.5.14/;
not a tracked source dependency. Blender reports build 62c1db4208e8.

V48 and V59 reopened with auto-execution disabled; reports are preserved here.
V48: 71-bone rig, 5318-vertex bound mesh. V59: 95-bone rig, 6270-vertex bound
mesh plus fire objects, editable actions and packed albedo. Original hashes
unchanged. Blender detects CPU AMD Ryzen 7 9800X3D and RTX 5090 OptiX.

Executed neutral review:
`blender --background --disable-autoexec art/source/enemies/ashfang/model/local-appearance-001/rigged-block-v48/ashfang-rigged.blend --python tools/sprite-lab/review-ashfang-clay.py -- --output-dir art/source/enemies/ashfang/recovery-2026-10-22/v48-clay-r01`

New immutable editable review snapshot:
`recovery-2026-10-22/v48-clay-r01/ashfang-neutral-review.blend`, SHA-256
`ce924a613f1da0515d4f6ccf554edab1f843e3b60d1679a044950f0c900ce87e`.
Reopened successfully; original materials, packed image, rig and actions remain.
Rest pose/material override/camera/light are review configuration, no new anatomy.
Four actual orthographic 512px/32-sample Cycles OptiX views rendered in
1.408, 0.549, 0.537, 0.539 seconds. Render log peak device allocation approximately
1431 MiB; not total-board VRAM, temperature or a production load benchmark.

Visually inspected side and three-quarter: FAIL M1 anatomy gate. Thin torso,
weak chest/haunch mass, blunt short skull, repetitive dorsal slabs and simple
flat wing membranes do not match the card. Preserve this source and its motion;
do not multiply animations/material polish before rebuilding primary anatomy.
Front/rear were rendered but not visually inspected this session. Phone/game
scale review, full candidate model comparison and biological reference research
remain outstanding. Preliminary three-source license screen is in
`recovery-2026-10-22/candidate-screening.md`; no outside asset adopted.

Python inspector syntax check and native reopen checks passed. No gameplay tests
run because runtime files were untouched. No owner sign-off. M0 remains open;
M1 has a recovered review baseline, not a newly completed blockout.
