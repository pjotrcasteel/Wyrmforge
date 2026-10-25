# WyrmForge — T0 Canonical Town Baseline and Acceptance Matrix

**Status:** IN PROGRESS — nine real runtime district screenshots captured and inspected; state, occlusion, performance and owner approval outstanding.
**Workstream:** [Town T0–T6](town-3d-rebuild-milestones.md), isolated PR #349 (`feat/town-3d-rebuild-t0-t6`); G4 PR #346 is paused.
**Reference:** current production `main` Town, not a redesigned mockup.
**Important:** This document distinguishes verified source facts from captured runtime evidence and unapproved visual acceptance.

## 1. Canonical asset inventory (verified in main)

Base art: `wwwroot/art/town/night-active.webp`, `day-active.webp`.

Night vacant overlays: `night-vacant-ArcaneNexus.png`, `night-vacant-Blacksmith.png`, `night-vacant-Codex.png`, `night-vacant-HallOfFame.png`.

Day vacant overlays: `day-vacant-ArcaneNexus.webp`, `day-vacant-Blacksmith.webp`, `day-vacant-Codex.webp`, `day-vacant-HallOfFame.webp`.

Approved Nexus school artwork: `nexus-approved/{arcane,binding,death,fire,frost,storm}.webp`; older `nexus-schools/{arcane,binding,death,fire,frost,storm}.png` assets also exist. **Do not assume the older PNGs are the production selection.**

Navigation/masking assets: `night-navigation.json`, `nexus-v2-walk-mask.svg`, `nexus-v2-well-foreground.svg`, `nexus-v2-noticeboard-foreground.svg`, `nexus-v2-foliage-mask.svg`.

## 2. Runtime paths and compatibility hazards (verified from source)

- `Features/Forge/CanonicalTownView.razor`: base panorama, night vacancy overlays, Nexus art/mastery overlay, building hotspot callbacks, World Gate callback, optional debug geometry and NPC view.
- `wwwroot/js/refuge-foreground-cutouts.js`: authored alpha cutouts for the well and noticeboard; preserve correct *partial* occlusion (do not hide the entire NPC).
- `wwwroot/js/town-v2-nexus.js`: optional `?townV2=1` navigation test uses a **rasterized walk mask**, not `night-navigation.json`; do not treat either as universal authority until reconciled.
- `wwwroot/art/town/night-navigation.json`: canonical 1672×941 source-coordinate data, including walkable, obstacles, destinations and foreground occluders. Navigation/collision polygons do **not** imply physically correct 3D caster/receiver geometry.
- `wwwroot/js/lighting/town-relightable-contract.js` on G4: migration adapter only; does not imply a production 3D Town.

## 2a. Verified geometry counts and migration hazards (2026-10-25)

The `night-navigation.json` source declares a **1672×941** painting-space canvas, **16** walkable polygons, **31** obstacle footprints, **30** destinations and **11** foreground occluders. These are distinct semantic layers and must not be merged into one mesh or used as direct lighting geometry.

The eleven occluders are: `noticeboard-foreground`, `well-foreground`, `west-gate-banner-foreground`, `east-gate-banner-foreground`, `west-lower-pillar-foreground`, `east-lower-pillar-foreground`, `hall-terrace-foliage-foreground`, `nexus-low-terrace-railing-foreground`, `world-gate-arch-roof`, `nexus-terrace-bushes-foreground`, `nexus-stairs-shrubs-foreground`.

**Navigation divergence to resolve:** optional `town-v2-nexus.js` uses a **6-pixel grid** and **8-pixel foot radius** against a rasterized mask; it explicitly does not use the JSON. It also defines separate well/noticeboard cutout bounds and depth rules. The production actor view and V2 are different runtime paths, so a T1 mesh must not silently replace either. Record route parity and occlusion screenshots for both before migration.

**Production visual-state caveat:** the Razor Town view directly references `night-active.webp` and night vacancy overlays. Day assets exist in the repository, but their presence alone does **not** prove that the current production Town renders a functioning day mode. C06 remains a runtime verification task.

**Interaction IDs verified in Razor:** Arcane Nexus = `build`, Blacksmith = `forge`, Codex = `codex`, Hall of Fame = `legends`; World Gate uses a separate `OnGate` callback. Keep these identifiers stable during 3D migration.

## 2a. Existing browser acceptance harness (verified from source)

`tests/Wyrmforge.Browser.Tests/WyrmforgeBrowserTests.cs` already provides valuable **real-browser Town screenshot automation**. It contains mobile Arcane Nexus mastery captures (`nexus-fire-baked-unlearned-{width}.png`, `nexus-fire-baked-invested-{width}.png`), per-school 390px captures (`nexus-school-{key}-390.png`), debug school captures, vacancy assertions, and an optional `/?townGeometry=1&townV2=1` NPC test. These are **test capture definitions, not evidence that the latest captures were downloaded or visually approved**.

