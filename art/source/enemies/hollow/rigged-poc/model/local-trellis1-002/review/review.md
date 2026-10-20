# Local mesh review — 20 October 2026

**Technical reconstruction passed; visual gate B not passed. No rig or walk.**

The run used the actual RTX 5090 with PyTorch 2.8.0+cu128, original Microsoft
TRELLIS and direct Meta DINOv2 weights. Hugging Face networking was disabled.
Model files came from ModelScope; the card/reference remained local throughout.
Peak allocated PyTorch VRAM: 9730 MiB. No hardware settings were modified.

Preserved: raw generated geometry/colors, GLB, exact candidate checksum and
source revision in provenance.json, editable Blender review scene, four PNGs.
Blender review renders use CPU Cycles; the reconstruction used the RTX 5090.
The review source uses original native Z-up geometry to avoid GLB importer-axis
ambiguity. Native generated RGB is wired explicitly to the material. The GLB
stores vertex colors; there is no authored UV texture or animation rig yet.

## Self-review findings

- Recognizable thin humanoid, narrow rib cage, long fingers and tattered skirt.
- Skull, teeth and ribs are substantially softer than the source card/reference.
- Brown/bone material separation is too blurred and the overall treatment reads
  as a pale low-detail model rather than the approved weathered undead artwork.
- Back design is inferred and simplified. Small holes/artifacts are visible at
  the neck and forearm; cloth requires separation/topology inspection for motion.
- Fingers and garment panels have not passed deformation testing.

**Decision:** retain as the first successful local reconstruction test; do not
promote to production art, rig/walk acceptance, or runtime sprites. Refinement
requires a faithful skull/rib silhouette, detailed textures and clean deformable
hands/cloth before continuing the procedure's rigging gate.

No independently generated animation grid, rigid-cutout substitute or final
spritesheet was produced. The four views are static review evidence only.
