# Arcane Nexus emitter color acceptance — 0.0.179

## Visual finding

PR #292 / v0.0.178 correctly tracked current school and learned Arcane Web points, and its three CI checks were green. Inspection of the PR browser screenshots nevertheless found that Fire mastery mainly brightened the **masonry** while the glass dome spellwork and portal remained mostly violet. Pixel/color acceptance therefore **was not achieved** by passing CSS-property assertions alone.

## Correction

- Preserve the exact approved night town painting and all vacancy overlays. Do not apply a CSS filter or darkened replacement artwork to the building.
- Add two tightly localized, feathered emitter masks over the **actual dome aperture** and **portal interior**, using `mix-blend-mode:color` to change their magical hue while preserving original details and luminance.
- Reduce and reposition the existing `screen` radiance to the same emitters instead of brightening plain stone walls. Its intensity still grows only from Web points learned in the currently followed school.
- Keep aura layers at town scenery depth, below NPC/cutout layers, with no pointer events; locked Nexus has no coloring and no radiance. Canonical Refuge remains night-only.
- Include explicit computed-style/mobile browser assertions for the color mask and both emitter regions, but **also compare actual screenshots**: the selected school's hue must be visible inside the portal/dome, and the building's ordinary walls should stay materially unchanged.

## Evidence and acceptance

Visual references: [v0.0.178 Nexus phone screenshots](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39864254855) contain `nexus-fire-unlearned-320.png`, `nexus-fire-invested-320.png` and 390px equivalents. The prior glow is visibly broader than the magic sources; automated color-variable tests alone were insufficient.

For this PR, compare those same screenshot pairs at 320×568 and 390×844, examine hue/color at both emitters, ensure orange Fire coloring is visible even before higher Web investment, and confirm brightness increases at advanced investment. Verify unchanged masonry/windows and town/NPC occlusion, and obtain a physical iPhone visual check before declaring the building art fully accepted.

This is a **visual QA correction** independent of future Cryomancer/Storm/Arcane Web gameplay. Fire remains the only specialization actively being finalized.
