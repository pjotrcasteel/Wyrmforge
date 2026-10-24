# Regions and Wyrm lineages v1 (amendment §6, §7, §11.5)

This slice adds data contracts only. Hunts play exactly as before: the same seed attracts the same Wyrm (pinned by `StartingRegionAttractionMatchesTheRegionlessRoll`).

## Contracts

| Contract | Layer | Purpose |
|---|---|---|
| `RegionId` | Domain/World | Kebab-case string id, so regions can be added as data without renumbering saves. |
| `RegionDiscoveryState` | Domain/World | Ordered, idempotent list of charted regions. A restore drops unknown or malformed ids. |
| `WyrmLineage` / `WyrmLineageCatalog` | Domain/Combat/Dragons | One lineage per discipline: Ashfang (Fire, the Cinder Wyrm), Rimeclaw (Frost, the Glacier Wyrm), Stormcoil (Storm, the Tempest Wyrm), Voidweaver (Arcane, the Aether Wyrm). Tiers up to Ascendant are **Hunted**; Elder, Primordial and Divine are **Reserved**. |
| `WyrmTier.Primordial` | Domain | Added between Elder and Divine (scale ×1.48). The tier is never persisted, so reordering it is safe. |
| `RegionDefinition` | Application/World | Name, dominant school, status (Playable/Planned), habitats, roster, concept roster, Wyrm influence (Home/Present/Absent) and access rule. Resources are derived from the lineages hunting there. |
| `RegionAccessRule` | Application/World | Open, FirstHuntComplete, HunterLevel, WyrmSlain or NotYetAuthored. It is evaluated only against account facts (`RegionAccessContext`), so a story choice never opens or closes a region. |
| `RegionCatalog` | Application/World | One playable region and three planned regions (see below). |
| `SaveLayout` / `SaveDomain` | Application/Persistence | Maps every browser storage key to its domain: Onboarding, PlayerLegacy, World, Chronicle, Endgame, Preferences or Telemetry. A test scans the web project and fails on any unclassified key. |

## Regions

| Id | Name (working title) | School | Home lineage | Status |
|---|---|---|---|---|
| `cinder-frontier` | The Cinder Frontier | Fire | Ashfang | Playable. All four lineages are Present, so the attraction roll keeps its variety. |
| `glacier-region` | The Hoarfrost Reaches | Frost | Rimeclaw | Playable once Ashfang is slain (provisional). Stormcoil and Voidweaver are Present, Ashfang is Absent. Roster and habitats: `frost-region-roster-v1.md`. |
| `tempest-region` | Uncharted Storm region | Storm | Stormcoil | Planned, using the `concepts/Electric` roster. |
| `aether-region` | Uncharted Arcane region | Arcane | Voidweaver | Planned, using the `concepts/Arcane` roster. |

Region names are working titles until the product owner names them (§14). The two planned regions are deliberately left unnamed.

## Simulation

- `RunSimulationFactory.Create(..., region:)` defaults to the starting region. Requesting a planned region throws.
- The first hunt culminates in the region's **home lineage**, which replaces the hard-coded Ashfang (same result today). `regionOpening:` does the same for a hunter's first hunt in a region they have not charted, without the tutorial's early ending.
- A region's habitats, recipes, map territory names and the extraction-defence plan all follow its dominant school; the map keeps the seed's layout.
- Lineages marked Absent can neither be rolled nor followed as a research lead. The starting region has no Absent lineages.

## Web

- `wyrmforge.world.v1` stores `{"Discovered":[...],"Selected":"..."}` (`Selected` is optional; older saves have none). A region is charted when a hunt starts in it.
- The hunt runs in the selected region while it stays open, else in the starting region; the First Hunt always walks the starting region. An Ascendant rite whose lineage is Absent in the chosen region is not carried into that hunt.
- Migration: a hunter with completed runs and no world save gets the starting region charted when the page loads.
- Hunt prep shows a REGION line: name, dominant ground and "n of 4 regions charted".

## Start paths: the World Gate

- **World Gate** (main menu, unlocked after the first hunt): a "Choose your hunt" list of every mode. *Free Exploration* is the only playable one and shows the current region, its home Wyrm, regions charted and the "Road to the Conclave" checklist, and enters a hunt. *Campaign* (Book I), *Targeted Wyrm Hunt* (needs more lineages than Fire and Frost), *Endless Hunt* and *Endless Arena* are listed greyscaled, disabled and marked **Coming later**, so the player sees the world is larger without being able to pick an unbuilt mode. BEGIN HUNT still starts directly; the gate is a choice screen, not a toll.
- The art (`wwwroot/art/world-gate.jpg`) is a crop of product-owner concept art (`user_handover_files/concepts/Menus/choice.jpg`), not code-generated, so it is not in the generated-art manifest.
- Free Exploration lists every region: open ones are tappable (school colour, home Wyrm, "New: your first hunt here ends at …"), locked ones say what opens them ("Slay Ashfang to open"), planned ones read *Uncharted*.

## Chronicles (campaign state)

- `StoryBookDefinition` / `StoryBookCatalog`: authored books. Book I, *The Broken Covenant*, has four segments (Prologue, Acts I–III), three major decisions and three endings. The final decision's options **are** the endings. All names and story are **provisional canon** (Highward, Cindervale, the Covenant Engines, the Sealed Testament, Commander Aldric Vane, Archivist Seren Thale, Enginekeeper Brannoc Hale, Scout Wren Ashby).
- `ChronicleState`: one playthrough. Choices are only accepted in the current segment, once each; `Advance` waits until the segment's choices are made; the final choice completes the Chronicle and names its ending. Restore replays choices and never runs ahead of them.
- `ChronicleRegistry` (`wyrmforge.chronicles.v1`, `SaveDomain.Chronicle`): several Chronicles side by side. Beginning a new one never overwrites another, numbers are never reused, and only Playable books can begin (Book I is not yet).
- `OneTimeGrantLedger` (`wyrmforge.legacyGrants.v1`, `SaveDomain.PlayerLegacy`): a permanent reward is claimed once (`first-completion-{book}`, `advanced-access`). Replaying a Chronicle never pays twice.

## Two routes to advanced access (amendment S3)

`AdvancedAccess` (Application) opens the Conclave/advanced research by either route:

- **Campaign:** complete Book I once.
- **Exploration (proposal):** slay a Wyrm of every lineage (4), defeat one Ascendant and reach Hunter 12.

The grant is claimed into the ledger on load and after each hunt and never relocks. The Conclave itself is not built yet; the gate says it opens in a later update.
