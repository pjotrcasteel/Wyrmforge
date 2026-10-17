# Contextual auto-cast v1: Warding Pulse

Amendment §5 and §11.4 call for a proof of concept of a second, contextual auto-cast. It needs a defence or control spell, deterministic C# arbitration, one shared cast budget, decision traces, and no independent spell stream. This is the smallest version that proves the model without fixing the final spell count (up to 4, amendment §5).

## The spell

**Warding Pulse ◎**
- School-neutral and deals no damage.
- Shoves movable enemies within 118 px outward by 78 px over 0.18 s. Elites are moved half as far.
- Immovable: Bell Warden, Reliquary, Reliquary Ward. Set pieces hold their ground.
- Recovery 7 s.
- It does not cancel attacks:
  - A Penitent that is pushed out of its locked bash arc swings at air.
  - A Mire Hound's locked pounce lane moves back with it, and the telegraph stays truthful (`MireHoundBehaviorState.Displace`).
  - An Ash Slinger's ember still lands on its mark.
- Dodging stays the main defence. Hades' cast and Diablo's Frost Nova buy space; neither replaces footwork.

## Arbitration (`Domain/Spells/Contextual/SpellArbiter.cs`)

`SpellArbiter.Decide(policy, read, recovery)` is a pure function. It only reads `BattlefieldRead`, which holds things the player can also see.

| Input | Meaning |
|---|---|
| Crowd | Living, unfrozen enemies inside the pulse reach. |
| Movable | The crowd minus set pieces. |
| Contacts | Enemies touching the hunter. |
| Telegraphs | Windups a shove can spoil: a Penitent bash whose arc covers the hunter, a Drowned Wraith strike that would hit, or any Mire Hound windup. Lobs are not counted, because a shove cannot spoil them. |

The default policy is **Guard**: `crowd + contacts + 3 × telegraphs ≥ 4`. That means four enemies in reach, three with one already touching, or a single real windup. The rule is checked in this order:
1. Below the threshold: no cast.
2. Nothing in reach can be moved: **NothingToMove**, and no wasted pulse beside a boss.
3. Still recovering: **Recovering**.
4. Otherwise: **Cast**.

This works like a Final Fantasy XII gambit with a sensible default. The player gets one readable rule instead of writing a script. Later the Nexus may offer other policies, such as an aggressive or a conservative guard.

## Shared cast budget

The primary keeps the only cast clock. The contextual spell is judged every tick, so a defence is never starved. When it fires, it **takes the primary's next cast**: the primary cooldown is set to at least its full interval, and `PrimaryCastsYielded` counts the cost. There is no second damage stream, which matches the cast-trigger model of Path of Exile, where triggers consume the same budget.

## Decision traces

`RunSimulation.DecisionTrace` is a bounded queue of 64 entries. Each entry holds the time, spell, reason, score and the full read. It records:
- every cast;
- the first tick of each blocked need (Recovering or NothingToMove).

A quiet read below the threshold is never logged. A death can be read back as "wanted to pulse at 312.4 s, still recovering".

## Unlock and presentation

- **Unlock:** unlocks at **Hunter level 3**, and never in the first hunt. This is provisional, because amendment §14 leaves the cadence open. It is derived from XP (`HunterProgress.ContextualSpellUnlocked`), so the save format is unchanged. The level-3 reward label names it.
- **No opt-out:** v1 has no opt-out toggle. It is auto-prepared, and nothing is persisted.
- **HUD:** a dashed "AUTO" badge in the combat HUD.
- **Readiness ring:** a ground ring at the hunter's feet that closes during recovery. Hades shows cast ammo on the hero, not in a corner.
- **Pulse:** a pale double ring sweeps out to the exact reach, with outward ticks. Under reduced motion it shows the final ring instead.
- **Hunt prep:** shows "SECOND SPELL", or the lock.

## Fairness check (BalanceLab A/B)

The run used `--fresh-hunter --runs-per-combination 20`, with and without `--contextual`: 160 runs per arm, 2 agents × 4 schools. About 12–15 pulses per run.

| School | Defeated (base → ward) | Wyrms slain | Kills/min |
|---|---|---|---|
| Arcane | 46% → 34% | 0.74 → 0.84 | 53.5 → 54.8 |
| Fire | 10% → 12% | 1.20 → 1.16 | 73.8 → 74.9 |
| Frost | 41% → 35% | 0.61 → 0.68 | 32.3 → 33.3 |
| Storm | 15% → 21% | 1.24 → 1.14 | 89.0 → 82.8 |

The ward compresses the field: the spread of defeat rates shrinks from 36 to 23 points. The fragile schools gain the most. Storm pays the most for its yielded casts, because chain casts carry the highest value per cast. Its loss is within noise at this sample size (±8 pts), so the tuning is kept. Re-check this when a second contextual spell or Nexus policies arrive.

Reproduce:

```
dotnet run --project src/Wyrmforge.BalanceLab -c Release -- --fresh-hunter --runs-per-combination 20 [--contextual]
```

The CSV gains a `contextualCasts` column.

## Code

- **Domain:**
  - `Spells/Contextual/SpellArbiter.cs` (policy, decision, trace);
  - `WardingPulse.cs`;
  - `MireHoundBehaviorState.Displace`;
  - `HunterProgress.ContextualSpellLevel`.
- **Application:**
  - `Simulation/Spells/RunSimulation.ContextualSpells.cs`;
  - the `UpdateSpellcasting` hook;
  - `WardPulseRenderSnapshot`, `PlayerRenderSnapshot.WardCharge` and `SpellHudSnapshot.Contextual`;
  - `RunSummary.ContextualCasts`;
  - the `RunSimulationFactory.Create(contextualSpell:)` parameter.
- **Web:**
  - `ArenaView.ContextualSpell`;
  - `Home.razor`;
  - `RunHubView`;
  - `arena.js` (`drawWardPulse`, `drawWardReadiness`);
  - `spell-hud.js`.
- **Tests:**
  - `SpellArbiterTests` (Domain, 10 cases);
  - `ContextualSpellTests` (Application, 6), covering Penitent defuse, crowd push and shared budget, trace edges, the threshold, first-hunt gating, and seeded determinism.
