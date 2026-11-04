# Source-art integrity and border audit — 36 Wet Forest candidates

**Status:** offline QA evidence, not approval or runtime certification. Date: 25 October 2026.

## Provenance

The 36 original, full-resolution PNG image-generation files were recovered from the earlier art archive. **All 36 individual original PNG SHA-256 hashes match** `manifest.json`'s `sourcePngSha256` entries. Encoding each source as WebP quality 92, Pillow method 6 reproduced the GitHub WebP SHA-256 in `manifest.json` **for all 36 files**, confirming an exact local reproduction of the branch's image bytes. Nothing in the reviewed archive was replaced.

## Audited image families

At 256-pixel image width, take a 7% border band and a centered 50% box. The border warning is **only** a possible matte/isolated-patch indicator: at least 35% of border sample pixels have maximum RGB channel ≤32, and the border has at least 20 percentage points more such pixels than the middle. It does **not** declare the painting good or bad.

| Material family | Possible black-matte border | Median mean-RGB gap L/R | Median gap T/B | Interpretation |
| --- | ---: | ---: | ---: | --- |
| Grass / Moss | 0 of 6 | 14.3 | 16.9 | Full-bleed paintings; visible raw tile seams still exist |
| Wet Mud | 0 of 6 | 10.1 | 14.7 | Full-bleed, with painted puddles / highlights |
| Old Paving | 4 of 6 | 0.2 | 0.3 | Most samples are isolated stone patches, not a paving tile |
| Trampled Earth | 6 of 6 | 0.8 | 0.8 | Isolated directional paths on black matte |
| Scorched Ground | 6 of 6 | 0.6 | 0.6 | Bounded ember/scorch patches on black matte |
| Marsh / Wet Bank | 6 of 6 | 0.3 | 0.4 | Bounded wetlands on black matte; water reflection is painted |

**22/36 variants** received the heuristic matte warning. Some have tiny edge gap **because opposite edges are both black**, a misleading indicator of seamlessness; this must never promote them to repeatable runtime tiles.

## Repeat-study findings

Two offline three-way contact sheets were created from original Grass/Moss and Wet Mud source paintings:
1. Naive repetition of one source repeats recognisable objects and produces clear seams.
2. Periodic opposite-edge feathering reduces mathematical edge mismatch, but leaves repeated landmarks and can introduce blur/ghosting.
3. A research-only deterministic, minimum-error seam-cut quilt sampling all six source candidates per family reduces obvious fixed-object repetition. It is **not** a solved production material: no generated image is declared seamless, neutral-albedo, authored-normal, authored-roughness, or lit by PR #332. Patch frequency, seams, colour bias, water regions and mobile readability need proper testing. This comparison is a source-material research result, not a proposed shipping compositor.

## Next technical tasks

- Keep this art archive and accepted six-swatch game atlas separate.
- Continue source-only studies for a **true** reusable ground base: inspect patch-quilt seams, material composition and texture repetition at the real 320/390-pixel portrait presentation scale.
- Author light-neutral albedo and *separate* water/normal/roughness/depth/emission/transition layers from editable source data. In particular, **do not** automatically classify dark RGB as a transparent alpha mask or red lava paint as an emissive GPU surface.
- Integrate those derivatives only through the shared universal G0–G1 lighting/material interfaces in PR #332, with actual mobile captures and zero-light diagnostic; avoid a second renderer.
- Obtain owner visual approval only after presenting a meaningful material-lit/arena-scale comparison. Until then, all 36 remain `unreviewed` and this PR stays a draft art archive.

See [the full readiness audit](PRODUCTION-READINESS.md), [manifest](manifest.json), and the scripted source scans in `tools/art/`.
