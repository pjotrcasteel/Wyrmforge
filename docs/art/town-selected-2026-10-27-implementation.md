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
- 27 bounded fixtures, one exclusive domain per fixture. Chimney only Blacksmith.
- Two runtime-tinted neutral magic emitters: Nexus dome and portal. Existing six-school
  palette, actual C# TownNexusRadiance strength, no second progression or save write.
- Stable diffuse receivers across unlocks/isolation. Only emissive objects and light
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

Initial checkpoint: 69 focused Town JS tests passed. Current mask slice: 70 passed.
21 original Town source hashes verified unchanged. Real local Chromium SwiftShader
now renders the shared engine (software GPU, not physical iPhone/Android performance).
First common-only frame confirms native projection, 14 common sources, chimney OFF,
zero isolation ambient and black negative space. This is **not visual approval**.

Material candidates still derive from painted canonical sources; they are not
artist-authored neutral PBR albedo. The selected 1536 uploads were not stretched into
1672 geometry. Current public pools/well and all building masks still require final
side-by-side QC. Full C# build/actual-game phone screenshots and latest CI are pending.
Do not merge or replace the live scene on the strength of unit tests.
