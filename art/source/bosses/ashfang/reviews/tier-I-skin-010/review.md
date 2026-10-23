# Tier I Ashfang volcanic skin proposal — 23 October 2026

The current packed master is `../../archive/tier-I-skin-010-packed/ashfang-tier-I.blend` (SHA256 `155bf614ebd5f73bfa06ea77d67858fcc1ef417ff95afc4517d39a78aad5011a`). This is a completed skin proposal for review, not a claim of owner material approval or a finished animated game character.

## Visible change

Preserved the explicitly approved Zagmatorah anatomy, long swept horns, articulated wing forelimbs and tail-fan correction. Rebuilt the skin as a dielectric charcoal surface using original UV paint, normal, roughness and AO detail. Added fine scale relief through the shader, with selective larger ember fractures concentrated at the throat, neck, chest and shoulder. Retained the source horn grooves instead of covering horn tips in scales. Wing membranes use a scorched oxblood/russet palette with original folds, veins, normals and opacity.

No replacement limb, horn, armor-plate, flame, smoke, ember or particle geometry was added. The master contains exactly the source mesh and skeleton. Fire and smoke are reserved for runtime game VFX, as requested.

## Design references

- Repository Ashfang card: `user_handover_files/concepts/Fire/10-ashfang-the-cinder-wyrm.png`. Transferred the charcoal volcanic surface, selective orange heat and scorched membranes onto the owner's approved Tier I anatomy. The larger card silhouette is not a reason to redesign the accepted baseline.
- [Blizzard Deathwing reveal](https://news.blizzard.com/en-gb/article/23177451/tremble-before-the-might-of-deathwing): volcanic power and dark-to-hot material contrast. No copied character mesh, distinctive metal jaw or armor geometry.
- [USGS lava surface photograph](https://www.usgs.gov/media/images/close-view-lava-flows-within-halemaumau-crater): cool dark crust interrupted by selected hot fractures, rather than making the entire body luminous.
- [Weta Smaug case study](https://www.wetafx.co.nz/films/case-studies/smaug): preserve a coherent expressive head and creature silhouette; the professional model remains the anatomical foundation.

## Evidence and limits

`comparison.jpg` compares original skin and candidate under the same cameras and lights. Both comparison sides already have the approved tail correction. `presentation/` contains 1600×1000 hero, portrait, side and cropped head detail views, rendered in Cycles OptiX at 128 samples from the packed master. The floor, lights and cameras exist only during presentation rendering; they are absent from the saved character master. `neutral-full/` provides three uncoloured-light RGBA views rendered from the independently downloaded remote master.

`anatomy-and-dependencies.json` and `remote-reopen.json` verify exact baseline geometry, UVs, weights, bone bind matrices/hierarchy, transforms, object list and tail mask. All 20 image datablocks are packed; no external dependency is needed to open the current master. The packed source is approximately 267 MB; some original and adapted material image datablocks retain the same source texture content. All 18 original downloadable texture files remain separately preserved.

Remote Git LFS retrieval and SHA256 checks passed for 133 objects at checkpoint `f6ad4a4b46dcc45753441fa62181569c893a055f`. The downloaded packed master reopens without missing images and passes the same anatomy comparison. `remote-lfs-verification.json` at the source root records every verified path/hash.

No real creature motion, tier expansion, atlas export, game integration or physical-phone acceptance was performed or implied by these stills. Original imported actions are static poses. The new skin is unapproved pending the owner's visual review; anatomy approval remains intact. Runtime fire/smoke is a future game-VFX task.
