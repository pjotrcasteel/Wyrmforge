# Hollow mobile pixel walking proof

20 October 2026. **A real one-view walking sheet from one textured, skinned 3D
source. Agent self-review supports this proof; owner artistic approval is pending.**

## Deliverables

- `hollow-walk.png`: 768×192 RGBA, 16 frames in an 8×2 row-major grid.
- `hollow-walk-strip.png`: the same 16 poses in a 1536×96 strip for Sprite Lab.
- `hollow-walk.manifest.json`: explicit frame rectangles, fixed pivot, 12 FPS,
  travel and source information. This is a proof manifest, not an integrated
  combat adapter. Strip metadata is beside its copy in Sprite Lab assets.
- `walk-review.gif`: nearest-neighbor enlarged playback, dark neutral background.
- `native-grid-review.gif`: native-size proof on a projected moving ground grid.
- `native-mage-comparison.png`: actual Sprite Lab canvas at 390px viewport width,
  beside Wyrmforge's current `mage.S.idle` artwork from the actor atlas.
- `contact-poses-3x.png`, `technical-report.json`, `browser-report.json`.

Editable source: `../../model/local-appearance-004/rigged-pixel-v3/hollow-rigged.blend`.
The albedo image is packed in that Blender file. Separate albedo, UV mesh, local
Gaussian appearance, shared latent and reconstruction provenance are preserved
under `../../model/local-appearance-004/`.

## What changed from the rough model

Recovered the richer appearance decoder, rendered its observations using local
Apache-2.0 gsplat, then baked them onto an actual UV-mapped mesh with CUDA visibility
checks. Unseen texels retain the generated vertex-color fallback; they are not
claimed to be directly observed anatomy. The first grayscale observations came
from an RGB-indexing bug and are rejected history, not texture sources for this proof.

Created a 22-bone armature with weighted limbs, dedicated cloth controls and a
root. The walk uses alternating support, analytically placed knees, pelvis loading,
torso counter-motion and delayed hand/cloth movement. An initial weight assignment
pulled some leg vertices toward hands/cloth; revision 2 corrected the regions.
Revision 3 uses the final mobile-scale camera. Original failed candidates remain
preserved; they are not selected in this deliverable.

The RTX 5090 rasterizes the sampled **deformed 3D mesh** at native 96×96 resolution.
No independently generated animation frames, rigid-cutout animation or per-frame
image warping. Output has binary alpha, nearest texture sampling and a fixed
64-color ramp derived from the current Wyrmforge Hollow atlas, with no dithering.
The actor occupies about 56–60 pixels in height, rather than showing an oversized
smooth 3D render as the intended game asset.

## Evidence and review decision

- Actual source seam: maximum vertex-position difference **0.0 model units**.
- Actual foot-bone stance markers with source travel applied: maximum drift
  approximately **1.01×10⁻⁷ model units**. These are skeleton contacts, not an
  automatic proof of visual gait quality or a measurement of every sole vertex.
- Every exported frame contains artwork, has clear cell padding and binary alpha.
- Existing Sprite Lab's 390px browser run: 16 frames / 12 FPS / one authored
  direction, advancing frames observed, zero JavaScript errors. All format checks
  pass; the intentional one-direction warning remains.
- 19 existing Sprite Lab/core/building tests pass. Those regression tests do not
  certify this new character; its source report and browser evidence are separate.
- Visual self-review: inspected contact/passing poses, native and enlarged pixel
  frames, actual browser playback samples, and current mage comparison. Thin undead
  silhouette, bone/brown material separation and alternating steps read at mobile
  size. This is a credible walking proof, not approval of a complete creature.

## Scope and remaining work

One three-quarter front view and walking only. No mirrored missing directions,
attack/hurt/death clips, transition policy or production combat integration is
claimed. Hidden anatomy and close-up skull detail remain inferred/simplified;
broader deformation review is required before extending the full lifecycle.
Physical iPhone Safari and owner artistic acceptance have not been obtained.
No gameplay, saves, collision, aiming or current hunt artwork changed.

Sprite Lab preview is opt-in: `/sprite-lab/?candidate=hollow-local-pixel-v1`.
The default existing assets remain unchanged. Its old stride demo is disabled
for this candidate because it uses a different gait/travel contract; use the
source-derived projected-ground GIF for this proof's contact review.

Run the local review server with `node tools/sprite-lab/serve-review.cjs` and open
`http://127.0.0.1:8766/sprite-lab/?candidate=hollow-local-pixel-v1`.
For game integration, honor the 96px cell's **93 world-unit drawing size**, pivot
`[48,72]`, and 18.3871 world-units-per-cycle travel calibration; do not reuse the
legacy painted atlas's different 192px-cell / 60-world-unit drawing contract.

All generation/inference and final rasterization ran locally on the RTX 5090.
Blender evaluated the rig locally; CPU Cycles was used for earlier model-review
stills only. No hosted generation, subscription, GPU clock/voltage/power-limit,
firmware or Windows driver change was used.

## Research carried into the proof

- Wyrmforge's Hollow card/runtime atlas, current mage, approved forest-monastery
  encounter and actual enemy-lab evidence: restrained bone/brown palette, crisp
  silhouettes and readability against dark ground. No external game assets copied.
- [Animation Mentor's authored walk analysis](https://www.animationmentor.com/blog/tutorial-animating-human-walk-cycle/):
  contact, down, passing and up organize weight transfer. Our undead gait and keys
  are original; the reference's character and motion files were not imported.
- [Blender skinning guidance](https://docs.blender.org/manual/en/5.0/animation/armatures/skinning/parenting.html):
  weights need correction when deformation is wrong. The rig uses explicitly
  authored anatomical weights, and its first faulty region assignment was corrected.
- [gsplat](https://docs.gsplat.studio/main/): local CUDA appearance rasterization;
  the Apache-2.0 implementation avoids the upstream research-only renderer.
