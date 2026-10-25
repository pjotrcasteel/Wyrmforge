# WyrmForge — universal pixel-art lighting and visibility engine

> **Implementation plan, updated 23 October 2026 after owner clarification.**
> Binding requirements: [Art & animation](../canon/art-and-animation.md#proper-lighting-engine-and-foliage-self-shadowing--locked-23-october-2026),
> [Architecture & quality](../canon/architecture-and-quality.md) and
> [P5 roadmap](../canon/roadmap.md#arena-v2-lighting-engine-dependency-within-p5--23-october-2026-locked).
> This is a Work-session guide, **not** a claim that an engine has shipped.

## Mission: a LIGHTING SYSTEM for the entire game, not a tree effect

Build a **generic, reusable, object-agnostic lighting engine** analogous in
*capability and separation of concerns* (not scale, fidelity or feature count)
to Unreal/Unity scene lighting, tailored to WyrmForge's Gothic 2.5D pixel-art
visuals and eventual native iOS/Android targets.

**Owner requirement:** Any new existing/future object — a torch, wall lamp,
Fireball, Wyrm breath, burning tree, glowing crystal or magical effect — can
declare *that it emits light* and specify its characteristics, **without**
requiring a new renderer-specific `if (object.type === ...)` light implementation.
Every eligible nearby **receiver** (approved ground, wall, rock, tree foliage,
mage, enemy, Wyrm, props) responds through the same material/occlusion engine.
Objects can be **emitters, receivers, occluders, or any combination**. They are
not all required to emit light.

The previous **one-tree-first architecture was too narrow**. A tree is a
stress-test for shadow correctness, not the foundation of the system.
**Engine contracts and multi-object behavior come first.**

All Hunts remain Gothic night. Shadows approach black away from light;
actual warm fire, elemental spells and grounded practical light sources
reveal nearby geometry. No global orange tint, fake ambient daylight or
unbounded bloom. Essential combat UI/telegraphs must remain legible.

## Universal visibility contract — one engine for every in-world pixel

**OWNER LOCKED, 23 October 2026:** Not a Wet-Forest-only shader. The **same
lighting/material/shadow/visibility engine** must own the appearance of all
in-world visual geometry and animated pixel art in **Hunts, Town Square,
interiors, any future scene or biome**: ground, buildings, NPCs, mage,
Hollowed/Ashling/all enemies, trees, props, water, Wyrms and world VFX.
No ordinary world sprite remains full-bright because it bypasses the engine.

The rule is **physically motivated illumination, not a binary threshold**:
as a light approaches, a receiver gets gradually brighter and acquires
normal/material response; as it leaves, that receiver approaches dark. If
ambient/sky/directional, local and emissive sources are ALL disabled in
a diagnostic preset, **ordinary world imagery must resolve to black**,
regardless of brightness embedded in source-color pixels. If material
emission remains enabled, that surface may glow in darkness because it
is itself a declared emitter. The HUD, menus, inventory text and screen-space
accessibility/telegraph overlays are purposefully NOT world surfaces.

Approximate scene model (stylization after linear-light composition):

\`\`\`text
lit linear RGB = albedo × (ambient + Σ[attenuated light × BRDF(normal, material)
                                      × light-space shadow visibility])
                + specular/reflection + deliberate emissive materials
-> tone/exposure -> pixel-art sampling/quantization (when desirable) -> sRGB display
\`\`\`

The art identity is **Gothic darkness, not a mandatory pitch-black screen**
during normal play. Moon/sky ambience, nearby fixtures and correctly
registered emission are valid explicit sources, adjustable by scene.
The night/zero-light inspector must not contain a secret player bloom or
full-bright character exception. Player position, actionable threat
telegraphs, UI and accessibility indications must still be fair: separate
screen-space readability channels or actual authored emissive world
indicators, NOT hidden global daylight that negates the engine.

### Additional architecture gaps found during audit

- **Lighting versus authored pixel colors:** all regular visual assets use
  light-neutral albedo/color + independent material, normals/roughness,
  height/depth and authored occluder/receiver data. An already-lit panorama
  or enemy frame has highlights and shadows that cannot be "unbaked" by a
  dynamic black overlay. Preserve original paintings and source assets;
  create new *approved* derivative passes rather than overwriting them.
- **A single linear-light working space:** albedo/emissive color textures
  are decoded from sRGB; normal/height/roughness/masks are **non-color data**;
  lighting and reflection accumulation are linear; output gets exactly one
  tone/exposure and sRGB conversion. Prevent CSS brightness/filter
  re-application and double night veils over scenes.
- **One camera/depth/world coordinate convention:** sprites and meshes
  share a fixed 2.5D camera, world X/Y/Z, feet/pivots, height, vertical
  depth and optional billboard facing convention. NPC front/behind props
  sorting and gameplay collision remain separately authored. A sprite's
  ground foot collision doesn't describe its light-occluding canopy/body.
- **One light/occlusion pipeline:** alpha-clipped layered foliage,
  characters, roofs/architecture, particles, wet ground and props
  cast/receive shadows as their representation permits. A sprite normal
  map supplies orientation but **cannot itself cast volumetric shadows**;
  use depth/height/occluder geometry, authored layers or reused low-poly
  meshes when needed. Re-rendering one 2D global shadow mask and tinting
  every asset is not a full material/occlusion engine.
- **Transparent and emissive world VFX:** fire cores, runes, spell trails,
  windows and crystals may visibly emit in otherwise dark scenes if their
  material is emissive; to light neighboring surfaces they also register
  LightEmitter data. Smoke/mist/alpha particles must compose with depth
  and receive/scatter light as their selected quality tier permits. Do
  not keep otherwise unlit VFX globally bright by ignoring scene visibility.
- **Reflection and indirect illumination:** water, puddles, glazed stone,
  armour and other reflective materials respond to the same light through
  roughness/normals/reflectivity and an explicit reflection-quality tier.
  A bright specular spot ≠ an actual reflected tree/actor. Probes, selected
  planar captures or documented screen-space fallbacks are optional,
  budgeted and testable. Baked AO/static indirect light may help mobile,
  but dynamic direct fixtures cannot be counted twice as both baked
  bright scenery and realtime light.
- **Mobile art-style control:** fix the world-to-pixel ratio and light/shadow
  sampling grid; clamp/quantize/dither lighting only after physically
  coherent visibility. Ensure sprite nearest-neighbor sampling and light
  edges are temporally stable under panning, swiping, animated sprites,
  moving lights and device resolution. HDR/tone mapping should not
  erase a previously-approved palette or flood the world with bloom.
- **Scene audit and rollout are mandatory:** enumerate the *real draw paths*
  of Town, NPCs, enemies, mage, arenas, dragon art, world effects and
  painted foreground layers. Mark each as material-lit, needs geometry
  or relightable art, emissive, or UI-only. Do not claim "one engine for
  all pixel art" while any gameplay-facing world sprite bypasses it.
  A staged rollout is fine; an isolated GPU proof is not a complete migration.

### Evidence of current bypasses — confirmed on main 23 October 2026

- \`Features/Forge/CanonicalTownView.razor\` currently composites
  \`wwwroot/art/town/night-active.webp\` (a **pre-lit 1672×941** full-scene
  painting), \`night-vacant-*.png\` for unavailable buildings,
  school-specific Nexus artwork and DOM/canvas NPC layers. It cannot
  dynamically shade bricks, arches, roofs, floor and passers-by as one
  consistent material/depth scene.
- \`wwwroot/css/town-canonical.css\`, \`wwwroot/js/town-lighting.js\`
  and Nexus radiance code include distinct painting/brightness/clock
  behavior. Town day/night Auto/Day/Night settings exist in canon;
  confirm active runtime scripts on \`main\` before cutover, rather than
  assuming switching code is disabled. A sun/moon setting becomes an
  **environment LightProfile** processed by the same renderer, not a
  separate day-lit panorama replacement.
- \`wwwroot/js/arena-night-lighting.js\` uses a dark canvas mask
  with radial holes and warm color overlay. \`arena-enemy-art.js\`,
  \`arena-mage.js\` and \`hollow-sprites.js\` have source-specific
  highlighting/filters. These are historical prototypes, NOT the
  lighting authority when the new renderer is adopted.
- The existing \`Hollowed\`/\`Ashling\` use rigged sprite/animation
  approaches. **The present mage character/sprite is TEMPORARY and will
  be replaced using the SAME character sprite/animation architecture
  as Hollowed and Ashling.** Do not rebuild or "final-lighting-polish"
  the disposable mage asset, create a new bespoke mage renderer, or
  alter C# character/gameplay. The shared character \`LitSprite\`,
  pose/frame normal/depth/occluder/material and animation binding
  must support all three (and future characters) via data; test
  Hollowed and Ashling now, verify the replacement mage on adoption.
- \`RefugeTownActors\`, \`night-navigation.json\`,
  \`refuge-foreground-cutouts.js\` and \`town-v2-nexus.js\`
  contain existing authored NPC foot-collision, zoning, parallax and
  foreground-occlusion rules. **These are useful scene metadata to
  preserve and transform**, not reasons to discard the whole town.

## Town Square relighting — mandatory project slice, not a filter

**Rebuild the Town Square's *renderable asset decomposition*, NOT its
approved layout, art identity, navigation or gameplay.** A single pre-lit
night/day panorama bakes the illuminance, material and shadow direction
into ordinary color pixels. It is impossible to obtain physically
consistent moving firelight, accurate actor shadow receiving, varied
roughness or correct building depth by merely overlaying another GPU
light pass on that flattened result.

**Preserve:** three horizontal districts and default central view, all
four building Active/Vacant states and unlock logic, six independent
Arcane Nexus school artworks with mastery intensity, World Gate,
well/noticeboard, walking NPCs, their feet-depth masking/collision,
existing named paths/occluders, interactive hotspots, original approved
panoramas and eight active/vacant source paintings. Do not overwrite
owner-approved art or substitute new architecture without approval.

**Build in parallel as a gated migration:**

1. Archive a reference screenshot matrix of current game town:
   four building states, six Nexus school variants, NPC foreground/
   well/board occlusion, daytime and nighttime settings, phone 320/390
   and desktop. Record approved source assets/locations and camera.
2. Create new **relightable scene layers** from original geometry/art:
   neutral paving/stone ground, building walls/roofs/windows/doors,
   well, noticeboard posts, trees/flowerbeds, gate and foreground
   occlusion. Each has world transform/height, material, receiver/caster
   geometry (or tiered sprite depth/normal passes), appropriate
   alpha, material IDs and independently authored emissive surfaces.
   Do not infer actual solid/light geometry from RGB image alone.
   Use new editable source files/approved derivative layers; leave
   canonical images untouched until owner accepts replacements.
3. Every fixture/source registers its **same typed LightEmitter**:
   gate lanterns, street torches, active building windows, Blacksmith
   forge, Nexus color per active school/mastery. Vacant buildings
   have NO occupants/source fixtures unless world state says so.
   Emitted light can reach ground, architecture, NPCs and foreground
   props and be blocked by roof/wall/foliage depth. The existing Nexus
   recolored artwork cannot *pretend* to illuminate the ground;
   its registered engine light must actually do so.
4. The existing device-local **Auto/Day/Night** town preference
   becomes a shared environment \`LightProfile\` (sun/moon angle,
   sky ambient/intensity, exposure), using ONE renderer and ONE
   material set. Hunts can be night-only using the same system with
   a different environment profile. Never bake/select a different
   entire town image as the new lighting technique.
5. Town NPCs use the same character-sprite lighting material as
   Hollowed and Ashling; share frame/pose transform, authored normal/
   depth/occluder, cast/receive and emissive rules. Preserve NPC
   route/foot collisions and accepted visibility masking across
   the well and both noticeboard posts.
6. Validate world-wide zero-light diagnostic (no fixture, no
   moon/ambient, no emissive): all **world** art is black while
   UI/hotspots are still safely navigable through explicit
   non-world accessibility controls. With a torch, walls and
   characters brighten only within visible non-occluded range.
   Compare identical camera and geometry in day/night profiles.
   Ensure building vacancy/unlock state alters both artwork and
   emitter registry without ghost light; no duplicate illumination
   from baked highlights.
7. Benchmark the separated static geometry/layers, dynamic NPCs,
   shadow lights and reflections on real phones. A generic render
   bridge for Town should share common \`LightingSystem\` modules
   with Hunts; **never create a second \`TownLightingEngine\`**.

**Schedule impact:** G0/G1 universal renderer and a representative
mini-town corner (one lantern, wall/roof, NPC, paving and wet puddle)
must validate the contract *before* migrating the entire panorama.
Actual town decompositions/camera/art signoff is its own staged G4/G5
migration with gameplay interaction regression gates. Document the
necessary source reauthoring openly rather than promising the flat
panorama can be automatically relit.

### Universal-engine acceptance matrix (add to G1 and final migration)

| Test | Required result |
| --- | --- |
| **Black-world diagnostic** | All sources, ambient and emissions zero: **all world-space assets black**, not just the Wet Forest; HUD/debug unaffected |
| **New light + ordinary asset** | Register torch/crystal/rune with descriptors ONLY; it illuminates Hunt terrain, town wall/paving, NPC/enemy and reflective puddle without modifying renderer source |
| **Walls and occlusion** | Same source is blocked by walls/roof/foliage; NPC/tree/character cast and receive coherent moving shadows, no light through solid scenery |
| **Animated actor** | Hollowed and Ashling receive proper pose-aware light and cast; mage will share identical bindings **after its replacement**, not special casing the temporary mage |
| **Town school state** | Changing active Nexus school/mastery changes emitted light color/intensity and lit nearby surfaces through engine; vacant means no unauthorized window/rune light |
| **Town day/night preference** | Shared environment profile changes sun/moon/ambient within engine; architecture, actor materials, collision, camera and progress remain identical |
| **Water/reflection** | Reflections and glints follow true source location/occlusion, roughness and water normals; no permanent painted reflection |
| **Pixel-art style** | Correct color-space/tone, frame-to-frame stable light boundaries, crisp sprites, no indiscriminate blurry HDR glow |
| **Interaction** | Existing town hotspots, NPC walkability, foreground masking, building unlocks, mobile swipe and accessibility remain unchanged after renderer cutover |

## System boundary: three reusable contracts, no per-asset renderer rules

### 1. Light emitter (declarative component)

A light-emitting object registers or updates a typed `LightEmitter` descriptor
(in the eventual authoritative C# render snapshot for gameplay, or test-only
data in the isolated proof). **Fields below are conceptual and MUST be reconciled
with existing code before adding new C# types.** Keep rendering and simulation
decoupled.

| Property | Purpose |
| --- | --- |
| `Id`, `OwnerId`, `Enabled` | Stable source identity; create/update/remove without leaked or duplicate lights |
| `Type` | Point (omnidirectional), Spot (cone), Directional (distant source); Area-like soft sources as later optional approximation, not a promised real-time area-shadow system |
| `Position (X,Y,Z)`, `Direction` | World-space origin/height, orientation; not a canvas pixel, arbitrary screen coordinate or 2D-only radius |
| `Color`, `Intensity`, `Range`, `Falloff` | Emitted radiance/brightness and attenuation; choose/document consistent engine units and color space rather than ambiguous arbitrary numbers |
| `ConeAngle`, `Penumbra` where applicable | Spot-only shape; validate ranges |
| `ShadowMode`, `Priority` | May cast real shadows, request quality or remain illumination-only under mobile budget; no assumptions that every light can afford a shadow map |
| `Lifetime` / active-state transitions | Spawn, attach, move, flicker when appropriate, expire/extinguish; timeline comes from authoritative state, not frame-time client guessing |
| Optional `LayerMask` / profile | Intentionally limit influence (e.g. VFX-only) without hard-coding object kinds into shader/renderer |

**Important:** "glowing sprite" / emissive material makes the *source itself*
appear luminous. It **does not automatically illuminate other objects** unless
a light-emitter descriptor is also present. Conversely, an invisible test light
can illuminate surfaces without a rendered torch mesh.

### 2. Lit renderable / receiver + occluder (declarative components)

Any renderer-visible object describes **what it is made of**, not which spells
it knows: world transform, mesh or depth-capable 2.5D geometry, albedo,
normals, optional authored height/depth, roughness, **specular/reflectivity, metalness when appropriate, water/transparency or reflection mode**, AO and emissive map, `ReceivesLight`,
`CastsShadow`, shadow participation/quality, optional alpha-cutoff for leaves
and appropriate double-sided behavior. Sprites may use authored height/depth
and normal data *when sufficient*, but genuinely overlapping foliage needs
real multi-layer geometry to cast dynamic leaf-on-leaf shadows.

- **Same render path** for bark, wet stone, mud, rock, armour, enemies,
  characters, cutout foliage and other props, with material parameters
  controlling their response. No hand-authored special-case `drawFireballOnTree`
  / `drawTorchOnRock` logic.
- Shadow receivers and occluders are independent of C# physical collision;
  a tree canopy shadow shape is **not** a collision volume.
- Real occlusion is resolved using caster depth/light-space visibility, not
  only `N·L` normal illumination or a 2D silhouette painted onto ground.
  Alpha-clipped leaves must use the same cutoff in normal and shadow passes.

### 3. Scene lighting system / renderer adapter

A central lighting subsystem consumes a registry/immutable render snapshot of
emitters, renderables, and environmental settings (ambient/sky fill, exposure,
optional moon/directional key). It performs transforms, culling, attenuation,
shadow caster selection, shadow maps, material response, occlusion,
**reflection/specular selection, visibility/exposure control**, composition and diagnostics. It is **one engine** shared by all assets,
not a second renderer attached to every character or biome.

Suggested conceptual flow:

```text
Authoritative C# RunSimulation / scene state
  -> versioned LightingSnapshot (emitters + transforms + lifetimes)
  -> renderer adapter (WebGL GPU proof now; native adapter later)
  -> central LightRegistry / visible-light & caster selection
  -> geometry/depth/alpha-cutout shadow passes
  -> shared material shaders (ground / foliage / rock / actor / water)
  -> material-controlled direct specular + reflection sources/probes where needed
  -> near-black visible-world lighting + emissive VFX + legibility-safe combat UI
```

Static authored world lamps/torches register like moving spell emitters;
the authority/lifecycle depends on existing scene state. The demo may add
test-only emitters, **clearly labeled**, without inventing production gameplay.

### Light types and rollout

| Light | Expected game examples | Initial support |
| --- | --- | --- |
| **Point** | Fireball, torch, burning vegetation, crystal | G1 illumination + shadows in a bounded test; optimize costly omnidirectional shadows on mobile |
| **Spot** | Directional magical beam, cone-shaped fire, lantern | G1 registry/material compatibility + proper directional/cone shadows |
| **Directional + ambient** | Moonlight / minimum night visibility | G1 scene-wide support, restrained and **not fake daylight** |
| **Emissive surfaces** | Lava vein / spell core / rune | G1 source appearance; adds real scene illumination only if configured as an emitter |
| **Area/extended sources** | Large furnace/open flame | G3+ quality extension or documented cluster/approximation; do not claim real soft area shadows before testing |

The interface should be **extensible** and provide **useful reflections** without promising unlimited mirror-quality reflections, real-time global illumination or Unreal Lumen on phone hardware.
Multiple lights illuminate concurrently; dynamic **shadow casting is separately
budgeted**. Do not turn all extra lights into fake painted shadows.

## Surface response, reflections, and actor visibility — mandatory cross-object behavior

**G1 needs a minimal specular/reflection-capable material path**, not a
water-specific Fireball glow. G3 can raise reflection fidelity and add more
expensive techniques, but the engine must be designed for this from G0.

- **Correct difference:** authored normal maps change local surface normals,
  providing diffuse/specular highlights and depth cues on a pixel-art sprite.
  **A normal map cannot, by itself, make an object cast real geometry/depth
  shadows** or know when another leaf/arm blocks light. To cast dynamic
  shadows from detail, add shadow-capable mesh/alpha-cutout geometry or
  a deliberate height/depth representation (parallax/self-shadow approaches
  only where valid). This distinction is documented in standard renderer
  material/shadow APIs; don't label normal-map highlights "cast shadows".
- **Material interface:** provide controls such as `NormalMap`,
  `HeightOrDepth` (optional), `Roughness`, `Specular`, optional
  `Metallic`, `Reflectivity`/`ReflectionMode`,
  `Transparency` and `Emission`. Texture coordinates, world orientation
  and pixel scale must be consistent across atlases and meshes.
- **Water is a first-class lit/reflective material:** direct Fireball and
  torch highlights follow their world positions; water/puddles may also
  reflect nearby silhouettes, scenery or source shapes via a **documented
  tiered method**. Start with real material specular + water-normal ripple;
  use cheap probes/scene captures for broader reflections and selective
  lower-resolution planar reflection for important still ponds if measured
  affordable. A specular sparkle is **not** equivalent to a true reflected
  enemy/tree, and an unverified screen-space-only method cannot reflect
  off-screen objects. Provide reflection OFF/A/B and correct occlusion.
  No fake mirrored Fireball sprite pasted on water.
- **Actual actors, especially Hollowed:** convert an **existing original
  Hollowed sprite/animation reference** to a lit-material receiver with
  authored/exported normal/depth data and a separate plausible caster
  silhouette. Lighting reveals real body form, armour and limbs as they
  enter range; it changes their shaded orientation and ground cast.
  Preserve sprites/animations/identities and **do not redesign Hollowed** or
  give them permanent custom glow just to make them visible.
- **Darkness is real:** outside all emitters, ground, objects and Hollowed
  should become near-black except a deliberately minimal night ambient/
  moon contribution and a small neutral player visibility allowance.
  **Not every enemy must always be visible**. But gameplay must remain fair:
  mandatory attack telegraphs, damage cues, player orientation, exits and
  accessibility accommodations live in a separately controlled readability
  pass that is testable and does not brighten the entire world. No invisible
  unblockable hit merely because its attacker was outside illumination.
  Decide predictable warning behavior during G1 and verify it at phone scale.
- **Pixel-art-aware rendering:** preserve authored pixels/edges, avoid
  indiscriminate smoothing/bloom and plastic PBR. Evaluate nearest-neighbor
  or intentionally bounded upscale, quantized/light-band/dithered shading
  where it supports the existing art, crisp animated outlines, shallow
  reflections and coherent temporal behavior. Aesthetic pixel constraint
  changes *presentation fidelity*, not the correctness of light visibility.

**G1 is a multi-material demonstration, not a completed Unreal-scale water
engine.** Required now: Hollowed actually reacts to lights and shadows,
and water reflects a moving point/torch through the **same generic light/material
path**; leave costly scene-accurate water reflections to proven optional G3
tiers if necessary. Do not let the reflection extension defer the fundamental
G1 registry/geometry self-shadow proof.

### Research grounding (not borrowed assets)

- [Three.js MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html):
  normal maps change fragment lighting; roughness controls reflection response.
- [Unity URP 2D lights](https://docs.unity.com/en-us/engine/6000.7/manual/unity2d/2d-urp/2d-index/2dlight-properties):
  separate normal-map lighting and Shadow Caster geometry; the same 2D
  light can illuminate sprites without each sprite implementing the light.
- [Unreal physically based materials](https://dev.epicgames.com/documentation/en-us/unreal-engine/physically-based-materials-in-unreal-engine):
  roughness/specular/metallic material parameters, not emitter-specific shaders.
- [Three.js Reflector](https://threejs.org/docs/pages/Reflector.html) and
  [Unity reflection probes](https://docs.unity.com/en-us/engine/6000.0/manual/lighting-overview/lighting/reflection-probes/introduction):
  reflection-camera captures and probe-based approximations have different
  accuracy, cost and visibility limits.

## Why tree-only normal maps failed

Gothic-night Canvas mask (merged #326) gives local contrast; alpha-projected
ground casts and camera-space normal passes from experimental #327 give useful
comparisons. **None of these tells the renderer which leaf blocks another**.
A normal describes surface orientation, while depth from the light tells us
visibility. The new GPU engine requires actual caster/receiver geometry.

The original **ancient oak** and **dead elm** from source-only Blender
[PR #307](https://github.com/pjotrcasteel/Wyrmforge/pull/307)
remain valuable complex stress-test assets with editable `.blend` files.
Export real trunk/branch and alpha-clipped leaf geometry to a fixed-camera
2.5D GPU scene; preserve original source and provenance. Do not replace
approved original art, regenerate trees unnecessarily or integrate these
unapproved candidates into production.

## Rendering architecture and mobile performance

- Build an **isolated `/arena-light-engine` GPU proof** (WebGL2/Three.js or
  another proven backend, with choice recorded), not a permanent browser
  platform commitment. Keep `/arena-lighting` and Hunts untouched initially.
- Preserve WyrmForge's established fixed orthographic 2.5D view, sprite-inspired
  aesthetics and six owner-approved ground materials/transitions and Step-2
  trails. Render original terrain rather than a new generic grey test plane
  for final art acceptance; a simple debug plane is allowed for early correctness.
- For foliage self-occlusion: alpha-cutout leaf geometry casts **and receives**
  real shadows from a moving point/spot source; branches shade trunk and
  adjacent leaves; the ground and nearby rock/actor are lit and occluded by the
  exact same light.
- Keep strict budgets: choose shadow-casting lights by explicit quality/priority,
  visibility and relevance, not arbitrary object-type special casing. A
  point-light cube shadow commonly requires six depth views. Start with a
  bounded number of active shadow casters, with graceful stable fallbacks for
  non-shadowed light. Avoid flickering caster choices between frames. Add
  near/mid/far geometry/LOD, shadow-update caching and dynamic scaling *after*
  correctness. Measure GPU/frame time, thermal, battery, overdraw and memory
  on real iOS/Android devices; target 60 FPS modern and stable 30 FPS fallback
  (goals, not claims).
- Source values/physics/damage/timing are authoritative C#; shaders are
  visual-only. Snapshot shape should be portable. Do not copy/paste gameplay
  into JavaScript or port .NET 10 into a new native runtime casually.

## First Work session: G0 → G1, prove a GENERIC ENGINE, not a specific tree

1. **G0 inspect & reconcile:** repository `main`, #307 original Blender
   asset/source pass, #327 experimental lighting, **every in-world
   draw path for Town Square, player, Hollowed, Ashling, arena and FX**,
   current C# snapshots, approved town/terrain sources and CI. Write a
   small renderer architecture decision with typed cross-scene material,
   emitter, environment, pixel sampling/color units and screen-space
   exception contracts. The **current mage sprite is temporary** and
   its replacement will use Hollowed/Ashling's sprite setup.
2. **Build the common registry and surface path first.** A minimal,
   reusable light descriptor + renderable/material descriptor + scene
   compositor must allow objects to **register/update/remove themselves
   through data**, not new renderer conditionals. Show visible light and
   shadow-registry/debug state. Keep demo data separate from gameplay.
3. **Prove several different emitters:** moving Fireball (Point),
   fixed torch (Point), directed lantern/beam (Spot), restrained
   ambient/moon direction. They can independently spawn, move,
   change intensity/color/range, be disabled, and expire. **Two active
   overlapping local lights** must combine consistently; no ghost light
   after removal.
4. **Prove several different receivers and occluders:** actual approved
   wet ground, rock/wall and shallow reflective water; **existing Hollowed
   AND Ashling sprite animations** with per-pose lighting/occluders;
   original 3D ancient oak/leaf layers; and an **isolated Town Square
   corner** (paving, lantern, roof/wall, NPC, foreground post).
   The same Fireball/torch lights all of them, without separate
   `TownLighting`/`MageLighting` branches. Hollowed and Ashling
   cast and receive real dynamic shadows; tree leaves cast onto other
   leaves/trunk. Keep current mage graphics out of final art approval:
   its **future replacement uses the same rigged-sprite pipeline**.
5. **Prove add-an-object without engine edits:** add a new sample
   "glowing rune"/"lit crystal" using only descriptors/assets. It should
   light rock, ground, tree and any other eligible object in range.
   The generic lighting-renderer source must **not change** to add this
   object. Demonstrate removal and toggling `CastsShadow`/
   `ReceivesLight` separately.
6. **Debug/test:** frozen seed/camera at 320×568 and 390×844,
   **Town day/auto/night** versus Hunt nighttime environment profiles,
   and **world-light ALL OFF** (including ambient and material emission)
   that must make every ordinary *world* pixel black while independent
   UI/accessibility channels remain readable.
   Views: lit, albedo, normals, actual geometry, light-space depth,
   shadow visibility, light bounds, per-object emitter registry.
   Presets: Fireball left/right/behind/off, torch only, overlapping
   Fireball+torch, moving Spot, no emitters, shadows off, new rune,
   **Hollowed outside/entering/leaving the light**, and **Fireball reflection
   in still/rippled water with reflection enabled/disabled**.
   Report pixel/frame metrics without claiming final physical QA.
7. **Review & refine:** visually inspect the *actual* screenshots,
   especially internal leaf self-shadow and light changes on non-tree
   objects, before calling G1 done. Preserve original .blend files and
   accepted materials. CI passing doesn't equal visual sign-off.

### G1 acceptance matrix: generic behavior and real shadows

| Case | Must be observable |
| --- | --- |
| **New emitter added** | Light appears on ALL in-range eligible objects via config/registration, **zero object-specific renderer code** |
| **Move, disable, remove** | Light and appropriate dynamic shadows move/disappear immediately; IDs stable, no leaks/phantom glows |
| **Fireball + torch overlap** | Both affect shared terrain, tree and rock; intensities combine without global daylight or blown-out artifacts |
| **Point, Spot and directional** | Distinct defined shapes/directions/ranges respected; future unsupported area lights degrade explicitly, never silently masquerade |
| **Different materials** | Wet ground, water, rock, bark, leaves and actual Hollowed/enemy sprite react appropriately under the SAME light, not one uniform paint overlay |
| **Occlusion** | Rock casts on ground, tree casts ground shadows, real leaves cast on other leaves, branches and trunk with Fireball direction reversal |
| **Shadows OFF** | Illumination persists but visibility/occlusion differences disappear; no hidden fixed shadow masks |
| **Hollowed enemy receives light** | Actual Hollowed transitions from near-black unlit to visibly normal-lit as Fireball approaches; side-facing contours and its ground cast respond correctly, independently of tree-specific code |
| **Water / reflective material** | One source produces moving, view-appropriate highlights/reflection on water or puddle; rock/foliage remain matte; disabling reflection removes it without disabling diffuse lighting |
| **Zero light + readability** | World goes near-black; Hollowed outside light is mostly concealed, not mysteriously fully lit, while player orientation, actionable attack telegraphs and accessibility cues remain intentionally readable and testable |
| **No emitters / budget fallback** | Near-black readable night; caster budget may reduce shadow quality but must not invent lights, change gameplay or break combat visibility |
| **Existing Ashling / common sprites** | Hollowed and Ashling animate with the same lit-frame/normal/occluder material contract; replacement mage will adopt that SAME pipeline, never a unique lighting renderer |
| **World zero-light invariant** | With ambient/local/sky and emissions OFF, ALL ordinary world pixels resolve to black across representative Town and Hunt scenes; screen-space UI remains readable |
| **Mini Town corner** | Lantern/wall/roof/NPC/foreground post/paving use unchanged shared engine; roof blocks light; NPC responds and casts correctly |
| **Town environment profile** | Same geometry and materials support Day/Night/Auto light environment without swapping whole pre-lit backgrounds; unlock, Nexus and navigation state preserved |
| **Town fixture state** | Active vs vacant building lights and 6 Nexus school colors/mastery register/remove real emitters, no ghost or baked duplicate lighting |
| **Pixel-art color and temporal stability** | Linear sRGB lighting with one output transform, non-color normals/depth, stable pixel scale and shadow sampling under camera pan/animation |
| **New object uses engine** | Sample rune/second prop emits without modifying engine shaders/dispatch; casts/receives flags work independently |

**G1 fails** if only tree shadow works, a new object requires its own
light renderer, one-off `switch (kind)` cases are required for each source,
leaves shade only the ground, sprites become flat cardboard, mobile light
overlap makes night daylight, or the underlying approved ground changes.

## Gates after G1

| Gate | Deliverable | Evidence |
| --- | --- | --- |
| **G0 — inventory + contract** | Inspect existing repo; define reusable light/renderable/scene descriptors, units and backend | Actual source SHA, integration seams, written renderer-neutral contract |
| **G1 — working generic GPU lighting (NEXT)** | Light registry, point/spot/directional, multiple emitters, varied receivers, real occlusion with at least one complex alpha-cutout tree and a rock/wall | Acceptance matrix + 320/390px screenshots; independently add/remove a new emitter without renderer edits |
| **G2 — authoritative C# bridge** | Typed snapshot source mapping, stable lifecycle and environment settings; adapter boundary for browser/native | Deterministic replay, movement, extinction and no gameplay mutation/regressions |
| **G3 — advanced material/light response** | AO, two-sided leaf transmission, roughness, reflection fidelity tiers (specular → probes → selective planar water), wet materials, localized fog, emissive effects and optional extended-source approximation | Material-specific A/B, correctly moving reflections and preserved Gothic night; no neon/plastic/filter stack |
| **G4 — mobile and scale** | LOD, caster selection, caching/adaptive shadow quality, renderer-native choice | Real iOS/Android FPS, thermal/battery, memory and combat readability |
| **G5 — universal scene adoption** | One proven renderer shared across Town, Hunts, other biomes, NPC/character sprites, fixture emissions and world VFX; relightable Town asset decomposition preserves approved art/layout | Whole-scene zero-light audit + dynamic lights, Town day/night/building/Nexus/route parity, combat/save/UI tests, owner/native-device review |

Build G0/G1 in vertical, reviewable commits/PRs. Stop at the first
generic light + receiver + actual shadow proof until it works; **do
not expand scenery or ship mass art** to compensate for missing engine
behavior.

### G5 merge follow-up: real Hollowed injury and appearance materials

[The canonical roadmap](../canon/roadmap.md#once-g5-has-merged--integrate-hollowed-injuries-and-future-appearances-25-october-2026) schedules this **immediately after the final G5 milestone is merged into `main`**. The approved even-cadence `broken-leg-left` gameplay art is already merged through [#343](https://github.com/pjotrcasteel/Wyrmforge/pull/343); editable source and future appearance work live in [#333](https://github.com/pjotrcasteel/Wyrmforge/pull/333). This is an **asset-to-shared-renderer compatibility task**, not a reason to hold other gameplay or add a special Hollowed lighting renderer.

**Source binding and map correctness:** for every *shipped* variant and `walk`, `attack`, and `death` clip, resolve the actual source rig/pose and accepted atlas; export correctly aligned normals, depth, shadow-casting occlusion/geometry, albedo, and applicable material/emissive maps. Lock `direction × frame × clip × variant` to the same geometry and atlas anchor/alpha, retaining source hashes, revisions, world size and load-failure provenance. Standard, broken-left-leg and later approved arm/one-arm/other variants must not silently share mismatched normals/casters, reuse full-bright RGB, or substitute painted fake shadows.

**Behavioral parity:** the preexisting healthy-support reach attack and legacy death fallback remain distinct documented art-transition work until matching injury-specific sources are accepted; renderer integration alone cannot fix the silhouette. In-game C# movement/attack/death, stable appearance selection, hit flashes, collision and save data must remain unchanged. Preserve the owner-approved smooth limp without 3 m/s frame spikes. If maps are missing, use an explicitly valid **fully lit** fallback pair, never a full-bright bypass.

**Gate/acceptance:** G5's mainline migration must already feed *all active world actors* through the unified lighting/occlusion pass. The post-merge follow-up builds/validates the **new injury-specific** source geometry and materials: eight facings, animation sync, motion-to-attack-to-death, changing source positions, actor self/ground shadow, light-off zero-black and near-black Gothic readability; record 320px/390px and physical iOS/Android results. Require an independently reviewable PR and explicit art signoff. The material refresh is **not automatically done** by merging G5.

## Non-goals and invariants

- **Not** implementing Unreal Engine, Lumen, global illumination, fully
  physical path tracing, unlimited overlapping shadowed lights, or a
  general-purpose editor for every platform in the first slice.
- **Not** rewriting .NET gameplay, adding collision, changing Fireball
  balance or saves, or mandating Three.js/Unity/Godot as the final engine.
- **No** large-scale tree/biome conversions before owner approval; no
  resurrection of rejected old art. #327 remains experimental reference
  unless explicitly reconciled, not a second production light engine.

## Reference specifications / provenance

- [Three.js light categories](https://threejs.org/manual/pages/lights.html)
  and [shadow maps](https://threejs.org/manual/pages/shadows.html):
  directional/point/spot behavior and light-space depth rendering cost.
- [Three.js PointLight](https://threejs.org/docs/pages/PointLight.html):
  omnidirectional point attenuation and shadows.
- [Unity URP light components](https://docs.unity.cn/6000.0/Documentation/Manual/urp/light-component.html):
  typed light properties as inspiration for **component-driven design**,
  not a decision to adopt Unity.
- [Khronos glTF 2.0 materials specification](https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/Specification.adoc):
  `MASK` foliage alpha-cutoff, depth and double-sided behavior.
- [Godot 2D lights, shadows and normal/specular maps](https://docs.godotengine.org/en/stable/tutorials/2d/2d_lights_and_shadows.html):
  useful contrast between ambient modulation, lit sprites and *separate*
  shadow occluders; no obligation to use Godot.
- [Godot CanvasItem shaders](https://docs.godotengine.org/en/stable/tutorials/shaders/shader_reference/canvas_item_shader.html):
  `unshaded` vs `light_only` demonstrates why all world pixels must
  be in the lit pass, instead of bypassing it.
- [Three.js color management](https://threejs.org/manual/pages/color-management.html):
  sRGB albedo/emissive, non-color maps, linear light accumulation, one
  output encoding; prevent incorrect dark/bright art.


**Status at writing (23 October 2026):** audit of `main` found the Town's flattened `night-active.webp` and active/vacant painting layers, Arena's Canvas night mask, and enemy/mage-specific brightness helpers. **The mage visuals are temporary; replacement will use Hollowed/Ashling's rigged sprite architecture.** #324 and #326 are merged;
the original editable tree source #307 and Canvas L4 normal/shadow PR #327
were open at the latest inspection. Verify them before implementing.
The **generic GPU light engine is not implemented yet**; updating its
design documentation does not deliver renderer code or native performance.
