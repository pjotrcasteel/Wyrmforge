# Generated Hunt length evidence

Reproduce: `dotnet run --project tools/hunt-report -- 42 docs/playtesting/hunt-length`. Generator version 2.

Every count below comes from the actual C# generator. Combat counts exclude the Wyrm. Shortest/longest count encounters on a legal connected path; total generated nodes are not a played route.

| Region | Depth | Combat nodes | Shortest | Longest | Optional fights | Decisions | Paths | Map |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Fire | 1 | 13 | 6 | 8 | 2 | 6 | 24 | [SVG](fire-depth-1-seed-42.svg) · [raw graph](fire-depth-1-seed-42.json) |
| Fire | 2 | 22 | 8 | 12 | 4 | 7 | 32 | [SVG](fire-depth-2-seed-42.svg) · [raw graph](fire-depth-2-seed-42.json) |
| Fire | 3 | 22 | 10 | 13 | 3 | 8 | 32 | [SVG](fire-depth-3-seed-42.svg) · [raw graph](fire-depth-3-seed-42.json) |
| Fire | 4 | 26 | 12 | 14 | 2 | 8 | 50 | [SVG](fire-depth-4-seed-42.svg) · [raw graph](fire-depth-4-seed-42.json) |
| Frost | 1 | 13 | 6 | 8 | 2 | 6 | 24 | [SVG](frost-depth-1-seed-42.svg) · [raw graph](frost-depth-1-seed-42.json) |
| Frost | 2 | 22 | 8 | 12 | 4 | 7 | 32 | [SVG](frost-depth-2-seed-42.svg) · [raw graph](frost-depth-2-seed-42.json) |
| Frost | 3 | 22 | 10 | 13 | 3 | 8 | 32 | [SVG](frost-depth-3-seed-42.svg) · [raw graph](frost-depth-3-seed-42.json) |
| Frost | 4 | 26 | 12 | 14 | 2 | 8 | 50 | [SVG](frost-depth-4-seed-42.svg) · [raw graph](frost-depth-4-seed-42.json) |

The supported depths are the current pacing input. The current game resolves Wyrm identity/rarity at the lair; this change does not invent a preselected rarity contract. A future Hunt request can map an explicit threat tier to these budgets. Depth 1 retains two opening encounters, village and final approach, so its shortest route has six fights; the master design's 3–4 example is explicitly illustrative.

Each sector guarantees a short road plus a longer alternative, with distinct elemental attunements. Long roads place a real relic reward halfway along them. Cross trails advance exactly one stop, go uphill, and cannot enter a rewarded road beyond its relic. Stage numbers still represent authored pressure (1–8), rather than encounter ordinal. More encounters do not repeat Rank II/III rewards: trail rewards use the existing minor refinement envelope, each stat capped at rank 6; XP-based milestones remain levels 5/10/15. Existing recovery, hazards and boss behavior remain active.

## Timing limits

No human completion-time measurement is claimed. Ordinary encounter phase clocks impose the following theoretical floor, excluding enemy clear time, traversal, menus, Wyrm combat and the special Bell Warden final approach. These values are derived by starting the real EncounterDirector and adding four combat phases, its breathing room and the 2-second entry grace. They are not expected run durations.

| Pressure stage | Ordinary encounter clock floor |
|---:|---:|
| 1 | 19 seconds |
| 3 | 22 seconds |
| 5 | 25 seconds |
| 8 | 28 seconds |

Validation covers 800 maps (100 seeds × four depths × Fire/Frost), deterministic full serialized geometry/content, reachability/no dead ends, forward edges, shortest/longest budgets, distinct-school forks, mobile target spacing, protected detour rewards and bounded trail refinements. Existing dry-ground/scenery tests also run. SVGs use actual generated coordinates and sampled trail curves; they are diagnostic maps, not game screenshots.

This increases route length and the number of decisions without adding health multipliers. Survival and XP balance across the longer advanced routes still require human playtesting; generator validity is not proof of enjoyable completion time.
