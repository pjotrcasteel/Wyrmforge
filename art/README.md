# WyrmForge art direction

## Approved world concept — 14 October 2026

![Protected city and abandoned outskirts](world/protected-city-outskirts-v1.png)

This approved concept establishes the atmosphere and environment direction. It is concept art, not a production tileset or a commitment to the gameplay camera.

- Grounded dark fantasy inspired by the atmosphere of original Diablo II, expressed in pixel art.
- Restrained composition, clear silhouettes, selective detail; avoid random clutter and ornate spectacle.
- Wet forests, abandoned villages, ruined monasteries, muted earth colours, rain and mist.
- Humanity survives in a few great protected cities. Their magical engines consume an increasingly scarce substance whose origin is concealed.
- Protective runes are carved into the city walls, not suspended in the sky. Some glow; others are damaged, dim, or extinguished.
- Walls are battered and repeatedly repaired: broken battlements, impact scars, cracks, mismatched masonry and timber reinforcement.
- Protection should feel necessary but precarious: it protects us, but for how long?
- Creature tracks should look pressed into wet terrain, with irregular collapsed edges and pooled water, rather than clean stamped icons.

## World and progression decisions

- Wyrms were once sacred protectors; something changed them. Their relationship to the engines remains deliberately unresolved.
- The player is a mage seeking enough strength to save or rule the world.
- Defeated enemies and wyrms grant temporary power within a run. Lost spells and combined forbidden knowledge support progression across runs.
- Power visibly changes the mage; dangerous abilities carry manageable costs, with occasional consequential sacrifices.
- Successful hunts can enable real recovery, while larger consequences remain uncertain.
- Optional rare creatures promise powerful loot and experience. Environmental evidence helps players judge danger before committing.
- Elemental influence changes the environment and strengthens closer to the wyrm.

## Provenance

Generated with OpenAI image generation and iteratively art-directed with Pjotr. This is the approved final revision with wall-mounted failing runes, battered defences, and the weathered footprint. Earlier exploratory revisions are not the approved reference.

## Approved forest encounter — 14 October 2026

![Forest monastery encounter](world/forest-monastery-encounter-v1.png)

Approved gameplay-view environment study: an open forest clearing, ruined monastery entrance, a mage and two scavengers. This is concept art rather than a production tileset.

### Character readability

- Characters must remain immediately distinguishable from the terrain at mobile viewing size.
- The mage uses a muted slate-blue cloak, pale collar and clear staff silhouette.
- Scavengers use lighter bone-gray faces and upper backs with dark undersides and separated limbs.
- Quiet ground textures near characters; maintain value and restrained colour separation.
- Preserve grounded dark fantasy atmosphere without relying on glowing outlines, circles or UI markers.
- Apply this readability principle to every environment, enemy and mage progression state.

Generated with OpenAI image generation and iteratively art-directed with Pjotr; approved after the character contrast revision.

## Artwork workflow

Before every new artwork, research relevant real-world or game references and inspect the approved GitHub artwork. Preserve the mage's established slate-blue cloak, pale collar and staff silhouette. Use reference images directly; do not guess character colours from memory.

### Mandatory structural review — 15 October 2026

Apply to every future image, including concept art and production sprites. Mood and surface detail are insufficient for acceptance.

- Inspect perspective, coherent building layout, wall and roof supports, stairs and access, and object scale.
- Trace machinery from input through joints, pivots, linkages, and output; each visible connection must be understandable.
- Distinguish an intentional architectural cutaway from actual damage. Do not disguise unresolved geometry with rubble or texture.
- Preserve established characters and inspect silhouettes at intended gameplay size.
- Remove decorative complexity when it obscures function or construction. Fantasy power sources can remain mysterious; ordinary physical connections should remain coherent.
- Inspect the generated result against these requirements before describing it as ready. Research and detailed prompts do not replace output review.

The first engine house study failed this structural review: ambiguous roof construction, conflated structural and mechanical beams, an unreadable bellows drive, and an unclear conduit connection. It remains an unapproved exploration.

## Approved monastery interior — 15 October 2026

![Flooded monastery cloister and manuscript study](world/monastery-interior-v1.png)

Approved after research and architectural revision. A recognisable above-ground monastery: a flooded garden courtyard, connected covered walks, surviving roof sections, and adjoining rooms for study and daily life. Forbidden knowledge sits in a manuscript study; past wyrm worship appears in a faded mural.

- Maintain a coherent, human-scale building plan and clear routes.
- Restrained purposeful furnishings; avoid random arches, isolated pillars, giant ritual reliefs and cave-like flooded halls.
- Keep the established mage design and readable character silhouettes.
- This is approved concept art, not a production tileset.

Architectural references researched before generation:
- [Lacock Abbey — cloister and adjoining rooms, National Trust](https://www.nationaltrust.org.uk/visit/wiltshire/lacock/things-to-see-and-do-in-the-house-at-lacock)
- [Lilleshall Abbey — monastic layout, English Heritage](https://www.english-heritage.org.uk/visit/places/lilleshall-abbey/History/description/)

Generated with OpenAI image generation and iteratively art-directed with Pjotr. Earlier white-robe, burgundy-robe and ritual-chamber studies are not approved references.

## Protective engine house — 15 October 2026

![Protective engine house](world/protective-engine-house-v2.png)

Retained revised concept, not a production asset. The city's defensive infrastructure depends on exhausting human effort and an increasingly scarce fuel whose origin remains concealed.

- Simple stone-and-timber room; ground-level fuel loading removes the earlier unnecessary stair and platform.
- Separate bellows stand and a visible conduit connection to the wall rune panel.
- Preserve the established mage's slate-blue cloak, pale collar, and staff.
- Inspect physical construction, perspective, machinery connections, and object function before accepting future art. Validate mechanical motion before animating the furnace.
- The earlier engine house study failed structural review and is superseded by this revision.

Research before generation:
- [Saugus furnace and forge — Penn State](https://www.engr.psu.edu/mtah/essays/saugus.htm): furnace, bellows, charging route, and mechanical connections.
- [Papplewick engine house — Historic England](https://historicengland.org.uk/images-books/photos/item/DP572025): a spatial reference for purpose-built machinery rooms, not a period template.

Generated using the built-in OpenAI image tool, with the previous study and approved forest encounter as direct references, followed by a targeted conduit correction. The revision prompt required a rectangular workshop, explicit roof cutaway, a simple masonry furnace, floor-level charging hatch, independent lever-operated bellows, and one continuous conduit terminating at the rune panel. Restrained detail and traceable construction take priority over decoration.


## Movement and spell presentation — 15 October 2026

- [Eight-direction mage motion sprites](production/mage-walk-blocking-v1/README.md): consistent right-hand staff, fixed export pivot, three visual injury states and identical locomotion timing. Motion blocking only; final painted sprite art remains pending.
- [Spell/rank studies](production/spell-feel-v1/README.md): spell-specific cast overlays, release/travel/impact identities and ranks I–III. Eight spell profiles and 24 evolution identity routes anticipate multiple spells per school. Current evolution routes are future art hooks, not completed effects.
- Injury must be visual only. Movement, damage, cooldown, action timing and responsiveness must not degrade. Casting takes visual priority over the guarded arm without modifying root/leg motion or delaying the cast event.
- Upgrades must feel stronger through gesture, silhouette, timing accents, material response, release and impact. Do not indicate a damaging area or extra projectile unless the simulation actually provides it.
- Keep combat readable at mobile scale. Use quiet tails and concentrated accents; do not escalate every upgrade into more persistent screen coverage. Sound production and final painted effects are still pending.
