# Player sensitivity study

This .NET 10 console tool executes the actual game simulation without a browser, save writes or feedback submissions. It complements Balance Lab with fresh-account content, unspent/partial builds, three arena shapes and reproducible imperfect-input profiles.

The profiles are hypothetical sensitivity settings, not calibrated human personas. All retain the same Casual checkpoint policy to avoid confusing willingness to descend with combat skill. Decision overlays pause the simulation; reaction intervals apply to movement, not time spent reading those overlays.

From the repository root:

```bash
dotnet run --project tools/playtesting/Wyrmforge.PlaytestStudy -c Release -- --seeds 12 --output artifacts/player-study
dotnet run --project tools/playtesting/Wyrmforge.PlaytestStudy -c Release -- --mode world --seeds 12 --label Equal-world-area --output artifacts/player-study
```

Modes: `all` (full runs, bosses and dodge probes), `runs`, `bosses`, `dodge`, `world`, `verify`. Outputs are JSON with readable enum names. A movement tick is 0.05 seconds. The tool verifies deterministic repeated runs for every profile/arena and exact equivalence between Control and the original Casual policy before each study.

- `player-runs.json`: 17 builds × 6 profiles × 3 arenas × seeds, plus 12 builds × 3 arenas × seeds with the all-base-spell/relic pool as a matched Control comparison.
- `boss-trials.json`: 4 ordinary Wyrms × 4 prepared spells × 4 profiles × 3 arenas × seeds, with a fixed Fire/Frost hybrid build at Depth II. The developer setup upgrades the selected spell to Rank III and its first base evolution; non-Arcane setups retain the initial Rank I Arcane Orb.
- `dodge-probes.json`: zero, 0.25-second and 0.40-second reactions to the first ordinary target-burst warning from Voidweaver/Rimeclaw in both phases. These are straight-line escapes in an open desktop arena with no speed boosts or freezing. Damage across the warning can include overlapping signatures; use travel distance and attack geometry when attributing hits.
- `world-geometry-runs.json`: 17 builds × 2 edge-aware profiles × 2 mobile aspect ratios × seeds, with virtual arena area equal to the desktop arena. This tests geometry only; no renderer/input transform is implemented.

`candidate-telegraphs.patch` is an optional experimental patch against version 0.0.83. It is not applied by this tool. It extends Voidweaver's ordinary attack warnings, Rimeclaw's phase-two ordinary warning and its player-centred pressure warning. Apply and test it in an isolated checkout, with `--label Candidate-telegraphs-including-Rime-pressure`, to distinguish experimental evidence from shipped behaviour. Do not apply it blindly to a later game version.

Read the [findings and fix direction](../../../docs/playtesting/player-study-0.0.83.md) before interpreting results. In particular, the original agent lacks edge avoidance and ignores the ordinary circular attack warnings represented only as cosmetic splash pulses. The study's edge repulsion is a diagnostic control, not a complete player AI.
