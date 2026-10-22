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
