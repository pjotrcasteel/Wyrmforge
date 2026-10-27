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
