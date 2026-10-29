> **HISTORICAL 96px PIPELINE TEST ONLY.** Owner's latest direction is 3D model/pose/details **first**, Blender pixel conversion **after finished 3D source visual approval**. Do not repeat this unfinished source T-pose preview during M1–M4. [Canonical M1–M6 plan](HOLLOWED-3D-FIRST-PRODUCTION-ORDER.md).

# Hollowed V2 — genuine 96×96 mobile fidelity baseline

**29 Oct 2026; source candidate stage; owner has selected Rotwalker as the modeling base, but has NOT approved the finished model.**

## Real proof (never an AI illustration or claimed live Hunt screenshot)

- Source is the independently sourced Sotudios Rotwalker editable Blender candidate, under CC BY 4.0 attribution, NOT the rejected CC0 Horror Monster 70-bone/H1 mesh.
- [Successful isolated 3D source and mobile-pixel CI run 40852771524](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40852771524)
- [All genuine 96×96 per-view pixels, 4× NEAREST enlargements, silhouette, dark-background and editable source files](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40852771524/artifacts/12887567860)
- Render script: `tools/art/hollowed-reference-v2/render_mobile_candidate_blender.py`
- Metadata inside artifact: `review/mobile-native96/mobile-pixel-proof.json`
- No Blender image is masqueraded as an actual-running-game screenshot or phone test. No game files or animations were modified.

## Measurements from actual Blender-native images

- True native output **96×96 pixels**, rendered in Blender at that size; NOT reduced from 320px previews.
- Eight independent real views; character **60 pixels high** in each. Existing WyrmForge historical envelope: target **56–64 pixels** in a 96×96 cell.
- Preliminary pivot **[48,72]** for inspection. Runtime integration must calibrate actual world scale and contacts separately.
- Approximate actor widths at this T-pose (front, 45°, side, 135°, back, 225°, opposite side, final 315°): **50, 35, 12, 35, 48, 36, 12, 35 pixels**. These are widths of actual silhouette masks.
- Shared **36 colors** used out of a 48-color diagnostic cap, **binary alpha**, no dithering, enlarged inspection only using pixel-preserving NEAREST ×4.
- Neutral clay and studio lighting ONLY. Not a finished ash-rot/bone/char color design; not lit by the runtime GPU lighting engine. Physical iOS/Android and dark Hunt scene still untested.

## Visual self-review

**Technical PASS; artistic silhouette remains NOT APPROVED.**

The selected baseline shape is much more promising than the previous rejected mannequin, but at 1× native pixel size it loses all face detail, looks pallid against a generic dark background, has small indistinguishable hands, no long hair, and the side profile is barely 12px wide. The silhouette is unmistakably a neutral T-/A-pose source, NOT a threatening, feral Hollowed. Accepting this result as finished would repeat prior mistakes.

Therefore the right next changes are **big geometry / pose**:
1. Feral asymmetric three-dimensional posture with forward head/neck, nonuniform shoulder reach and planted/staggered feet. Full eight-view source geometry must be evaluated, not merely a twisted flattened sprite.
2. Thick but ragged **hair silhouette mass** (many fine loose strands do not survive at 96px).
3. **Long hooked claw silhouettes** that occupy enough native pixels to be distinct without looking like human fingers.
4. Broken ghoul identity in the face and shoulders, enough bony vs cloth mass separation to read in 36–48-color diagnostic palette.
5. Later interior fire and volcanic crack lighting only once the geometry works; avoid blurred glow dominating the figure at 1×.

No mandatory exact hand/hair pixel widths are approved yet; test distinguishability first and tune them alongside the actual Ashling and game at mobile viewport scale.

## Gate logic

- **Approved:** Rotwalker as art *foundation*, mobile native-96px review technique.
- **Not approved:** current pose, materials, facial appearance, hair, claws, deformation, runtime camera calibration, actual pixel atlas, in-game animation or mobile device performance.
- **Next visual checkpoint (superseded):** genuine full-resolution Blender posed front/side/back views of a fully edited 3D source; no native pixel export until M5, after owner reviews the finished 3D model. Output sprites must still come directly from that single modeled source.

[Owner decision and mobile-first contract](OWNER-SELECTED-ROTWalker-BASE-2026-10-29.md). PR #399 stays draft, PR #387 animation engine and all existing game assets untouched.
