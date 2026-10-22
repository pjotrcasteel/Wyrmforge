# Material Lab — visible organic surface wear (22 October 2026)

[Canonical art](../canon/art-and-animation.md) · [Canonical Hunts](../canon/hunts-and-world.md)

## iPhone feedback / measured failure
The owner demonstrated six-surface and all-grass On/Off pairs from Safari (10:54). After cropping the actual painted ground region from the all-grass screenshots, the mean absolute RGB channel difference is approximately **0.2/255** and only ~0.03% of pixels change by >25 on any channel. The previous Fine Detail succeeded in changing a hash but failed the actual visual requirement: a player cannot meaningfully see the improvement.

## Visual direction
Do not recolour, regenerate or replace the six approved material paintings. Avoid synthetic noise, confetti, uniform smudges and rectangular tile borders.

Research sources consulted for physical ground-treatment principles (not copied for assets):
- [Royal Horticultural Society — moss, algae and lichens on hard surfaces](https://www.rhs.org.uk/biodiversity/algae-lichens-liverworts-moss-hard-surfaces): moss and algae cluster around moist/shaded surfaces, particularly joints and edges.
- [Historic England — garden features and cobble paths](https://historicengland.org.uk/advice/technical-advice/parks-gardens-and-landscapes/garden-features/): path joints accumulate gritty soil and may host moss and grasses; weathering is nonuniform.
- [Journal of Applied Ecology — biological soil crust spatial patterns](https://besjournals.onlinelibrary.wiley.com/doi/10.1111/j.1365-2664.2006.01122.x): localized microhabitats form spatial clusters associated with resources like moisture.

Adapted principle: visually legible patches and wear *in context*, not random independent dots. The source pixels remain from the already-approved WyrmForge materials.

## Implementation
- Fine Detail **Off**: exactly the original image bake.
- Fine Detail **On**: retain the previous fine flecks and add a second scale of irregularly overlapping weathered material clusters.
- Two seeded groups per 112px-high world band, three connected marks per group, with core and satellites. Source is the approved *related* ground panel: worn earth/grass, mud/dirt, moss/dirt between stones, exposed/charred soil, drier marsh edges. A native-source satellite breaks up unnaturally even patches.
- Macro marks approximately 44–105px wide and 30–81px high, with feathered edges and contrast alpha 0.58–0.90. No geometry, props, roads, new paintings or gameplay edits. Bake once per toggle, not per frame.
- Guarantees at least one left-side accent cluster per band for the original portrait six-material sampler; all-grass preview also gets varied wear.

## Acceptance gate
- Existing JavaScript unit tests; new deterministic bounds, six-band coverage and source-provenance tests.
- 390px Playwright browser checks both default six-swatch board and plain grass: at least **2% of pixels** must show a per-pixel RGB-channel change >=16, and Off must return to the exact original checksum.
- Preserve mobile paint/undo performance and ensure no artificial circles, checkerboarding or out-of-bounds bleeding.
- CI/Pages results must be verified; owner visual acceptance at actual Safari size is still required.
