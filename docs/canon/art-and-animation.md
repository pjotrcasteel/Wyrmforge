# Art identity and character animation

> **Canonical WyrmForge specification · updated 20 October 2026.** Owner-approved art and one repeatable animated-character production pipeline.
> [Canonical index](README.md) · Only explicitly marked **LOCKED/approved** requirements are commitments. Proposed values, old milestones and drafts are not evidence of shipped code. Verify current `main`, PRs and tests.

## Present-day approved identity (20 October 2026)

- Gothic, grounded, readable dark fantasy. Prefer coherent real building geometry and material, limited meaningful magical light, and believable people/creatures over ornamental AI-generated clutter. Real game visual acceptance at mobile scale is required.
- Owner-approved eight building states are stored in `user_handover_files/concepts/buildings/`: four paired Active/Vacant paintings. Latest runtime town uses a single 1672×941 night composition and no CSS blackout or placeholder characters. [Town and UX rules](town-and-ux.md).
- Approved six elemental pixel emblems are Fire orange-red, Frost cyan, Storm yellow, Arcane violet, Necromancy green skull and Summoner bear. The source design is approved; do not silently re-style or re-generate it. [Provenance record](../art/divine-lineage-pixel-icons-2026-10-20.md).
- **Source/approval vs playback:** art card → persistent character model/rig → true authored motions → eight-direction export and metadata → Sprite Lab actual motion review → actual Hunt/phone validation. A still sheet or jittering cutout is not accepted proof of walking. Hollow is a validated bounded reference, not proof all characters are done.
- Shared locomotion and combat-action layers may blend only from real source motion with correct root/foot contact. Death overrides other actions; legal simulation remains in C#. [Current implementation record](../art/shared-sprite-animation-layers-2026-10-20.md).
- Research at least two independent attributable visual references before creating materially new art. Sources inform design principles, never authorize copied copyrighted material.
- **Ashfang Tier I baseline (owner-approved 23 October 2026):** preserve Zagmatorah's professional anatomy, horns, wing forelimbs, proportions, UVs and rig, with the requested terminal tail-fan removal. Approved baseline: `art/source/bosses/ashfang/archive/source-fidelity-001/ashfang-master-working.blend` (SHA256 `81e0bb96e05b15b43478ca6e033b8a67097ac66546409dc42509b841616ce98c`). Skin and restrained body-fire effects remain to be developed and reviewed. The earlier added forelegs, conical horns, tiled armor and neon-line experiments are rejected. This approves the Tier I anatomical foundation, not finished materials, animation or higher tiers. The Ashfang card remains the identity reference for the more powerful lineage.

## Historical approved world-art gallery (not a current town layout specification)

### Approved world concept — 14 October 2026

![Protected city and abandoned outskirts](../../art/world/protected-city-outskirts-v1.png)

This approved concept establishes the atmosphere and environment direction. It is concept art, not a production tileset or a commitment to the gameplay camera.

- Grounded dark fantasy inspired by the atmosphere of original Diablo II, expressed in pixel art.
- Restrained composition, clear silhouettes, selective detail; avoid random clutter and ornate spectacle.
- Wet forests, abandoned villages, ruined monasteries, muted earth colours, rain and mist.
- Humanity survives in a few great protected cities. Their magical engines consume an increasingly scarce substance whose origin is concealed.
- Protective runes are carved into the city walls, not suspended in the sky. Some glow; others are damaged, dim, or extinguished.
- Walls are battered and repeatedly repaired: broken battlements, impact scars, cracks, mismatched masonry and timber reinforcement.
- Protection should feel necessary but precarious: it protects us, but for how long?
- Creature tracks should look pressed into wet terrain, with irregular collapsed edges and pooled water, rather than clean stamped icons.

### World and progression decisions

- Wyrms were once sacred protectors; something changed them. Their relationship to the engines remains deliberately unresolved.
- The player is a mage seeking enough strength to save or rule the world.
- Defeated enemies and wyrms grant temporary power within a run. Lost spells and combined forbidden knowledge support progression across runs.
- Power visibly changes the mage; dangerous abilities carry manageable costs, with occasional consequential sacrifices.
- Successful hunts can enable real recovery, while larger consequences remain uncertain.
- Optional rare creatures promise powerful loot and experience. Environmental evidence helps players judge danger before committing.
- Elemental influence changes the environment and strengthens closer to the wyrm.

### Provenance

Generated with OpenAI image generation and iteratively art-directed with Pjotr. This is the approved final revision with wall-mounted failing runes, battered defences, and the weathered footprint. Earlier exploratory revisions are not the approved reference.

### Approved forest encounter — 14 October 2026

![Forest monastery encounter](../../art/world/forest-monastery-encounter-v1.png)

Approved gameplay-view environment study: an open forest clearing, ruined monastery entrance, a mage and two scavengers. This is concept art rather than a production tileset.

#### Character readability

- Characters must remain immediately distinguishable from the terrain at mobile viewing size.
- The mage uses a muted slate-blue cloak, pale collar and clear staff silhouette.
- Scavengers use lighter bone-gray faces and upper backs with dark undersides and separated limbs.
- Quiet ground textures near characters; maintain value and restrained colour separation.
- Preserve grounded dark fantasy atmosphere without relying on glowing outlines, circles or UI markers.
- Apply this readability principle to every environment, enemy and mage progression state.

Generated with OpenAI image generation and iteratively art-directed with Pjotr; approved after the character contrast revision.

### Artwork workflow

For new animated creatures derived from art cards, follow the detailed
[card-to-spritesheet production algorithm](../art/card-to-spritesheet-production.md).
It uses a persistent editable character and reviewed motion, with rendered sheets
as exports. The existing code-authored pipeline below describes legacy/current
assets; it is not the production method for the new detailed monster animations.

Before every new artwork, research relevant real-world or game references and inspect the approved GitHub artwork. Preserve the mage's established slate-blue cloak, pale collar and staff silhouette. Use reference images directly; do not guess character colours from memory.

#### Mandatory structural review — 15 October 2026

Apply to every future image, including concept art and production sprites. Mood and surface detail are insufficient for acceptance.