The existing tests initialize game state through `localStorage` keys `wyrmforge.firstHunt.v1`, `wyrmforge.characterSchool.v1` and `wyrmforge.arcaneBuild.v1`; enter Town using the test helper; and select the central district with `window.wyrmforgeTown.show(1, false)` (west=0, center=1, east=2). Preserve these reproducible setup paths for T0 rather than introducing a competing screenshot mechanism.

**Next execution tasks:** expand active/vacant, occlusion and Town V2 runtime captures and measure baseline costs; owner approval remains mandatory. A green test alone does not mark visual cases approved.

## 3. Visual capture matrix — required real in-game evidence

Capture screenshots using identical gameplay state and camera position for both legacy and future 3D Town. Record **viewport**, device/browser, commit SHA, feature flags, building unlocks, school/mastery, time profile, district and NPC count. Save PNGs under an explicit T0 artifact name; **do not substitute static paintings or generated concept images for runtime screenshots**.

| Case | Viewports | Expected subject | Evidence status |
| --- | --- | --- | --- |
| C01 | 320×568, 390×844, desktop | Central district, default camera | CAPTURED / INSPECTED; awaiting owner approval |
| C02 | 320×568, 390×844, desktop | West district and both buildings | CAPTURED / INSPECTED; awaiting owner approval |
| C03 | 320×568, 390×844, desktop | East district and both buildings | CAPTURED / INSPECTED; awaiting owner approval |
| C04 | 390×844 | Four buildings active and each vacant state | PENDING |
| C05 | 390×844 | Six Nexus schools, representative mastery states | PENDING |
| C06 | 390×844 | Day/night state or existing actual day/night behavior | PENDING — confirm runtime availability |
| C07 | 320×568, 390×844 | NPC behind well roof/posts, noticeboard panel/both posts, foliage | PENDING |
| C08 | 390×844 | NPCs entering/exiting screen, walking, waiting, feet-depth masks | PENDING |
| C09 | 390×844 | Gate and four building hotspots in unlocked/locked states | PENDING |
| C10 | 320×568, 390×844 | Debug navigation/geometry and optional `townV2=1` | PENDING |

## 3a. First actual browser evidence — October 25, 2026

- Successful [Browser smoke run #40220067444](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40220067444), Town branch commit `3e3149f` (GitHub PR workflow checkout was based on the commit's merge ref).
- Browser artifact ID **12608874361** (`wyrmforge-browser-9763cd57ba2fae4a16faf6cd26740b13acf5add5`), retention until **2026-11-08**.
- Extracted and visually inspected all nine `browser/t0-town-{west,center,east}-{320x568,390x844,1280x800}.png` real runtime captures.
- **320px / 390px:** correct left, central and right composition, well/noticeboard and building artwork. **1280px desktop:** all three district captures show effectively the same full-width panorama, which is expected when the full panorama fits on screen; do not use them to claim independent district camera states.
- **Observed baseline hazard:** actors appear as simple colored vertical rectangles in these captures. They must **not** be mistaken for final NPC art or approved NPC masking. Identify whether this is the production actor's expected interim rendering or a regression before acceptance.
- The same browser artifact contains Nexus school and unlearned/invested screenshots from pre-existing browser tests; those **do not yet cover the entire C05 acceptance matrix**.
- **Missing:** active/vacant capture set, day-mode behavior, full C07/C08 feet occlusion playback, debug geometry and TownV2 snapshots, performance numbers, explicit owner sign-off.

## 4. Behavior and spatial regression checklist

- [ ] Three districts remain reachable by horizontal navigation; default central view retained.
- [ ] Four building interactions trigger existing callbacks and honor unlock/vacancy states.
- [ ] Nexus school and mastery appearance matches approved art.
- [ ] NPC foot placement, obstacle avoidance and behind-object masking match real production behavior.
- [ ] Both noticeboard posts and the well permit intended behind-object movement without whole-sprite disappearance.
- [ ] Gate interaction and NPC offscreen exits work.
- [ ] Existing NPC crowd count (including 14-agent stress scenario) is measured without adding AI behavior.
- [ ] Optional Town V2 path is separately captured and does not redefine production behavior.
- [ ] Current frame time, draw calls, memory and NPC simulation costs are measured on mobile or comparable WebKit.
- [ ] Existing sound/hotspot behavior and screen navigation remain intact.

## 5. T0 exit criteria and owner review

T0 is **NOT DONE** until: (1) screenshot matrix C01–C10 is captured from the running game, (2) behavior and performance baseline is recorded, (3) differences between raster, JSON and runtime navigation are documented, and (4) the owner approves the canonical reference set.

**Keep production art untouched until T0 approval.** Independent, nonproduction T1 schema/calibration and sample geometry may proceed on the isolated Town branch without activating a renderer switch. AI agent implementation is outside this workstream; see [AI0–AI6](unified-agent-ai-milestones.md).
