# Selected Town integration — T2 remains unapproved

Continuation of draft PR #368, opt-in only. The live Town is unchanged. No T3–T6 work.
Canonical direction: [Town](../canon/town-and-ux.md), [art](../canon/art-and-animation.md).

## Source selection

All **ten attached JPEGs** are preserved byte-for-byte at
`src/Wyrmforge.Presentation.Web/wwwroot/art/town/selected/2026-10-27/`.
`manifest.json` records dimensions, SHA-256, full crop, no alpha, explicit roles,
owner-reference approval and measured SIFT/RANSAC correspondence with canonical art.
No older ZIP supplies this selection. All are 1536×864. There is no genuinely unlit
color base or ungridded combined night frame; none is installed as a full RGB light
contribution, normal map or physical depth map. This is not a request for more images.
The five isolated references remain the visual target. Day and grid references
have about 1.088× scale correspondence; the isolated references are not reliably
pixel registered. Localized feature fits are not whole-image registration proof.

## Implementation

- Same G1–G3 LightingEngine, 1672×941 art projection and current gameplay bridge.
- 28 bounded fixtures, one exclusive domain per fixture. Chimney only Blacksmith.
- Two runtime-tinted neutral magic emitters: Nexus dome and portal. Existing six-school
  palette, actual C# TownNexusRadiance strength, no second progression or save write.
- One stable scene receiver across unlocks/isolation; removed overlapping building diffuse plates. Only emissive objects and light
  descriptors change. Public sources remain available with every building vacant.
- Pure snapshot policy tested across isolation, vacancy, day, night, strict zero,
  exposure, six schools and source-hash integrity.
- Live bridge now observes scene-level unlock/school/mastery/time changes and the
  existing device-local town-time event. Cleans up listener/observer/frame on teardown.
- Explicit cloth-and-gold exclusion masks. Public lantern apertures are bounded
  source-authored masks, not differences against a falsely inferred dark frame.
- Hand-authored skyline MATERIAL ALPHA removes distant painted moon/sky/lake at night;
  it is not claimed as depth/collision/shadow geometry. Day retains day background.
- Original well remains default. Separate previous Stage4 art requires explicit opt-in.
  In the domain proof only narrow original support contours cast shadows; broad
  camera-facing roof/rim/terrace proxies are not reliable physical shadow volumes.
- Exact selected reference and SHA beside the GPU lab. Capture matrix includes every
  domain and strict off at 320, 390 and 1120 widths, with per-frame diagnostics.

## Verification and limits

Initial checkpoint: 69 focused Town JS tests passed. Current mask slice: 71 passed.
21 original Town source hashes verified unchanged. Real local Chromium SwiftShader
now renders the shared engine (software GPU, not physical iPhone/Android performance).
First common-only frame confirms native projection, 15 common sources, chimney OFF,
bounded .025 night ambient and black negative space. This is **not visual approval**.

Material candidates still derive from painted canonical sources; they are not
artist-authored neutral PBR albedo. The selected 1536 uploads were not stretched into
1672 geometry. Current public pools/well and all building masks still require final
side-by-side QC. Full C# build/actual-game phone screenshots and latest CI are pending.
Do not merge or replace the live scene on the strength of unit tests.


## GPU QC correction after first full matrix

The historical `day-vacant-ArcaneNexus.webp` visibly contains block-corrupted edges
and a painted blue portal/dome. It is no longer used as a night reflectance source.
Removed the four overlapping diffuse building plates entirely: one stable registered
night-vacant composite receives real engine lights, with a bounded linear exposure
candidate (gain 4) and no geometry interpolation. Public glass/flame and building
warm/magic masks remain independent shared-engine emissive materials. Foreground
cutouts use the exact original source with bounded gain, avoiding a daylight roof halo.
This is a candidate reflectance correction, **not recovered physical neutral albedo**.
Night isolation uses the same small .025 environment as combined; strict off/zero
still disable ambient, all sources and emission. The explicit sky alpha keeps the
moon, distant landscape and background black independent of the light subset.

A first complete genuine GPU matrix passed readiness and zero-black pixel checks at
320/390/1120 widths; its median public paving was 44 (reference tolerance 24–65).
Those first frames exposed the painted-magic issue, so fresh final frames must replace
them before visual review. All 525 JS tests passed after main reconciliation; the
latest reflectance correction has 71 focused tests passing. Physical-phone performance
and owner visual approval are still absent.


## Final code checkpoint and owner-review evidence

