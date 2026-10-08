# WyrmForge main-screen direction

## Decision

Use one compact game menu, with a simple W/ring placeholder and a clear Begin Hunt action. Keep the existing chapter gates. Artwork is unnecessary for validating hierarchy, navigation and readiness.

## Reference research

- Hades main-menu screenshot: https://interfaceingame.com/screenshots/hades-main-menu/ — inspected the screenshot directly. A short menu occupies one area beneath a prominent title, while the rest is a scene. Play leads the list. Adapt its hierarchy and spatial continuity, using plain geometry instead of illustration.
- Vampire Survivors UI analysis: https://teemo.dev/game-design/vampire-survivors/systems/ui-ux-design/ — secondary analysis describes a flat Start/Options/Unlocks menu and separate progression screens. Adopt short destinations and a rapid return to play. This is secondary evidence, not a verified current client inspection.
- Dead Cells historical menu screenshot listing: https://www.mobygames.com/game/89051/dead-cells/screenshots/windows/916940/ — listing found, full image blocked by the source. Do not derive detailed layout claims from it. Official control reference: https://deadcells.wiki.gg/wiki/Controls supports keyboard/controller navigation as a relevant input baseline.

These are design references, not proof of player comprehension. Recommendation: use Hades' action hierarchy and the simple separation of play/progression described for Vampire Survivors, with WyrmForge's chapter, Atlas and Essence vocabulary.

## Why the present home feels like a website

ForgeView.razor supplies a navigation rail, mobile bottom navigation, a resource topbar and a tutorial banner. RunHubView.razor adds another hero and tutorial explanation, two loadout cards, expanding Ascendant cards, Hall of Fame, feedback and a goal board. The resulting document has competing navigation and a long vertical reading order.

## Proposed hierarchy

1. WyrmForge title and chapter.
2. Small W/ring placeholder establishing a consistent focal position.
3. Begin First Hunt / Begin Hunt, always in the same location.
4. Arcane Atlas, Forge, Codex, Hall of Fame as simple labelled menu rows. Locked rows show the actual requirement beside them, never only in hover text.
5. One concise readiness line and a compact Controls/Feedback footer.

First hunt: supplied tutorial build, no invented unspent-point warning; teach movement and automatic casting at encounter entry. After the first hunt: Atlas and Codex unlocked, available points shown directly beside Atlas. Forge follows the actual secured-Essence eligibility check, not a new arbitrary run gate. After two hunts: Hall of Fame unlocked. Keep unlock sequences already shipped in 0.0.84.

Detailed build, offering selection, hunt rites and goals belong on their own screens or a preparation overlay. A compact selected build/offering/rite summary can appear near Begin Hunt for returning players. Keep the launch action stable; do not force experienced players through mandatory preparation every run.

## Interaction and acceptance

- Mouse/touch directly select a labelled row. Keyboard arrows select available rows, Enter confirms, Escape returns; preserve Tab and visible focus. Add gamepad support as implementation work, not a claim about the mockup.
- Locked destinations cannot open; their unlock condition stays visible.
- Returning home preserves selection and uses a short transition. Respect reduced motion. No dependency on decorative sound or art.
- Normal mobile portrait/landscape and desktop viewports fit the main menu without scrolling. For short screens, reduce decorative space before compressing controls; retain accessibility scrolling for zoom/large text.
- A fresh tester can identify how to start immediately and explain why a destination is locked. Confirm with humans; the mockup is not usability proof.

## Implementation locations

ForgeView.razor/.css: replace the home dashboard shell with the main-menu composition; retain progression screens and gates. RunHubView.razor/.css: centralise the primary action and short readiness summary; remove duplicated tutorials and relocate goals/rites. Home.razor.cs: reuse existing start/save/unlock callbacks. Do not change save semantics or leaderboard consent.

The interactive conversation mockup is a design preview only. Its hunt ends via a labelled preview control; it does not execute combat, save state or invent high scores. Home implementation remains the next reviewable step.
