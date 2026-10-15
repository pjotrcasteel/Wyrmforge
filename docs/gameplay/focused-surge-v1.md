# Focus Surge — fourth-cast vertical slice

## Why
The previous green focused-magic revision (54b9f0e) reached a Wyrm in 16/96 established seeded hunts, versus 33/96 with the old independently scheduled multi-spell system. Combat readability and combo acquisition improved, but losing simultaneous spell streams left too many builds without enough meaningful coverage. More random projectile spam is not the answer.

## Rule
- Every **fourth non-echo cast of the same active primary spell** releases an empowered version of that **same cast**. Other learned spells remain knowledge for deliberate combinations.
- Surges add **65% damage to the primary cast only**, a 20% larger physical projectile collision radius, one extra pierce, and a rank-scaled impact splash (46/60/74), or two additional jumps for chain spells. Existing larger mastery splashes are retained where stronger.
- Surges stack with an explicitly selected Frostfire or Stormglass combination, but **never trigger a separate attack** or independently scheduled spell.
- Progress belongs to each spell, survives a deliberate focus switch, and does not advance for echoes, extra projectiles, support procs, or chained continuations.
- Echoes retain their existing damage profiles; the bonus is not applied a second time. Chain and splash effects retain the original surge's identity and payload.
- Cast and hit snapshots carry immutable surge identity. Staff motion, wake, and elemental impact get a visibly stronger release. Reduced-motion keeps the distinction without rapid motion.

## Explicit release gate
Before considering a merge, compare this branch against commit `54b9f0e` on identical seeds, fresh and established builds. The dedicated CI workflow preserves both sets of run reports. Verify overall Wyrm reach, combination selection, survival, and any first-hunt regressions; do not assume tuning improved the experience simply because it is more powerful.

CI build, unit tests, real-browser pixel tests and a human mobile readability review remain necessary. The artwork is still an interim slate-blue mage silhouette. Injury stays entirely visual-only.

No changes here to movement speed, spell cooldown, enemy behavior, player health, drop rates, unlock pools or attack scheduler.
