# Grey wizard — reference review and production checkpoint

Status: canonical default appearance approved by owner on 30 October 2026; native
sprite production, motion and runtime/device acceptance remain pending.
Owner request: elderly main-character mage, pointed hat, long grey cloak and staff;
review the entire supplied reference archive before starting. This authorizes a
fresh sprite-first attempt, not revival of abandoned wizard PR #335.
Authority: [art canon](../canon/art-and-animation.md), [architecture](../canon/architecture-and-quality.md),
[roadmap](../canon/roadmap.md). This is an execution receipt, not competing canon.

## Repository and engine audit

Started from fetched main `69abbe571` in isolated `codex/grey-wizard-sprite-first`.
Original AN checkout and untracked Ashfang work remain untouched.
Current-main canon records AN #387 closed unmerged/deferred on 30 October.
Preserve that archive and #335; do not import their rigs or rejected animations.
Inspected active draft G4/G5 #381 and Hollowed V2 #399: independent work, neither
is a source-art prerequisite. Do not modify their branches or imply acceptance.

Existing player: `wwwroot/js/arena-mage.js`, `arena-mage-frames.js`,
`tools/art/sprites/mage.mjs`. Four facings, mirrored west, two walking poses,
separate staff geometry; current atlas character space is 36x42, origin 18,22.
Existing reusable animation: `sprite-animation.js`, `sprite-layer-compositor.js`,
`rigged-sprites.js`, creature manifests and animation profiles. Profile-driven
directions, stride/distance, action priority/timing, pause and reduced motion.
Use an actor adapter and authored sprites; no new controller/physics engine.
C# snapshots own root movement, aim, committed casting, damage, death and saves.
Shared LightingEngine/Hunt GPU adapters own material/depth/light consumption.
No mandatory live 3D model, source-skin, IK, cloth solver or Blender dependency.

## Full supplied archive review

Input: local `Reference-assets.zip`, 681699 bytes. All seven outer entries and
all nested file listings reviewed. All 153 PNGs inspected on nine contact pages;
the adventurer's five character actions additionally inspected as enlarged
eight-frame strips in all six supplied directions. Frame-by-frame inspection
does not establish original intended playback speed: no timing metadata supplied.
Seven PSD files inventoried; their flattened counterparts were inspected, not
their internal layer structure. Text/readme/license and Tiled XML inspected.
Private review sheets stay outside the repository; do not republish pack assets.

| Pack | Actual supplied coverage | Assessment for this character |
|---|---|---|
| Dark mage | 12 PNGs: 4 idle, 4 walk, 4 attack; one view. Idle/walk 64x64; attack 74x64. | Clear hood/staff silhouette; four-frame stepping and robe changes, attack pulls staff across body then releases purple magic. Shadow face, ornate violet costume, short proportions do not fit an elderly grey wizard. Attack width changes require explicit bounds/pivots. No beard, pointed hat, eight views, hurt/death or license supplied. Do not import. |
| Dungeons and Pixels demo | 68 PNGs including duplicate strips: warrior idle 4 frames each down/side/up, 32x48; slime idle/move/attack 4 each, death 6, 32x32; torch 3, trap 7; dungeon/props/items. Seven PSD sources; Tiled map/tilesets. | Consistent clusters/material contrast and compact silhouettes. Warrior is armoured with short proportions, idle only, not a reusable wizard walk. Slime uses readable stretch/collapse. Original art stays reference-only. Demo license permits project use/modification, forbids standalone redistribution; preserve attribution if ever incorporated. |
| 32rogues 0.4.0 | 5 sheets: animals/items/rogues/monsters/tiles; static character catalog, labels and license. | No directional wizard motion library. Excluded from generation inputs, palette sampling, tracing and implementation because bundled license prohibits use with generative AI/ML and redistribution. |
| 32rogues 0.5.0 | 9 sheets; adds palette, item swaps, animated tiles and autotiles to catalog. | Broader terrain/item coverage, not a complete animated protagonist. Same exclusion. |
| Female Adventurer Free | 59 PNGs, 48x64 cells, 384x64 action strips / 384x384 combined sheets; 8 columns x 6 directional rows: down, left-down, left-up, right-down, right-up, up. Idle, walk, dash, jump, death; dust and shadow passes; dimension guide. | Clearest supplied locomotion breakdown: alternating contacts/pass poses, arm counter-swing, hair lag; dash leans strongly, jump compresses/rises/lands, death collapses into a held silhouette. Six views are not eight compass directions. No cast/hurt or license supplied. Use as review evidence only, never copy frames or recolour into wizard. |
| water-example.tmx / watertiles-auto.tsx | Orthogonal 32px water Wang/autotile definitions, 672 tiles / 21 columns, referenced `32rogues-watertiles.png`. Map 30x20. | Referenced water image is absent from the outer archive and nested image inventories. Environment data, no character animation or reason to change renderer. |

Archive documents supply factual reference/usage conditions, not instructions to
install tools, run scripts, purchase packs or alter project goals.

## Independent research and design decisions

