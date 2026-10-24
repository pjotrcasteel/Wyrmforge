# Hunt upgrade cards — after permanent Fireball progression (0.0.180)

## Decision

**No more Fireball II/III, spell ranks, newly learned spells, spell evolutions or school switching through hunt upgrade cards.** They belong to the Arcane Nexus Main Spell/Research progression, not the in-hunt reward screen.

All **actual gameplay** reward generation, level-up application and Fateweave rerolls follow the same two-tier pool:

- **Regular levels and trail rewards:** three modest, temporary `RunRefinementCatalog` selections (Force, Rhythm, Footwork, Warding, Vitality). Repeated picks increment the refinement rank for the current hunt only.
- **Every fifth Hunt level (5, 10, 15, …):** up to three eligible, stronger **major runes** and **current-school Attunement**. These change the hunt build without modifying Fireball's permanent level, its equipped mutation slots or Research. Fire players can pick Emberbrand (burn), Multicast (universal projectile rule), Potency (+18% spell damage) or Fire Attunement (+10% Fire damage this hunt), subject to max ranks and prior picks. Three choices are visible with at least one alternate available for Fateweave at the first breakthrough.

### Implementation

`LevelChoiceService.RollForProgression` is the production reward entrypoint from `RunSimulation.Progression`. `CreateMajorPool` constructs a dedicated, same-school eligible temporary pool instead of filtering the legacy spell-rank catalogue. `DraftPool` uses the **same** pool when Fateweave rerolls. `PowerMilestoneProfile.IsMajorChoice` rejects old rank, evolution, new spell, and cross-school cards, even if a stale client submits one directly.

The older `Roll`/`Apply` catalogue methods remain for standalone tooling and legacy deterministic tests; they are **not** called by actual hunt reward progression. The game's real primary spell stays rank I throughout a Hunt; permanent core levels 1–5 come from the Main Spell screen.

### Acceptance

- Real simulation from level 1 through level 15: never offers `spell:`, `evolution:` or `synergy:` upgrade cards, never increments primary-spell rank.
- Level 5 offers meaningful temporary major choices rather than mandatory Rank II. Subsequent multiples of five preserve the same discipline.
- Normal levels remain mini upgrades; trail rewards cannot steal a major milestone.
- Fateweave and gilded rerolls cannot reintroduce old cards.
- Reject attempts to submit old cards at major levels.
- Remaining spell rank logic inside older combat/class definitions is not an offered Hunt upgrade path; it can be removed separately when no other callers need it.
