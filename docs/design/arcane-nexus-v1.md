# Arcane Nexus v1: the Frostfire journey

The Design Amendment of 2026-10-17 (§3, §11 step 2) merges the Arcane Web and the Laboratory into one Arcane Nexus. v1 ships one complete journey for an existing legal combination:

> Frostfire: node → material and where to find it → experiments → stabilize → equip → loadout reference

## Architecture

- **Domains unchanged.** `ArcaneWeb`, `LaboratoryState`, `MaterialVault` and `HuntLoadoutBook` are not modified, and there are no save-format changes.
- **`Wyrmforge.Application.Nexus.ArcaneNexus`** is a pure read model:
  - `Node(...)` returns a socket's research: stage, material need with source, the next guided experiment, known/needed conditions, the next action and loadout references.
  - `Suggest(...)` wraps `LaboratoryAdvisor.Next` for the "next discovery" chip.
  - `Mark(...)` returns the per-node badge state.
  - The guided step skips dead-end (Incompatibility) experiments. The player can still run them from the experiments list.
- **Rendering only in the UI.** `BuildView` renders the read model and invokes the existing Laboratory commands through `ForgeView`. C# owns every rule; JS only pans, zooms and focuses.
- **Spellcraft facet (2026-10-18).** The standalone `LaboratoryView` is retired. The Nexus now has two facets, Web and Spellcraft; research, binding and testing moved to the Spellcraft circle, and the node inspector keeps a progress line, Equip/Unequip and "OPEN THE CIRCLE". See `spellcraft-v1.md`.

## Mobile design decisions and research basis

| Decision | Why |
|---|---|
| Inspector is a bottom sheet at about 55% height that keeps the Web visible above it. On desktop it is a side panel. | Bottom sheets keep context and sit in the thumb zone (NN/g on bottom sheets; Hoober's grip studies, UXmatters). |
| One sticky primary action at the bottom of the sheet. | Primary actions belong in the easy-reach lower third (Smashing Magazine, "thumb zone"). |
| Touch targets of 44 px or more; node hit areas extend 8 px past the art. | Apple HIG 44 pt, Material 48 dp, and NN/g on touch-target size. |
| Stage badges differ by shape and icon as well as colour. | WCAG 1.4.1: never use colour alone. |
| Material card shows owned/needed, a named source and a Track action. | Monster Hunter's "where to find" and Genshin's material sourcing remove off-game wiki lookups. |
| A "next discovery" chip that focuses and opens the node. | Path highlighting as in Path of Exile planners. Progressive disclosure (NN/g) keeps it non-blocking. |
| Experiments are folded into a `<details>` with the guided step surfaced first. | Progressive disclosure, so new players see one decision at a time. |
| Stabilize requires inline consent before consuming a material. | Irreversible spending must be explicit, as with Slay the Spire's confirm-on-remove. |
| A 20 px left-edge gutter ignores pans. Zoom buttons are always visible. | Avoids conflicts with the OS back gesture, and pinch alone is not discoverable. |
| Sound controls are hidden on the Nexus. | They overlapped the chip in the thumb zone. The owner approved removing them here. |
| Focus is smooth and honours reduced motion. On phones it centres the node in the band above the sheet, with extra scroll room below the Web. | Keeps the selected node visible while its sheet is open. |

## Not in v1

- Recipes beyond the existing Rime and Storm infusions.
- `NexusKnowledge` as a separate persisted state (S3).
- The bench journey's browser test now lives with Spellcraft (`Mobile_Spellcraft_ResearchesAndBindsRimeInfusionWithConsent`).
