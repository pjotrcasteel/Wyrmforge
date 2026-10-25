# WyrmForge — T0 Canonical Town Baseline and Acceptance Matrix

**Status:** IN PROGRESS — source audit recorded; screenshots, runtime observations and owner approval outstanding.
**Workstream:** [Town T0–T6](town-3d-rebuild-milestones.md), G4 PR #346.
**Reference:** current production `main` Town, not a redesigned mockup.
**Important:** This document records **verified source facts**, not claimed runtime or visual QA. No in-game screenshots have been inspected for this T0 pass.

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

## 3. Visual capture matrix — required real in-game evidence

Capture screenshots using identical gameplay state and camera position for both legacy and future 3D Town. Record **viewport**, device/browser, commit SHA, feature flags, building unlocks, school/mastery, time profile, district and NPC count. Save PNGs under an explicit T0 artifact name; **do not substitute static paintings or generated concept images for runtime screenshots**.

| Case | Viewports | Expected subject | Evidence status |
| --- | --- | --- | --- |
| C01 | 320×568, 390×844, desktop | Central district, default camera | PENDING |
| C02 | 320×568, 390×844, desktop | West district and both buildings | PENDING |
| C03 | 320×568, 390×844, desktop | East district and both buildings | PENDING |
| C04 | 390×844 | Four buildings active and each vacant state | PENDING |
| C05 | 390×844 | Six Nexus schools, representative mastery states | PENDING |
| C06 | 390×844 | Day/night state or existing actual day/night behavior | PENDING — confirm runtime availability |
| C07 | 320×568, 390×844 | NPC behind well roof/posts, noticeboard panel/both posts, foliage | PENDING |
| C08 | 390×844 | NPCs entering/exiting screen, walking, waiting, feet-depth masks | PENDING |
| C09 | 390×844 | Gate and four building hotspots in unlocked/locked states | PENDING |
| C10 | 320×568, 390×844 | Debug navigation/geometry and optional `townV2=1` | PENDING |

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

**No 3D replacement meshes or changed production art are authorized by this audit.** Start T1 only after T0 evidence and review are available. AI agent implementation is outside this workstream; see [AI0–AI6](unified-agent-ai-milestones.md).
