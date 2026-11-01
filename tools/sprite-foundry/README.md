# Sprite Foundry — isolated offline authoring pipeline

**Status: tooling candidate. No Wizard art or gameplay animation has been approved by this tool.**

This is a source-first sprite-production tool inside the WyrmForge repository, entirely separate from the game runtime, presentation renderer, and the existing Sprite Lab inspector. It packs *authored* pixel frames into deterministic 8-direction atlases, checks dimensions/transparency/material alignment, and produces a local HTML review. No game assets are written; no source art is silently replaced.

Canonical art rules: [art and animation](../../docs/canon/art-and-animation.md) and [2.5D mobile acceptance](../../docs/canon/roadmap.md). The existing [Sprite Lab](../sprite-lab/README.md) remains the runtime-motion inspector. This foundry is a **pre-production packer**, not another game engine.

## Free tools

- **Required:** Python 3.10+ and free, open-source [Pillow](https://python-pillow.github.io/). Packaging/testing only.
- **Optional drawing:** [Pixelorama](https://orama-interactive.itch.io/pixelorama), [Krita](https://krita.org/), or LibreSprite. The agent authors complete RGBA frames; there is no need for cutout deformation or a paid app.
- **Optional anatomical reference:** Blender; never a runtime prerequisite or a mandate to render from 3D.
- **Optional Aseprite:** editable pixel-animation timeline and CLI exporting, if already available. Not required.

Install locally (Windows):

    py -m pip install -r tools/sprite-foundry/requirements.txt

Run from the repo root:

    py tools/sprite-foundry/foundry.py --project tools/sprite-foundry/wizard.project.json --source tools/sprite-foundry/source/grey-wizard --out tools/sprite-foundry/output/grey-wizard --allow-incomplete

Remove the --allow-incomplete argument for the full technical gate. The output/ folder is generated and should not be mistaken for approved assets. Open tools/sprite-foundry/review.html locally; choose the generated manifest.json and all *.albedo.png atlases together.

## Input layout

The project JSON states intended cell dimensions, eight canonical directions, foot anchor, frame counts and nominal preview FPS. Its initial **64×80 / 32×32-world** values are a proposed Wizard review format, not a redefinition of the runtime pixel/world scale or the native 160px source files on PR #439.

Each individually authored frame is a transparent PNG, at exactly the project cell resolution. Source paths:

    source/grey-wizard/
      idle/S/00.albedo.png
      idle/SE/00.albedo.png
      ...
      walk/S/00.albedo.png
      walk/S/01.albedo.png
      ...
      walk/SW/15.albedo.png

Do **not** create missing directions by flipping asymmetric art. The Wizard's staff stays in his **right hand** in every facing. All frame canvases share a fixed world-feet anchor; animation changes the limbs, not the world pivot. Do not separately resize frames, batch-warp clothing, generate synthetic passing poses, or paint ground shadows into actor albedo.

Optional same-sized RGBA map files use the same basename: 00.normal.png, 00.roughness.png, 00.emission.png, 00.depth.png. A material layer must exist for *every* source frame in the clip if used at all, and its alpha must match that frame's albedo. Maps are **not synthesized** by this tool; missing maps remain explicit. Their semantics must be reviewed against the shared G renderer before runtime integration.

Output for every clip:

- <clip>.albedo.png: a fixed-grid atlas with direction rows and frame columns
- <clip>.<material>.png: optional exactly matching atlas
- <clip>.checker-review.png: checker contact sheet, **not** an approved gameplay screenshot
- manifest.json: dimensions, frame timing, direction row order, anchor, files
- report.json: technical findings and mandatory artistic/gameplay review reminders

The CLI returns a nonzero status if strict completeness, alpha, or sizing checks fail. In --allow-incomplete mode, missing authored frames stay transparent and are marked **incomplete**; malformed or contradictory art still fails.

## Pinned Wizard identity reference

The exact `references/approved-grey-wizard.png` blob is preserved from the **approved-default-reference.png** in draft Wizard PR #439 (blob SHA `022250517f90fa3b2c48c8078ef6c1c0a6161ea5`). It is the visual identity baseline, **not** a pose or animation acceptance. Use the review page's reference selector to compare every authored facing. The Foundry never modifies this source or guesses a replacement design.

## Production sequence — owner approval gates

1. **Eight-direction silhouette:** start from the approved Gothic grey Wizard reference and the ongoing [Wizard draft PR #439](https://github.com/pjotrcasteel/Wyrmforge/pull/439); preserve hat, beard, robe, right-hand staff and proportions. Treat its source revisions as candidate material, not acceptance.
2. **Four walk key poses in every direction:** grounded contacts and convincing crossing/passing positions; reject incorrect anatomy before generating in-betweens.
3. **Complete 16-frame walking clips:** author actual frames and validate full 360° turns, loop, staff control and motion matching C# speed. Do not claim interpolation alone is hand animation.
4. **Material and light integration:** match albedo, normal, emission, roughness, depth/caster data to the same actor pose. Reuse shared lighting/animation renderer.
5. **Only after explicit approval:** separate integration PR with real Wet Forest Hunt captures at **320 and 390px**, actual occlusion and mobile budgets. The Foundry itself never publishes to wwwroot.

Passing automated tests **never** means visual approval. We specifically reject the historic failure mode of producing thousands of technically valid but anatomically wrong frames.

## Tests

    py -m unittest discover -s tools/sprite-foundry/tests -v

The test suite generates geometric **test fixtures only**, never purported finished character art. A scoped CI workflow runs it without building or modifying the game. Do not merge or promote sprite assets merely because CI is green.
