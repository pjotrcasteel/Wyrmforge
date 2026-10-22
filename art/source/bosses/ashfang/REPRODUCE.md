# Reproduce and review

## Current Tier I skin workflow (23 October)

The approved anatomy is `archive/source-fidelity-001/ashfang-master-working.blend`. The current self-contained skin proposal is `archive/tier-I-skin-010-packed/ashfang-tier-I.blend`. It contains the original mesh, UVs, weights and 112-bone rig, original reversible tail mask, packed source textures and editable volcanic skin shaders. No fire/smoke/ember geometry. Previous anatomy, plate and fire studies below are historical and must not be rerun as the current artistic direction.

From the worktree root, use the Blender executable below with `--disable-autoexec --python-exit-code 1`:

```powershell
& $blender -b art/source/bosses/ashfang/archive/source-fidelity-001/ashfang-master-working.blend --disable-autoexec --python-exit-code 1 --python tools/ashfang-zagmatorah/tier-I-volcanic-skin.py -- --output art/source/bosses/ashfang/archive/tier-I-skin-NEW
& $blender -b art/source/bosses/ashfang/archive/tier-I-skin-010-packed/ashfang-tier-I.blend --disable-autoexec --python-exit-code 1 --python tools/ashfang-zagmatorah/tier-I-presentation.py -- --output artifacts/ashfang/new-presentation --samples 96
& $blender -b art/source/bosses/ashfang/archive/tier-I-skin-010-packed/ashfang-tier-I.blend --disable-autoexec --python-exit-code 1 --python tools/ashfang-zagmatorah/tier-I-validate.py -- --output artifacts/ashfang/new-validation.json
```

Unpacked generated revisions require the sibling `M0-001/original/download/textures` archive. The packed current master can be opened alone. `tier-I-validate.py --compare BASELINE_JSON` verifies geometry, UVs, weights, bind matrices/hierarchy, object transforms, object list and the reversible tail mask; `--pack-master NEW_PATH` creates a new self-contained immutable revision. Presentation lights/floor/cameras exist only in memory during rendering and are not added to the character master. Neutral and staged stills are review evidence, not creature motion or device acceptance.

## Historical rejected workflows


Use Blender 4.5.14 LTS, background mode, with `--disable-autoexec` when opening downloaded/native sources. Commands below run from this worktree. Never reuse an existing output directory.

```powershell
$blender = 'C:/Wyrmforge/artifacts/toolchains/blender-4.5.14/blender-4.5.14-windows-x64/blender.exe'
& $blender -b --factory-startup --python tools/ashfang-zagmatorah/import_source.py -- --source C:/WyrmForgeAssets/Zagmatorah --output C:/Wyrmforge/ashfang-zagmatorah/artifacts/ashfang/M0-new
& $blender -b art/source/bosses/ashfang/archive/M0-001/master/ashfang-master-working.blend --disable-autoexec --python tools/ashfang-zagmatorah/candidate.py -- --config tools/ashfang-zagmatorah/candidate.json --output C:/Wyrmforge/ashfang-zagmatorah/artifacts/ashfang/M1-new
& $blender -b artifacts/ashfang/M1-new/ashfang-master-working.blend --disable-autoexec --python tools/ashfang-zagmatorah/review.py -- --output C:/Wyrmforge/ashfang-zagmatorah/artifacts/ashfang/M1-new/review --render
```

Original import contains no authoring edits. Packing and path repair are conversion/dependency preservation steps. Original creator-native Blender source was not supplied. Both candidates start from the preserved initial working copy; `archive/M1-candidate-00*/config.json` records each recipe, and Git history preserves script revisions. Candidate001 uses script e8ece45f; candidate002 uses 4f7cd6ca. Materials retain imported UV normals and opacity; AO/metallic dependencies are archived but not comprehensively reconstructed. Geometry/rig compatibility remains unvalidated beyond finite coordinates, group assignments, preserved topology and successful reopen.

Source card SHA256: dfc6593f74ed4d0edff3a549344860893dd93d8c599dd3ea43135a161dc889ba.

Review outcome: both candidates FAIL master identity gate. Candidate002 is a surface/proportion experiment only. No actual animated source clip, clay review, gameplay camera match, accepted rig test, six-tier system, sprite export or integration is claimed. The 1,074 boundary edges may include intentional membrane/open surfaces; 5 additional nonmanifold edges require localized diagnosis. The supplied FBX is a lightweight download with external maps, explaining its difference from the reported 139 MB package.

All archived native `.blend` files are immutable milestones. Save a new revision rather than overwriting them. Keep LFS enabled on checkout (`git lfs pull`).

## Tail correction and later anatomy studies (23 October)

- `remove-tail-fan.py`: open candidate002, write a new revision. The reversible mask removes the terminal membrane and its lateral supports while retaining the tail centerline and all source vertices.
- `armor-study.py`: open candidate003, write candidate005-equivalent output. Current script is the corrected low-relief recipe; candidate004 preserves the earlier rejected tall-plate recipe (script at 7107f1d2).
- `foreleg-study.py`: open candidate005, write candidate006-equivalent output. Creates two isolated 1,074/1,072-vertex source-topology limb blocks and 30 new bones, retaining original UVs/materials. Limb attachments and proportions remain provisional.
- `inspection-pose.py`: open candidate006, write candidate007-equivalent output. Creates a static articulated wing/jaw inspection pose and tests left foreleg isolation. No animation is authored. Current review.py preserves this authored pose; `--profile clay` renders a neutral geometry review.

Every stage accepts `--output NEW_ABSOLUTE_DIRECTORY`. Keep the sibling `M0-001/original/download/textures/` directory beside candidate006 and later outputs. New `.blend` files use that relative archive layout. Download the archive with Git LFS before opening; copying the small `.blend` alone will omit textures. Earlier packed sources, especially the original conversion, remain untouched.

Current native candidate007: archive/M1-candidate-007/ashfang-master-working.blend. Tail-removal request is applied. Full Ashfang identity, foreleg seam/muscle correction, membrane extreme-pose checks and real motion remain unfinished. Clay views expose geometry and are not visual acceptance.

Correction: candidate006/007 retained broken texture references from save-path rebasing. Their material renders are invalid evidence; clay geometry remains useful. Candidate008 is the repaired current source. Run repair-texture-paths.py on candidate007 into a new sibling output; current authoring scripts disable relative remapping. Always pass --python-exit-code 1 to Blender. Review now fails on missing image dependencies.
