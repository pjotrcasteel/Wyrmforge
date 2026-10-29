# Source-motion reference note

Research checked 27 October 2026, once for this foundation.

- Owner reference: [Deniz Canbulut — Zombie Walk Animations](https://www.youtube.com/watch?v=C2eVIKeCH8E). Video retrieval failed in the research tool; **no claim to have watched it**. The owner's four gait descriptions guide asymmetric support, passive lag and catch steps; no animation data copied.
- [Blender official IK constraint manual](https://docs.blender.org/manual/en/4.4/animation/constraints/tracking/ik_solver.html): explicit chain length and pole planes, no stretch; constraint ordering needs evaluated transforms. Installed authoring target is Blender **4.5.3 LTS**. Our offline solver uses actual armature bind transforms and explicit poles, and updates dependency state between parent and child. It fails on singular/unreachable targets.
- [GDC 2012 — Animation Driven Locomotion for Smoother Navigation](https://www.gdcvault.com/play/1015614/Animation-Driven-Locomotion-for-Smoother), Anguelov/Harris/Leblanc: available abstract identifies footskating and unsupported pivots as navigation/locomotion compatibility problems. Here navigation stays C# authoritative; source contacts validate the animation against it. No talk-footage review claimed.
- [Autodesk Golaem — Setting footprints on your motions](https://help.autodesk.com/cloudhelp/ENU/GOLAEM-Maya/files/tutorials/assets-conversion-0/converting-motions/glm_setting-footprints-your-motions.html): footprints describe support timing and synchronize transitions; neutral/start differs from a locomotion cycle. Use one support epoch per contact per cycle and separate clip timing from world travel.

These principles are applied to the existing cape-free skinned Hollowed, UVs and Gothic materials. Mathematical contact checks do not validate silhouette, expressive timing, actual gameplay lighting or owner visual acceptance. The initial source's COM is explicitly a pelvis proxy, not a measured full-body mass model; that remains an open source gate.

## 29 October — orientation / stride constraints

[Unreal Engine pose warping documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/pose-warping-in-unreal-engine) describes aligning lower-body IK with locomotion and distributing counter-rotation along spine joints while preserving upper-body facing. The transferable principle is constrained skeletal orientation and source-referenced stride adaptation; no Unreal code, assets or Blueprint runtime is imported. Wyrmforge keeps one existing animation clock, actual C# root motion, explicit profile limits and independent saved-skin verification. The earlier [Spine IK reference](https://esotericsoftware.com/spine-ik-constraints) remains relevant to fixed-length constrained limb solving. Neither reference establishes this candidate's visual acceptance.

## 29 October - actual skin deformation

[Kavan et al., Skinning with Dual Quaternions (2007)](https://users.cs.utah.edu/~ladislav/kavan07skinning/kavan07skinning.pdf)
is the primary mathematical reference for blending rigid rotation/translation
without the joint collapse of linear matrix blending. The original saved
Blender Armature modifier actually enables preserve volume. Our implementation
declares that mode, aligns quaternion hemispheres, normalizes the weighted pair
and rejects unsupported nonrigid bone transforms. No source code or assets were
copied. The independent NumPy reference is checked against every evaluated vertex
in sampled saved-Blender poses, then GPU raster output is compared with CPU
evaluation. Matching bone endpoints or pure-foot vertices alone was insufficient.