Rendering checkpoint: [`0a5c01e`](https://github.com/pjotrcasteel/Wyrmforge/commit/0a5c01e7748eccf83f219d5dcb3be127065fdc5f).
**T2 still requires owner visual review; draft, unmerged, no production cutover.**

- **528/528 JavaScript tests** pass after the last rendering change; **73/73** focused Town tests pass.
- **21** original approved Town asset hashes remain unchanged.
- **59 genuine browser screenshots** saved, plus labeled crops/GIFs and per-frame JSON.
  All seven light subsets are captured at **320, 390 and 1120px**. New aperture
  frames and common/combined/off calibration frames were recaptured separately;
  their exact runtime JS hashes are in per-frame metadata rather than falsely
  claiming every image came from one identical intermediate commit.
- Every strict-off native framebuffer reports **zero nonblack world pixels**.
  Common-only chimney is OFF; Blacksmith-only chimney is ON; neutral Nexus magic
  is `#ffffff`. Public paving median is **43**, within the existing reference
  tolerance **24–65** (selected reference about **36**); this is not visual signoff.
- The actual shared WebGL renderer passes the live-update regression: a temporary
  zero inspector remains black after a citizen/clock update, clearing it restores
  authoritative day, and teardown disposes resources. No progression/save writes.
- CI .NET build, tests and publish passed at the final rendering checkpoint `0a5c01e`; latest full CI/browser
  acceptance must be checked separately. Physical iPhone/Android performance
  and final visual matching remain unverified.

[Selected common reference vs genuine GPU](previews/town-selected-common-2026-10-27.jpg)
(left reference, right GPU) and [all five domains](previews/town-selected-five-domains-2026-10-27.jpg).
Exact identifiers and screenshot hashes: [comparison metadata](previews/town-selected-five-domains-2026-10-27.json).
The owner also has the 38MB screenshot/runtime bundle with all ten unchanged uploads,
59 raw browser frames, diagnostic exports, validation logs and a local-server GPU lab.
That lab is the same renderer/modules, not a published full-game PR deployment.

Remaining approval limits: bounded reflectance candidates still originate from
painted canonical sources, not artist-authored neutral physical albedo. The hand
skyline and limited support shadow proxies are approximations, never ground-truth
scene geometry. The approved selected frames are references because their geometry
is not reliably registered for subtraction. No full RGB night states are stacked.

## T2 follow-up: remove public pillar hotspots

The first owner-facing comparison exposed pale, concentrated pillar highlights.
Public lamp proxies were only .12–.14 world units in front of the receiving painting,
causing inverse-square spikes. Raised those ten public proxies to .5 without moving
their canonical screen anchors, changing engine shaders, light ownership, art or saves.
This is proxy calibration, not a claim of measured architectural height. Existing
common-only capture confirms chimney OFF and neutral-white diagnostic state. A fresh
same-code desktop/mobile visual set follows this checkpoint; owner approval is pending.

### Follow-up visual proof (rendering checkpoint `1fd8cf7e`)

Public intensity was then reduced from .55 to .4 after correcting the lamp-to-receiver
separation. Fresh **59/59** genuine shared-GPU captures use this same rendering code,
with per-frame module/screenshot hashes. **73/73 focused Town tests** pass; the **21
original asset hashes** remain unchanged. Every world pixel is RGB zero in strict-zero
and domain-off at **320, 390 and 1120px**. Common-only chimney OFF, Blacksmith-only ON.
Paving median is now **38** (selected reference roughly 36), versus 43 at the previous
checkpoint. Pixel brightness is only a guard, not proof of matching colour or light shape.

- [Phone-friendly selected reference ABOVE / actual GPU BELOW](previews/town-selected-common-soft-pools-2026-10-27.jpg)
- [Previous GPU ABOVE / corrected GPU BELOW](previews/town-common-gpu-before-after-2026-10-27.jpg)
- [Fresh five-domain comparison and exact source metadata](previews/town-selected-five-domains-2026-10-27.json)

Known visible differences remain: paving is warmer/yellower than the selected common
reference; the original canonical gate does not contain the extra rooftop flames shown
in that reference. Its existing gold roof ornaments must not be converted into emitters.
No new rooftop torch artwork, painted-source substitution or colour-wash workaround was
introduced. These differences are for owner review at T2, not a claim of visual completion.

CI at previous `bd205f598` completed Validate, shared GPU, WebKit and both Town GPU lab
and actual-game mobile acceptance successfully (Town run **40462347006**). Actual-game
320/390 screenshots were downloaded and visually inspected: they preserve the real
HUD/camera crop but use the **previous** lamp calibration. New rendering-code CI is still
running; do not mislabel prior screenshots as the new result. Physical iOS/Android
performance remains unverified. The new 59-frame browser proof bundle is supplied to the
owner separately. The full local JS rerun encountered automatic network-review blocking
of an unrelated `example.test` request; focused Town checks remain independently green.

**STOP: T2 owner visual approval required. No T3–T6, merge or live cutover.**

## Owner rejection: wet paving, well artifacts and missing lanterns

The owner rejected the prior T2 image. It must not be treated as approved.
The night painting itself contains specular-looking streaks; lowering GPU specular
cannot remove them (the domain materials already had reflection disabled).
The corrected candidate uses only original canonical daytime paving within the
existing ground mask, with bounded illumination normalization. It is dry-looking
painted material, **not recovered physical albedo**. A 28px material boundary blends
back to the original surrounding receiver; it does not feather around the well/board
holes, which would reintroduce the wet halo. No post-render wash or second scene.
The domain floor shares the camera-facing normal with adjacent painted masonry;
roughness 1, specular 0, reflections OFF. Original source bytes remain unchanged.

Foreground well/board textures now sample the **same already-calibrated source** as
the scene behind them, rather than a separate scene with gain 3 versus 4. Original
flat support extrusions no longer cast or receive misleading rectangle shadows in
domain mode. Feet-depth foreground occlusion remains present; no collision changes.
The existing daytime ground also contains a painted well shadow, so this remains a
candidate rather than proof of physically correct movable shadows.

Five omitted public point sources are registered with exclusive common ownership:
west/east gate-foot lanterns (693,362)/(970,362), west/east wall lanterns
(458,476)/(1073,424), lower-west lantern (540,710). Their bounded glass emission
masks and the missing noticeboard lantern mask are added. Common now has 20 sources;
all five groups total 33. Explicit local cap 40 prevents silently dropping source 33;
shadow budget remains 8, no per-light shadow maps added. **75 focused Town tests pass**.
Fresh GPU close-ups and zero-light/mobile checks follow; T2 remains unapproved.

Close-up QC found that the inherited foreground polygons included several pixels
of paving above the well roof and beside the noticeboard/posts. Those pixels were
retaining a cut-paper halo over the dry ground. Added **T2-only** tighter alpha paths
traced against original full-resolution pixels. The production `CUTOUTS` array and
collision map remain unchanged. Both the dry-ground exclusion and raised foreground
use the same corrected paths, so the halo cannot be cured in only one of the layers.

Extended only the dry ground material mask along the existing World Gate stair and
southern approach coordinates, so the painted wet streaks do not continue through
those two public routes. The navigation/collision data itself is untouched. The
75 focused Town tests remain green after the expanded material bounds.

### Corrected T2 owner-review proof

Rendering checkpoint **59c2d2b3b267d623fdb78d1b126f3dd9e4859b19**.
13 browser cases captured as both native 1672x941 framebuffer PNG and viewport PNG:
previous rejected common render; current common/combined/off at 320,390,1120;
day at 390; isolated Blacksmith and white Nexus at 390. No image generation or
rendered-pixel recoloring. Exact module/screenshot hashes accompany each frame.
Every native off framebuffer is entirely RGB zero. Common has 20 sources and chimney
OFF; combined has all 33; isolated Blacksmith has chimney ON. 75 focused tests and
21 immutable asset hashes pass. Latest CI and physical-phone performance are pending.

[Full native corrected common render](previews/town-common-dry-cleanup-2026-10-27.png).
[Rejected LEFT / corrected RIGHT well close-up](previews/town-well-dry-cleanup-closeup-2026-10-27.png)
uses source crop (650,375)-(970,585), enlarged 2x with nearest sampling in lossless PNG.
[Exact proof/source metadata](previews/town-dry-cleanup-2026-10-27.json).
This addresses the owner's wet-look, cutout halo and missing-lantern feedback;
it is still a T2 candidate awaiting visual approval, not a live Town replacement.

## Owner circled-area and colour correction

The owner marked the roof window, gate sconces, upper-east foot lantern, well roof,
side ground transitions and both lower lamp pools. The previous result remains rejected.
Found a real hue error in the exposure candidate: independent RGB clipping changed
bright orange source pixels into pale yellow/green-looking patches. Exposure now uses
one shared bounded linear-RGB gain per pixel to preserve source channel ratios. Public
illumination is a less-yellow `#fff0e3`; warm glass/flame emission remains source-coloured,
with a softer threshold knee and reduced common emission (.95 instead of 1.4).
Only the dry **ground material candidate** retains .45 of source chroma, reducing the
orange/green stone cast; no screen-space filter or whole-building/flag tint is applied.
The four circled side/lower ground lanes now use the same dry material mask, following
existing public ground coordinates. No geometry, collision, progression or source-art
modification. 77 focused Town tests pass, including hue preservation and source-alpha
regressions. New GPU proof follows this checkpoint; no T2 visual approval is claimed.

Close-up review also caught dry-ground coverage overlapping the projected Hall roof
and the western shop silhouette. Ground walkability does not imply visible ground:
the material mask now excludes those source-aligned scenery contours, retaining the
canonical vacant-state window/roof pixels rather than borrowing day-building pixels.
No collision or gameplay map change. This correction is included in the final proof.

The close-ups still showed double-orange masonry beside the gate sconces. Added a
bounded, feathered reflectance-chroma correction on those two source-aligned stone
patches only. Flame/glass apertures and adjacent banners are explicitly retained;
this removes painted wall colour multiplying the real warm engine lights. It is
candidate material authoring, not a screen tint or physical albedo recovery. 78
focused tests pass, including glass/banner/source-alpha preservation.

Magnified sconce QC isolated a second source of the stamped glow: the public emission
bounds included warm brick. Tightened the three gate apertures to actual flame/glass
and raised the public brightness gate, with a soft knee requiring both red and green
brightness. Warm brick is now explicitly rejected by a regression test. Sconce stone
correction uses an elliptical zero-at-edge falloff; it does not leave a rectangular
gray patch or preserve a rectangular orange hole. **79 focused tests pass**.
