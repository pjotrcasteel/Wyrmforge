# Refuge town — canonical building integration (20 October 2026)

## Approved source artwork and intended behaviour

The owner approved **four new active** and **four new vacant** building images after removing painted NPCs, calming excessive light sources and refining the structures. These are the actual game images, not a style guide or temporary placeholders.

| In-game destination | Source | Runtime | Unlock |
| --- | --- | --- | --- |
| Arcane Nexus | `user_handover_files/concepts/buildings/ArcaneNexus/{active,vacant}.png` | `wwwroot/art/buildings/ArcaneNexus/` | First hunt |
| Blacksmith | `.../Blacksmith/{active,vacant}.png` | `wwwroot/art/buildings/Blacksmith/` | First secured Essence |
| Codex | `.../Codex/{active,vacant}.png` | `wwwroot/art/buildings/Codex/` | First hunt |
| Hall of Fame | `.../HallOfFame/{active,vacant}.png` | `wwwroot/art/buildings/HallOfFame/` | Two completed hunts |

Each first-party runtime PNG is **byte-for-byte identical** to the canonical source blob. The original `user_handover_files/` copies remain unchanged. No painted NPC is added; eventual NPCs should be separately positioned and animated above the environment.

## Scene composition

- **Desktop:** three adjoining, frameless city districts, all in one viewport: west (Arcane Nexus above Blacksmith), central World Gate, east (Codex above Hall of Fame). Independent building paintings and ambient backgrounds, rather than five textual menu cards.
- **Mobile portrait:** three full-screen horizontally swipeable districts; two art buildings on each side, the World Gate in the middle. Start in the middle. Small accessible district controls and keyboard arrows supplement touch. CSS preserves each painting's 3:2 aspect ratio; no stretched architecture.
- **World Gate:** continues to use the existing original gate artwork and the existing WorldGateView, including Free Play and Campaign; always available.
- **State:** `TownBuildingVisuals.Resolve` takes the same authoritative unlock flags as navigation. All four buildings show either their exact active PNG or exact vacant PNG. Tapping a locked location shows the existing in-world requirement notice and never opens it or plays door audio. There is no black/gray CSS haze or runtime recoloring.

This replaces the old 2172×724 panorama **as the four building drawings** per the owner's 20 October instruction. The older three-slice panorama and the generated vacant patches remain in the repository for archival use but do not render as building states. The World Gate keeps its original central town scene.

## Validation and remaining checks

- `tests/javascript/refuge-canonical-town.test.mjs`: validate exactly eight intact 1536×1024 canonical PNG copies, independent state mapping, first-party paths, and no overlay darkening.
- Browser smoke `Mobile_Refuge_HasThreeScrollableSlicesAndClickableBuildings`, `Mobile_VacantBuildings_ExplainUnlockRequirementsOnTap`, `Mobile_PrimaryOath_CancelReturnsToTownWithoutConsumingOrUnlocking`, and `Mobile_Refuge_UnlocksOccupiedBuildingsWithClickableHotspots` check the new scene and real routing.
- Capture 320×568 and 390×844 mobile center/west/east, plus 1440×900 desktop. Inspect cropping, labels, unlock transitions, Gate navigation, and touch targets; screenshot and Playwright CI are prerequisites for merge.
- **Not yet proven by browser CI:** physical iPhone Safari acceptance, preferred placement of independently animated NPCs, and a true seamless connected town environment behind the individual studio-background building paintings. Do not label these as finished.

### Source ownership

The `CanonicalTownView.razor` component handles only visuals/accessibility. `ForgeView.razor` still owns all navigation and progression, and `refuge-town.js` owns swipe/keyboard controls. No new game-domain progression or NPC state is introduced.
