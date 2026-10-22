# Continuity — original Ashfang, 22 October 2026

Implementation starts from refreshed main 1e630566 in isolated worktree
`C:/Wyrmforge/ashfang-original-production`, branch codex/ashfang-original-production.
Previous main/untracked files and recovery branch are untouched. Open PRs checked:
293,292,290,288,287,286,283,282,280,218,209,186,136,128,118.

New canonical direction and production record established. Owner authorizes
existing LFS allowance only, no paid overage; numeric quota unavailable. Bounded
small sources can use ordinary Git and independently verified remote retrieval.
Large sculpt/textures blocked until LFS remaining quota/billing cap verified.

No source model, sculpt, rig, animation, runtime change or owner acceptance yet.
Next: preflight receipt and original primary anatomy study with neutral reviews.

Original M1-r01 primary contour geometry created, no prior imports. Pre-union,
continuous primary skin and working copy preserved. Reopened in Blender 4.5.14:
34590-vertex primary skin, zero non-manifold/boundary edges, finite positions.
Skull/jaw, horns, separate digits and cambered wing panels remain editable.
This is primary volume construction, not professional sculpt detail, deformation
retopology, rigging or owner-accepted anatomy. No surface/detail or animation.

Authoring: `blender --background --factory-startup --python tools/ashfang/author-primary-study.py -- --revision M1-r01`.
Reopen: `blender --background --disable-autoexec <M1-r01/ashfang-primary.blend> --python tools/ashfang/pipeline.py -- validate --revision M1-r01 --output <validation/M1-r01>`.
All three native files total about 3.21 MiB, within the bounded ordinary-Git pilot.
Blender emitted a denied user-extension-cache write warning; native saves and
reopen passed. No system install or hardware settings changed. GPU review pending.

M1-r01 neutral review rendered with RTX 5090 OptiX, nine real views at1024/32
samples including front/side/rear/top, both three-quarter, elevated34deg, two
head closeups. Front/side/top/right three-quarter/skull three-quarter inspected.
Agent review FAIL for owner submission: muzzle/brow are too soft/rounded and
cheek looks attached; wing rest staging obscures body/does not meet card presence.
Remaining views rendered but not yet visually inspected. Geometry format pass is
not artistic acceptance. Preserve r01; next revision edits these original forms,
not legacy geometry, before armor/fire/rig/animation. Review camera/light native
snapshot also retained. Native r01 SHA256 in authoring-report.json.

M1-r02: original r01 source preserved, then lengthened muzzle/mandible, flattened
brow and nasal planes, merged cranial/temple/brow skin after saving a preceding
native snapshot, editable primary chest/scapula shape-key corrections, and
provisional relaxed wing-digit carriage shape keys. Extended basis retained.
These static design poses are not a rig, animation or final membrane deformation.
All native source totals11.42 MB before r02 review snapshot, within20MiB pilot.
Reopen validation passes. r02 source SHA256:
503199d0b6eda7c95d277eff5caaf38add26a868b4e5596427cbede49aeb008c.
Exact authoring command: open M1-r01/ashfang-primary.blend with --disable-autoexec
and --python tools/ashfang/refine-primary-r02.py. Never rerun into existing r02.

R01 was independently retrieved from exact remote commit dde6d9a8 and SHA256
matched6ce00401a851c3112ed2027123e6fa3c0c56e57113665b41560d7765584d1e98.
Large sculpt/texture LFS quota remains unverified; no LFS bytes or paid overage.

R02 ten1024px/32-sample neutral views rendered locally with Cycles/OptiX:
front/side/rear/top, both three-quarter,34deg relaxed/extended, skull side/three-quarter.
All reviewed through the contact sheet; head/right/left/rear and native board
also inspected individually. Render time2.39sec first view,1.38-1.44sec subsequent.
GPU temperature31C before/after; board memory sampled after2246MiB, not peak or
sustained-load certification. Source/review snapshot both reopened; finite shape
keys checked separately. No missing external dependencies. No rig or actions yet.

Agent artistic verdict FAIL: r02 improves muzzle length and cranial integration,
but remains too smooth/generic to claim recognizable Ashfang. Native23%-width
comparison at320/390/440px lacks threatening card identity. Wing roots and neck
primary silhouette need further authored anatomical work. No owner acceptance
requested for this failed candidate; no materials/fire/animation expansion.

Static native boards use public runtime mage.N.idle at unchanged36x42 frame size,
with explicit pixel-equality check after compositing. They are NOT live Hunt or
phone captures, final sprites or proof of pixel-art quality. Camera34deg is still
provisional. Closed-jaw/rearing studies and full native environment comparison
remain undone. r01/r02 are preserved research, not M1 completion.

Pinned Pillow11.3.0 (MIT-CMU) and NumPy2.3.3 (BSD) installed in ignored local venv
artifacts/ashfang-python from PyPI wheels, no global package changes. Commands:
`python tools/ashfang/compare-native-size.py --review <reviews/M1-r02> --output <reviews/M1-r02-native>`;
`python tools/ashfang/contact-sheet.py --review <reviews/M1-r02> --output <reviews/M1-r02-contact.png>`.
Syntax check: python -m compileall -q tools/ashfang passed. A shell wildcard
py_compile invocation failed before compileall; no source change resulted.

Billing connection has no quota API; available in-app browser was signed out,
so remaining LFS allowance could not be inspected. Owner offered to sign in;
browser shown for owner-operated authentication. No credentials read/entered,
billing changes, LFS uploads or paid overage. Native pilot currently13,996,536bytes
across8 .blend files, all individually below8MiB. Next large sculpt still gated.
