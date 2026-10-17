# Design amendment 2026-10-17 — reconciliation record

The 2026-10-17 design amendment overrides the 2026-10-15 Spellcraft handover only where the two conflict. Everything else in the handover still applies.

`Effective design = 2026-10-15 handover + 2026-10-17 amendment − superseded clauses`

- **Reconciled at:** `a39db57` (arena roster step 6), on branch `feature/lab-frostfire-mutation`.
- **Work in progress was not interrupted.** The arena roster continues with step 7.
- **Proposals stay proposals.** Numbers, names, tier labels and counts in the amendment are proposals unless it marks them as product rules. This record does not settle them.

## Repository audit

| Area | Shipped reality | Conflict? |
|---|---|---|
| Combat casting | One committed primary (`SpellBook.IsPrimaryCommitted`). Combinations fold support spells into the primary's cast; no independent streams (`docs/gameplay/committed-primary-and-combat-clarity.md`, `focused-magic-v1.md`). | Yes, partly: this is now transitional. See S1. |
| Laboratory / Arcane Web | The Laboratory domain (`LaboratoryState`, mutations, two sockets, loadouts) and the Web canvas (`arcane-web.js`) sit in the Forge/Build area. | Yes, at the UI level only: they become facets of one Arcane Nexus. See S2. |
| Campaign gates | No Book I, Chronicle or Conclave gate exists in code. | No code conflict. The design gate is superseded (S3). |
| Level-up pacing | Minor refinements, with milestones at level 5/10/15 (`docs/gameplay/power-milestones-v1.md`). | No: the amendment confirms this. |
| Rerolls | None exist. | New feature (Fateweave), pending. |
| Arena roster | Steps 1–6 shipped: habitats, roster, elites, Reliquary, Bestiary. | No. It fits "Hunts remain the universal engine". |

## Retained

These stand as before. The amendment confirms them or does not touch them.

- **Simulation:** deterministic C# authority with seeded RNG; JS only renders.
- **Spell grammar:**
  - typed, bounded spell grammar;
  - the reaction-event budget, with no infinite proc loops and no unrestricted all-element stacking;
  - Frostfire is processed in exactly one place.
- **Pacing:** minor refinements between level 5/10/15 milestones. The rejected "frequent major upgrades" proposal stays rejected.
- **Story:** Book I, *The Broken Covenant*, with three major decisions and three endings. Chronicles stay independent, and story choices never gate gameplay power.
- **Competition:** Conclave ranked equality, no pay-to-win, Hall of Legends and the Champion's Archive.
- **Research economy:** consent-based spending with an exact preview; failed experiments teach; no double-spending an Essence; no time gates.
- **Wyrms:** the identities of Ashfang, Rimeclaw, Stormcoil and Voidweaver, and the existing meaning of Ascendant/Elder.
- **Look and feel:** the art direction (dark battered Diablo-style 2.5D, the slate-blue mage) and readable enemy attacks, including the arena roster brief.
- **Existing systems:** Forge Masterworks, the Essence Vault, Codex/Bestiary, and all save keys.

## Superseded (the amendment wins)

| # | Old clause (2026-10-15) | Effective decision | Migration seam |
|---|---|---|---|
| S1 | One committed primary as the permanent combat model | Up to 3–4 equipped spells: one reliable primary plus contextual auto-casts chosen by a deterministic C# decision engine with a shared cast budget. There are no manual spell buttons. | The single primary stays as the **transitional** stage. New code must not hard-code "exactly one spell forever". The next combat step is a single contextual second auto-cast proof of concept (amendment §11.4), behind the existing `SpellBook`. |
| S2 | Laboratory and Arcane Web as separate player-facing systems | One integrated **Arcane Nexus** view: Web, research bench, recipes, loadout and Forge ritual. | Add a logical `ArcaneNexus` application/UI boundary that composes the existing Laboratory, Web and Forge domains. Domains and saves stay unchanged; screens merge later. |
| S3 | Book I completion unlocks the Conclave and the advanced Laboratory; the prologue is mandatory | The campaign is optional from the start, with an equivalent non-campaign route to the endgame. | There is no gate to remove today. Future `ChronicleState`, `WorldState`, `NexusKnowledge` and `EndgameState` stay separate. |
| S4 | Four arms plus a few hybrids as the full scope | An architecture for hundreds of typed combinations and many disciplines. The four elements are the introduction. | Keep the typed component catalogs extensible. No content-scale work now. |
| S5 | A draft choice with no reroll | Per-card **Fateweave**: each card can be rerolled once per round, charges are shared across the hunt, and a rare golden slot uses the same charge. | Pending: the first candidate slice after the roster. |
| S6 | A few authored locations and Wyrms | Dozens of regions, each with one dominant discipline. Every fundamental discipline gets a Wyrm lineage, with tiers potentially up to Divine. | Pending: data contracts only, after the first hunt is proven. |

## Pending, in order

These follow the amendment §11. They are candidates, not a fixed schedule.

1. **Arena roster step 7.** Done: the Bell Warden on every pre-lair road, and Ashfang on the first hunt. The first-hunt Ashfang rule is **provisional**; it serves the tutorial/story track and may move into `ChronicleState` once the campaign exists (S3 keeps the campaign optional). The Ashfang polish slice is deferred to the story phase.
2. **Fateweave.** Per-card rerolls on `LevelChoiceService` and the level-up overlay:
   - per-round slot flags;
   - a hunt-wide charge pool;
   - a seeded golden flag that stays within the stage;
   - persistence and replay.
3. **Frost telemetry.** Record offered, selected and rerolled cards, plus control utility, in BalanceLab and playtest signals. Diagnose the cause before tuning.
4. **The first Arcane Nexus journey.** One existing legal combination (Frostfire): research a node with a visible material, reach a permanent discovery, and reference it from the loadout.
5. **A contextual second auto-cast** (defense or control), with arbitration and decision traces.

**Presence scale (product-owner request, done ahead of S6).** `WyrmTier` (Wyrm, Ascendant, Elder, Divine) is a Domain contract whose only behaviour today is body size: ×1, ×1.15, ×1.35, ×1.6 of the catalog radius. The body is the hit area and drives the sprite. Wyrm radii rose ~1.75× (Ashfang 34→60). Only Wyrm and Ascendant are fought; Elder and Divine are reserved, their names stay provisional, and they need a roaming lair camera before they ship, because a Divine body fills a phone's width. Elites grow ×1.25; the Reliquary (27) and Bell Warden (38) outsize every elite.
6. **Region and lineage data contracts** and a non-campaign start path.

## Open questions

These are left to the product owner. Nothing here has been decided.

- How many Fateweave charges a hunt starts with, the cap, the golden chance, and how much stronger a golden reroll is.
- The loadout unlock cadence (1 → 4) and the weights used to choose between casts.
- The full list of disciplines, the node count, and the point budget.
- The campaign's element order and the thresholds for the non-campaign route.
- The Wyrm tier names beyond Ascendant/Elder (`WyrmTier.Elder`/`Divine` are placeholders).
