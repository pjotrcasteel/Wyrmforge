# Current owner-approved TierI size calibration

The owner selected the **2x preview setting as rendered in the saved screenshot**, not a literal measurement of the complete tail/body silhouette. `tier-I-scale-baseline.json` is the exact size reference: worldCell448.53076140099125,0.75 game camera,402x874 logical phone viewport. Future tier multipliers apply to this baseline. The slider remains1–6x; default/reset/manual-off use2x. Its chosen value is saved locally and reflected in the shareable `?size=` URL parameter. The obsolete `bossSize` query is ignored/migrated. No per-frame/per-facing sprite fitting.

The iPhone17Pro-shaped preview uses a1206x2622 backing canvas and approximate rounded-frame/island chrome, based on Apple display specs linked in the page. This is browser sizing review, not physical iPhone acceptance. Camera zoom affects all actors/ground together; the game-camera view stays fixed while the slider changes only the boss.

Current fine/bold source002 uses native512/256 renders and64 fixed palette entries;52 used.1632 exact source frames and96 atlas sheets cover idle,claw_right,fly,roar in all8 views, plus source003 comparison. It has not converted the remaining37 actions. Pixel-style approval is separate from the newly approved size.

---

## Earlier correction notes (superseded sizing trials)

# Corrective large-boss2.5D pixel proof002

Latest owner direction supersedes the earlier viewport quota: the grounded body must read roughly5x the actual player's visible height. Use42px mage reference height and the SE idle head/chest/pelvis/limb projected span (exclude long tail and atlas padding). One world scale applies to every facing and animation. Camera zoom transforms the ground, mage, Hollow and boss together. Arena view keeps a massive boss; Fit whole dragon zooms the complete scene without changing relative sizes.

Native source: archive/pixel-style-002/ashfang-pixel-style.blend. Approved source018 anatomy/motion is unchanged. author-pixel-style.py adds matte response, binary alpha and64 fixed color-ramp entries with denser dark tones. It preserves fine shading at the corrected large body scale. The rejected001 source/exports remain in history and their own folders.

Render idle,claw_right,fly,roar in all eight directions with render-animations.py at512px into artifacts/ashfang/pixel-style-002/fine and256px into artifacts/ashfang/pixel-style-002/full. Use --motions art/source/bosses/ashfang/archive/motion-library-018/motions.json. Each density has816 native frames.

Run pack-pixel-proof.py --output art/source/bosses/ashfang/exports/pixel-proof-002. It packs exact unresampled cells, checks palette/binary alpha/empty/clipped frames and includes32 source003 comparison sheets. Copy the complete bundle to wwwroot/art/review/ashfang-pixel-proof-002. The96 atlas files contain64 new pixel sheets and32 source-comparison sheets.

The opt-in /arena-lab/ashfang/ proof imports the actual game ground, mage and Hollow renderers. It neither replaces the ground-only Lab nor changes Hunt mechanics. review-pixel-proof.cjs checks all atlas loads, animation controls, shared camera, depth sorting,320/390/440/1100px body-to-player ratio and actual screenshots. Source-cell checks are technical evidence; they do not approve artistic quality. Owner rejected001's visual sizing despite those checks.

Original follow-up records remain in reviews/pixel-style-001. New review/evidence belong in reviews/pixel-style-002. Full41-action pixel finishing, any hand pixel cleanup, gameplay/device integration and owner style acceptance remain separate.

---

## Historical first proof (superseded)

# Bounded2.5D pixel style proof

Native scene: archive/pixel-style-001/ashfang-pixel-style.blend, authored from the approved motion-library018. author-pixel-style.py adds fixed compositor color ramps, binary alpha and matte material response without changing geometry, weights or motion. Same35.264-degree orthographic eight-direction view. Shared21-color palette;18 colors used in the current exports.

Render idle,claw_right,fly,roar with render-animations.py at sizes48,96,128,256 into artifacts/ashfang/pixel-style-001/mobile-bold,mobile-fine,full,fine respectively. Use --clips idle,claw_right,fly,roar --size N, and --motions art/source/bosses/ashfang/archive/motion-library-018/motions.json. Each resolution contains816 native frames.

Run pack-pixel-proof.py --output art/source/bosses/ashfang/exports/pixel-proof-001. It packs unresampled native pixels, verifies fixed palette/binary coverage/all3264 source cells/no empty or clipped frames, and includes the preserved003 source comparison. Copy this bundle unchanged to wwwroot/art/review/ashfang-pixel-proof-001. The160 atlas files include128 newly rendered pixel sheets plus32 source-comparison sheets.

Serve src/Wyrmforge.Presentation.Web/wwwroot at loopback port8879 and open /arena-lab/ashfang/. It imports the actual ground board/material renderer and actual mage/Hollow renderers. The ground-only /arena-lab route and live Hunts are untouched. The broadest idle silhouette calibrates20% of canvas gameplay width, within the recovered15–25% TierI target. One scale per viewport; no per-frame or per-facing rescaling. Natural foreshortening remains. Mobile LODs retain small native details; no blur filtering or screen-stretched model.

Run review-pixel-proof.cjs for actual browser controls, all160 atlas loads,320/390/440/1100px size measurements, depth-order control and captured actual-game references. Comparison characters are reference poses, not simulated combat. Neither presentation markers nor this proof alter C# collision, timing, damage or saves.

Native source plus all referenced textures were independently retrieved through LFS and reopened. Updated runtime/source atlases must also pass final independent cache hash receipts. Style acceptance, hand pixel cleanup, processing the remaining37 actions and actual Hunt/device integration remain subsequent work.
