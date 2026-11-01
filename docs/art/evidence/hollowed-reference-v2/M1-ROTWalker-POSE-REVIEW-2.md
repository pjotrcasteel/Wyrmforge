# Hollowed M1 revision 2 — actual Blender source / pose checkpoint

**UNAPPROVED source-only edited Rotwalker (29 October 2026).** This is genuine full-resolution 3D and shape-key deform data, not generated art, not native pixels, not a production animation skeleton, not the running game.

- [Actual passing Blender/CI source run 40854963052](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40854963052)
- [Real Blender source + front/right/back + 8 neutral-clay/silhouette renders](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40854963052/artifacts/12888847325)
- 31,963 same artist-source vertices, 31,693 original polygons, original bind shape retained for reversing edits.
- Arm-span 2.3337m bind → 1.1394m posed (0.488 ratio); model skull shifted forward 0.4489m; posed full height 2.7231m; foot sole correction about 10–13mm per foot.
- Arm reach asymmetrically increased and hips/knees further offset relative to M1 revision 1.
- No animation actions, no old H1 body, no animation engine/code modifications, no 96px conversion, no game atlas changes.

## Honest visual review

The profile maintains a recognizable forward head/neck/torso ghoul bend, with elbows closer to a reaching posture. **However**, the front shoulder armor and upper arm structure still feel rigid, the asymmetry is not dramatic enough and the knees do not yet convey sufficient weight transfer. Both front/back silhouettes still resemble a generic armored undead. This is NOT acceptable as the final body and pose of the owner's high-quality Hollowed reference.

The right next production slice is true anatomical shoulder/arm/leg sculpt and eventual controlled skinning (instead of treating an unrigged static shape key as finished animation). Do not hide those issues under hair, fire, cloth, pixelization or special rendering.

Owner should steer from real front/side/back; source should remain on PR #399 until visual direction is credible. User wants the final 3D model/pose/details FIRST, then (and only then) Blender native pixel export.
