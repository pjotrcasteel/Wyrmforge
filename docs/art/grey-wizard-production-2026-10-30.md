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
