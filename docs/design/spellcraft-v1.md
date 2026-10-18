# Spellcraft v1: the ritual facet of the Arcane Nexus

The 2026-10-15 handover describes spellcraft as **elemental ordering** on a magic circle: a Foundation element shapes the spell, an Infusion element alters it, a sealed third seat waits for advanced rites, and element order matters. The 2026-10-17 amendment (§3, S2) asks for **one Arcane Nexus** rather than competing screens. Spellcraft v1 delivers both: the Nexus has two facets, **Web** ("where it lives") and **Spellcraft** (the circle), and the old standalone `LaboratoryView` is retired.

The product-owner concept is `user_handover_files/concepts/Menus/spellcraft.jpg`. It shows a study, a chalk circle on the floor, element tokens and a result card. v1 keeps that composition and makes the circle a live canvas.

## One system, three surfaces

| Surface | Role |
|---|---|
| **Web** (node inspector) | Where a resonance lives: its socket node, loadout references, Equip or Unequip. Shows only a one-line progress summary ("2/3 conditions understood · Fire + Frost") and links to the circle ("OPEN THE CIRCLE"). |
| **Spellcraft** (circle) | Where a resonance is understood: seat elements, research, bind (stabilize), test, equip. |
| **Forge** | Its Laboratory entry now opens Spellcraft on the tracked or suggested mutation. |

Every rule stays in C#. The domains (`LaboratoryState`, `MaterialVault`, `ArcaneWeb`, `HuntLoadoutBook`) are unchanged, and there are no save-format changes.

## Architecture

- **`Wyrmforge.Application.Nexus.Spellcraft`** is a pure read model over the existing Laboratory and `ArcaneNexus.Research`:
  - `Families` are the six handover resonances: Frostfire (Fire + Frost), Flashpoint (Fire + Storm), Riftbrand (Fire + Arcane), Stormglass (Frost + Storm), Glacial Echo (Frost + Arcane) and Arcane Conduit (Storm + Arcane).
  - `Circle(foundation, infusion, …)` resolves a seating into a state: `Empty`, `AwaitingInfusion`, `SameElement`, `Sealed` or `Research`.
  - A `Research` circle carries the existing `NexusResearch` (stage, material, next step, known/needed conditions).
  - A **reversed order** of a known recipe is `Sealed`, with the clue "the known form begins with X". A family with no recipe yet is `Sealed`, with no clue.
  - `Grimoire(...)` returns six pages (Known, Studied or Sealed). `Log(...)` returns every recorded experiment, failures included.
  - A recipe is titled with its family name ("Frostfire") until it is discovered, and with its spell name ("Rime Infusion") after.
- **`wwwroot/js/spellcraft-circle.js`** only renders: the circle, pulses, the test vignette and haptics. Pure draw functions are exported for tests.
- **`SpellcraftView.razor`** renders the read model and invokes the existing Laboratory commands through `ForgeView`.

Recipes in v1 are the two existing Laboratory mutations: **Rime Infusion** (Fire → Frost) and **Storm Infusion** (Arcane → Storm). The other four families are sealed placeholders; their text is provisional canon.

## Research basis and the decisions it drove

| Decision | Basis |
|---|---|
| **Tap-to-place** is the primary input: tap a tray token to seat it, tap a seat to clear it. There is no required drag. | NN/g, "Drag-and-Drop: How to Design for Ease of Use": drag needs a precise motor action and an accessible alternative. Tap is the alternative made primary. |
| Tray and primary action live in a **sticky dock** at the bottom; the circle above it is a view and a test button. | Smashing Magazine, "The Thumb Zone": primary controls belong in the easy-reach lower third. |
| Seats, tokens and buttons are **44 px or larger**. | NN/g, "Touch Targets on Touchscreens"; Apple HIG 44 pt; Material 48 dp. |
| An unknown result is a **"?" silhouette**. The centre sigil is split into **one shard per condition**, and each shard lights when that condition is understood. | Outer Wilds' ship log and Potion Craft's map show the shape of what is unknown, so progress is visible before success. |
| A **research log** records failures and dead ends as knowledge. | Outer Wilds (failure as information); Noita's emergent discovery. |
| **Element order matters**, and swapping is one tap (⇄). Reversed order gives a clue, not a silent failure. | The handover's elemental ordering; Magicka's element queueing made readable. |
| **Ceremony scales with weight**: a seat is a snap, an insight lights a shard, a failure flickers amber, an incompatibility greys out, a bind is a 2.2 s stabilize, and a first discovery differs from a repeat ("ALREADY RECORDED"). | General game-feel practice; Hades-style escalation of rare rewards (general knowledge, not a fetched source). |
| **Test** plays a looping micro-vignette on a training post: Frostfire freezes then shatters, Arcane Conduit chains, an unstable rite fizzles into grey smoke. | Shows the effect without text; the same idea as an ability preview clip. |
| Effect and trade-off are two short **pips**, not paragraphs. | Progressive disclosure (NN/g). |
| Binding consumes a rare material only after a **warm consent sheet** that shows the specimen and the vault count before → after. | Irreversible spending must be explicit; Cultist Simulator's ceremonial framing (general knowledge). |
| Hints are **earned through research, never bought**. | The handover's "magic is studied" principle. |
| Haptics are **additive only**: `navigator.vibrate` where supported (not iOS), never under reduced motion. | MDN, Vibration API. |
| **`prefers-reduced-motion`** stops rotation, motes and sparks; pulses keep their colour change. | MDN, `prefers-reduced-motion`. |

## The circle

- **Seats:** Foundation (left), Infusion (right), and a sealed third seat (top) for later advanced rites. `Spellcraft.OpenSeats = 2`, `MaxSeats = 3`.
- **Charge:** two counter-rotating rune bands and an inscribed hexagram brighten as conditions are understood. Element streams flow from each seat into the centre.
- **Sigil:** shards look like stained glass. Unlit shards are etched outlines; lit shards hold their element's light. Once discovered, the Foundation emblem holds the centre and the Infusion emblem orbits it.
- **Same element twice** is seated, then shown as a struck-through red ring. It is a readable mistake, not a refusal.
- All light is clipped to the circle, so nothing bleeds to the canvas edge.

## Primary action (one at a time)

| Next step | Dock action |
|---|---|
| Material missing | TRACK X (then TRACKING · STOP) |
| Research step | RESEARCH + the experiment name |
| All conditions known | BIND THE RESONANCE (consent sheet) |
| Bound, socket node not allocated | OPEN IN THE WEB (focuses the node) |
| Ready | EQUIP / UNEQUIP |

Side paths (dead-end experiments) stay available in a fold. The guided step skips them, as in Nexus v1.

## Art provenance

`wwwroot/art/spellcraft-study.jpg` is a 706 × 264 crop of the product-owner concept `user_handover_files/concepts/Menus/spellcraft.jpg` (the study band only). It is not code-generated, so it is not in the generated-art manifest. The circle itself is drawn live.

## Not in v1

- Recipes for Flashpoint, Riftbrand, Stormglass and Glacial Echo (sealed, provisional text).
- The third seat and three-element rites.
- Drag-to-seat as an optional extra input.
- `NexusKnowledge` as a separate persisted state (amendment S3).
- Balancing. It comes last, once every system is in place.
