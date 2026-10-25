# WyrmForge — Wet Forest ground material concepts v1

**STATUS: REVIEW CANDIDATES — NOT LOCKED, NOT ENGINE-READY.**

This is the owner's requested six-families × six-individual-variations art review collection (36 separate images).
Original source images were generated in ChatGPT in October 2026 and are preserved for visual review
as full-resolution, quality-92 WebP versions. Their original PNG SHA-256 digests and filenames are recorded
in `manifest.json`; the 36 original PNGs were additionally packaged in a conversation backup archive.

## Visual review

![All 36 Wet Forest material candidates, six variants per family](review-contact.jpg)

Inspect the individual `variant-01.webp` … `variant-06.webp` files inside each family folder at original resolution before deciding which paintings to approve. See the [production-readiness audit](PRODUCTION-READINESS.md) for the observed black-matte borders, baked lighting/reflections, material separation work, and GPU/arena acceptance gates. The contact sheet and artwork remain **review-only**; neither is a game texture atlas.

## Families
1. `grass-moss` — normal wet forest substrate
2. `wet-mud` — damp soil
3. `old-paving` — ruins/settlement context, NOT ordinary forest road
4. `trampled-earth` — path/road core
5. `scorched-ground` — optional fire-Wyrm influence, NOT general terrain
6. `marsh-wet-bank` — saturated terrain and water margins

Each family has `variant-01.webp` through `variant-06.webp`.
`review-contact.jpg` is a downscaled six-by-six visual index, **not** a runtime atlas.

## IMPORTANT — source art is not renderer-ready yet
- These are **concept images**, not verified seamless tiles. At present image borders/edge colors
  do not match. Do not tile them in the Arena Generator and claim seamless transitions.
- Some source art contains dark backgrounds, painted shadows, highlights, red glowing cracks
  or water reflections. They are **not** light-neutral albedo images; extract/author suitable
  maps (albedo, roughness, height/normal, occlusion, emission where applicable) before use.
- Never replace the already-approved six-swatch runtime atlas or bypass the universal GPU lighting
  engine from PR #332. No lighting filters or new renderer.
- Actual in-game review at 320px/390px mobile viewports, material edge blending, repeat variation,
  deterministic layout, and all-light-off black-world proof are required before any runtime migration.

## Reproducible Grass/Moss + Wet Mud source-repeat study

The **first twelve** Grass/Moss and Wet Mud source paintings now have a non-destructive, repeatable QA generator. This is a visual experiment, not a lighting-compatible game texture exporter.

- Run: `python -m pip install Pillow==12.0.0`, then `python -m unittest discover -s tools/art/tests -p test_ground_material_probe.py -v`.
- Generate: `python tools/art/build_ground_material_probe.py --output /tmp/ground-review --tile-px 240` from the repo root.
- Each `*-repeat.jpg` compares a 3×3 repeated original (left) against a 3×3 periodic-border feather study (right). The study intentionally exposes repeating objects, blurred seams, and mismatched world scale; matching border pixels is **not** proof of a high-quality seamless texture.
- The `review-metrics.json` provides original and studied edge-gap diagnostics and immutable source hashes. No output goes into gameplay and nothing updates the source manifest's approval status.
- GitHub Actions' **Wet Forest ground concept integrity** workflow uploads the `wet-forest-grass-mud-repeat-studies` review artifact for each successful PR run (30-day retention). The review pages must still be checked by a human.
- Actual relightable albedo, independent puddle masks, physically meaningful reflection/roughness/normal maps, authored transition/geometry masks, and representative mobile shots must wait for the unified lighting interface in PR #332 and owner approval.

## Verified original-source audit and seam-cut research (25 October 2026)

**All 36 original source PNG SHA-256 digests matched the archive manifest**, and locally re-encoding each original at WebP quality 92 with Pillow method 6 reproduced all 36 committed WebP checksums exactly. The source evidence and per-family border screening are in [SOURCE-AUDIT-RESULTS.md](SOURCE-AUDIT-RESULTS.md).

- 22/36 candidates have a **possible black-matte boundary**, based on a conservative brightness/edge screening rule; this means they need patch/path/shoreline handling rather than raw rectangular repetition. It is not a user art rejection.
- The **six** Grass/Moss and **six** Wet Mud paintings are full-bleed, but lack proven seamless boundaries or light-neutral color.
- `tools/art/quilt_ground_material_study.py` is an optional, deterministic **research-only** six-source seam-cut compositor. It compares naive repetition, periodic edge feathering, and seam-cut quilting for Grass/Moss and Wet Mud. It never writes to the source archive, modifies canonical game materials, certifies seamlessness, or implements lighting.
- Local first-pass review suggests seam-cut sampling reduces obvious repeated landmarks relative to simple 2×2 repeats; future gameplay-scale inspection is still required.
- GitHub Actions `visual-review` now includes unit tests, all-36 source diagnostics, the twelve earlier repeat-probe studies, and the two quilting comparisons in the same downloadable artifact. **Latest CI has not yet been verified green.**

## Diversity-controlled source quilting — research-only checkpoint

The first seam-cut quilt disproportionately reused individual sources (13/25 Grass/Moss patches from one artwork; 16/25 Wet Mud patches from another), despite all six paintings being available. The experimental sampler now attempts each of the six source artworks per patch, then applies a small, deterministic usage penalty (`diversityStrength=0.15`) among visually plausible candidate overlaps. A candidate outside the bounded overlap-error budget (best error ×1.45 + 100 mean-squared RGB units) cannot win solely for variety.

The repeat-study JSON reports `selectedSourceUsage`, `sourcesRepresented` and the actual selection sequence. This improves coverage *without guaranteeing artistic quality or an exact six-of-six result for every seed*. It retains all six original image hashes, any baked highlights, no authored water masks and **no** production materials. The visual-review job and unit tests verify the code; real device screenshots and shared GPU shading remain separate future gates.

## Portrait-size Grass/Moss ↔ Wet Mud material-boundary QA

A standalone `tools/art/ground_transition_study.py` research tool builds four **source-only portrait comparison boards** at **320×568** and **390×844**, using two deterministic seeds. Each board tests the same Grass/Moss and Wet Mud six-source quilts across three *visual-only* transition modes:

- **Hard boundary:** sharp family switch, exposing disconnected material detail.
- **Soft crossfade:** source RGB mixing, exposing blur and muddy/ghosted detail.
- **4×4 ordered coverage dither:** alternating untouched source pixels in the boundary band, preserving the source pixel colors and helping reveal whether the transition remains readable at small sizes.

The wavering test boundary is explicitly **not** a C# `WetForestRecipe`, road shape, puddle distribution, hazard, collision rule, reflection, or procedural gameplay plan. There is deliberately no simulated Fireball, player, material geometry, GPU lighting or baked night overlay in these comparisons. The `transition-study.json` report records seeds, source usage and content hashes. The original paintings and existing game atlas remain unchanged.

Generate from the repository root with `python tools/art/ground_transition_study.py --output /tmp/wyrmforest-ground-source-review`, after installing the pinned visual-review dependencies in the workflow. The draft PR's **Wet Forest ground concept integrity** artifact also contains the preview boards once CI succeeds. These boards are **not** a substitute for the shared GPU-lighting integration, actual iOS/Android inspection, or user approval.

## Approval/locking protocol
**Do not rename this folder CANONICAL or update runtime references until the owner explicitly accepts
these 36 images.** After approval, record approved image hashes in an immutable manifest
and commit the production source derivatives separately for the shared renderer. This review branch
is intentionally isolated from concurrent engine and arena-generator work.

The old rejected oak/forest assets are not used in this collection.
