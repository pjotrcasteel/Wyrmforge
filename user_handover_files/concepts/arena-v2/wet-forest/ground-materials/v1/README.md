# WyrmForge — Wet Forest ground material concepts v1

**STATUS: REVIEW CANDIDATES — NOT LOCKED, NOT ENGINE-READY.**

This is the owner's requested six-families × six-individual-variations art review collection (36 separate images).
Original source images were generated in ChatGPT in October 2026 and are preserved for visual review
as full-resolution, quality-92 WebP versions. Their original PNG SHA-256 digests and filenames are recorded
in `manifest.json`; the 36 original PNGs were additionally packaged in a conversation backup archive.

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

## Approval/locking protocol
**Do not rename this folder CANONICAL or update runtime references until the owner explicitly accepts
these 36 images.** After approval, record approved image hashes in an immutable manifest
and commit the production source derivatives separately for the shared renderer. This review branch
is intentionally isolated from concurrent engine and arena-generator work.

The old rejected oak/forest assets are not used in this collection.
