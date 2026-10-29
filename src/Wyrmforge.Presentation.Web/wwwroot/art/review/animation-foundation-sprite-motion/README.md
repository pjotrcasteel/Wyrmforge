# Bounded full-body sprite motion library — review only

Nine sixteen-frame walk clips, eight genuine source facings each: 1,152 baked
whole-body frames. Editable source is preserved under
`art/source/animation-foundation/baked-motion-library-20261029/`.

The common measured alpha crop plus one-pixel guard is `[15,23,81,86]` inside
the original 96px cell. Pixels are copied without rescaling; source anchor and
world size are retained. Encoded PNGs total 3,085,372 bytes; decoded RGBA is
18.2725 MiB. Three such maps would consume 54.8174 MiB **before** adding actions.
This pack contains source-lit review color only, not production material passes.

Constant-heading source markers pass 2,880 cases (maximum 0.5201 native pixels).
Curved paths fail 19/40 cases (maximum 3.5741 native pixels). This pack is not
accepted animation, not a grounded-turn solution and not AN2/AN4/AN5 completion.
No claw art is supplied; the existing approved attack fallback remains required.

Reproduce `render_saved_clips.py` for all declared clips and directions, then
`export_atlases.py --tight-crop`. Use the same shared controller/asset owner.
The capture tool's explicit `AN_ASSET_ROOT` override can inspect this pack via
`animationFoundation=sprite-walk` without replacing the first walk proof.
