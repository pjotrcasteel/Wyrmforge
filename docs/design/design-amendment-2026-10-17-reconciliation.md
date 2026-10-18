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
2. **Fateweave.** Done (see below). Per-card rerolls on `LevelChoiceService` and the level-up overlay:
   - per-round slot flags;
   - a hunt-wide charge pool;
   - a seeded golden flag that stays within the stage;
   - persistence and replay.
3. **Frost telemetry.** Done (see below). Record offered, selected and rerolled cards, plus control utility, in BalanceLab and playtest signals. Diagnose the cause before tuning.
4. **The first Arcane Nexus journey.** Done. One existing legal combination (Frostfire): research a node with a visible material, reach a permanent discovery, and reference it from the loadout. The Application read model `ArcaneNexus` composes Laboratory, Web, Vault and loadouts with no save changes. The Web screen is renamed Arcane Nexus and the research bench is embedded in its node inspector. The standalone LaboratoryView stays reachable from the Forge as a legacy surface until the Forge ritual facet merges. See `docs/design/arcane-nexus-v1.md`.
5. **A contextual second auto-cast** (defense or control), with arbitration and decision traces. Done. Warding Pulse is a no-damage, school-neutral shove. It is chosen by the pure `SpellArbiter` (Guard policy: `crowd + contacts + 3×defusable windups ≥ 4`) and spends the primary's next cast (shared budget). A bounded decision trace records casts and blocked needs. It unlocks at Hunter 3 and never in the first hunt. This is provisional per §14, and the save format is unchanged. In the BalanceLab A/B, the spread of defeat rates across schools shrinks from 36 to 23 points. See `docs/design/contextual-autocast-v1.md`.

**Fateweave as shipped.**
- `FateweaveState` holds the hunt-wide charges, the capacity, per-round slot flags and golden flags. `RunSimulation.RerollChoice(slot)` replaces only that card, from the exact legal pool the draft came from (`LevelChoiceService.Reweave`). It never shows duplicates and avoids cards already rerolled away where possible.
- Golden flags and replacements use a dedicated stream seeded from the run seed, so rerolls never shift any other draw. BalanceLab output is byte-identical with and without the feature.
- **Gilded:** in minor drafts, two ranks of the same refinement (never past the cap). In breakthrough drafts, a higher-rarity card from the same milestone pool. A slot only turns gilded when such a card exists. Evolution drafts and the guaranteed Rank II card cannot be rerolled.
- **Provisional tuning:** 2 starting charges, capacity 4, 6% golden chance per slot. `Grant`/`RaiseCapacity` are the seams for pickups and Nexus nodes; neither ships yet.
- Runs are not saved mid-hunt, so reload cannot restore charges.

**Frost telemetry as shipped.**
- `DraftLedger` counts, per school and per relation to the committed primary (Primary / Other / Neutral): rounds shown, cards offered (reroll replacements included), picks, cards rerolled away and in. A synergy counts for each school it fuses; refinements are neutral. `ControlLedger` measures enemy-seconds denied by freeze/chill: frozen seconds count fully, chilled seconds by their slow. It is split into all enemies, threats (within 160 px), elites and uniques, and the Wyrm, plus kills made on controlled targets.
- The level-up pulse (`ReleaseUpgradePower`) freezes everything for every school. Its 0.85 s window is reported apart (`PulseSecondsDenied`) and never credited to a build.
- Both ride on `RunSummary`, `RunSelfPlayMetrics`, the BalanceLab report (two new tables, nine new CSV columns, JSON) and the local playtest evidence (`draft`, `control`; whitelisted and clamped in `playtest.js`). The telemetry reads only; the original BalanceLab columns are byte-identical over 1,200 runs.

**Frost diagnosis** (BalanceLab, 25 runs × 48 build/agent pairs; bots, so human pick rates still need playtest evidence):
1. **Offer.** Frost primary cards are the least offered: 0.15–0.18 per round, against Fire 0.16–0.22, Arcane 0.17–0.25 and Storm 0.20–0.32. Bot pick rates once offered are flat (≈55–63% for every school), so "Frost rarely picked" is at least partly "Frost rarely shown".
2. **Control is real, and where it should be.** Pure Frost denies 7–10% of all enemy-seconds, 18–28% of threat-seconds, 47–72% of elite-seconds and 21–32% of Wyrm-seconds. 26–65% of its kills land on controlled targets. Winter Shell is among the hardest builds to hurt (median damage taken 41–77).
3. **Storm out-controls Frost, through a relic loop.** Storm builds that reach depth 2 deny 21–40% of enemy-seconds and 42–92% of elite-seconds (Casual bots rarely get there and show ~0%). The source is **Duelist Lens** (rare; +1 chain, chilled/frozen kills burst and spread chill): chain kills keep spreading the chill, so the cascade sustains itself once anything is chilled (the level-up pulse is enough). Fire builds carry the lens just as often and get ~0%. Frost Touch is rarely taken. Frost's identity is being delivered better by another school's chains.
4. **Kill power, not control, is Frost's deficit.** Wyrm-seconds denied are healthy despite boss resistance (frozen ×0.45, duration ×0.35), yet Frost still slays fewest Wyrms (≈1.0 vs 1.4–1.7). The gap is damage on the clock, not denied time.

**Bounded proposals, not yet applied:**
- (a) Proc guard: a chill spread by a defeat burst cannot itself trigger another burst (the "triggered effects cannot trigger" rule from Diablo and Path of Exile). This is a loop fix, not a nerf to the lens's intended use.
- (b) Draft parity: weight Frost primary cards until the offer rate per round is within ±10% of the other schools.
- (c) Only after (a) and (b), re-measure. If Frost still slays fewest Wyrms, look at a frozen-target payoff outside Absolute Zero, e.g. shatter damage that scales with depth.

**Presence scale (product-owner request, done ahead of S6).** `WyrmTier` (Wyrm, Ascendant, Elder, Divine) is a Domain contract whose only behaviour today is body size: ×1, ×1.15, ×1.35, ×1.6 of the catalog radius. The body is the hit area and drives the sprite. Wyrm radii rose ~1.75× (Ashfang 34→60). Only Wyrm and Ascendant are fought; Elder and Divine are reserved, their names stay provisional, and they need a roaming lair camera before they ship, because a Divine body fills a phone's width. Elites grow ×1.25; the Reliquary (27) and Bell Warden (38) outsize every elite.
6. **Region and lineage data contracts** and a non-campaign start path. **Done (contracts only):** `RegionCatalog` (1 playable, 3 planned from the concept folders), `WyrmLineageCatalog` (Primordial added as a reserved tier), `RegionDiscoveryState` in `wyrmforge.world.v1`, and `SaveLayout` that maps every key to a state domain. Attraction is unchanged for the starting region. ChronicleState and OneTimeGrantLedger stay as documented seams until a campaign exists. See `regions-and-lineages-v1.md`.

## Open questions

These are left to the product owner. Nothing here has been decided.

- How many Fateweave charges a hunt starts with, the cap, the golden chance, and how much stronger a golden reroll is.
- The loadout unlock cadence (1 → 4) and the weights used to choose between casts.
- The full list of disciplines, the node count, and the point budget.
- The campaign's element order and the thresholds for the non-campaign route.
- The Wyrm tier names beyond Ascendant (`WyrmTier.Elder`/`Primordial`/`Divine` are placeholders).
- Region names: "The Cinder Frontier" is a working title, and the three planned regions are unnamed.
