# G4 physical-device approval — GitHub Pages only

This protocol uses the **existing public HTTPS GitHub Pages deployment**, with an isolated G4 opt-in version. The player must **not** download artifacts, run Python/PowerShell, host a local IP address, set up a tunnel, or publish the draft engine to the ordinary game.

## Where to play

- **G4 GPU mobile candidate:** https://pjotrcasteel.github.io/Wyrmforge/g4-preview/?arenaGpu=1&gpuQuality=mobile&g4Review=1
- **G4 Canvas comparison, same game build:** https://pjotrcasteel.github.io/Wyrmforge/g4-preview/?g4Review=1
- **Normal production game (not the G4 test):** https://pjotrcasteel.github.io/Wyrmforge/

The G4 and Canvas comparison paths share one **pinned** experimental build. The ordinary game keeps the production Canvas renderer and must never be replaced by an unaccepted G4 renderer. A new G4 candidate is available only after the pinned Pages deployment passes.

**Important, 29 October 2026:** The iPhone owner rejected G4 candidate `d594948` as nearly black, confirmed by Chromium CI screenshot. [Repair PR #413](https://github.com/pjotrcasteel/Wyrmforge/pull/413) improves authoritative hunter/ambient night visibility and WebKit copy behavior; [Pages PR #414](https://github.com/pjotrcasteel/Wyrmforge/pull/414) prepares the new pinned candidate. Until the updated Pages workflow is green, the URL may still show the rejected build. **Do not use an old screenshot as approval.**

## iPhone Safari and Android Chrome review

1. On a real phone (not desktop emulation), open the **GPU mobile candidate** directly in the normal browser. Note the phone model, OS version, battery before/after and whether battery saving/reduced motion is enabled.
2. **Before any game menus**, the G4 test page shows one full-screen choice: **Share performance results privately** or **Keep private on this phone**. Tap either button once. Nothing uploads without the first choice. There are no sharing controls hidden in the Hunt. After the choice, start **Free Play → First Hunt** and verify the mage, enemies, ground and spell lighting are visible. A near-black scene with an operating HUD is a failed visual gate.
3. **Recording starts automatically in the real Hunt** whenever the G4 review URL is used. Move/aim/cast/fight for 5–10 minutes or until death. Verify sprite edge sharpness, ground detail, occlusion, lighting and absence of black frames. You do not need to press Start.
4. **On death, victory or navigation, G4 keeps the last timing summary on the phone.** It also checkpoints measurements locally every five seconds. The compact bottom-right G4 panel survives the destroyed Hunt screen and displays the last run's frame rate and p95. There is no JSON export step.
5. With **Share performance results privately** selected on the first screen, a compact, privacy-allowlisted timing report is sent after each Hunt. With **Keep private on this phone**, nothing uploads. Every new G4 test-page load shows this one choice again, so you can change it without entering a Hunt. No raw device user-agent, exact viewport, per-frame traces or movement coordinates are uploaded; accepted collector reports are retained for up to 30 days.
6. Take an actual gameplay screenshot if judging graphics, and note battery percent, perceived device warmth, stalls and input lag.
5. Repeat the same flow on the **Canvas comparison** URL with similar game actions. Do not claim the browser FPS difference is controlled without a matched scene/seed. Repeat on the other platform if available.

## Evidence to return

No file export is required. With private delivery consent enabled, the frame pacing summary goes directly to the existing WyrmForge playtest collector and remains visible on the phone after the Hunt. Send one genuine gameplay screenshot for visual approval and say **"GPU visuals approved"** or **"GPU visuals rejected"**, with any visible issues. If the collector cannot be reached, the local last-run summary remains on the phone. Performance, battery and thermal device acceptance are separate human observations.

The JSON measures **requestAnimationFrame timing** (p50/p95/p99; per-minute warm-up trends), sampled CPU submission and GPU-upload counts, renderer-fallback/missing frames and runtime errors. It cannot measure genuine GPU time, GPU VRAM, GPU temperature, battery power draw or thermal throttling directly. Those require physical instrumentation or user observations.

The G4 milestone remains **unaccepted** until mobile visual quality and sustained real iOS/Android performance meet agreed budgets. G5 default renderer cutover, the painted Town, AN0–AN6 and the AI/Arena engines are independent and unaffected.


## First real iPhone acceptance evidence — 30 October 2026 (PARTIAL, not sign-off)

The owner supplied **four unmodified, real iPhone screenshots** from the isolated Pages
candidate `v0.0.180-g4-preview · 4244d63`. The screenshots were supplied in the
review conversation; no AI-generated images or desktop mockups are used as evidence.
The separate Pages deploy and smoke run [41017988776](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/41017988776)
passed. Shared GPU proof runs [41017896048](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/41017896048)
and [41017902579](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/41017902579)
also passed on the integrated branch.

| Actual iPhone observation | Evidence / finding |
| --- | --- |
| Recorder persistence and consented delivery | Run-lost screen shows **G4 · 49 FPS · p95 33ms · SAVED**, plus **G4 saved and privately received**. **PASS**: no export and no loss on death. Collector receipt is screen-confirmed; detailed private per-run data was not retrieved by the reviewer. |
| Timing | Saved panel reports **48.98 observed FPS, 33ms p95, 282.22s recording elapsed**. The gameplay results screen separately shows **219s** for that run. These are different clocks; do not call the whole 282.22s active gameplay or infer GPU execution timing from rAF pacing. |
| Actual play | The results screen shows **73 kills across four trails**, with player-controlled movement, enemies and spells visible in the preceding screenshots. |
| World readability | Trail 1 (Abandoned Road) and Trail 3 (Wet Forest) show clear terrain and the hunter in the middle of combat. **Trail 2 (Wet Forest)** is much darker: most of the world outside the narrow hunter light radius is difficult to discern. This is an **open visual regression/acceptance concern**, not an approved Gothic night. Require source-based lighting investigation and a new *real-Hunt* screenshot after any fix. |
| Post-death presentation | An **expanded G4 diagnostic overlay visibly covers portions of the rewards/actions screen**. Follow-up code in the same G4 workstream collapses and re-docks the saved summary at Hunt completion; validate on mobile before calling the overlay accepted. |
| Battery and temperature | The iPhone battery indicator shows a charging symbol and an increase from about **25% to 29%** between captures. Consequently the screenshots cannot establish battery *drain*. No device thermal or power instrumentation is provided. |
| Other required acceptance | No matched Canvas comparison, Android physical-device run, sustained 10-minute thermal/battery trace, input-latency assessment, GPU memory/time instrumentation, or owner approval of the dark Trail 2 appearance is included in these screenshots. These gates remain **OPEN**. |

**Disposition:** The previously blocked *recording + death persistence + private receipt*
acceptance slice is now confirmed by **real-device** proof. G4 overall remains
**partially accepted, not complete**, because scene-wide readability and sustained
cross-device performance/thermal acceptance remain open. G5 production cutover is
a separate milestone. Preserve the painted Town, C# source authority, other engine
work and the default Canvas Hunt. Do not ask for another JSON export.


## Follow-up mobile GPU visual defects — 30 October 2026

The same iPhone review reports **the mage partially buried in the ground, Bell Warden and Wyrm silhouettes distorted or sunk, and frequent screen tearing/flicker**. These were not approved by the owner. The G4 presentation fixes are staged in [PR #424](https://github.com/pjotrcasteel/Wyrmforge/pull/424), after the owner screenshot evidence:

- **Generic sprite-foot geometry:** source captures originally put the C# position at 75% of the texture height, but the painted feet and boss tails extend farther down. The old default billboard translated its plane by only 25% before tilt, placing its lower quarter *below* Z=0, where terrain depth could hide it. The single shared upright plane now starts on Z=0. The Hunt's existing Canvas paint extents give each actor a **data-driven painted-foot fraction** (mage, standard enemy including Bell Warden, Wyrm), which the existing generic atlas-frame binding crops and scales without discarding visible legs or tails. Unit tests cover grounding, per-source crop UVs and no negative-Z vertices. This is a renderer adaptation, not an animation or C# collision change.
- **Mobile tear prevention:** compose complete GPU-world, actors, VFX, HUD and overlays into a reusable correctly DPR-sized Canvas staging surface, then copy that completed frame **once** to the visible interactive Canvas with nearest-neighbor sampling. This preserves the existing single shared GPU lighting renderer and gameplay authority. The extra staging copy can cost mobile memory/bandwidth: the device-level frame pacing gate remains required. Unit tests check reuse, transforms, no interpolation and single visible presentation. No GPU timer or memory measurement is invented.
- **Other G4 review UI:** the post-Hunt G4 report collapses/moves away from the rewards; the separate preboot consent and private delivery remain intact.

**Acceptance remains open:** The above are source-backed repairs, not visual owner approval or proof of zero tearing on iPhone. Rebuild the isolated pinned Pages candidate **only after the exact-head tests pass**, obtain real iPhone screenshot/video proof of an upright mage, Bell Warden and Wyrm with correct foot contact and no frame tearing under camera movement, and verify p95 frame pacing has not regressed versus the prior 33 ms result. Do not fold GPU defaults into production or close G4 prematurely. The dark Trail 2 scene is still an outstanding independent visual concern.


## G4 low-cost terrain isolation — 30 October 2026 (owner-requested)

The owner reported the updated GPU iPhone preview remained slow, with squashed actors
and no visible Fireball light affecting the Hollowed. They suspect the high-resolution
Wet Forest tile images and asked to **temporarily remove those images**.

The experimental G4 **GPU review** (`?arenaGpu=1&gpuQuality=mobile&g4Review=1`)
now defaults to **flat terrain colors from the existing C# ground recipe**. On
Wet Forest it skips all PR #340 900px material image requests/decodes, the
source-backed atlas mosaic, 12px classification array, and synthetic microtile
stamps. It paints a single soil color, broad ground patches and the connected
source-defined trail and site. Other G4 terrain skips the legacy art-tile pattern.
No environment collision, walkability, seed, C# authority, actors, lighting
emitters, shadow engine, VFX, or approved source image is deleted.

- **Default low-cost G4 GPU:** `/g4-preview/?arenaGpu=1&gpuQuality=mobile&g4Review=1`
- **Same GPU with previous painted ground:** append `&g4PaintedGround=1`
- **Canvas A/B with the same flat ground:** `/g4-preview/?g4Review=1&g4FlatGround=1`
- **Production:** unchanged full art; this simplification is *not* enabled for
  normal Hunts or the existing art/material labs.

This isolates *tile-image decode/terrain-bake cost*. It does **not** yet remove
the large GPU ground Canvas capture and its per-frame upload/compositing cost, so
improved sustained FPS is a **hypothesis**, not a promised result. Use the
existing automatically saved G4 p95/FPS report; compare with the prior observed
48.98 FPS / p95 33ms on iPhone, noting that different runs are not controlled.
The reported mage/Warden/Wyrm squash, missing Fireball illumination/shadow on
Hollowed, and tearing/heat remain **open separate visual acceptance problems**.
Do not mark G4 or production GPU cutover complete based on a flat-ground build.


## Owner rejection: Fireball directions, missing lighting and mobile performance (30 Oct 2026)

After the first GPU contact/atomic-present candidate, the owner reported **visibly
squashed mage, Bell Warden and Wyrm**, **very poor performance**, **Fireballs
vanishing in some aim directions**, and no convincing Fireball light/shadow
response on the Hollowed. The source-backed tile-free test has been committed
separately; it removes 900px ground images but cannot fix these independent bugs.

Follow-up draft repair (review gate still OPEN):

- The C# Fireball stays authoritative for travel, position, heading, lifetime and
  **actual GPU light and shadow**. Its authored 16-frame V5 albedo/emission art
  is drawn in the existing **camera-independent 2D directional sprite pass after
  GPU world shading**. Do not also submit the rotated GPU projectile plane and
  suppress its Canvas image: a camera-facing billboard must not disappear when
  rotated. Tests exercise eight directions, both V5 channels and the same frame.
- The shared GPU actor geometry stays ground-contacted but uses the **entire
  source sprite's original height**. Per-artwork foot metadata may position the
  object; it must never shorten/crop its vertical artwork. JS regressions cover
  mage, enemy/Hollowed, Bell Warden and Wyrm aspect.
- The existing C# Fire projectile light retains its 144px radius and real
  shadow flag but uses **higher direct-light intensity (6)** for meaningful
  contrast against moonlight and the hunter's visibility source. No second
  client-side light or invented hit effect is created. Regression checks that
  the mobile six-view shadow budget selects the real emitter and Hollowed
  cutouts receive light/shadow.
- The additional full-screen 2D presentation staging pass is disabled by
  default; Safari's preserved WebGL source buffer and a synchronous single-rAF
  visible Canvas remain. For A/B, `&g4StageFrames=1` explicitly restores
  staging on the opt-in G4 review. This targets unnecessary framebuffer copies;
  do not claim zero tearing or improved iPhone p95 without device measurements.

**Must validate before accepting G4:** genuine iPhone playback showing all
eight Fireball headings, Hollowed visibly illuminated with correct opposing
shadow when the Fireball passes, the mage/Bell Warden/Wyrm at native proportions,
camera scroll without tearing, and saved FPS/p95 compared with the original
~49 FPS / 33ms p95. Maintain flat-vs-painted terrain A/B, iPhone/Android
temperature gates, and unreadable Trail 2 as open issues. No JSON export.


## G4 physical iPhone projection regression — 30 October 2026

The owner supplied another genuine iPhone Safari screenshot of the deployed
`v0.0.180-g4-preview · eca7e51` showing that Fireball effects were improved
but the overall actor/game presentation was still visually compressed/squished.
This screenshot is real user evidence, not an AI-generated preview.

**Root cause found in the shared G4 adapter:** the legacy source is an
already-painted, camera-relative Canvas capture with exact `x/y/width/height`.
The GPU billboard kept its full image but translated its bottom to
`y + footFraction * height`, shifting the *whole image* vertically by
`(1 - footFraction) * height` relative to the original Canvas renderer.
The foot fraction describes a point *inside* the art, not its clipping,
aspect ratio, or rectangle origin.

**G4 fix:** preserve the complete capture at its original pixel rectangle,
and anchor the GPU billboard bottom at `y + height`. Keep the same
orthographic camera, source world geometry, 45-degree upright cutout plane,
lighting material, C# actor positions, and image dimensions. Leave internal
painted foot metadata intact for future separate caster/occlusion work;
it must not move or compress visible image pixels.

**Deterministic regression:** project the real Three.js `huntActorGeometry`
through the exact G4 orthographic camera at **320x568, 390x844, 402x656,
844x390** and verify the resulting on-screen rectangle equals the authored
Canvas capture within 0.001 pixels for the mage, Warden and Wyrm. No
CSS stretching, new renderer, or C#/animation changes.

**Acceptance remains open:** the owner must check a real iPhone snapshot
after the newly pinned preview deploy and approve actor silhouette
proportions and ground contact. Mobile FPS/p95, Fireball-to-Hollowed shadows,
Trail 2 readability, tearing and Android power/thermals remain independent
open G4 gates. Do not infer physical device acceptance from browser tests.
