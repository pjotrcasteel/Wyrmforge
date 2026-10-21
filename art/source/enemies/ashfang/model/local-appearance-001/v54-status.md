# Ashfang V54 fire identity — work in progress

Owner rejects V53's stone-only reading; canonical creature direction updated.
Preserve the accepted body and motion. Add molten armour breaks and genuinely
animated surface-bound fire rather than treating orange eyes as a finished fire
identity. Current main and open work are checked without touching runtime files.

Research: NASA ACME candle photograph
https://science.nasa.gov/image-detail/candle-flames-3/ informs buoyant tapered
flames; Illusorisch's original breakdown
https://realtimevfx.com/t/sketch-10-illusorisch/4342 informs large tapered layers,
offset motion and secondary tongues. Transfer those principles to volumetric
source meshes and a limited pixel fire palette, not the references' assets or
rendering style. The original Ashfang concept card supplies identity: black
armour concealing bright molten heat, burning spine/tail and chest.

Recipe: prepare-ashfang-surface.py from V50, bake-ashfang-surface.py --fire,
build-ashfang-body-fire.py, install packed Blender texture. Flame attachments
are means of actual deforming surface vertices. Source meshes are exported in
all nine action spaces, with periodic loop flicker and motion drag. They are
presentation only; no C# damage, player size or encounter rules change.

This checkpoint has no generated V54 evidence yet. Remaining: local generation,
source and native-scale visual checks, editable flame source, owner review.
PR #186 remains draft; V53 and earlier failed evidence preserved.
