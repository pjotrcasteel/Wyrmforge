# Spell blueprint and compatibility contracts v1

Spellcraft handover §6–§9 and §16. This slice replaces the hardcoded `SpellId` and `SynergyId` pairs in `LaboratoryCatalog` with typed, validated blueprints. Gameplay does not change.

## 1. Contracts (`Wyrmforge.Domain/Spells/Composition`)

**`SpellTag` / `SpellTags.For(SpellId)`:** structural tags derived from existing spell data:
- Delivery: `Projectile`, `Chain`, `Impact`.
- School: `Fire`, `Frost`, `Storm`, `Arcane`.
- Status: `AppliesFreeze`, `AppliesBurn`, `AppliesChill`, `AppliesShock`, `AppliesMark`.
- Granted only: `Charged`.

Compatibility checks read tags, never spell ids.

**`SpellComponentCatalog`:** each component has a kind (Form, Infusion or Reaction), a complexity cost, required tags, granted tags, and for reactions the existing synergy it realizes.

| Component | Kind | Complexity | Requires | Grants / realizes |
|---|---|---|---|---|
| Bolt | Form | 0 | Projectile | — |
| Chain | Form | 0 | Chain | — |
| Rime Infusion | Infusion | 2 | Impact | Frost, AppliesFreeze |
| Storm Charge | Infusion | 2 | Impact | Storm, Charged |
| Thermal Shatter | Reaction | 2 | Fire + AppliesFreeze | → Frostfire |
| Conduit Discharge | Reaction | 2 | Arcane + Charged | → Arcane Conduit |

**`SpellBlueprint(Foundation, Form, Infusion?, Reaction?)`:** an ordered component list.

**`BlueprintRuleset`:** versioned so ranked play can freeze a version later. `V1`:
- Complexity budget 6.
- At most 3 elements.
- At most 16 reaction events per simulation step.

**`BlueprintValidator.Validate(blueprint, ruleset, socketAccepts?)`:** deterministic. It applies components in order, so a component sees the tags granted before it. It returns the issues, complexity, final tags, elements, and the synergy realized. Each issue carries a player-facing reason and a fix.

| Issue code | Meaning |
|---|---|
| `WrongComponentKind` | Component is in the wrong slot. |
| `FormMismatch` | The foundation doesn't support the form. |
| `MissingRequirement` | A required tag isn't present when the component is applied. |
| `OverBudget` | Complexity exceeds the ruleset budget. |
| `TooManyElements` | More elements than the ruleset allows. |
| `SocketRejects` | The socket accepts none of the blueprint's elements. |

## 2. Laboratory port

- `LaboratoryMutationDefinition` takes a `SpellBlueprint`. `Foundation`, `Validation` and `Realizes` are derived from it.
  - Rime Infusion = Fire Bolt + Bolt + Rime Infusion + Thermal Shatter (complexity 4/6).
  - Storm Infusion = Arcane Orb + Bolt + Storm Charge + Conduit Discharge (complexity 4/6).
- `ArcaneMutationSocketDefinition.Accepts` lists bridge elements. A blueprint fits if it shares at least one (C.3 added two bridge sockets; see [`laboratory-sockets-loadouts-v1.md`](laboratory-sockets-loadouts-v1.md)):
  - Rimebrand: Fire, Frost.
  - Charged Focus: Storm, Arcane.
  - Flashfire: Fire, Storm.
  - Glacial Lens: Arcane, Frost.
- `LaboratoryState.Equip` returns `InvalidBlueprint` if validation fails. This is checked after the socket check, and the shipped catalog never triggers it.
- The Laboratory view shows a blueprint line: foundation · components · complexity X/Y.

**Migration rule:** a reaction realizes an existing synergy and never adds a parallel effect, so legacy and Laboratory effects still cannot stack. Saves are unchanged because mutations are still persisted by `LaboratoryMutationId`.

## 3. Reaction event budget

- `Combat/Interactions/ReactionBudget` is reset each combat step (`RunSimulation.Update`).
- Interaction splashes and Conduit discharges spend from it. When it is exhausted, the secondary event is suppressed and counted. The primary hit and its damage multiplier still apply.
- Recursion is also bounded structurally: Conduit-spawned chains cannot trigger Conduit again.
- **Measurement:** 80 hunts (Rime, Storm, legacy Fire and legacy Arcane × 5 seeds × 4 personalities × up to 720 s). The peak was 2 events per step, with 0 suppressed. The cap is a safety ceiling and does not change current balance, so the BalanceLab results still hold.
- Diagnostics: `RunSimulation.PeakReactionEventsPerStep` and `ReactionEventsSuppressed`.

## 4. Tests

- Domain `BlueprintValidatorTests` covers:
  - Both shipped blueprints are valid.
  - Every issue code fires.
  - Tag order matters.
  - Determinism.
  - Budget arithmetic.
- Application tests check that real hunts stay within budget, and that an exhausted budget suppresses discharges but not the hit.

## 5. Deferred

- Alternative forms beyond Bolt and Chain.
- Element inversion.
- A third element.
- Player-saved blueprints (Phase E).
- Tuning of complexity costs. The current values are hypotheses against handover §9's 2 / 6 / 8 bands.
