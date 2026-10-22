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

Owner-assisted read-only account check now verifies included LFS allowance and
existing hard no-paid-overage limit. No billing settings changed. Private quota
receipt stays in ignored artifacts; no account-wide billing details published.
New r03 native paths are LFS tracked; r01/r02 ordinary-Git sources/history untouched.

R03 original primary silhouette: authored cervical/occipital/scapular bony
landmarks following the card's major crest rhythm, nasal recess/cranial planes,
and stronger wing-root mass. No scales, surface detail, materials or animation.
Landmark roots intentionally intersect skin; they are not finished retopology.
The RNA from_mix default was checked in pinned Blender and a duplicate r02
shape offset was found in r03. Original r03 and working source preserved, then
corrected copies created without overwriting either. Current editable source:
M1-r03/ashfang-primary-key-corrected.blend, SHA256
57fdf7182f7664d900697f2ce27801c04ffa544024bbf05d94598812f5647b1c.
Corrected source reopened and finite shape-key integrity passed; visual review
still pending. No M1 completion or owner acceptance. Push before rendering.

Independent remote r02 download from exact commit0a4c051f matched SHA256
503199d0b6eda7c95d277eff5caaf38add26a868b4e5596427cbede49aeb008c.

R03 checkpoint fbd88a8a remotely verified. New native assets uploaded via LFS
(two unique objects,5.8MB; duplicate working copies deduplicated). Independent
shallow sparse clone in ignored artifacts fetched the corrected source from
GitHub rather than local media. SHA256 matched
57fdf7182f7664d900697f2ce27801c04ffa544024bbf05d94598812f5647b1c and Blender
reopened the retrieved native source successfully (validation receipt retained).
No paid overage or billing setting change; account details remain private.

R03 ten neutral views, contact sheet and320/390/440px unchanged-mage static
comparisons completed. Contact/native boards inspected. Bony crest better
establishes dorsal silhouette, but agent artistic gate remains FAIL: card-specific
skull/neck, wing shoulder construction and native-size threat remain insufficient.
Do not ask for approval of a finished model or claim M1 complete. Do not multiply
contour/spike variants, add material noise or start rigging to disguise the gap.
Next task needs materially better primary sculptural planes and grounded wing
carriage; not another identical render. Closed jaw/rearing pose, actual environment
and phone review still missing. M2-M8 not implemented, no owner sign-off.

Current authoritative working native is working/ashfang-working-r03-key-corrected.blend.
Immutable counterpart is milestones/M1-r03/ashfang-primary-key-corrected.blend.
R03 original mixed-key error version remains unique history, not authoritative.
Review source carries reproducible light/camera setup; no animation or textures.
The CLI currently implements audit/validate/review/benchmark only. bake/render/
export/pack intentionally fail as unimplemented; their future plan is not shipped.
Krita/FFmpeg not installed because paint/motion stages have not become eligible.

Remote verification invocation:
`git clone --depth1 --single-branch --branch codex/ashfang-original-production --filter=blob:none --no-checkout <origin> artifacts/ashfang-lfs-verification`
followed by sparse checkout of exact r03 source, checkout HEAD, SHA256 and headless
Blender validate. This native source is now remotely retrievable, not just local.

Continuing M1 after owner corrected premature stop: failed visual review requires
continued correction, not ending authorized work. R04 reconstructs cranial planes
and orbital/nasal cavities, independent open/closed jaw design pose, and replaces
wing-arm stalks/compressed fan with compact arms and explicit finger chains.
Folded/extended finger landmark lengths agree within2.58e-7 authoring units; this
is a structural check, not an animation/flight acceptance. Earlier geometry is
retained hidden as native history, all pre-Boolean and pre-bake projects saved.

The new body cut initially had10non-manifold junction edges. Original failed
r04 retained; a separate voxel-closure source repaired those cut junctions.
Current native source: milestones/M1-r04/ashfang-primary-repaired.blend, SHA256
00f53049e21e4f1b80d4d7e246050485db4dd7c06284f89a1ad7e0bfdac39c19.
Reopened/validated: source finite, primary body manifold, all pose keys finite.
Boolean modifier-order warnings are recorded in ignored author log and require
visual inspection of skull/orbits before any art pass. No owner acceptance or
M1 completion. Next: push current/pre-operation sources, inspect new clay views,
correct visual defects and continue remaining M1 studies.

Owner resumed with HEADLESS ONLY operating constraint. Do not control native desktop or browser UI. If a necessary stage cannot be completed headlessly, pause and explain capability gap. R04 review fails orbital anatomy and integrated facial planes. Continue primary form correction; no M2 approval.

R05 headless source and preunion construction saved, LFS uploaded at 6e2a953c. Independent sparse download SHA256 d1b9c910b870a317242f70fd82121e5b9dbcc733cb65a00ed367c7999a4eca82 and reopen pass. Clay review: sockets improved, but rounded brows, generic horn roots, undifferentiated torso and haunches still fail M1. Continue primary-plane work; no owner acceptance or desktop control.
