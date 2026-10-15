# Earned primary power and direct combinations

Candidate follow-up to the 2026-10-15 focused-magic comparison. The preceding focused revision is 8e0ec63e63678baf93bd830d2797e42b6da517ae.

## Player-facing changes

A Rank II primary can offer a compatible combination when its supporting spells are unlocked for this run. Picking that skill teaches missing supporting knowledge at Rank I without changing the primary. Existing learned ranks are preserved. Locked support is never granted through a combination. If both requirements were already learned, the previous Rank I combination path remains valid. The combination still requires a deliberate skill selection; learning or ranking a spell does not activate it automatically.

A Rank I spell keeps its existing damage and coverage. Rank II and III primary casts gain additional damage multipliers of 1.35 and 1.80 on top of their native rank scaling. This is an initial tuning candidate, not a claim of balanced output. Fire Bolt's base primary hit progresses from 30 to 52.65 to 86.4 before other build modifiers. Cast intervals and movement are unaffected by this new profile.

| Spell | Rank II added coverage | Rank III added coverage |
| --- | --- | --- |
| Arcane Orb | Existing extra pierce; wider projectile | Another pierce; larger projectile |
| Fire Bolt | 32-radius impact blast | 84-radius impact blast |
| Frost Shard | One pierce | Two pierces plus existing mastery nova |
| Chain Lightning | One additional jump | Two additional jumps plus existing mastery fork |
| Cinder Needle | 28-radius impact burst | 44-radius impact burst |
| Ice Lance | One pierce | Two pierces |
| Ball Lightning | One additional jump | Two additional jumps |
| Aether Dart | One pierce | Two pierces |

Projectile radius multipliers are 1.15 and 1.40 at Rank II and III. These affect the actual captured projectile radius and collision, not just a UI claim. Damage and coverage belong to the scheduled primary and its earned echoes. The Arcane Conduit chain helper retains its native damage and chain profile, avoiding an accidental second application of primary power to the supporting proc.

Upgrade readouts use the same damage profile and display piercing, target counts and impact size. The animation study remains separate; no final mage sprite or larger body gesture is claimed by this gameplay patch. Injury remains visual only.

## Validation

New regression cases cover acquiring a combination without switching or downgrading, preservation of existing support ranks, rejection of locked support and duplicate picks, real splash damage from one Fire Bolt, multiple targets struck by one frost shard, separation of primary chain power from supporting proc power, and accurate upgrade readouts.

The local execution environment was unavailable during this follow-up. Build, test and packaging results must come from the new GitHub CI runs. The preceding revision's tests cannot be presented as validation of these changes.

The dedicated **Focused magic comparison** workflow builds this candidate and the preceding focused control separately, using the same seeds, agent personalities, arena and caps. It runs 32 fresh and 96 established hunts per variant, checks that each retains one primary and has no draft decision failures, and preserves JSON/CSV reports. Its step names expose compact statistics for both variants. Completion of that workflow does not by itself establish human balance or animation quality.

Keep PR #107 in draft until the new tests and comparisons have been inspected. Do not merge or deploy based only on the existence of this tuning candidate.