- Inspect perspective, coherent building layout, wall and roof supports, stairs and access, and object scale.
- Trace machinery from input through joints, pivots, linkages, and output; each visible connection must be understandable.
- Distinguish an intentional architectural cutaway from actual damage. Do not disguise unresolved geometry with rubble or texture.
- Preserve established characters and inspect silhouettes at intended gameplay size.
- Remove decorative complexity when it obscures function or construction. Fantasy power sources can remain mysterious; ordinary physical connections should remain coherent.
- Inspect the generated result against these requirements before describing it as ready. Research and detailed prompts do not replace output review.

The first engine house study failed this structural review: ambiguous roof construction, conflated structural and mechanical beams, an unreadable bellows drive, and an unclear conduit connection. It remains an unapproved exploration.

### Approved monastery interior — 15 October 2026

![Flooded monastery cloister and manuscript study](../../art/world/monastery-interior-v1.png)

Approved after research and architectural revision. A recognisable above-ground monastery: a flooded garden courtyard, connected covered walks, surviving roof sections, and adjoining rooms for study and daily life. Forbidden knowledge sits in a manuscript study; past wyrm worship appears in a faded mural.

- Maintain a coherent, human-scale building plan and clear routes.
- Restrained purposeful furnishings; avoid random arches, isolated pillars, giant ritual reliefs and cave-like flooded halls.
- Keep the established mage design and readable character silhouettes.
- This is approved concept art, not a production tileset.

