# WyrmForge — active development handover

**Reviewed:** 15 October 2026  
**Repository:** https://github.com/pjotrcasteel/Wyrmforge  
**Playable build:** https://pjotrcasteel.github.io/Wyrmforge/  
**Canonical branch:** `main`; the playable URL is only current after the Pages deployment's **deploy** job actually succeeds.  
**Open work and PR dispositions:** [repository triage](repository-triage-2026-10-15.md).

## How to continue this project

Develop against current `main` and inspect recent merged PRs before writing code; do not work from a historical chat summary alone. Build **real vertical slices**: implement canonical C# behavior (when gameplay is involved), corresponding presentation, deterministic/unit tests, and 390px browser checks in the same increment. Prefer concrete code, PRs and verification over speculative briefs. Progress until meaningfully validated, not one tiny commit per request. Never label a screenshot, research draft, or passing headless test as approved art.

The game is a dark, violent, roaming action roguelite, **not a stationary lane incremental game**. Diablo I/II environments and atmosphere, StarCraft's sound identity, and the specific [Legion Breaker / Battlemage visual study](../design/battlemage-visual-reference.md) inform original work; do **not copy** those games' proprietary sprites, sounds, compositions, or mechanics.

## Current technical foundation

- **C#/.NET 10 Domain and Application:** deterministic Wyrm/Great Hunt, extraction, encounter, spell, progression, terrain/barrier and snapshot state. Preserve one canonical game state and a testable simulation.
- **Web presentation:** Blazor WebAssembly, JavaScript Canvas2D and authored pixel materials. World camera and player/enemy positions are derived from canonical C# snapshots. `src/Wyrmforge.Presentation.Web/wwwroot/js/arena.js` composes `arena-environment.js`, `arena-cloister-art.js`, `arena-mage.js`, mage frames, enemy art, spell-lighting and VFX.
- **Gameplay direction:** commit to one primary magic attack; combinations such as Fire + Frost produce **one coherent Frostfire cast** rather than uncontrolled parallel streams. Powers, ranks and Surge must feel and look different; slow deliberate cast motions must be **presentation-only**, not movement/cooldown penalties. Visual-only injury does not lower combat effectiveness.
- **Progression:** First Hunt unlocks the Atlas/Codex with the initial point; second hunt opens the Hall of Fame. Eligible subsequent hunts grant Arcane points up to the cap (port of [#67](https://github.com/pjotrcasteel/Wyrmforge/pull/67) in [#115](https://github.com/pjotrcasteel/Wyrmforge/pull/115)); do not duplicate first-hunt credit or reward abandoned runs.
- **UI:** one-glance meaning, no scroll to discover essential combat status, no help-question-mark as substitute for readable signals. Research RFC: [visual-first magic UI](../design/visual-first-magic-ui-rfc.md). A future Magic Lab is intentionally NOT part of the current gameplay implementation.
- **Art:** keep the consistent slate-blue mage robe and pale collar, **thin upright recognizable staff**, deliberate wind-up/release/Surge frames; avoid hammer-like head shapes and facially ambiguous weapon grips. The flooded monastery must read as damaged historic cloister architecture rather than a cave, random arches, fake spires or neatly repeated monoliths. Use fixed world-space wall planes, actual C# masonry/barrier footprints, gate states and character-foot depth ordering. Never camera-face all props or invent collisions for scenery. [Monastery art slice](../art/legion-breaker-cloister-vertical-slice-v1.md), [motion/lighting](../art/monastery-motion-light-v2.md), and the [#114 perspective correction](https://github.com/pjotrcasteel/Wyrmforge/pull/114).
- **Audio:** recorded-instrument/Foley + licensed human-created audio *candidates*, not approved assets. Research and provenance: [audio rebuild](../audio/classic-dark-fantasy-rebuild.md), [unreviewed candidates](../audio/licensed-audio-candidates.json). Listening, file provenance/licensing and sustained in-game fatigue tests are mandatory before swapping out sounds.

## Latest review gate (15 October)

1. **#114 merged:** corrected staff, removed random cloister spire-like monoliths, introduced world-space wall elevations and depth ordering, improved school-colored mage lighting and replaced prison-like gateway bars. JavaScript/.NET validation and Chromium browser CI passed on the tested PR head. This is **not** proof that real iPhone screenshots meet the desired visual-quality bar.
2. **#111 and #94 merged as documentation only:** a design RFC/visual reference and an audio research proposal. They shipped **no licensed audio binary, magic laboratory, UI redesign or approval of the proposed art assets**.
3. **Arcane-points fix merged:** [#115](https://github.com/pjotrcasteel/Wyrmforge/pull/115) ported the valuable #67 change onto current main with regression tests for first-hunt initial point, later completed hunts, the cap and abandonment. JS/.NET validation, focused-magic comparison and browser smoke passed. The original obsolete #67 PR was closed.
4. **Important distinction:** recent GitHub Pages workflows have red status because the separate collector connectivity smoke receives Cloudflare HTTP 403 from GitHub-hosted runner egress. Prior workflow evidence shows the **build, deploy and live Pages browser smoke passed** before the collector check failed. Confirm each job independently; never describe overall workflow failure as proof the game failed to publish, and never claim collector availability when the external check is inconclusive. Track [#60](https://github.com/pjotrcasteel/Wyrmforge/issues/60).

## Next vertical slices (priority)

1. **P0 — deployment and physical-device reality:** inspect latest Pages build/deploy/smoke; resolve or correctly isolate runner-to-Cloudflare 403 in #60 while retaining consent/security verification; verify iPhone Safari camera, staff silhouette, monastery (two approaches), gate occlusion, character/enemy contrast and movement.
2. **P1 — human-readable 2.5D art:** replace remaining temporary geometry with deliberate authored character/environment atlases and proper corner/side orientations. Establish coherent monastery nave/cloister/roof/floor historical structure; use fewer distinct props, stronger visual hierarchy, wider dark playable negative space, meaningful elemental degradation.
3. **P1 — focused magic power:** compare Fire, Frost, Storm and Arcane cast identities at ranks I–III and Surge at actual 390px; make motion, impact, local illumination and progress legible without fake shots. Test first playable Fire+Frost fusion before a general crafting system.
4. **P1 — fairness / onboarding revalidation:** old 0.0.83 player study contains important hypotheses but is not a current-game balance authority. See [archived study](../playtesting/archive/player-study-0.0.83.md). Revalidate unavoidable target bursts, mobile world-vs-display geometry, newcomer unspent-build preparation and first-trail guidance against current C# simulation before reusing values.
5. **P2 — visible progress choices:** implement the smallest truthful part of [visual-first UX RFC](../design/visual-first-magic-ui-rfc.md) as one 390px slice, then test comprehension and discoverability.
6. **Later:** Arcane Laboratory #108; Hall of Fame security/real D1 submission #66; native iOS/Android release #55. Preserve current canonical simulation, consent and migration paths.

## Development gates and pointers

- `node --test tests/javascript/*.test.mjs`, `dotnet build Wyrmforge.slnx -c Release`, `dotnet test Wyrmforge.slnx -c Release`.
- GitHub workflows: `.github/workflows/csharp.yml` for JS/.NET/balance validation; `.github/workflows/browser-smoke.yml` for Chromium and downloadable PR preview/evidence; `.github/workflows/pages.yml` for actual deployment and separate live collector verification.
- Primary browser integration: `tests/Wyrmforge.Browser.Tests/WyrmforgeBrowserTests.cs`; precise art checks: `tests/javascript/arena-cloister-art.test.mjs`, `arena-mage.test.mjs`, `arena-mage-frames.test.mjs`.
- Preserve gameplay/art consistency, determinism, actual 390px readability, and real collision/occlusion even when a test passes; human visual approval remains the last art gate.

**Do not rebuild completed features from scratch or silently reopen retired experimental branches.** Relevant outstanding issues and the entire PR audit are captured in the linked triage document.
