# Mire Hound VFX asset provenance

Source: user-supplied \`FX (2).zip\`, pack \`pvfx-foundry-thirteen-spritesheets\`, 7 November 2026.

- **Dash Dust:** \`effects/smoke/dash-dust/strict/grid/sprite-sheet.png\`. 13 frames, 68×32, 8 columns, pivot (24,28).
- **Punch Hit:** \`effects/impacts/punch-hit/strict/grid/sprite-sheet.png\`. 11 frames, 48×40, 8 columns, pivot (17,21).
- Both sprite sheets are combined in \`mire-hound-atlas.png\`; the second starts at atlas y=64. No authored frames were omitted or interpolated.
- Only palette colors changed, to dark wet earth, muted bruise red, and bone/ivory.
- Original bundled \`LICENSE.txt\`: games and commercial modification permitted; attribution not required; assets are provided as-is.
- Runtime: one decoded 544×144, indexed 12-color atlas, only indexed source-rectangle draws. No new lighting engine, no terrain or physics write, no synthetic collider.
- C# simulation is authoritative for windup, movement, contact, land/miss and recovery. The Bite/Punch Hit animation only displays with \`pounceLanded\`.

Keep the original archive as source material; do not redistribute the extracted pack as standalone assets.
