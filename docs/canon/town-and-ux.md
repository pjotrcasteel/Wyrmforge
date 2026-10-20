# Refuge, World Gate and player-facing UX

> **Canonical WyrmForge specification · updated 20 October 2026.** The actual integrated town and player journey. Current main and pending PRs must not be conflated.
> [Canonical index](README.md) · Only explicitly marked **LOCKED/approved** requirements are commitments. Proposed values, old milestones and drafts are not evidence of shipped code. Verify current `main`, PRs and tests.

## Refuge is gameplay, not an art preview — LOCKED

- The latest main release at this consolidation checkpoint is **0.0.138**. The Refuge shows a coherent **1672×941 night panorama** composed with independent **actual active/vacant artwork** for four buildings. Those states are driven by persistent gameplay unlocks; **no preview/test toggle** may alter them. The town menu opens real destinations; locked taps explain requirements, never silently enter a building.
- **Arcane Nexus** and **Codex** unlock after the first completed Hunt; **Blacksmith** after securing the first Essence; **Hall of Fame** after two completed Hunts. The **World Gate** is always reachable. Use these same authoritative predicates for rendering and navigation. [Town integration evidence](../art/refuge-night-panorama-preview-2026-10-20.md).
- Players navigate the town by **swiping on touch** or dragging on desktop; keyboard access remains for accessibility. **No West/Gate/East buttons** or temporary building toggles. Don't turn approved scenery into vertically stacked image cards.
- Preserve the eight owner-approved active/vacant source PNGs in `user_handover_files/concepts/buildings/`, and their coherent night town composition. Vacant means empty and unpowered (no lights, fire or static NPC); active artwork genuinely lights up. **Never use a CSS dark wash, filter, blackout rectangle or stretch an image** to fake vacancy or fill a screen. Original artwork is immutable without approval. Approved art source details: [canonical building checkpoint](../art/refuge-canonical-buildings-game-screen-2026-10-20.md).
- Day/night adaptation is approved: **Auto** uses local browser/device time, with explicit **Day** and **Night** overrides in Settings; avoid hardcoded server time, location permission or unapproved game-clock pressure. The device-local Auto/Day/Night implementation has merged via [PR #173](https://github.com/pjotrcasteel/Wyrmforge/pull/173). **Day is 07:00–18:59 and Night 19:00–06:59** according to browser/device local time; Settings overrides persist, and town lighting does not change any building unlock.

## Ambient townspeople — staged implementation (20 October 2026)

- **First slice (feature branch, not yet a shipped feature):** the existing night panorama draws seven small rectangular citizen placeholders over the road. Their seeded, deterministic C# `TownCrowd` model owns connected street waypoints, idle delays, speeds and destination reservations. Blazor renders positions; no browser-side gameplay RNG and no modified building PNGs.
- Pedestrians have **no gameplay authority** yet: no resource spending, quests, blocking interactions, or save migration. Town hotspots remain clickable through them. The simulation is only alive while the town component is mounted; reduced-motion users do not see the ambient movement.
- **Next slice (not implemented here):** building workers with identities and schedules. A worker exists only if its authoritative building unlock is active; a vacant building cannot have a worker at its entrance. Add waypoints for arrival/work/break/return, realistic paths and tests before considering sprite animation.
- Before approving scene placement, inspect the real town in desktop and iPhone Safari. Waypoints are authored approximations until visually checked against the approved 1672×941 artwork; never pretend an inaccessible street is usable or cover critical gate/building affordances.

## First-run and gate journey — LOCKED direction

- Character creation chooses a permanent Divine school and signature, separate from World Gate Hunt/Wyrm lineage. The character-creation copy must be short and meaningful; show recognizable pixel emblems with one accessible label each, not repeated overpainted words.
- The owner has requested **Fire-only character creation temporarily** while completing Fire end-to-end. Render the other five schools disabled without implying they are available. This is implemented for new players on main v0.0.138 through [PR #172](https://github.com/pjotrcasteel/Wyrmforge/pull/172); existing non-Fire characters retain their saved selection.
- The World Gate leads to **Free Play** and a visibly unavailable grayscale Campaign route as appropriate to actually implemented story content. New Hunt is active; **Endless Hunt** and **Endless Arena** are visibly future/disabled options until built. A Free Play new Hunt chooses available lineage and Wyrm tier; never pretend Tier II–V or a missing region is playable. Keep class choice and region choice separate.
- Campaign remains **optional** by product design and is not the exclusive gate to research/endgame. Disabled story UI indicates implementation readiness, not an eventual requirement to finish it for free-play progression.

## UI conventions and accessibility

- Art-led mobile-first composition; strong visual hierarchy with one obvious primary action, progressive disclosure, legible small-screen label, safe-area support and sensible tap targets. Avoid generic filler/AI-sounding narration and repeated instructions.
- HUD/player identity, version and levels are overlays **on top of** authored artwork rather than reserved footer/header bands that reduce the art. Preserve aspect ratio, no stretched town/building illustrations. Browsers may capture gestures: accessible keyboard/focus alternatives must remain.
- The player sees world and spells honestly: a painted bridge is traversable only if the simulation permits it; a disabled icon cannot secretly start a Hunt; color alone isn't the only state signal.
- Inputs must survive cancel/pause/background/resize and page scroll must not hijack combat gestures. Reduce motion and sound when configured.

## Relevant implementation and visual evidence

[Character school/sigil fix](../handover/2026-10-20-character-school-and-sigil-fix.md) · [World Gate](../art/world-gate-mobile-2026-10-19.md) · [visual-first UX research](../design/visual-first-magic-ui-rfc.md) · [town state](../art/refuge-night-panorama-preview-2026-10-20.md). Historic documents describe old screenshots/proposals; this topic is the active design contract.
