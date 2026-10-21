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


## Generated result and validation

V54 is now the current candidate. Molten orange/yellow breaks replace the tiny
isolated ember details; dark armour remains. Broad wing veins are heated.
Fourteen surface anchors each carry two tapered, independently phased 3D flame
tongues. Surface attachment follows evaluated deformation, buoyancy rises in
world space and rearward drift responds to source velocity. Tongues are still
stylized geometric fire requiring owner review, not a claimed fluid simulation.

All nine fire meshes are saved as NPZ source, plus editable per-action shape
keys and emission vertex colors in ashfang-rigged.blend. Each fire action is
in a named collection; walk is initially enabled, other collections hidden.
To inspect a different action, switch the dragon's matching action and enable
only its fire collection. ashfang-texture-only.blend preserves the intermediate
source before editable flame installation. Rest/animation geometry is unchanged:
motion-preservation.json proves every original non-UV array equal to V50 across
all nine motion exports. Walk and flight fire loops close exactly.

Local NVIDIA RTX 5090 renders: six action previews finite/unclipped, eight
actual camera directions. motion-review-v1/flight-sequence.gif and walk.gif
show combined material/fire at native 80px/unit with integer 2x display.
fire-identity-comparison.png compares actual V53/V54 source cameras. The four
current PR workstreams and older open PRs were checked (#218/#209/#205/#186,
#136/#128/#118); main was fetched. No runtime, player or external assets changed.

This source preview materially restores the fire identity, but texture/fire
are not owner-approved or finished. Remaining: refine organically varied flame
forms, local fire light on scales, native phone acceptance and complete art
library; then explicit runtime integration. Existing breath jet remains a
geometric placeholder. Fire meshes do not create damage or a gameplay aura.
No live-game validation or completed boss/spritesheet claimed. PR #186 is draft.
