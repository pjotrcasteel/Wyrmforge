# Game dragon reference study — 21 October 2026

Research evidence; [canonical art](../../../../docs/canon/art-and-animation.md)
and [creatures](../../../../docs/canon/creatures-and-encounters.md) remain the
design authority. Owner rejected V37 as a very large cricket. Contact and loop
checks do not constitute visual acceptance.

## Evidence and transfer

Inspected the original Ashfang card, official Teostra/Nergigante renders in the
browser, and ArenaNet's Tequatl hero illustration and screenshot thumbnails.
Read the official creature descriptions and Blizzard-linked Onyxia guide.
This is a static silhouette and encounter-structure study, not frame-by-frame
gameplay analysis. No measured animation timings are claimed. No external
meshes, textures or footage were downloaded or incorporated into Ashfang.

| Reference | Observations and application | Limits |
|---|---|---|
| [Teostra, Monster Hunter Now](https://monsterhunternow.com/monsters/teostra) | Render shows substantial neck/head and strong forelimbs beneath articulated wings. Official description distinguishes fire/powder states and escalation. Transfer: body must remain readable beneath wings; breath preparation and escalation need distinct states. | Do not copy mane, face, exact attacks or elemental-counter system. |
| [Nergigante, Monster Hunter Now](https://monsterhunternow.com/monsters/nergigante) | Render shows conspicuous horns, deep torso, substantial limbs and tail. Official notes describe arm slams, ground lunges, wing-spreading escalation and diving charge. Transfer: physical attacks involve the body and planted limbs; preparation poses communicate intent. | Do not copy spike regeneration, silhouette details or timings. |
| [Rathalos, Monster Hunter Now](https://monsterhunternow.com/en/monsters/rathalos) | Official account describes taking flight and attacking from above with flame breath. Transfer: ground and air should create different spatial threats, with a clear return to ground combat. | Flying wyvern is not Ashfang's four-leg-plus-wing anatomy template. No breakable-part grounding mechanic proposed. Text consulted, no frame analysis. |
| [Tequatl, Guild Wars 2](https://www.guildwars2.com/en-gb/the-game/releases/september-17-2013/) | Official hero illustration emphasizes deep jaw, thick neck and low threatening head; screenshot thumbnails show large membrane wings. Transfer: head/neck/chest masses establish threat before effects. | Undead styling and army-sized scale do not transfer to Tier I. Stills do not establish animation timing or detailed fight mechanics. |
| [Onyxia, World of Warcraft](https://news.blizzard.com/en-us/article/24165121/20th-anniversary-realms-molten-core-and-onyxia-s-lair-now-live) | Blizzard identifies a three-phase encounter and links this [strategy guide](https://www.wowhead.com/classic/guide/onyxia-onyxias-lair-strategy-wow-classic). Guide describes ground/air/ground and directional Deep Breath with a warning and safe areas. Transfer: flight changes the spatial problem and returns to a meaningful grounded phase. | Guide is secondary, linked by Blizzard. No full encounter viewing claimed. Raid roles, adds, exact thresholds and warning timings are not proposed for Wyrmforge. |

## Diagnosis against the source card

Ashfang's side and pixel views show a deep ribcage, a neck connected to broad
shoulders, a projecting horned jaw, muscular upper rear legs, and a thick tail
root tapering over a long curved tail. V37 retains a narrow reconstructed trunk
and thin angular leg connections. Closed wings make competing long shapes above
the body. Enlarging the model from about 15% to 23% viewport width enlarged
these defects rather than repairing the anatomy.

## Next source gate

1. Rebuild deficient torso/neck and limb attachment volumes: deep ribcage,
   broad shoulders, muscular haunches, compact hocks and substantial paws.
   Preserve four walking legs plus separate wings.
2. Establish distinct muzzle, lower jaw, brow and backward horns. Remove any
   detached-looking dark skull cap. Keep a long volumetric tail with thick root,
   lifted curvature and tapered tip.
3. Fold wing joints/fingers against the back and flanks without an upright shell
   silhouette. Retain large fully opened wings for flight.
4. Review untextured side/front/gameplay silhouettes BEFORE another full bake.
   The creature must read as a dragon at native phone size, wings folded,
   without glow, flame or magnification supplying its identity.
5. Compare against unchanged native player size near the upper end of the
   owner's Tier-I width range. Judge limb separation, head/body hierarchy and
   tail curvature. Expanded wings have a separate envelope. Screenshot composites
   stay private; Tier I must remain distinct from screen-wide Tier V.
6. After the anatomical gate, carry the source through stalking, rearing/breath,
   push-off with immediate flap, flight, offscreen passes and landing. Recheck
   all contacts/deformations after changing anatomy. Preserve prior candidates.

Encounter application is an interpretation within the existing authorized
direction: grounded stalking -> breath preparation/attack/recovery -> forceful
nose-up accelerating departure -> ground warning plus moving winged shadow/fire
pass -> return and landing recovery. These are not newly implemented simulation
states; research alone approves no damage, immunity, timings or balance changes.

## Continuity

Checked main a0384843 and open PRs, including concurrent #220/#218/#215/#209/#205.
No concurrent files changed. PR #186 stays draft. This research slice changes no
model or gameplay and makes no finished-art claim. Next work is the anatomical
silhouette gate, using local RTX 5090 production.
