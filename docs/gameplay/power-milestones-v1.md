# WyrmForge: power milestones, minor refinements (M1)

## Player feedback and confirmed problem
The post-PR-109 iPhone build felt too easy and power arrived too quickly. The old reward pool allowed primary spell Rank II/III, +18% Potency, extra projectiles, and hosted elemental combinations before a meaningful leveling checkpoint. The experience curve was intentionally not changed in this slice, so we can isolate *reward strength* from *level frequency*.

## First playable rule
- **Level 1:** commit exactly one primary spell, as before.
- **Levels 2–4, 6–9, 11–14 etc.:** choose one modest refinement from three cards. New refinements scale gradually: Force +6% damage, Casting Rhythm -4% cast interval, Fleet Step +4% movement speed, Runic Ward -5% damage taken, Life Thread +8 maximum HP (and heals eight).
- **Level 5:** the first major breakthrough is a dedicated, **guaranteed primary Rank II**, not a three-card draft with tempting alternatives that leave fresh hunters badly underpowered.
- **Level 10:** second major breakthrough: primary Rank III if Rank II was chosen, or an earned combination if eligible. Powerful combat runes (extra projectiles, Arcane Echo, elemental hit mechanics) can also appear here or at other breakthroughs.
- **Level 15:** if the primary was mastered, choose an evolution branch **as the actual level-15 reward**. This is *not* granted immediately when Rank III is picked. If Rank III was skipped, later breakthroughs still allow mastering it, with evolution deferred to a later breakthrough.
- **Later levels:** every fifth level permits another major reward, subject to actual build prerequisites. Normal levels remain refinements.
- **Trail attunement rewards:** one modest refinement, **never** a free major rank, combination or evolution, even if the displayed upcoming XP level happens to be a milestone.

## Enforcement
The real `RunSimulation` invokes `RollForProgression` and `ApplyForProgression`, both level-aware. Applying stale/off-milestone cards is rejected before state mutation. One-time primary locking and supporting-school combination acquisition remain intact. The classic reward catalogue APIs remain available solely to existing standalone deterministic tests and developer setup tools; they do not drive live player progression.

## Intended tuning sequence
1. M1: validate minor vs major reward separation, level 5/10/15 behavior, and actual run balance.
2. M2: after measuring time-to-level and time-to-Wyrm, tune XP thresholds and pickup value. Do **not** simultaneously change enemy HP.
3. M3: raise challenge through telegraphed enemy movement/abilities after observing the new build.
4. M4: make levels 5/10/15 visually and sonically exceptional without extra combat mechanics.

The target ranges are hypotheses. Compare seeded fresh and established cohorts as diagnostics, and confirm human iPhone combat before merging to GitHub Pages.