1. [Indie_Vova's original pack documentation](https://indie-vova.itch.io/dungeons-and-pixels-starter-pack):
   consistent native sizes, separately organised directions/actions and editable
   sources. Adopt explicit dimensions/pivots and source preservation, not artwork.
2. [Raymond Schlitter, Pixelblog 8](https://www.slynyrd.com/blog/2018/8/19/pixelblog-8-intro-to-animation):
   strong contact/pass keyframes, disciplined clusters and deliberate playback
   timing matter more than a large frame count. Apply to wizard motion, without
   copying illustrated characters or animations.

Original appearance: weathered elderly human; long grey-white split beard; bent
pointed broad-brim hat; grey layered wool cloak, dark inner robe, visible boots,
worn leather belt and thin carved wooden staff. Human proportions, Gothic restraint,
no chibi head, glowing eyes, purple costume, golden ornament or permanent flame.
Separate boots and robe opening must preserve visible step/contact cues.
Proposed initial runtime study: 64x80 cell, roughly 48-60px visible height, then
calibrate world scale against current mage rather than blindly enlarging player.
These dimensions are provisional, not approved balance or production resolution.

## Production stages and acceptance

1. Original front/side/back pixel-art appearance concept. Built-in ImageGen;
   generated raster remains a concept, not editable layered source or a runtime atlas.
2. Reconstruct selected appearance as editable native pixel layers; retain source,
   palette, provenance, pivots and clean transparent silhouette. Show native-size
   320/390px scale studies, honestly labelled outside-game until real Hunt captures.
3. One convincing south-facing 16-frame walk: genuine alternating stride, visible
   weight transfer, attached hand/staff, authored cloak/beard follow-through. GIF,
   full contact sheet and MP4; no transformed still used as evidence of walking.
4. Eight genuine facings and idle/walk/cast/hurt/death; shared profile/actor adapter.
   Test cast while moving, action exit, turns, pause, death priority and fallback.
5. Frame-aligned optional normals/roughness/emission/caster data through existing G
   contracts; no baked spell flames or independent staff light. C# cast events drive
   any future elemental effects. Six school variants deferred until base accepted.
6. Real Hunt 320/390px captures, feet/depth/occlusion, nearest sampling, darkness
   and spell-light response; measured decoded atlas cost and real phone frametime.
   Appearance and motion approval precede production replacement; retain live mage.

Checkpoint before generation: review and plan only. No code/tests/runtime changed.

## Appearance candidate v001

Built-in ImageGen produced `art/source/characters/grey-wizard/appearance-concept-v001.png`
using the adjacent exact `concept-prompt.txt`. No pack images were generation inputs.
Original output is preserved byte-for-byte. Three-view costume/identity concept:
recognisable aged face, grey pointed hat, beard, layered cloak, wooden staff and boots.
Inspection: attractive costume direction but far too detailed for a native sprite;
alpha has transparent background plus partial-alpha regions (not a clean binary
cutout), long hem may hide steps,
beard is more tapered than split, side view is closer to profile than elevated game
camera. This is a concept only, not an atlas, animation or alpha-ready runtime art.
Next targeted refinement: genuinely transparent background and much simpler,
consistent pixel clusters at small actor scale; retain the identity and proportions.
Visual/art approval, editable native layers, motion and game/device proof remain open.

## Appearance candidate v002 / review gate

Targeted built-in ImageGen edit of v001, no external pack inputs. Preserved original
`appearance-concept-v002.png`, exact `refinement-prompt.txt`, and SHA256/dimensions/
alpha statistics for both in `provenance.json`. The three-view 1536x1024 study has
simpler grey folds, brighter beard and clearer separate boots. It is still a
generated high-resolution concept: not a validated 64x80 grid, restricted palette,
binary cutout, shared-anchor pack or editable pixel layers. Do not ship by shrinking
it and calling it finished pixel art. Front/side/back staff views retain the same
right-hand identity; view silhouettes and perspective need native reconstruction.

Current deliverable is ready for the appearance review described in stage 1.
Unapproved appearance stays outside runtime. Next: editable native front-facing
sprite, world-scale comparison, then the genuine south walk proof. No old wizard
rig, animation engine or live mage replacement was introduced. No tests were run
because this checkpoint contains documentation and source concepts only; file
dimensions, alpha, hashes and visual contents were checked. Native/mobile game
and physical-device validation are pending, not implied by these source images.

## Owner appearance approval — 30 October 2026

Owner: "yes perfect" and request to store as canonical default before continuing.
The accompanying attachment is the exact selected reference, not automatically
v002: copied byte-for-byte as `approved-default-reference.png`, SHA256
`1867f2819eff1c1f0a8b2a08a2fe74a4958dfc41012f001712d235ab10d49dc6`.
Its identity now governs the canonical art and vision topics. Both generated
candidates and prompts remain preserved as production history. Their earlier
unapproved statuses above describe those checkpoints, not the newly approved
attached reference. No additional animation or runtime implementation in this slice.

## School cape/staff addition — 30 October 2026, production started

Owner requested the school symbol on the back of the cape and school-identifying
staffs. Recorded in art canon without replacing the approved base attachment.
Use character school, not Hunt region; preserve canonical emblem identities from
`wwwroot/art/divine-lineage-sigils.webp`: Fire/flame orange-red, Frost/snowflake
cyan, Storm/lightning yellow, Arcane/orb violet, Necromancy/skull green,
Summoner/bear earth tones. Six variants share grey costume, body and grip.

Comparison-board brief: back badge below hood; slender wooden staffs with compact
school finials (ember stone, ice crystal, lightning inlay, orbital orb, bone skull,
carved bear). These specific treatments/size are proposals for review, not approved
production assets. No permanent flame, full-robe tint or new lighting engine.
Exact prompt preserved as `school-variants-prompt.txt`; edit inputs are the approved
wizard and existing emblem atlas, never supplied third-party packs.

Research principles, no copied museum motifs:
- [V&A medieval embroidery](https://www.vam.ac.uk/articles/the-syon-cope): pictorial
  coloured-thread motifs belong to the fabric rather than floating over it. Use
  restrained stitched appearance following folds, not copied religious imagery.
- [Met carved wooden staff](https://www.metmuseum.org/art/collection/search/314578):
  slender continuous wood can support a legible sculptural finial. Apply the
  structure/material principle, not the object's cultural motifs or triangle design.

Pixel/mobile requirement: compare badge and staff silhouettes at actual native
actor scale later; this high-resolution board cannot establish Hunt readability.
No gameplay availability, casting effects or new spells are implied by six designs.

### Six-school comparison v001

Saved `art/source/characters/grey-wizard/school-variants-v001.png` (1536x1024),
original built-in edit output, with exact prompt, inputs and SHA256 in provenance.
Visually inspected: all six back badges visible below hood, grey costume preserved,
school-coloured compact staff heads, same grip and no baked flame. Fire/Frost/Storm
top row; Arcane/Necromancy/Summoner bottom row. Summoner is a bear head, not a paw.
The image interprets the atlas motifs on cloth; it is not a byte-identical emblem
export and must not replace the existing canonical atlas. Native production must
reuse the approved emblem source/layers rather than extracting newly generated
symbols from this board. Broad glow/partial alpha and high-resolution detail remain
concept limitations; do not claim material, transparency or mobile validation.
No runtime files changed. `git diff --check`, source dimensions and hashes checked;
no gameplay tests applicable to this source-art/docs slice. Variant appearance
approval remains open; the approved base reference stays unchanged.

### Owner rejection/correction of v001

Owner rejected the mounted-icon staff approach and flat-looking cape symbols.
V001 is retained only as a rejected production record. Updated art canon: weave
symbols into cloth so folds compress/occlude and shade them; keep the original
crooked wooden staff and express school through its grain/material and restrained
magic along its length. No icon-shaped topper, skull, bear head or orbital finial.
V002 brief uses scorched ember fissures, frost rime, copper/yellow charge seams,
violet grain channels, bleached decayed wood/green crevices, and living root/moss/
amber sap respectively. These treatments are proposals, not owner-approved details.
Exact prompt saved as `school-variants-v002-prompt.txt`. Generate from the approved
base and canonical atlas, not from the rejected board. No runtime changes.

V002 produced and preserved as `school-variants-v002.png`, exact built-in ImageGen
output with SHA256 in provenance. Inspected all six: no mounted icon heads; natural
wooden crooks restored, school character carried by grain/fissures/rime/metal/root
material. Cape motifs now have muted thread texture and central fold shading.
Fold occlusion is still limited and motif shapes remain comparatively flat in
places; this is not cloth-deformation or native sprite acceptance. No claim of
byte-identical icon reproduction, animation or in-Hunt proof. Appearance review
remains open. V001 retained explicitly as rejected, never as an approved variant.
Source hash/dimensions and `git diff --check` verified; no runtime changes/tests.

### V003 requested refinement

Owner approved the v002 direction ("perfect") and requested more faded cape
images plus stronger school influence in the staff. Preserve v002 as the accepted
directional checkpoint, not final sprite/runtime acceptance. V003 targeted edit:
weathered lower-contrast thread only (not whole image), and more substantial
school material transformation throughout the wooden shafts. Preserve crook,
grip, grey costume and no-icon-topper boundary. Prompt:
`school-variants-v003-prompt.txt`. Candidate appearance remains subject to review.

Saved `school-variants-v003.png`, original 1536x1024 built-in edit of v002. Visually
inspected all six: cape motifs are lower contrast/desaturated, while full-shaft
staff treatments are stronger. Fire char/ember fissures, Frost blue-white rime,
Storm yellow/copper grain, Arcane violet channels, Necromancy pale deadwood/green
cavities, Summoner living root/moss/leaf buds. Natural crooked tips preserved; no
mounted symbols. V003 owner appearance approval remains pending. Partial-alpha
source concepts are not clean native sprite/material packs or in-Hunt/device proof.
Exact prompt, input, image hashes/dimensions and production status preserved.
`git diff --check` verified; no runtime changes or gameplay tests in this slice.

### V004 owner change — subtle cape hue, distinct gem-topped staffs

Owner requested a small hint of school hue in the grey cape and, instead of the
whole staff resembling the school, a school-coloured top gem with a distinct staff
design per school. This supersedes v003 full-shaft treatments, not the faded cloth
embroidery or approved wizard identity. Current canon rewritten to match the latest
direction rather than retaining conflicting staff constraints. Proposed gemstones:
red-orange Fire, cyan Frost, yellow Storm, violet Arcane, green Necromancy, earthy
amber Summoner. Distinct natural wood/metal settings and gem cuts; no icon sculptures.
Capes remain grey with muted warm/cool/ochre/violet/olive/earth undertones.
V004 exact edit brief saved as `school-variants-v004-prompt.txt`; prior candidates
remain preserved. No runtime change or approval of an ungenerated candidate implied.

Saved `school-variants-v004.png`, original 1536x1024 built-in edit of v003. Inspected
all six: capes remain grey with subtle school hue; physical faceted top gems are
red-orange/cyan/yellow/violet/green/amber; distinct carved/twisted/root wood and
metal settings replace transformed full shafts. Right-hand grips preserved.
Emblems retain woven/fold appearance, though some contrast increased relative to
v003; native faded-thread consistency remains a production concern. Appearance
review remains pending; no game/material/animation or device validation claimed.
Exact edit prompt, input and SHA256 provenance preserved. Source dimensions/hash
and `git diff --check` checked; no runtime changes or gameplay tests.

### V005 staff-setting refinement

Owner accepted v004 cape/character direction and requested gems grown or crafted
into each staff, rather than separate stones held at the top. V004 staff settings
remain unapproved. V005 targets only heads/short shaft transitions: recessed stone
faces enclosed by continuous wood/root or fitted metal sockets, wood/metal overlaps
gem edges and extends above it. Fire split burl, Frost silver-lined mortise, Storm
fitted copper sleeve, Arcane enclosing spiral knot, Necromancy recessed deadwood/
iron band, Summoner root-engulfed amber are proposed constructions. Preserve v004
cape hues/faded embroidery. Exact brief: `school-variants-v005-prompt.txt`.

V005 preserved as `school-variants-v005.png`, 1536x1024. Gems visibly recessed in
enclosing wood or crafted sockets. Generated board altered cape contrast/detail;
retain v004 as approved cape direction, not those incidental changes. Owner says
good direction and requests staffs more unique: repeated pointed/leaf frames are
still too similar. V006 isolates six full staffs for better inspection, with distinct
blunt burl / angular stepped head / open copper crook / sideways spiral knot /
narrow splintered deadwood / squat living-root burl. Gem integration stays; colour
alone is not enough. Prompt `staff-designs-v006-prompt.txt`. No runtime change.

V006 delivered as `staff-designs-v006.png`, a 1536x1024 staff-only comparison.
Visually inspected six complete constructions: Fire burnt burl, Frost angular inset,
Storm copper crook, Arcane sideways spiral, Necromancy jagged deadwood, Summoner
living-root knot. Embedded gem faces retained; unlike previous repeated frames,
head silhouettes now differ. This does not alter the accepted v004 cape reference.
Exact ImageGen prompt/input and SHA256 recorded. Appearance approval pending;
head proportions must still be calibrated beside the mage at native gameplay scale.
Not a runtime atlas, material map or phone acceptance proof. File dimensions/hash
and git diff --check verified; no executable changes or gameplay tests.

### V007 crystal/magic readability request

Owner asks crystal/elemental magic more apparent. V006 unique constructions retained;
propose larger exposed faceted mineral cores, stronger internal school radiance and
small local magical accents, preserving structural wood/metal/root support. Exact
edit brief `staff-designs-v007-prompt.txt`. This remains a concept study; any future
dynamic effects/light use existing shared presentation events/renderer, not baked
gameplay or a separate lighting engine. Cape reference remains v004 unchanged.

V007 saved as `staff-designs-v007.png`, 1536x1024; larger crystal cores and school
energy accents visibly increase magical identity while retaining six constructions.
Owner selected this staff direction ("keep it here") and asked wizards to hold them.
Record source approval, not runtime acceptance. Staff-only source has broad concept
glow/partial alpha; future material/emission/effect separation remains mandatory.
V008 composite brief combines v004 character/capes with v007 staffs at human scale,
same right-hand grips, complete staffs from ground to just above the hat. Exact
prompt `wizards-held-staffs-v008-prompt.txt`; no new character/staff redesign intended.

V008 saved as `wizards-held-staffs-v008.png`, 1536x1024 original built-in edit.
Inspected all six: corresponding v007 identities retained, staffs visibly held in
right hands with continuous shafts down beside boots; complete figures and heads
in frame. Grey school cape studies retained in the composition, with incidental
generated thread/contrast differences; source references remain v004 capes and
v007 staffs, not automatically replaced by this composite. Large magical heads
need native-scale/gameplay clearance review; no animated hands, lighting, material
passes, gameplay or physical-phone validation claimed. Composite appearance review
pending. Exact prompt/inputs and source SHA256/dimensions preserved. Git diff check
and file checks only; no executable changes or gameplay tests.

### V009 owner scale correction

Owner rejects v008 staff scale as much too big. Design identity remains selected,
but not those head/shaft proportions. V009 targets about half shaft thickness and
roughly half head dimensions while keeping walking-staff length, attached right
grips, crystal readability and compact unique shapes. Hat-relative head size and
finger-relative shaft thickness provide character context, not final runtime
numeric budgets. Prompt `wizards-held-staffs-v009-prompt.txt`; cape/body unchanged.

V009 output preserved as `wizards-held-staffs-v009.png`, 1536x1024. Visually checked:
all six shafts noticeably slimmer, heads compact relative to hats, hands wrap the
shafts and complete staffs remain beside boots. Magical cores/unique silhouettes
retained. Output also shifts embroidery brightness despite targeted prompt, so
v004 remains cape reference; those incidental changes are not a new approval.
V009 proportion/appearance review pending, not native sprite or gameplay acceptance.
Hashes/dimensions, exact prompt/input and original output preserved. Git diff check
passes; no runtime edits or gameplay tests.

### Owner acceptance of corrected proportions — 30 October 2026

Owner accepted v009 ("sure this is fine"). Staff scale/proportions are approved
for the source concept. Reference stack: exact approved base wizard; v004 cape
hue/faded woven symbols; v007 staff identities/crystal character; v009 held scale.
Record these complementary references, not a new redesign. Native editable sprite
and material layers, genuine motion, real Hunt 320/390 and phone validation remain
pending. No production integration or animation completion claimed.

## Native south walk production started

Owner requested next steps after source-concept approval. Current main refreshed:
`69abbe571`. Active draft #439 retained; original AN checkout untouched.
Added editable native 2D source `tools/art/grey-wizard/source.mjs` using the existing
Bitmap painter, explicit 16 authored poses and separate pixel layers. This is a
new unapproved source reconstruction, not a claim it matches the approved art yet.
First scope Fire/S only; other directions/actions/schools not authored.
64x80 source padded losslessly into 80x80 square cells for the existing sprite
manifest contract, common [42,70] packed anchor; provisional worldSize 40.
Build script exports albedo/emission, separate layer atlases, editable command JSON,
source frame PNGs and scale/contact sheets under `native-south-v001`.

Initial format/controller checks: 16 unique frames, binary alpha, explicit palette,
unclipped bounds, same shared sprite controller frames 0..15, pause/reduced-motion.
Combined two runtime maps 819200 decoded bytes. This is not visual motion/contact
acceptance; first inspection, GIF/video, real Hunt/phone and materials remain open.
No live renderer/simulation/production atlas changes; no old wizard/AN rig imported.

### First native source review package

Generated GIF, full 16-pose contact sheet, native/4x MP4 and old-mage body scale
study. Existing Sprite Lab imports the square-cell atlas and advances/pauses at
320/390px in real desktop Chromium without page errors. Native source is labelled
S; the old lab hardcodes THE HOLLOW/SE and its generic chase is not C# gameplay.
Do not infer real Hunt acceptance from these screenshots.

Actual checks: deterministic rebuild 38/38 exports; 16 unique poses; 31 pigments;
binary alpha; no clipping; shared controller sequence/pause/reduced motion; 16/16
existing focused JS controller/mage tests; GIF 16-frame count and MP4 decode pass.
Initial browser launch needed explicit installed Chromium path, then loopback access
outside sandbox; both corrected and 320/390 checks passed. FFmpeg helper installed
only under task output folder for video encoding, not game/runtime dependencies.

Visual findings: small sprite retains pointed hat, beard, layered grey clothing,
boots and held staff; fine source-concept details simplify heavily at this scale.
This is an unapproved native reconstruction and initial authored movement proof,
not final appearance or convincing grounded walk acceptance. Gait length/world
velocity, stance slip, start/stop/turn, casting, other views and actual Hunt depth/
lighting/physical phones remain open. First native sprite and one-view walk need
owner visual review before expanding into a larger directional/action library.
Evidence/source: `art/source/characters/grey-wizard/native-south-v001/`.

## Native study rejection and Gothic reconstruction

Owner rejected native-south-v001: "too cartoony", Gothic/Diablo-like setting.
That study remains archived only; its green technical checks do not authorize art
or motion continuation. Main faults: shortened/chunky human reading, simplified
flat cluster/face treatment, insufficient long heavy robe/material fidelity.
Approved base wizard, cape and staff decisions remain intact. Re-establish a single
faithful static Gothic appearance before further motion. New built-in ImageGen
study uses the approved base and selected staff reference, without third-party pack
inputs. Prompt `gothic-reconstruction-v002-prompt.txt`; no runtime acceptance or
native dimensions, editable pose library or animation inferred from a generated still.

Saved `gothic-reconstruction-v002.png`, 1024x1536 original built-in image edit,
with exact prompt/inputs/SHA256. Inspection: longer human proportions, heavy
ankle-length drape, aged severe face and material detail closer to approved source.
This remains a static candidate, not an animation repair or new owner approval.

Added explicit diagnostic nearest samples at 64/96/128 visible-pixel heights under
`gothic-sampling-v002`. Same source/shape across sizes; threshold 200 removes
diffuse concept alpha from the diagnostic bounds while original stays untouched.
Pixel counts/colour counts/crop reported. At 64px much facial/material information
is lost; 96/128 retain more identity but unclean texture noise remains. No production
density chosen or budget relaxed. These are raw sampling studies, not authored
native palette/cluster cleanup, editable layers or accepted runtime material maps.
The original source walker remains REJECTED; no new walk/action library authored.
Verification: PNG decode/export, bounds/dimensions/hash and git diff check only.

## Gothic native layered production v003

Owner requested continuing sprites from the Gothic correction. Refreshed main at
`3d3fc32aa` (G4 preview rollback); art branch and concurrent work preserved.
New source `gothic-south-v003` derives its shape/texture from faithful Gothic v002,
not rejected primitive v001. Median-cut shared 96-pigment native palette; 72x136
editable source (128px visible height), twelve PNG layers + project masks/coordinates.
All layers exactly recompose the native master; no claim that quantisation alone
completes native pixel cleanup. Working source density is provisional, not a phone
budget change. Source texture/shape must be reviewed at actual world scale.

Sixteen explicit offline 2D pose keys deform cloth/arm grids, articulate boot/ankle
motion and bind staff/hand. No new runtime engine, live meshes or C# authority.
160px padded atlas cells, common [56,141] anchor, worldSize 40 provisional. Shared
controller samples all sixteen frames and pauses/reduces safely. Binary alpha,
unclipped bounds and 16 unique frames pass. Source boot raster soles show 0px
spread during each declared stance under the authored 2px/frame root translation;
this is NOT actual C# gameplay/contact/stride fitting. Two diagnostic maps decode
to 3276800 bytes; real source materials/Hunt/phone gates stay open.

Checkpoint before visual/browser/video validation: new texture-based layered
source and first one-view pose export only. Do not promote or extend the rejected
cartoony source. No production renderer/mage/atlas/simulation files changed.

### Gothic v003 review package validation

Delivered `grey-wizard-fire-south.ora` (twelve named native layers), 16-frame contact
sheet, native/2x GIF and MP4, and existing Sprite Lab import/play/pause captures at
320/390 desktop Chromium. Existing lab THE HOLLOW/SE captions are generic/hardcoded;
source is S and no new facing/Hunt acceptance is inferred. Shared controller and
Bitmap painter match freshly inspected main; no duplicate runtime engine added.

Checks passed: 25/25 deterministic pose exports, exact resting layer recomposition,
16 unique frames, binary alpha/unclipped bounds, source-only 0px stance raster
spread, shared playback/pause/reduced motion, 16/16 existing focused JS tests,
320/390 actual lab import/play/pause with zero page errors, 16-frame GIF count,
MP4 decode, twelve-layer OpenRaster structure. Two decoded maps: 3276800 bytes.

Visual review remains OPEN: this restores the Gothic source texture/proportions,
but hidden anatomy/edge fills, motion quality, source density and actual C# stride
calibration need acceptance. No live mage replacement or other direction/action
library work before this one-view review. Current work is not real Hunt/device
proof, production relightable materials or completed character animation.

## Upright Hollowed parity and 2.5D scale review

Owner accepted the Gothic direction, asked for human size parity with Hollowed if
it stood upright, and reaffirmed 2.5D. Source GIF 1x/2x panels were native source
pixels, not common game/world scale. Actual baseline current no-cape Hollowed is
arms/standard-walk.png, cell96/worldSize93, radius11, visualScale1 (variation +/-5%).
The legacy caped sheet is a fallback, not the primary comparator. Pending #399 V2
has no accepted replacement body and is preserved untouched.

Provisional standing-body guide comes from parent neutral mesh vertical extent and
its saved source camera projection, not a stretched/relabelled hunched image. Result
~49.69 projected world units. Wizard source crown under hat is estimated y22 to
sole y131 (109 native pixels). Candidate worldSize ~72.944643 yields same body
height, excluding hat/staff. Old export worldSize40 produced only27.25 anatomical
world units despite its large source GIF. This corrects the mixed preview units;
not a final approved physical-phone scale decision. Exact inputs/hashes/limitations
are recorded in scale-calibration.json. Native pixels/pose geometry unchanged.

Add a strictly opt-in existing /enemy-lab source consumer via wizardStudy query:
shared controller, real C# root/radius and arena camera/depth, no new engine. Only
that developer route can load the actor; default Hunts remain unchanged. South
view only, unavailable art/cast uses existing fallback. Lab note makes limitations
visible. Source-lit art is not accepted GPU/material/perspective proof. A real
Hunt/elevation/occlusion/phone matrix still remains; 2D layers are authoring data,
not a flat 2D product direction. No source rigs/Hollowed/G/AN branches altered.

### Actual C# arena scale capture — 30 October 2026

Captured opt-in Enemy Lab at 320/390px desktop Chromium using existing C# simulation,
arena camera, actor depth path and no-cape Hollowed. See source
`gothic-south-v003/scale-review/arena-report.json` and both canvas PNGs. Movement
measured 104.48/101.33 world units; no browser page errors or rendering failures.
The capture retries transient canvas replacement without modifying gameplay.

Capture exposed a radius normalization mistake: the actual player radius is14,
not the legacy drawing assumption12. Candidate now normalizes to14, so the
72.944643 worldSize applies to the ordinary player instead of enlarging it by
16.7%. Test uses the real14 baseline. Source frames remain unchanged.

Visual assessment: current Enemy Lab is very dark; sprites are separated in depth
and only the wizard south view exists. These are genuine arena captures, but do
not prove final perspective, clean material integration, close side-by-side body
parity, elevation/occlusion, production Hunt acceptance or physical-phone budgets.
The Hollowed can select injury/arm and +/-5% size variations; report preserves the
actual variant rather than silently representing it as standard neutral anatomy.
Upright parity remains a provisional source-camera guide pending visual review.

Validation: 3/3 scale consumer tests; 25/25 deterministic source exports; actual
320/390 C# movement/draw/readiness checks. This slice preserves the default mage,
C# simulation, existing approved sources and concurrent engine work. Draft PR439
is a review checkpoint, not a production cutover or complete character library.

## Directional source milestone — 30 October 2026

Owner responded very nice to corrected arena scale and requested continuation.
Keep current radius14/worldSize72.944643 as the accepted working scale baseline;
physical-phone, material and perspective gates remain open. Next bounded slice:
original eight-direction neutral idle source at elevated game perspective,
faithful Gothic materials, fixed right-hand staff and faded Fire cape embroidery.
This will be a source study, not eight finished animations or a live cutover.
Preserve existing south motion and all approved references. Review direction,
handedness, silhouette and scale before authoring directional walk/action frames.
Existing independent research/reference review applies; no new third-party art.

### Eight-direction native idle study checkpoint

Built-in ImageGen generated original 4x2 turnaround from approved Gothic v002
and held-staff v009 proportions; a targeted edit corrected apparent hand changes
in NW/SE. Exact prompts, both originals and SHA256/alpha audit are preserved as
`gothic-directions-v004-*`. No pack artwork or old rejected wizard rig used.
Alpha inspection corrected the initial preview impression: original files DO
contain transparent backgrounds, with fractional alpha on edges, not opaque
runtime backdrops. Native sampler thresholds alpha and uses the existing96-colour
palette, explicit cell crop bounds and128px silhouette height. Inspected contact
sheet and corrected row boundary to prevent adjacent hat pixels leaking into cells.

`prepare-directions.mjs --check` passes11 byte-identical outputs: eight neutral
views, atlas, contact sheet and sampling metadata. NW is too similar to N; other
rear perspective and costume/staff consistency still require refinement. Native
silhouette normalization is not yet anatomical landmark registration. Do not use
as finished eight-direction animation or overwrite v003 south motion/runtime.
No gameplay/engine changes; actual world-scale/depth and phone review remain open.

### Rear-direction correction and facing flipbook — v005

Owner requested continuation. Corrected NW/NE whole-body orientation with built-in
ImageGen using only v004 source. Rear three-quarter views now expose opposite
profile/beard edges and differ visibly from N at native size; NW staff is partially
occluded by the cloak. Retained six original native views byte-for-byte instead of
accepting generator drift elsewhere. Original output and exact prompt preserved.

Export `gothic-directions-v005`: eleven deterministic sampling files plus native
8-held-facing GIF and verification. The GIF is a facing flipbook, not authored
turn interpolation, locomotion, arena footage or phone proof. Inspected native
contact sheet. Checks pass: v004 unchanged11/11, v005 deterministic11/11, eight
GIF frames decode to exact opaque source colours/alpha, shared96-colour palette,
binary alpha/unclipped bounds, six unchanged native directions.

This resolves the near-duplicate rear-facing source issue provisionally; exact
angles, foot/anatomical registration, costume/staff consistency and actual scene
acceptance remain. No engine/gameplay changes, no production switch, and no claim
of finished directional animation. Current v003 south/lab baseline preserved.

## Southeast source walk — v006 checkpoint

Owner requested continuation. Authored a separate SE16-key offline layer project
from v005 SE native source, retaining Gothic palette/shape. Twelve editable PNG
layers, new diagonal foot-contact keys, shoulder/arm weighting, robe panel grid
deformation, beard lag and bound staff/hand. Source feet move against [1,1] native
root guide per frame, matching current canvas ground x/y convention (no extra
2:1 root projection). SE foot midpoint anchor90,136 is an explicit estimate;
accepted worldSize72.944643 is inherited, crown32/sole141 guide still109px.

Existing source exporter accepts SE project data; no runtime engine was added.
Original south export remains25/25 byte-identical. SE export25/25 passes,16 unique
frames, binary alpha/unclipped bounds, exact layer/idle recomposition and shared
controller sampling/pause/reduced motion. Declared stance sole extents stay fixed
in both axes under the narrow source root guide; this is NOT a C# stride proof.

Timing finding: existing source strides are very short relative to actual player
travel. Source-only12fps is an appearance/motion inspection speed, not a gameplay
fit. Do not promote these walk profiles directly or describe cadence as validated.
Retain current opt-in v003 lab baseline and default production mage while source
motion/stride and later walk/run adaptation are reviewed. No C# speed changes.
Checkpoint before GIF/MP4, OpenRaster packaging and browser validation.

### Southeast review validation

Delivered12-layer OpenRaster,16-frame contact sheet, native/2x GIF and MP4, and
existing Sprite Lab import/play/pause captures at320/390 desktop Chromium.
19 focused shared-controller/mage/lab tests passed; source export25/25 matches
and original south25/25 stays identical. Packaged12layer bytes and merged source
match, GIF16frames/1330ms verified, MP4 decodes, zero browser page errors.
Sprite Lab THE HOLLOW caption remains generic; source manifest correctly says SE.

Numeric audit reads C# PlayerState.Speed190 (before build/status modifiers): SE
source stride10.31593world units/cycle gives7.73695world units/sec at12fps. At base
C# speed the profile would demand18.418cycles/sec (~294.69frames/sec). This is a
material unresolved animation-fit issue, not a production-ready walk. Report is
`review/package-cadence-audit.json`; current C# code/source hash recorded. Do not
hide it with a new clock or change gameplay speed. Future source locomotion needs
an appropriate run/stride solution reviewed at real root travel, preserving scale.
No production integration, source-material acceptance or physical-phone claim.

## Staff as walking stick — owner correction, v007

Owner approved the direction but requires staff use as a walking stick. Canon now
requires planted support, weight transfer, lift/recovery, attached grip/arm and
world-ground consistency for walking facings. SE revision v007 preserves v006
source layers and foot keys, adds16 explicit tip/angle keys and a shared rigid
staff/hand transform about the actual source tip59.5,133. Sleeve follows the
moving grip while shoulder remains attached; mild load transfer toward support.
Frames7–15 plant at constant source-world72.5,146 under root[i,i]; frames0–6 lift
(up to6nativepx), advance, and lower into the next plant. No new physics/engine.

First source checks pass:16 unique binary-alpha/unclipped frames, exact idle
recomposition, planted tip analytical AND raster-bottom drift0px, grip error0,
both prior foot-contact extents0px. Original south and SEv006 exports remain25/25
byte-identical. This is source contact under authored travel, NOT live C# cadence
acceptance: prior stride/run-fit gap remains. No production/lab cutover.
Checkpoint before media/browser review and editable-source packaging.

### Walking-stick review validation

Large swing exposed residual staff/crystal pixels in body/hat masks. Corrected
staff ownership polygon; source rest still exact, no remaining strong fire pixels
in other layers near original head position. Inspected16-frame contact sheet.
Packaged12-layer OpenRaster and new GIF/MP4; GIF16frames/MP4 decode pass.
Existing Sprite Lab import/play/pause passes320/390 without page errors;19 focused
controller/mage/lab tests pass. v007 export25/25 byte-identical after cleanup.
Support analytical and raster tip remain0px drift; hand/shaft share exact grip.
Live cadence gap remains explicitly open in audit; no C# speed or engine changes.

## Owner rejection of walking-stick v007 / v008 repair

Owner screenshot shows torn sleeve/old-position fragments. v007 is NOT accepted;
prior numeric contact checks did not establish coherent source art. Retain it as
rejected review. V008 repairs the entire hanging sleeve ownership, makes lower
sleeve lag taper smoothly away from the grip, and explicitly paints a322px hidden
robe strip from adjacent source pigment behind the vacated staff. Idle source
still recomposes exactly. Inspect all16 frames against light background; source
contact/cadence limitations remain. No production cutover or acceptance implied.

### Repair review package

V008 includes complete sleeve mask, tapered lower-sleeve influence, explicit
hidden robe painting and removal of tiny disconnected raster islands (<=6px).
Re-inspected16 frames on light background and regenerated grey-background3x
GIF/MP4. OpenRaster13 exact layers, GIF16frames and MP4 decode pass;25 deterministic
exports pass and v007 remains unchanged. No artistic acceptance inferred from
numeric tests; live cadence and other production gates remain open.

## Owner artifact report: v009 overlap correction

Second owner crop identifies the remaining dark rectangular wrist patch. Layer
inspection traced it to v008's robe-under-staff underpainting starting at y70:
it copied dark sleeve pixels into open air above the actual cape. Not solved by
small-island removal. V009 restricts hidden painting to the true lower cape/shaft
overlap y96–126 (159pixels versus322). All original source/pose data preserved.
Inspected16 numbered frames on light background; rectangular patch is removed.
Staff plant, grip and foot keys unchanged. V008 remains rejected art history;
source contact checks alone are not acceptance. Checkpoint before new media.

V009 validation: targeted pixel regression passes18 old-opaque/new-clear probes
at reported wrist region across frames5–10, and no cape-underpaint alpha above
y96. New25/25 deterministic exports pass, prior v00825/25 unchanged. Exact13-layer
OpenRaster/GIF16frames/MP4 decode pass. These prove the reported patch correction,
not full artistic or live-animation acceptance. New gray-background GIF retained.

## Ongoing artifact review and south walking-stick source — v010

Owner authorized continuation while continuously checking nonsensical pixels.
Canon now records that requirement. Added repeatable review-artifacts.py: light/
dark numbered16-frame sheets,4x wrist/sleeve crops,8-connected alpha components,
clipping/binary-alpha diagnostics. Applied to corrected SEv009 and new Sv010:
both16frames each have one connected silhouette, binary alpha and unclipped
bounds. These diagnostics do NOT establish artistic correctness of connected
pixels. Earlier wrist-specific18probe regression remains passing.

South uses preserved v003 source/palette/foot motion, adds explicit staff plant,
support weight transfer, lift/recovery and exact hand transform. First enlarged
review exposed incomplete hanging sleeve ownership; corrected full sleeve mask,
tapered influence and separate sleeve/cape underpainting at actual source overlap.
Inspected light/dark full sheets and grip crops before media. Source plant7–15:
analytical and raster tip fixed at33.5,162 under root[0,2i],0px grip/stance drift.
14 editable layers, same accepted working worldSize72.944643/anchor56,141.
Source stride/cadence remains unfit for live base speed; no production cutover.
Original S and SEv009 remain25/25 byte-identical. New source is a review study,
not completed directional motion/material/Hunt or physical-phone acceptance.
Checkpoint before longer video/browser review.

### South support-loop review validation

Packaged14-layer OpenRaster, native/3x gray-background GIF/MP4 and existing Sprite
Lab320/390 import/play/pause captures without page errors. Exact14 layer bytes,
GIF16frames/1330ms, MP4 decode verified.20 focused JS tests pass; Sv01025/25
exports pass. Generic artifact reports for S/SE each show16 single connected,
binary-alpha/unclipped silhouettes; light/dark/grip sheets inspected separately.
Do not equate an empty flag list with artistic acceptance or all-pixel correctness.
S source14.5889world stride at12fps corresponds10.9417world units/sec; base190
would require13.0236cycles/sec. Live walk/run fit remains OPEN. No production
renderer/C# or active engine work changed. Next source work: remaining facings,
repeated artifact inspection and credible live-speed locomotion before cutover.

## South boot-edge report and v011 cleanup

Owner crop identified a small dark heel spur. Enlarged16-frame foot review traced
it to boot-edge pixels assigned to the robe plus hidden-edge padding. Expanded
boot ownership, disabled extra boot edge dilation, and explicitly beveled9 source
corner pixels. Original v010 retained. New source5433pixels; same palette/scale,
keys, staff and contacts. Feet-detail sheet now part of every artifact review.
16 one-component/binary-alpha/unclipped frames;0 source foot/staff contact drift.
Visual heel hook is removed; original S/SE pose/runtime/cadence gates stay open.
Checkpoint before updated media and continued directional source authoring.

### Boot cleanup validation and continued review

Final mask correction moves previously misassigned heel pixels with the boot;
explicit9pixel corner cleanup and no boot seam dilation remove the spur. Source
regression reproduces15 old heel-remnant pixels in frames6–10 and verifies clear
after repair.21 focused tests pass (including prior wrist regression). New25/25
exports pass; v01025/25 unchanged.14-layer OpenRaster bytes/GIF16frames/MP4 decode
pass. Inspected all16 light/dark full frames and enlarged feet; generic report
shows16 connected/binary-alpha/unclipped silhouettes. No automatic all-pixel or
artistic acceptance claim. Continued direction-source inspection includes E view:
its far boot is occluded in neutral source, so must author hidden boot/sleeve
coverage before extending motion; do not blindly warp/duplicate the single visible
foot into a finished walk. Live stride fit and production gates remain open.

V011 existing Sprite Lab320/390 import/play/pause also passes without page errors.
Browser screenshots/report retained. No new direction animation or live C# stride
fit is implied by this cleanup checkpoint.

## Owner rejection of v011 leg/hem coverage — v012 repair

Owner correctly reports the lower-body overlap still visibly wrong and asks for
inspection before delivery. Previous connected-component and heel tests did NOT
establish coherent anatomy. V011 is not accepted final motion. Root cause:
neutral robe-edge pixels were assigned to boot shafts and travelled as a grey
bar; hidden source legs were too short when boots moved forward. V012 reassigns
garment above sourcey116 to body, authors longer lower-leg coverage beneath the
opaque robe using explicit native leather donor regions, and retains source
layer ordering (legs behind cloth). No automatic front-layer overlay or gameplay
changes. Neutral source recomposition remains exact; pose keys/scale unchanged.

Inspected all16 enlarged lower-body frames; grey travelling ankle strip removed
and missing shaft coverage filled. Added targeted before/after tests for4 missing
coverage probes and2 grey-to-leather probes in both contact extremes. Source-only
foot/staff support contacts0px; original v011 remains unchanged for traceability.
Do not call passing tests or one connected silhouette artistic acceptance.
Checkpoint before review media/package validation.

### V012 pre-delivery review

Inspected16 enlarged lower-body poses, full light/dark contact sheets and the
before/after comparison (frames0,7,8,15). Garment grey now stays with the robe;
leather leg coverage replaces exposed gaps. Retained comparison PNG and full
GIF/MP4.14 exact OpenRaster layers, GIF16frames, MP4 decode, new25/25 exports,
prior v01125/25 unchanged and22 focused tests pass. Existing Sprite Lab320/390
import/play/pause passes without page errors. Prior source cadences and full
Hunt/material/phone acceptance remain open; this repair is not final-art approval.

## East-facing source walk — v013

Owner accepted south leg/hem repair and requested continuation. Authored16 E pose
keys from v005 E native reference, preserving Gothic costume/staff handedness.
The far foot was hidden: reconstructed editable far boot/shaft from native near
boot pigments, offset[-2,-2], palette shade0.85, separately keyed/occluded behind
near foot/body. Explicit lower-leg coverage avoids the prior ankle coverage gap.
New neutral master includes that small far-heel extension; original E input stays
preserved.11 source layers,160cell, provisional anchor80,139, worldSize72.944643.

First pre-delivery artifact review caught shaft remnants, missing cloak-fringe
ownership and seam padding painting shadows into the old shaft footprint. Fixed
with explicit per-row shaft contours, corrected fringe mask, protected staff
footprint, and28 native body/fringe pixels trimmed at the true front panel edge.
No neutral-body cutout is left as an unexplained floating rectangle. Enlarged
feet/grip sheets inspected through16poses; diagnostics now report one connected
binary-alpha/unclipped silhouette per frame. These are supplemental diagnostics,
not artistic acceptance. Original S/SE source exports preserved unchanged.

E support7–15 stays analytically fixed at117,141 under root[1.5i,0]. Raster staff
tip spread1px and boot stance extent spread0.5px reflect native rounding; grip
error0. Real C# speed/stride, world perspective/occlusion, material/phone gates
remain OPEN. No runtime/gameplay/engine changes or production cutover.
Checkpoint before review media and browser playback.

### East ground/contact review refinement

Full-frame inspection found the original neutral staff ended7 source pixels
above the near boot sole. Extended the narrow wood tip with explicit existing
wood donor pigments to y141, retaining compact head/grip proportions. Authoring
ownership gives those tip pixels to staff, not overlapping boot masks; far-boot
reconstruction cannot copy shaft pixels. Analytical support now117,141, on the
near-foot ground row. Earlier pre-media source checkpoint remains historical.
No claim that an arbitrary fixed tip point alone establishes ground contact.

### East review delivery validation

Reviewed corrected16-frame light/dark full sheets plus enlarged feet/grip before
media delivery.11-layer OpenRaster bytes and neutral-layer composition exact;
GIF16frames/1330ms and MP4 decode pass. Existing Sprite Lab import/play/pause at
320/390 passes with zero page errors.24 focused tests pass including new ground
plane/no-wood-in-boot and vacated-shaft-gap regressions. E25/25 deterministic
exports pass; corrected S/SE remain25/25 unchanged each. All16 E frames have one
connected binary-alpha/unclipped silhouette; this does not replace visual review.

Live source-stride gap remains explicit: E10.9417world units/cycle at12fps gives
8.2063world units/sec; C# base190 would demand17.3648cycles/sec. No source profile
promoted, no C# movement changes, no final Hunt/material/phone acceptance claimed.
Remaining facings/actions and live locomotion fit remain required production work.

## Northeast walking-stick source — v014

Owner requested continuation after E. Authored16 NE poses from the preserved v005
rear-three-quarter native source. Source projects reuse gait phase timing with
explicit NE foot progression, cloth sway and separate staff tip/angle keys.
Both visible boots receive lower-leg coverage under the robe.11 editable layers,
95 source pigments within the96 budget,160cell, guide anchor78,136 and inherited
worldSize72.944643; actual arena/phone scale acceptance remains separate.

The faded school pigment remains in the same cloak-left cloth layer, so the
motif follows folds/deformation rather than a badge. New cape-detail16-frame crop
and regression verify source motif ownership and no cape emission. First full
review caught12 warm head/finger pixels outside staff/hand masks; corrected
ownership before preview generation. No warm staff-region pigments remain on
stationary body. Source component scan16/16 single/binary-alpha/unclipped;
feet/grip/cape crops and light full-frame sheet inspected, not artistic approval.

NE ground uses root[i,-i]. Native tip100.5,130 is explicitly14.25px forward and
8.25px right of root78,136 in this projection. Its higher screen row is forward
placement on the ground, not a floating vertical height or a mandatory3D engine.
Support7–15 fixes source-world113.5,117; analytical/raster tip, boot sole extents
and grip drift0px in this narrow source replay. No actual C# stride-fit claim.
Checkpoint before editable-source packaging, media and browser review.

### Northeast editable source and motion review — 1 November 2026

Packaged the existing v014 native source as `grey-wizard-fire-northeast.ora`
with 11 editable OpenRaster layers, source-identical layer bytes and an exact
merged master. Exported the actual 16 authored NE frames to `northeast-walk.gif`
(1330 ms at approximately 12 fps) and a decodable four-cycle MP4, both retained
under `gothic-northeast-v014/review/`. No interpolation or generated replacement
poses were introduced. The GIF is a source-motion review, not gameplay footage.

Visual inspection of the complete light-background contact sheet finds the same
Gothic silhouette, attached grip, staff support/recovery and cloth-carried faded
Fire embroidery across all frames. Automated targeted regressions pass (7/7
across NE/E/S repair files); package/media audit passes with 11 exact layers,
16 GIF frames, 1330 ms total duration and successful MP4 decode. These checks
do not establish artistic or physical-phone acceptance.

**Open blocker:** C# `PlayerState.Speed` remains 190 world units/sec, while the
NE source stride is 10.31593 world units/cycle, corresponding to just 7.73695
world units/sec at source 12 fps. Replaying this walk at actual C# speed would
require roughly 294.69 source frames/sec. Preserve simulation speed; author a
credible travel/stride/cadence solution before any runtime cutover. Existing
production mage, approved references and concurrent engines remain untouched.

Sprite Lab browser capture at 320/390px is still pending in this environment:
Playwright is present but its matching Chromium binary is missing, and the
browser download returned an invalid archive. Do not count previously recorded
E/S/SE browser runs as NE validation. NE artifacts remain available for direct
owner review while browser verification is unresolved.

## North-facing walking-stick source — v015 (1 November 2026)

**REJECTED BY OWNER. Historical local experiment only; do not merge, ship,
or use this mask/animation as a production input.** The first automated audit
missed semantic errors: broad staff polygons captured sleeve and robe pixels,
arbitrary cloak halves tore the continuous embroidered fabric, and repeated
shoe-pigment donors produced checkerboard shins. Binary alpha and single
components are not substitutes for identifying actual anatomy. Rebuild v016
below supersedes these claims. This rejected v015 was not pushed to PR #439.

Authored a distinct N-facing16-key layered pixel study from the existing v005
rear-view reference. It preserves the approved silhouette, faded Fire cape
embroidery, slim crystal staff and the working worldSize72.944643. Native source
is palette-limited to96 pigments with11 editable layers; no new renderer or
gameplay authority is introduced. North source gait alternates two eight-key
boot contacts and plants the staff on the same source-world ground coordinate
for frames7–15, including an attached hand/grip. It is a provisional presentation
cycle, not a run that fits C# movement.

Pre-review found the concept staff tip stopped above the sole ground row: an
initial short extension detached as a small raster island in frames8–15. V015
now has an explicit continuous narrow wooden extension painted from existing
native shaft pigments. Both analytical and actual raster staff contact now stay
at exactly [103.5,134] in the source-world root replay, with zero drift. A second
review found pale repetitive hidden-leg pixels exposed behind the moving boots;
the lower-leg donor was corrected to darker original leather pigment. These are
targeted sprite-source corrections, not generic alpha-component bandages.

Delivered source layers, 25 deterministic atlas/metadata exports, exact11-layer
OpenRaster package, actual16-frame north-walk GIF (1330ms), decodable MP4, light/
dark full-frame sheets and enlarged wrist/feet/cape inspections. All16 frames
are binary-alpha, unclipped and one 8-connected silhouette.10 focused JS tests
pass, including three new N contact/art regressions. This does not prove artistic
approval, 2.5D scene occlusion, physical-device budgets or credible live cadence.

**Hard remaining blocker:** the N source stride is16 native units per cycle,
7.29446 world units/cycle after current scale; its 12fps review gives only
5.47085 world units/sec. C# base speed190 would require approximately416.75
source frames/sec (26.05 cycles/sec). Do not promote it to production or alter
the C# movement speed to conceal this mismatch. The shared locomotion-fit gate
must be solved before expanding this source into full action integration.

The matching Chromium binary remains unavailable here, so N Sprite Lab320/390
browser capture was not performed. An NE `--check` also reveals a pre-existing
stale controller hash in the stored NE verification record; this work has not
regenerated or modified its NE source/export. Preserve that mismatch for a
separate accurate validation pass, rather than silently updating unrelated art.

## North semantic source rebuild — v016 (1 November 2026; review pending)

After rejection of the v015 north motion, rebuilt its source segmentation as an
**independent** project (`gothic-north-rebuild.mjs`): the complete rear robe and
faded Fire embroidery are a *single* layer, separate from both boots, two
purpose-painted hidden leather shins, two sleeves, hat, hair, grip/hand and a
narrow material-guarded wooden staff. Removed the cross-part two-pixel bleed,
the artificial robe split, and tiled donor shoe textures. The two shins use
explicit native-palette leather brushes under existing opaque fabric, not a
borrowed boot rectangle. Hand and staff follow the same transform; the staff
does not carry broad grey sleeve pixels. The shoulder sleeve stays native
until genuine bend geometry can be authored rather than pulling horizontal
holes through cloth.

Retained the 160px/96-pigment source and exact resting composite with 11
editable layers. The sole source moves through a compact 8-native-pixel cycle;
the opposite foot recovers with at most 1.5px lift, while the staff tip plants
in source world space on frames 8–15. Both sole contacts drift at most 0.5px
from integer raster rounding, staff mathematical contact 0px. A gentle 1.35px
maximum bottom-only warp now sways the *whole* robe fabric without severing
the embroidered back. All 16 poses are unique, binary-alpha, one connected
silhouette; enlargement of hem, cape and wrist did not show the former torn
center seam or copied leg swatches.

Exported `gothic-north-v016/grey-wizard-fire-north.ora`, native layers and
frame atlas, `review/north-walk.gif`, four-cycle MP4, isolation GIF and pixel
ownership map. Exact OpenRaster layer audit, 16-frame/1330ms GIF, successful
MP4 decoding, deterministic source export and five focused v016 tests pass.
These are **source-art tests and visual previews, not owner acceptance**.

**Gates still open:** organic upper-body/shoulder motion is deliberately
limited while hidden anatomy is incomplete; actual in-game 2.5D preview,
mobile-size material/light pass, staff-ground occlusion, and real C# cadence
are unverified. The authored stride is only 3.64723 world units/cycle; at
source 12fps this implies 2.73542 world units/sec, whereas the C# base player
speed is 190. Do **not** change gameplay speed or cut this source into live
locomotion to hide that disconnect. The old v015 remains rejected and v016
remains in art review pending an explicit owner decision.

### North wrist/shoulder articulation — v017 (art review)

Source v016 retains its own checkpoint. v017 adds a separate 93-pixel grey
`wrist-cuff` from the actual gripping forearm and 206 *covered* native-palette
pixels of `sleeve-underlay`, beneath the true right sleeve/cuff only. This
underpaint is explicit grey garment anatomy rather than borrowing nearby boot,
staff or robe pigment. The grip/cuff/staff share one transform; shoulder root
stays attached to the robe while the forearm drape bends mildly toward the
travelling hand. The hanging sleeve remains its own part instead of dragging a
large arbitrary part of the embroidered back.

v017 retains the exact standing N source, binary alpha, sole/staff world contact
and full continuous robe. Its 13 editable OpenRaster layers and 16 poses pass
source reconstruction, fingertip/cuff transform, covered underpaint and detached
pixel inspections. Packaged `gothic-north-v017/grey-wizard-fire-north.ora`, a
1.33s GIF, a decodable four-cycle MP4, and enlarged shoulder/foot/robe views.
All 19 focused wizard JS tests pass across v017 and earlier reviewed directions.

This pass closes only the worst sleeve gap caused by moving a broad sleeve
polygon. It is **not** proof of a naturally complete stride, 2.5D-ground staff
occlusion or C# velocity fit. Source cadence still implies only 2.73542 world
units/sec at 12fps vs player base speed 190. PR remains draft; no live asset
cutover or merge without explicit owner acceptance and actual Hunt/device proof.
