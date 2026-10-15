# Laboratory tuning v1: self-play measurements and proposals

Status: proposals only. No constants were changed. Product-owner sign-off and a human playtest are required (handover §17).
Constants: `LaboratoryCatalog.RimeInfusionDamageTradeOff = -0.10` and `LaboratoryCatalog.StormInfusionCastIntervalTradeOff = 0.10`.

## 1. Method

- Harness: `dotnet run --project src\Wyrmforge.BalanceLab -c Release -- --laboratory --runs-per-combination 40 --output artifacts\lab-study`. The report is written to `<output>/laboratory-study.md`.
- 2,880 deterministic hunts: 40 seeds per build × agent × variant, starting at seed 10000, with a 720 s cap in a 1280×720 arena.
- Builds of the mutation's school: Fire builds for Rime Infusion, Arcane builds for Storm Infusion. All BalanceLab personalities are used.
- Variants:
  - **baseline**: no mutation and no lead.
  - **legacy synergy**: the subset of baseline hunts in which the agent bound the legacy synergy through a level-up choice.
  - **mutation**: the mutation is prepared before the primary commit.
  - **lead**: a research lead for the mutation's specimen Wyrm.
- Lead variants use a `ResearchingAgent` decorator, which takes the specimen whenever the harvest offers it. The unmodified heuristic never values "vitality", so without the decorator it never takes a Rime Heart. This understates what a player who wants the specimen secures.
- Paired comparisons use the same build, agent and seed, so the only difference is the mutation.

## 2. Results

### Specimen access

| Wyrm | Slain, no lead | Specimen secured, no lead (unmodified agent) | Slain, with lead | Specimen secured, with lead |
|---|---:|---:|---:|---:|
| Rimeclaw | 24.0% | 0.0% | 99.2% | 99.2% |
| Stormcoil | 20.2% | 5.5% | 79.4% | 79.1% |
| Ashfang | 46.4% | – | – | – |
| Voidweaver | 28.8% | – | – | – |

### Mutation against the same builds

| Mutation | Variant | Hunts | Mean score | Death rate | Wyrm slain | Mean reactions |
|---|---|---:|---:|---:|---:|---:|
| Rime Infusion | baseline | 640 | 1,750,951 | 6.6% | 99.2% | 39.0 |
| Rime Infusion | legacy synergy | 640 | 1,750,951 | 6.6% | 99.2% | 39.0 |
| Rime Infusion | Rime Infusion | 640 | 1,829,804 | 5.9% | 99.8% | 61.2 |
| Storm Infusion | baseline | 320 | 1,096,195 | 36.3% | 79.1% | 234.2 |
| Storm Infusion | legacy synergy | 285 | 1,217,881 | 28.4% | 87.7% | 262.9 |
| Storm Infusion | Storm Infusion | 320 | 1,284,694 | 32.2% | 84.7% | 413.4 |

Every Fire baseline hunt bound legacy Frostfire, so the Rime legacy row equals its baseline row.

### Paired seeds: mutation minus baseline

| Mutation | Pairs | Score Δ mean | Score Δ median | Mutation scored higher | Kills Δ mean |
|---|---:|---:|---:|---:|---:|
| Rime Infusion | 640 | +78,853 | +33,527 | 65.8% | +54.3 |
| Storm Infusion | 320 | +188,499 | +62,914 | 70.9% | +147.0 |

## 3. Proposals

1. **Keep the research lead.** Without one, the specimen Wyrm is slain in only about a fifth to a quarter of hunts. With a lead, the specimen is secured in 99% (Rime Heart) and 79% (Storm Heart) of hunts. Stormcoil is the harder hunt; the remaining gap is hunt difficulty, not access.
2. **Keep the First Hunt exclusion and Ascendant priority.** The lead never overrides onboarding or a due rite.
3. **Rime Infusion: keep −10% damage, or consider about −15%.** It beats legacy Frostfire by +4.5% mean score (median +1.9%) despite the trade-off, because the reaction is active from the first cast. The advantage is modest and is the intended reward for research. Revisit only if playtests show it as mandatory for Fire.
4. **Storm Infusion: consider raising the cast-interval trade-off to 0.15–0.20, or keep 0.10 pending a playtest.** It beats legacy Arcane Conduit by +5.5% mean score and roughly doubles the discharge count compared with baseline (413 vs 234 reactions). Its death rate (32.2%) is higher than legacy (28.4%); the extra score comes from offence, not survival.
5. **Change constants only together.** The ratio tests read the constants, so a change is one line plus a re-run of this study.

## 4. Caveats and open questions

- The agents are heuristic, not human. Their level-up choices differ from players'.
- The legacy Storm row (285 hunts) is a self-selected subset: hunts where the agent chose Arcane Conduit.
- The Storm Heart's own Forge offering has a "every 5th cast" lightning proc. It can coexist with Storm Infusion; they are separate systems, as Rime Heart vitality is for Rime Infusion. Decide whether that overlap is desirable.
- The 720 s cap and depth ≈2 mean late-game scaling is not measured.
- Open: should a lead persist across several failed hunts, or expire? Currently it persists until the specimen is secured.
