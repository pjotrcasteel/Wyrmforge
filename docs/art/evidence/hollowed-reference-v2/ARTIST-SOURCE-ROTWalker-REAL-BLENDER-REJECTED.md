# Update — 29 October 2026, direct owner override

**The owner has explicitly revisited the same genuine Blender Rotwalker render and selected the model as a preferred foundation.** The original audit below remains as a historical pre-owner subjective critique, **not the current art direction**. Its upright/T-pose and lack of ghoul hair/wretched damage are the exact elements the owner asks us to change. The authored torso, skull, torn garment, feet and general undead identity are worth preserving rather than starting over again. This is **approval to use Rotwalker as the modeling basis**, **not** approval of the finished Hollowed, the existing pose, its topology for mobile, its skinning, or its appearance at game scale. Source is unrigged according to its creator; do not claim it has a compatible skeleton. The latest direction is in [OWNER-SELECTED-ROTWalker-BASE-2026-10-29.md](OWNER-SELECTED-ROTWalker-BASE-2026-10-29.md).

---

# Artist-source screening 1 — Rotwalker is REJECTED as Hollowed (29 Oct 2026)

The owner rejected H1's generic mannequin and explicitly demanded the character in the supplied front / side / back reference, not another trivial retrofit. V2 was therefore created cleanly from main with **zero prior H1 model/rig reuse**.

## Genuine 3D screening evidence

- [Independent real Blender CI 40850752773 — SUCCESS](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40850752773).
- [Editable source candidate and genuine 8-view neutral-clay + black silhouette + native96 render artifact](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40850752773/artifacts/12886697904).
- Artist: Sotudios, model: Rotwalker, `rotwalker.fbx`, freely downloadable 155 MiB package at https://sotudios.com/Assets/Undead-EnemyPack/ under CC BY 4.0 with attribution. Research/archive SHA256: `00eac47b87125fc537951441bcda0388d32035f450ca7e904bd1349fb38c5672`.
- Actual imported source: 31,963 vertices, 1 mesh, no animation actions, original archive artist source; no previous H1 body, 70-bone rig or head graft.
- Isolated resulting `.blend` (not in game): `ROTWalker-CANDIDATE-NOT-HOLLOWED-NOT-APPROVED.blend`. Eight independent real Blender camera directions were rendered; no generative image tool was used.

## Visual verdict: REJECT

The real anatomy is not a viable base for **this** owner reference:

1. Upright centerline and stock outstretched-arms (authoring T-pose), without the reference's extreme collapsed rib cage / projecting neck and aggressive asymmetrical forward reach.
2. Broad layered clothing and armored collar conceal shoulder, chest, abdominal anatomy. Owner reference demands actual visible skeletal musculature and rib damage; a costume cannot replace that.
3. Small normal-size human hands, not the reference's long articulated hooked claws and oversized wrist/forearm silhouette.
4. Legs are straight and similarly weighted; no striking asymmetric crouched/staggered weight or lower-leg stance.
5. Clean exposed skull and neat draping fabric is nowhere near the organic torn face and tangled hair from owner's three-view design.
6. Native 96px reads as an ordinary armored zombie or skeletal soldier, not a unique terrifying Hollowed.

**Do not replace H1 with this candidate, copy it into V2, rig or skin it, ship it, or use its textures as a shortcut.** The source audit proves access and legality, not artistic acceptance. It is kept as negative evidence only.

## Remaining gating blocker

No independent source sculpt has yet met the quality bar. Screen a higher-quality *actual anatomical artist sculpt* close to the owner reference, with commercial modification rights and sufficient editability. Alternatively commission/author a genuinely original anatomical character sculpt in Blender/ZBrush. No new actual Hollowed body is complete; B0 remains OPEN. It would be misleading to promise that procedural shape keys, source downloading or automated rigging could automatically match a professionally illustrated character.

Everything in live WyrmForge and animation engine PR #387 remains untouched. The V2 PR stays draft.
