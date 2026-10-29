# Original oak GPU derivative

Native source preserves original #307 geometry from generator revision
8c963f8351a758b0fb468fd1340088ff7b904abf, copied unchanged into
`tools/art/lighting-source/step3_wet_forest.py`.
Runtime geometry uses author's material ramp midpoints, not baked illumination.
Procedural bark detail is not yet exported. Original leaves are bent polygon
geometry, not alpha cards. Alpha-card foliage remains a separate acceptance test.
This candidate is unapproved and used only in the isolated GPU proof.