Architectural references researched before generation:
- [Lacock Abbey — cloister and adjoining rooms, National Trust](https://www.nationaltrust.org.uk/visit/wiltshire/lacock/things-to-see-and-do-in-the-house-at-lacock)
- [Lilleshall Abbey — monastic layout, English Heritage](https://www.english-heritage.org.uk/visit/places/lilleshall-abbey/History/description/)

Generated with OpenAI image generation and iteratively art-directed with Pjotr. Earlier white-robe, burgundy-robe and ritual-chamber studies are not approved references.

### Protective engine house — 15 October 2026

![Protective engine house](../../art/world/protective-engine-house-v2.png)

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
### October 15 continuity notes (historical implementation direction; current town rules win)

The [October 15 handover](../handover/2026-10-15-project-art-and-backlog.md) is historical implementation evidence. The concepts above retain character, mood, composition and construction continuity; **present-day Refuge composition and building states are governed only by [Town & UX](town-and-ux.md)**. Artwork on the playable site still requires visual approval on a real phone.

Recent user corrections are requirements, not optional sketches:
- The mage must always wear the same slate-blue cloak / pale collar and hold a **thin, continuous staff**. Earlier raised hammer-like ends, white outfits and burgundy outfits are rejected.
- Delete tall random spires/monoliths from the monastery. They read like **camera-facing billboards** and break 2.5D when walking away. A monastery means a deliberate connected building plan, purpose-built cloister, adjacent rooms, damaged supports and wet walkways, not a cave or a pile of ornamented arches.
- Keep wall top/front/side planes fixed in world coordinates, with correct player/enemy foot-depth sorting when they pass behind the wall. Only C# collision footprints should look like impassable raised scenery.
- Gates must visibly open based on actual simulation; do not use prison-wide railing/grille designs or make walkable floors look like solid obstacles.
- The first playable art corrective pass [PR #114](https://github.com/pjotrcasteel/Wyrmforge/pull/114) merged. It does **not** signify final aesthetic approval. Review the real deployed asset and iPhone Safari at 390px scale.

Preserve the artistic principles and gameplay decisions in the [Battlemage source study](../design/battlemage-visual-reference.md), [visual-first UI RFC](../design/visual-first-magic-ui-rfc.md), and [full continuation handover](../handover/2026-10-15-project-art-and-backlog.md).

### Runtime pixel-art pipeline (code-authored)

The existing code-authored sprites are deterministic code outputs. This section
documents that pipeline, not all future character art or the new rigged-source procedure.

- **Source.** Modules live in `tools/art/sprites/*.mjs`: actors, wyrms, tiles, environment and ui. Shared helpers (palette, canvas and PNG encoder) are in `tools/art/lib/`.
- **Build.** `node tools/art/build-art.mjs` writes the atlases, `manifest.json` and `icons.css` to `src/Wyrmforge.Presentation.Web/wwwroot/art/`, and preview sheets to `docs/art/previews/`.
- **Verify.** `node tools/art/build-art.mjs --check` fails if committed output differs from a fresh build. Tests are in `tests/javascript/art-pipeline.test.mjs`.
- **Runtime.** Atlases are loaded by `wwwroot/js/art-atlas.js`. UI icons use `.px-icon .px-{id}` or the `<GameIcon Glyph="…">` component. Every catalog glyph must be mapped in `Shared/GameIconMap.cs`.
- **Capture.** Run `node tools/art/capture-screens.mjs <outDir>` against a local published build. It needs `PLAYWRIGHT_CORE` and `CHROME_PATH`.
- **Audit and gaps.** See `docs/art/asset-and-screen-audit.md`.

---

## Animated-character production algorithm — required procedure

Version 1.0 — 20 October 2026.

**Status: production procedure, not an implemented general-purpose generator or automatic approval of every character.**
The owner requested a detailed, repeatable method after rejecting generated-frame
and rigid-cutout Hollow animations. This document describes how to produce and
evaluate future assets. It does not certify the existing animations.

The default authoring route is **one textured, deformable 3D character with an
animation rig, rendered into 2D sprites**. The editable character and motion are
the source; a spritesheet is a derived export. A properly prepared Spine project
is an alternative when preserving painted 2D artwork is more important than
inexpensive multi-direction rendering. Do not switch routes silently.

### 1. Scope, authority and delivery rules

- Product behavior: [canonical topic index](README.md), [Magic & combat](magic-and-combat.md) and [Town & UX](town-and-ux.md), as applicable.
- Visual identity and approved references: [art direction](../../art/README.md)
  and the creature's original card under `user_handover_files/concepts/`.
- This procedure governs **new card-derived animated character production**.
  Existing code-authored atlases remain existing assets, not an instruction to
  recreate detailed monsters from drawing primitives.
- [Sprite Lab](../art/sprite-lab-github-pages.md) inspects exports; it cannot create
  missing poses, repair anatomy, or grant artistic approval.
- Work one creature at a time. First prove one walk in one view. Only then extend
  that creature to its required states and directions.
- No runtime replacement before visual acceptance and an explicit integration
  change. Preserve gameplay behavior, saves, aiming and collision rules.
- Automated format checks, CI and foot-contact equations do not establish good
  animation. Record technical results and visual decisions separately.

**Stop conditions:** missing source rights, an unreadable reference, an unsuitable
rig, unavailable authoring/rendering tools, or failed visual review block the
affected stage. Keep useful work and report the specific blocker. Do not substitute
a generated collage, stretched image, mirrored missing view, or rigid paper puppet
and describe the stage as complete.

### 2. Required inputs and the production record

Create a record before authoring. Values below are fields to resolve, not claims
that all are already implemented in WyrmForge:

| Input | Required information |
| --- | --- |
| Identity | Stable creature ID, family, original card path and SHA-256 |
| Reference | Approved full-body image, useful turnaround crops, written invariants |
| Gameplay reference | Current mage artwork, intended ground plane, screen scale |
| Behavior | Actual movement, attacks, damage reactions, death and special states |
| Geometry | Biped/quadruped/etc.; proportions, appendages, costume and asymmetry |
| Source rights | Model, textures and motion provenance; permitted use recorded |
| Authoring | Selected route, source files, tool versions, rig family and units |
| Export | Camera, facing convention, scale, sample rate, frame dimensions, padding |
| Review | Per-stage outcome, evidence paths, reviewer, date and source revision |

Suggested project layout; directories are created only when their contents exist:

```text
art/source/enemies/<id>/
  references/                 # Original card or reference to its canonical path; crops
  production.json             # Identity, versions, dependencies and stage status
  design-brief.md             # Visual invariants, unresolved details and motion brief
  model/character.blend        # Mesh, materials, armature, actions and render setup
  motion/                     # Original imported motion and attribution
  review/                     # Clips, stills, notes and rejection records
  export-profile.json         # Camera, scale, directions, sampling and packing
  exports/<revision>/         # PNGs, manifest, preview and technical report
```

Large source binaries may need Git LFS or a durable asset store. Before adopting
either, verify repository/CI access and quotas. The record must contain a durable
location and checksum; a temporary chat download is not a source archive. Never
store tokens or credentials in the production record.

### 3. Overall algorithm and stage gates

Each stage receives a versioned input, produces an inspectable output and either
passes, fails or is blocked. A change to the model invalidates downstream motion
deformation review and renders; a change to camera/scale invalidates renders and
packing. Preserve earlier decisions as history, never silently carry approval
onto changed outputs.

Routine gates are the producing agent/artist's own documented reviews, not a
request for owner permission after every step. Continue within the authorized
brief. Ask only when a consequential unresolved design choice, required resource
or new cost needs the owner, and present an actual candidate for artistic
acceptance. Never claim owner acceptance from the agent's self-review.

```text
ProduceCreature(card, gameplayContract, exportProfile):
    record = ResumeOrCreateRecord(card.checksum, creatureId)
    brief = AnalyzeCardAndGameplay(card, gameplayContract)
    RequireReview(brief, "identity and unresolved details")

    character = ObtainOrBuildEditableCharacter(brief)
    ValidateSourceRightsAndDependencies(character)
    RequireReview(RenderReferencePose(character), "identity at game size")

    rig = BindAndValidateDeformation(character, brief.rigFamily)
    RequireReview(RenderPoseTests(rig), "joint deformation and silhouette")

    walk = AuthorWalkFromSuitableMotion(rig, brief)
    RequireReview(RenderSingleViewWalkAndStrideTest(walk), "convincing gait")
    CheckpointRemote(character, rig, walk, record)

    clips = AuthorRequiredStates(rig, gameplayContract)
    transitions = DefineInterruptionsAndTransitionPolicy(clips, gameplayContract)
    RequireReview(RenderSingleViewLifecycle(clips, transitions), "whole lifecycle")

    renders = RenderAllRequiredViews(clips, exportProfile)
    RequireReview(renders, "all views at gameplay size")
    atlas = PackWithoutChangingPoses(renders, exportProfile)
    technical = ValidateAtlasAndMetadata(atlas)
    Require(technical.pass)
    RequireReview(PlayInSpriteLab(atlas), "exported motion and transitions")

    delivery = ArchiveSourcesSettingsEvidenceAndExports(record, atlas)
    return delivery.withStatus("visual candidate or accepted; runtime not yet integrated")
```

This is descriptive pseudocode. Names such as `AuthorWalkFromSuitableMotion` are
work stages, **not existing callable tools**. Automation must not replace a failed
review with an automatic pass or infer owner acceptance from silence.

### 4. Stage A — extract a character specification from the card

1. Open the actual card at full resolution. Identify the hero image, turnaround,
   details and any illustrative animation strip. Do not treat a decorative card
   layout as a uniform sprite grid.
2. Save reference crops without modifying the canonical card. Exclude captions,
   panel borders and unrelated scenery. Record crop rectangles and source hash.
3. Write invariants: head shape, torso proportions, limb lengths, hand/foot form,
   posture, costume, palette, surface finish, signature damage and asymmetry.
4. Separate observed features from inference. A single front view does not specify
   the back, hidden shoulder, cloth thickness or joint structure. Resolve visible
   ambiguities through a turnaround or written design decision before production.
5. Describe how it moves from its role and anatomy. A slow undead shamble, canine
   trot and insect scuttle are different motion briefs, not the same sine wave
   with altered speed. Research at least two relevant independent references,
   including animal locomotion or authored animation analysis where appropriate.
6. Inspect the current mage and environment at real game scale. Record the target
   creature height on screen, value contrast, camera elevation and material detail.
   Do not assume card resolution equals runtime sprite resolution.
7. Produce a contact sheet of the reference crops and a short design brief. Review
   silhouette and proportions before requesting or creating a model.

For **The Hollow**, preserve the gaunt village undead, exposed ribs, elongated
fingers, tattered muted brown/bone materials and hunched posture. Do not add horns,
weapons, glowing eyes, bulky armor or a different monster family. The card's
presentation artwork is evidence of identity, not an accepted walking cycle.

**Gate A:** identity and motion brief are explicit; unknowns are visible. Stop if
the only available image cannot establish a usable character specification.

### 5. Stage B — create the persistent character

#### Default route: textured 3D mesh

1. Select an original commissioned model, a suitably licensed existing model, or
   an AI-assisted initial mesh. Record origin and dependencies. Image-to-3D is an
   initial modeling aid; it does not establish correct hidden geometry or rigging.
2. Match the approved silhouette in front, side, back and three-quarter views.
   Adjust skull, rib cage, pelvis, limb ratios and posture before surface detail.
3. Inspect topology: remove accidental fused legs/fingers, floating fragments,
   missing undersides and doubled surfaces. Provide enough geometry around moving
   joints for deformation. Inspect inside the mouth and beneath hanging cloth.
4. Separate components where motion requires it: jaw, eyeballs if present, fingers,
   garment panels, equipment and meaningful appendages. Decide whether cloth uses
   bones, corrective shapes or baked simulation. Do not leave it glued across joints.
5. Establish units, forward axis, ground plane and rest pose. Apply required object
   transforms consistently before binding. Keep a non-deforming root at ground level
   and a separate pelvis/body control. Record the model-to-game scale.
6. Prepare UVs and materials. Bake or paint textures so bones, cloth, skin and metal
   match the card's muted palette. Avoid photographic detail that turns into noisy
   pixels after downsampling. Keep textures and dependencies with the source.
7. Set up a provisional game camera and lighting, then render a static pose on both
   a neutral background and a representative game background beside the mage.
8. Correct identity, color and readability now. Animation must not be used to hide
   a poor model or a style mismatch.

**Gate B:** the character reads as the same monster and fits the game at actual
size. If a suitable model cannot be obtained or authored, report this as the
remaining art task; do not pretend an export script solves it.

#### Alternative route: authored 2D mesh rig

A Spine-style source needs separately painted parts with hidden overlap, sensible
pivots, weighted deforming meshes and corrective/replacement drawings for large
pose changes. Paint missing surfaces revealed by motion. Prepare appropriate
draw order, foreshortening and additional direction artwork. A single chopped-up
PNG has insufficient information for a full turnaround or a convincing collapse.
Validate the same stages below using that source. Live skeletal blending requires
a runtime integration and suitable runtime licensing; exporting PNGs alone does
not retain the skeleton in the game.

### 6. Stage C — rig and deformation validation

1. Choose a compatible rig family: humanoid, canine/quadruped, arachnid, winged,
   serpentine or a creature-specific design. Reuse within compatible anatomy;
   do not retarget a humanoid gait onto an undead dog.
2. Build root, pelvis, spine, neck, head and limb chains. Add controls for jaw,
   fingers, tail, wings and cloth only when needed. Define bend directions and
   joint limits. Use IK for planted contacts and FK where arcs need direct control.
3. Bind the mesh and inspect weights. Check knees/elbows, shoulders/hips, wrists,
   ankles and garment attachments. Repair collapsing volume, disconnected seams
   and texture stretching. Add corrective shapes where basic skinning is inadequate.
4. Test a contact pose, passing pose, deep bend, reaching swipe, backward recoil
   and collapsed death pose. Render these at game scale and enlarged. Inspect
   self-intersections and hidden-side geometry in every intended view.
5. Test root motion separately from pelvis bob. The renderer's ground anchor must
   remain defined even when both feet move or the creature falls.
6. Save the rest pose, bone naming/mapping and rig version. Keep the imported motion
   unchanged as provenance; apply adaptations in separate actions or layers.

**Gate C:** test poses preserve coherent anatomy and materials. A mathematically
constant bone length is necessary for some checks, but does not prove good posing,
skin deformation or weight transfer.

### 7. Stage D — author and prove walking before expansion

1. Choose a gait reference that suits body type and character. Import/retarget
   suitable authored motion or key the motion on the validated rig. Correct bone
   mapping, scale, rest-pose differences and foot orientation after retargeting.
2. Define one complete cycle from a particular leg's contact to its next equivalent
   contact. Mark contact, loading/down, passing and rise phases for both sides.
   Do not mistake half a cycle for a full cycle.
3. Establish timing and support. For the Hollow, begin with a restrained slow
   shamble and a readable supporting leg. Tune any asymmetry deliberately; it must
   repeat consistently rather than appear as random injury or jitter.
4. Animate pelvis translation/rotation, spine response and shoulder counter-motion.
   Place the center of mass plausibly over the supporting base. Give hands and
   clothing controlled follow-through; a moving leg beneath a frozen torso fails.
5. Decide on root-motion or in-place source. Keep root-motion distance in metadata
   even when removing planar translation for an in-place render. Gameplay remains
   the authority for the actor's world position.
6. Measure travel per cycle and cycle duration. Nominal speed is
   `distancePerCycle / cycleDuration`. If the simulation moves faster/slower, drive
   walk phase from distance traveled within the accepted gait-speed range. Do not
   run the same feet at an unrelated fixed FPS while changing world speed.
7. Validate each stance foot against a moving ground grid: its world position
   should remain approximately stationary while supporting weight. Use joint/foot
   markers from the rig, not a silhouette centroid as a proxy for contact.
8. Check the loop boundary in pose **and velocity**: matching first/last silhouettes
   is insufficient if limbs stop or reverse abruptly at the seam.
9. Render one three-quarter view. Watch at game size, enlarged, in slow motion,
   and moving across the grid. Compare with the card and the mage. Review several
   consecutive cycles, not one attractive frozen frame.
10. Correct the source animation and re-render. Do not move, resize or warp each
    finished frame independently to disguise bad motion.

**Gate D:** one-view walk is convincing, foot sliding is controlled, torso/limb
motion agrees, and the loop has no visible pop. Save the clip and review result
remotely before extending directions or authoring other monsters.

### 8. Stage E — build the rest of the lifecycle

Use the same mesh, materials, rig and camera. Each clip has its own duration,
sampling and loop policy. Starting ranges below are production suggestions, not
fixed engine requirements; preserve gameplay timings and revise after review.

| State | Motion construction | End/loop behavior |
| --- | --- | --- |
| Idle | Balanced resting pose, restrained breathing and secondary motion | Seamless loop; avoid all enemies breathing in sync |
| Walk | Accepted full gait cycle with distance/contact metadata | Seamless, distance-driven phase when moving |
| Attack | Readable anticipation, committed strike, follow-through, recovery | One shot; impact agrees with authoritative hit timing |
| Hurt | Direction-appropriate recoil with a believable recovery | One shot or additive skeletal reaction; avoid restart spam |
| Death | Loss of support, fall, impact, settle | One shot; hold terminal corpse pose, never loop or return to idle |
| Special | Cast, leap, burrow, summon, etc. when actual behavior needs it | Explicit phase/events and interruption rules |

Detailed action procedure:

1. Read the current simulation's action timing and event semantics. Record the
   states/events that already exist and any missing contract. Do not invent a new
   combat state simply because a clip is convenient to render.
2. Block the key poses first. An attack needs anticipation/contact/recovery; a death
   needs support loss/fall/impact/settle. Inspect pose silhouettes before smoothing.
3. Add breakdown poses and timing, then secondary motion. Keep the contact moment
   readable at normal size. More frames do not repair an unreadable action.
4. Place visual event markers on the authored timeline. Map them to simulation
   normalized action time in the adapter; the render loop must not independently
   apply damage or spawn an authoritative projectile.
5. For hurt, distinguish a brief impact reaction from a gameplay stun. Repeated hits
   must not reset the creature to frame zero forever unless the simulation says so.
6. For death, stop locomotion, support a visible collapse and keep the final pose
   stable. Corpse persistence/fade/removal follows gameplay policy, not animation
   looping. Inspect the full falling silhouette for clipping.
7. Render a single-view lifecycle: idle → walk → attack → recover → walk → hurt →
   recover → death → held corpse. Also inspect attack/hurt interrupted by death.

**Gate E:** clips communicate different actions, event timing is truthful, and
the creature retains identity through extreme poses. Walking acceptance alone
does not confer attack/death acceptance.

### 9. Stage F — define transitions and blending explicitly

#### Spritesheet playback

PNG frames contain colors, not joints. An alpha crossfade between different poses
creates two partially visible bodies; it is not skeletal pose interpolation.
Use deliberate transitions instead:

1. Define legal state changes, priorities and interrupt windows from gameplay.
   Death takes presentation precedence; an attack's commitment/cancel rules come
   from simulation. Do not smooth an animation in a way that delays real damage.
2. Idle ↔ walk: choose compatible entry/exit poses, retain useful walk phase and
   optionally render a short start/stop clip if snapping is visible.
3. Walk → attack: use a compatible starting pose or a small, bounded set of
   phase-specific transition clips. Record eligible walk phases and their mapping.
   If a transition would violate the hit deadline, prioritize event timing and
   revise the source/transition design rather than delaying simulation.
4. Attack → locomotion: blend in the authoring source or use a rendered recovery
   transition. Resume a compatible support phase rather than always restarting
   at the same contact frame.
5. Hurt/death: define which clips may interrupt which others and how the current
   displayed pose enters the reaction. Do not bake every possible pair blindly;
   estimate transition count and memory before adding variants.
6. Direction changes: derive facing from the game's aim/movement rules. Preserve
   normalized walk phase when changing rows. Optional hysteresis prevents rapid
   row flicker near boundaries; attacks may lock facing if gameplay requires it.
7. Verify all supported transitions in the actual player, including rapid changes,
   repeated hits, freeze/pause, zero movement and a large frame-time step.

#### True continuous mixing and layering

If the requirement is arbitrary pose blending, a walk with an upper-body attack,
or continuous directional interpolation, keep a live skeleton in the renderer
(3D or an appropriate 2D skeletal runtime). Blend compatible transforms and apply
bone masks/additive reactions; keep contact constraints and gameplay event rules.
Blender can preview/bake blends, but baked PNGs cannot retain arbitrary runtime
mixing. This is a renderer/product choice requiring a separate integration slice,
not a capability unlocked by adding a `blend` field to atlas JSON.

**Gate F:** transition behavior is chosen, bounded and demonstrated. Mark a
spritesheet build as discrete playback, not as a live skeletal animation system.

### 10. Stage G — lock the render/export profile

1. Capture the actual game-view reference. Set camera projection and elevation to
   match; an orthographic camera is the starting proposal, not an assertion about
   the current renderer's exact projection. Save the final camera transform.
2. Define world axes and facing angles. For a source using +Y forward/+Z up, use
   a documented mapping to screen directions; verify with a visible forward marker.
   Atlas rows are ordered **N, NE, E, SE, S, SW, W, NW**, where screen north is up.
3. Render eight real orientations of the same 3D model; preserve asymmetry and
   consistent world lighting. Do not flip a lit weapon or costume and call it a
   separately authored direction. A single-view milestone lists only that view.
4. Keep camera, scale, color management, material setup and light rig fixed across
   clips. Rotate actor/root for facing while keeping world lights coherent; render
   background/world shadows separately if needed.
5. Set transparent film/background output to lossless RGBA PNG. No labels, borders,
   backdrop, baked ground plane or magenta residue belongs in production frames.
6. Render at a documented oversampling factor if needed, then use one reproducible
   downsampling/filter/palette policy suited to the approved painterly/pixel look.
   Inspect the result; neither nearest-neighbor nor smoothing is universally right.
7. Select export timing per clip. For a loop of duration T with N equal samples,
   render `t[i] = i*T/N`, i=0..N-1: **exclude the duplicated endpoint**. For one-shot
   clips include the required terminal pose and record actual frame start times and
   durations; hold the corpse separately instead of duplicating it arbitrarily.
8. Choose N to preserve motion and event readability. Eight frames is an initial
   walk budget to evaluate, not a universal count. If nonuniform samples are used,
   preserve their durations; do not play pose extremes at equal time by accident.
9. Render all required clips and views before deriving bounds. Use a fixed ground
   root pivot for placement; pelvis/head/alpha centroids may move naturally.
10. Compute a shared canvas containing the union of poses for that creature plus
    padding. If a large attack/death requires too much empty space, use explicit
    per-frame trim offsets with a fixed logical canvas; never normalize each pose
    to the same visible height. Record the tradeoff and keep the anchor invariant.

**Gate G:** motion remains coherent after sampling/downscaling, every view is
correct, extreme actions fit, and pose placement is stable against the ground.

### 11. Stage H — pack the images and write metadata

1. Prefer a simple separate sheet per clip for initial inspection: columns are
   samples and rows are actual authored directions. Use fixed logical frame size.
   Multi-state packing is acceptable only when every frame rect is explicit.
2. For a grid with cell width W, height H, frame i and direction row d, the rect is
   `(i*W, d*H, W, H)`. Any margins/gutters must be included explicitly in this formula
   or the manifest. Do not infer rectangles from painted separators.
3. Preserve RGBA and document straight/premultiplied-alpha expectations. Validate
   edges against dark and light backgrounds; correct fringes in rendering/export,
   not by eroding anatomy indiscriminately.
4. If linear filtering/mipmaps are used, allow texture gutters/extrusion appropriate
   to the renderer and test bleed. For point-sampled art, confirm integer alignment
   and still test adjacent frames. Packing is not permission to alter poses.
5. Write versioned metadata with source revision, image hashes, facing definitions,
   frame rects, logical size, pivot, timing, looping, terminal policy and events.
6. Keep nominal gait distance/duration in source units plus unit conversion. Keep
   attack hitboxes in canonical simulation; art metadata can identify a visual
   hand/weapon point but must not silently replace gameplay collision.

Example **proposed** metadata fragment for one reviewed walk direction. This is
illustrative and not a drop-in replacement for the existing Sprite Lab schema:

```json
{
  "schemaVersion": "wyrmforge-character-export/1",
  "creatureId": "hollow",
  "revision": "candidate-001",
  "sourceRevision": "<source commit SHA>",
  "playbackMode": "discrete-sprites",
  "coordinateSystem": "screen-x-right-y-down",
  "logicalSize": { "width": 192, "height": 192 },
  "pivot": { "x": 96, "y": 176 },
  "authoredDirections": ["SE"],
  "clips": {
    "walk": {
      "image": "hollow-walk.png",
      "loop": true,
      "durationSeconds": 1.0,
      "nominalDistanceGameUnits": 40,
      "directions": {
        "SE": {
          "frames": [
            { "rect": [0, 0, 192, 192], "startSeconds": 0.0, "durationSeconds": 0.5 },
            { "rect": [192, 0, 192, 192], "startSeconds": 0.5, "durationSeconds": 0.5 }
          ]
        }
      },
      "events": []
    }
  },
  "review": {
    "technical": "not-run",
    "visual": "pending",
    "ownerAccepted": false,
    "runtimeIntegrated": false
  }
}
```

The two-frame example demonstrates fields only; it is not a quality target or an
accepted Hollow specification. Final values come from the reviewed source.

### 12. Stage I — technical checks and visual acceptance

Run the export/manifest validator, then inspect the exported animation. Test the
files actually delivered, not just the authoring viewport.

| Automated check | Pass condition |
| --- | --- |
| File integrity | Every referenced image/source revision exists; hashes match |
| Rectangles | Integer, positive, in bounds; correct number of actual views |
| Alpha/bounds | Real transparency; no unintended clipped nontransparent edges |
| Timing | Positive frame durations; coherent total duration; no duplicated loop endpoint |
| Pivot/scale | Fixed logical root; explicit trim offsets; no per-frame rescaling |
| Events | Ordered, in clip range; no duplicate gameplay event from a looping visual |
| Terminal policy | Death is non-looping; corpse holds or follows explicit removal policy |
| Reconstruction | Export can be rebuilt from saved source/settings with recorded tool versions |

Sampling/rendering reproducibility may be numerical rather than byte-identical
across hardware. Lock versions/seeds where possible; record the comparison method
and tolerance instead of claiming determinism without demonstrating it.

Visual review must answer each item with evidence, not a numerical average score:

- Same creature as the card, matching the mage's material/detail language?
- Plausible anatomy/deformation and stable costume/hand shapes throughout?
- Supporting feet planted, meaningful weight shift and correct motion speed?
- No frozen torso, rigid seams, texture tearing, jitter or loop pop?
- Attack anticipation/contact/recovery readable at game size?
- Hurt distinct from attacking; repeated damage does not create visual lockup?
- Death loses support, settles and remains dead?
- Correct facings, phase continuity and legal action interruptions?
- Readable on representative dark, wet and spell-lit backgrounds, without adding
  unapproved glow outlines or baked scenery?

Keep a native-size loop, enlarged loop, ground-grid travel recording, lifecycle
recording, direction contact sheet and card/mage comparison. Record the exact
export revision reviewed and the reasons for rejection. A known failed result
cannot be promoted because a different technical test passed.

### 13. Stage J — review in Sprite Lab and integrate deliberately

Current Sprite Lab is a walking inspector with single/five/eight-view layouts.
It does **not** currently implement the proposed multi-clip manifest, attack/hurt/
death state machine, or arbitrary blending. Add these as an explicit later slice;
do not imply that uploading a multi-state sheet already exercises its lifecycle.

1. For the first walking milestone, load the exported direction sheet with its
   real frame dimensions, row count and timing. Do not export invented directions.
2. For lifecycle support, add clip selection, one-shot/loop/terminal handling,
   event markers, transition tests, a movement/grid mode and an evidence export.
   Keep the existing inspector functional and mark unsupported metadata clearly.
3. Verify exported pivots/timing in the lab, compare native-size footage and record
   owner acceptance for the exact candidate. Reject regressions in the source.
4. Only then create the runtime adapter for the existing game renderer. The existing
   painted-enemy pipeline uses eight poses (`idle`, `walkA`, `walkB`, `windup`,
   `attack`, `recover`, `hurt`, `death`), not the new multi-frame contract. Implement
   explicit mapping; do not overwrite `hollow.png` and assume compatibility.
5. Read action state/time from canonical C# simulation. Maintain gameplay-driven
   facing, movement, hits and death. Presentation interpolation must not mutate RNG,
   damage, saves or timing. Keep old assets available for rollback.
6. Run relevant adapter/playback tests, browser smoke and representative live combat.
   Measure atlas memory/load time and frame time at horde density, including mobile.
   RGBA decoded memory is approximately `width * height * 4` bytes per base texture,
   before mipmaps, copies and runtime overhead; compressed PNG size is not GPU cost.
7. Split sheets/limit resolution or preload deliberately if needed; never drop
   unreviewed frames or directions silently to meet a memory budget.
8. Publish through the established PR/CI/Pages process. Verify the deployed revision,
   cache invalidation and actual assets. Record physical iPhone/Android acceptance
   as pending until exercised; browser emulation is not physical-device proof.

### 14. Failure handling and iteration budget

| Failure | Return to | Required correction |
| --- | --- | --- |
| Wrong monster/proportions | B | Fix model/design, not frame alignment |
| Bad hidden surfaces or tearing | B/C | Repair mesh, weights or replacement artwork |
| Sliding/shuffling/stiff gait | D | Fix contacts, body motion, timing and travel relationship |
| Unreadable attack/death | E | Re-block action and preserve gameplay event timing |
| Ghosting or broken interruption | F | Correct transition policy/source; avoid whole-body fades |
| Jitter after packing | G/H | Fix sampling, pivot, bounds or trim metadata |
| Black/magenta fringe | G/H | Correct alpha/color/export pipeline and filter settings |
| Memory/performance failure | G/J | Re-budget export with reviewed quality tradeoff |
| Generation service unavailable | A/B or motion acquisition | Save input/settings/error; report blocker; no retry loop |

Make one identified correction per iteration when practical. Compare the same
camera, timing and background before/after. If repeated attempts do not improve
the specific defect, stop that method and explain what source/art capability is
missing. Do not consume further iterations by regenerating the entire sheet with
longer prompts. Limit any service retry policy explicitly; never bypass quotas.

Checkpoint every coherent slice to a task branch and keep unfinished work in a
draft PR as required by `AGENTS.md`. Preserve rejected evidence without shipping it
as the default approved asset. The owner should review an actual candidate, not
operate uploads, repair tooling, or repeatedly ask whether work has stopped.

### 15. The Hollow: first application and definition of done

Current status on 20 October: generated v1 and rigid painted cutout v2 were rejected
by the owner. Neither is an accepted gait. Sprite Forge was attempted through its
API; reference upload and submission succeeded, but generation returned a request
limit error. This does not prove or disprove its possible visual output; no accepted
result was produced. Do not restart either rejected method as if it were new work.

Next production slice:

1. Use `user_handover_files/concepts/Fire/01-the-hollow.png` and the current mage.
2. Resolve/acquire the editable Hollow model and compatible rig; document provenance
   and any unavoidable design uncertainty. Tool availability and source quality are
   prerequisites still to be proved, not completed work.
3. Pass the static identity and pose-deformation gates.
4. Author one three-quarter shamble and inspect it in motion at actual game size.
5. Deliver the editable source, settings, transparent walking sheet, metadata and
   native-size/grid preview. Record technical results and visual acceptance separately.
6. After that walk passes, extend the same character to lifecycle, directions and
   transitions, then the explicit game adapter. Do not begin the next monster early.

A **complete creature** has all required states and actual directions, correct
events and terminal behavior, accepted exported motion/transitions, reproducible
source, recorded provenance, bounded runtime costs, and verified integration.
"Packed PNG", "CI green", "eight rows" and "more frames" are not synonyms for done.

### 16. Reference basis

These sources establish tool capabilities and useful motion principles, not proof
that a WyrmForge candidate meets the standard. Accessed 20 October 2026.

- [Blender NLA introduction](https://docs.blender.org/manual/en/5.1/editors/nla/introduction.html):
  reusable actions and layered/blended authoring. Transfer: preserve editable motion
  and evaluate blends before baking. Do not confuse authoring blends with PNG runtime capability.
- [Blender command-line arguments](https://docs.blender.org/manual/en/latest/advanced/command_line/arguments.html):
  headless scripted rendering supports repeatable exports once a valid source exists.
- [Spine animation application](https://esotericsoftware.com/spine-applying-animations):
  runtime mixing, queuing and layering apply to skeleton data. Transfer: make the
  distinction between discrete frames and live skeletal poses explicit.
- [Spine weights](https://eu.esotericsoftware.com/spine-weights) and
  [export](https://en.esotericsoftware.com/spine-export/): deforming attachments and
  PNG sequence exports support the alternative 2D route; prepared artwork remains necessary.
- [Adobe Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html):
  humanoid rigging/motion source with specific geometry requirements; not a universal
  rigging tool for dogs, wings, tails or all monsters. Check applicable terms for each source.
- [Toon Boom walk analysis](https://learn.toonboom.com/modules/walk-cycle-animation/topic/walk-analysis1):
  contact/down/passing/up helps structure gait review. Transfer support and timing
  principles, not the example's art style or a single gait for every creature.

No source authorizes copying another game's artwork or replacing WyrmForge's
approved Gothic painterly/pixel identity. The card/mage comparison and game-scale
motion review determine whether the implementation fits.


### Wet Forest material and creature grounding — 21 October 2026

**Approved design direction, not approval of final assets.** Wet Forest must feel like one grounded
Gothic space, not flat ground behind independently floating monsters. Keep:
- Three coherent material families at game scale: near-black wet loam, desaturated moss/sedge,
  and worn grey-brown timber and bone. Litter follows ground clusters and physical object roots,
  not evenly distributed sparkle or high-contrast noisy overlays.
- Physical tree trunks, carts and stones keep their C# collision and feet; baked ground shadow,
  litter and disturbed earth can remain after destruction. Never bake upright solid-looking scenery
  without corresponding real geometry.
- Preserve the **approved** Hollow, Ashling and mage sprites. Their world-foot contact, grime-dark
  shadows and distance-driven walk poses integrate them into the ground; do not recolor or replace
  their silhouettes. Weak ambient shadows, never opaque covers that hide attacks/loot.
- One coherent visual scale in the Arena Lab: authored atlas sprite footprint and entity world
  coordinates use the same perspective. Test actual portraits, night lighting, 320–390px width,
  and combat readability rather than judging enlarged screenshots alone.
- Contextual field marks help explain ecology (e.g. grave-scarred ground under a Hollow);
  such presentation cannot invent C# collision, rewards or a new enemy type.

References: [Diablo II: Resurrected art/visibility trade-offs](https://www.playstationlifestyle.net/2021/09/21/behind-diablo-ii-resurrected-authenticity-developer-interview/),
[Dead Cells art deep dive: palette, parallax and placement rules](https://www.gamedeveloper.com/production/art-design-deep-dive-giving-back-colors-to-cryptic-worlds-in-i-dead-cells-i-),
[Dead Cells procedural level design by a developer](https://deepnight.net/tutorial/the-level-design-of-dead-cells-a-hybrid-approach/).

**Implementation checkpoint:** the Arena Lab uses baked seeded mud/litter/root dressing and
distance-driven motion with actual kind 0 Hollow and kind 2 Ashling. Those are code/art
integration improvements, **not** a claim that final Gothic environment assets are finished.

### Wet Forest pixel-material grammar — 21 October 2026

**Arena Lab candidate, not final artwork approval.** The existing Wet Forest floor previously mixed
anti-aliased ovals and broad smoothed roads with pixel-scaled creatures and physical sprites. The
preview now composes wet loam, moss, mud, leaf litter, shallow pools, rutted trail and site soil as
seeded **12-world-unit material cells**, with finer 2px/4px grain. The cell resolution is an art
construction rule: **never draw visible grid lines**. Neighboring cells are correlated in broad
material fields instead of independently colored visual noise.

The C# WetForestRecipe is still the only authority for the main trail, physical story-site position
and waterlogged patches; the cell painter does not create blockers, alternate routes, loot or
creatures. Each of the four historical sites has its own flat material trace, beneath the actual
C# physical artifacts. No raised, non-collidable forest decoration is introduced.

This revision keeps original tree atlas frames, approved Hollow/Ashling/mage animation and the
ground-contact dressing introduced in #206. It does **not** finish the needed Gothic canopy,
bark, root and ruined-site asset pass; those require real 320/390px captures and owner approval.
Normal Hunts still use their previously accepted arenas, not this generator preview.

Independent reference principles, without copying art:
- [Diablo 1 level-generation breakdown](https://www.boristhebrave.com/2019/07/14/dungeon-generation-in-diablo-1/):
  separate walkability from visual tile pieces; use equivalent tile variants without breaking
  connectivity and make landmarks distinct. Wet Forest preserves this separation at C#/JS boundary.
- [Dead Cells generation analysis by its designer](https://deepnight.net/tutorial/the-level-design-of-dead-cells-a-hybrid-approach/):
  coherent authored biome vocabulary combined with seeded placement, not arbitrary independent props.
  Wet Forest uses a shared material palette and retains four authored historical site identities.

### Wet Forest C#-anchored vegetation — 21 October 2026

This **Arena Lab candidate** extends the pixel-material pass without changing canonical physical
geometry. The painter selects among **three existing authored pine frames** and **two authored
dead-tree frames** according to stable seed + physical prop ID; the original atlases are not
recolored or regenerated. Shallow step-pixel roots and moss are baked **under** the world-space
trunks from the same C# prop positions. Sparse lichen/branch-edge and bark marks draw with their
depth-sorted prop silhouettes, not as unrelated fake trees.

The roots, litter, understory and the small overhanging foliage are visual only; C# continues to
own collision, destruction and loot. Destruction removes the raised tree and its physical trunk
together; residual dark soil and root traces are allowed floor archaeology. Ordinary Hunts, Frost
trees, character animation and saved games are unchanged.

**This does not approve final Gothic forest artwork:** the existing triangular pine frames still
need a dedicated silhouette/canopy illustration pass and iPhone-scale visual inspection. Maintain
the restrained loam/moss/timber palette, actual single source of physical truth and honest art
status; no giant uncollidable background trees or global color washes.

### Wet Forest silhouette experiment — 21 October 2026 (unapproved)

**Not final art.** The previous 36px-wide triangular pine frames still read too regular on the
390px browser capture. A second Lab-only candidate draws larger asymmetrical, broken-edged pine
crowns and bare skeletal deadwood from authored two-pixel-aligned shapes; the frames are cached
per C# physical tree, never baked as permanent fake background structures. Original atlas PNG,
manifest and other biome rendering stay byte-identical and provide a fallback. Tree destruction,
foot-depth and collisions remain sourced exclusively from C#.

This is a visual acceptance experiment: compare the new 320/390px browser captures with the
previous triangular atlas trees. Reject it if dense crowns obscure the player/attack telegraphs,
cause a runtime frame-rate loss, or read as stacked artificial rectangles rather than decaying
Gothic woodland. Even a passing visual check does not approve a production forest atlas.

### Wet Forest character rendering correction — 21 October 2026

**Important:** The previous Wet Forest screenshots were not evidence of the actual Hollow and
Ashling appearance. The Lab had been displaying fallback `arena-enemy-art` atlas actors,
while live Hunts already prioritize the independently authored **8-direction rigged** Hollow
and Ashling sources. The Lab now reuses the existing Hunt sprite controllers, original
runtime PNGs and C# motion, selecting compact fallback only while source imagery loads.

These approved and tracked animated sources must remain the **canonical character identity**,
not be repainted as blocky procedural ground decorations. If real rigged sprites still fail
actual 320px/390px game-view quality, fix the **source/rig/frames and validation** in a
separate staged character-art pass; never hide mismatches with larger contact shadows,
blurred upscaling, fake effects, or an unrelated generated screenshot. An art preview must
prove eight facings, walking contact, recognisable anatomy and animation transitions.

Lab pathing probes have no simulated combat, so playback is strictly movement/idle; attack
and death clips remain the regular-Hunt authoritative render path. Existing source bytes and
enemy mechanics are unchanged, preserving continuity with earlier accepted work.
