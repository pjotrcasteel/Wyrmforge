# Hollowed variation — source-based appearance, motion and death

Status: PR #358 merged into main; the two real 3D death clips are authored on PR #360. Only a successful Pages run demonstrates publication.

## Current source-based population

Hollowed remain one C# enemy kind with identical authoritative damage, collision, speeds and spawn rules.

- Existing four independently sourced body/animation looks: standard, broken right arm, absent left arm and injured left leg. The last is a real full-body walk/attack atlas, **not a rotated sprite**.
- PR #358 uses deterministic entity hashes to distribute those looks. Eight different starting phases in the already approved 16-frame walk cycle remove synchronized pack movement without changing travel-based foot cadence.
- Two contact-planted idle frames and restrained 95–105% render-only visual scale add legibility at 390px portrait. Visual scale never alters an enemy's C# hitbox or radius.
- The same individual retains its arm/injury identity, idle pose and visual scale for the lifetime of that entity, including death. Pausing or freezing does not alter simulation state.
- All attacks keep the actual authored source clip for the corresponding arm/leg silhouette. No arbitrary slash duration, damage timing or C# attack is added.

## Authored 3D death library

Previous production fallback rotated a walking frame sideways; that was owner-rejected and must never be resurrected. The new source is the editable Blender no-cape Hollowed rig, with a distinct 24-pose skeletal death action at 12 fps, eight independent view rows, and two authored variations:

- **collapse-forward**: recoil, buckle, forward impact, arms settle close to the body, then hold.
- **collapse-braced**: a separately keyed bracing-arm and compressed upper-torso fall, retaining actual skinning, UVs and floor grounding. Not a 2D flip or tint.

Source / production:

- `tools/sprite-lab/render-hollow-no-cape-death.py` authors and exports both 3D actions.
- `art/source/enemies/hollow/rigged-poc/model/local-appearance-004/rigged-hollow-death-no-cape-standard/hollow-death.blend` retains both Blender actions.
- `src/Wyrmforge.Presentation.Web/wwwroot/art/enemies/hollow-rigged/death/` contains both 3072×1024 pixel atlases and a SHA-256 checked manifest.
- `docs/art/evidence/hollow-no-cape-death-2026-10-25/` contains two per-direction pose reviews and playback GIFs.
- `src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-death.js` atomically loads both verified atlases, chooses one stable death style per entity and preserves directional row and grounded anchor.
- `hollow-sprites.js` keeps the four-second corpse lifetime, pause behaviour and fade. If the 3D source is unavailable, it no longer replays the rejected spinning corpse; the cape-free actor fades quickly.

**Acceptance distinction:** reproducible build, SHA/dimensions, direction and runtime tests are technical proof. User/owner still determines whether the visual acting and terminal poses are sufficiently convincing at actual iPhone/Android size. Do not claim a source clip is artistically approved merely because GitHub Actions passed.

Next authoring gates: expand true non-cape body/attack silhouettes from the 3D rig, death variants for visibly missing limbs, different stagger/hit reactions, and stronger idle animation. Every additional form must be its own source rig/action + QA preview; no generic Canvas palette filters or movement-speed changes.
