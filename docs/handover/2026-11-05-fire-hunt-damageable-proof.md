# Fire Tier-I real-damage gameplay proof — P1 / #479

**Status: partial evidence only; not an accepted end-to-end loop.** This is a proof tracker, not a balance verdict or an assertion that a heuristic bot measures fun. Do not close #479 or declare Hunt 1.0 play-tested based on the existing invulnerable smoke.

| Check | Evidence | Status |
| --- | --- | --- |
| Deterministic C# route, Ashfang, Essence decision and extraction | `FireTierOneFullLoopTests.FullHunt_ReachesAshfangDefeatEssenceAndExtraction` runs with `InvulnerableAgent`, explicitly healing every tick | Structural smoke only |
| Ordinary damageable agent, real combat and natural failure/success | `FireTierOneFullLoopTests.TwoDamageableHunts_SaveAndReloadWebGrowthBetweenAttempts` uses only controller input, logs HP/damage, routes, Wyrm encounters, victories and extracts for seeds 42 and 1204, with the actual first-Hunt flag on attempt one | New CI trial; **success not yet established** |
| Fresh character creation, World Gate and first Fire Hunt | New `FreshSave_CreatesFireMageAndEntersDamageableTierOneHunt` browser test uses clean Playwright storage and no god/bot switches at both 320px and 390px | New CI trial; complete Hunt **not proved** |
| Successful damageable run through Wyrm and ten-second extraction | Invulnerable C# structural test and opt-in `?god=1&bot=1` browser soak cannot prove it | Not proved |
| First Web point, spend, JSON reload and retry with saved nodes | The damageable C# two-attempt test carries first-Hunt onboarding, `fire-start` and its saved budget into the next simulation; the browser UI settlement path is still separate | New CI trial; **full UI proof not yet established** |
| Secure Essence and materials, save, reload and Arcane Nexus spend, then start next Hunt | Existing structural Fireball two-Hunt tests exercise Nexus-domain upgrade; damageable UI + persisted inventory still require proof | Not proved |
| Death, failed extraction, retry/abandon, save migration and restart cannot duplicate or lose rewards | Existing targeted tests cover portions separately; full boundary-spanning test missing | Not proved |
| Tier II refuge / Tier III selected-tier invariants | Focused navigation/simulation tests exist; they must remain on CI after proposed gameplay changes | Partial |
| Genuine screenshots at 320px/390px and a mobile performance sample | Existing greybox/terrain browser tests capture screenshots; damageable complete run at both widths has not been recorded | Not proved |
| Physical phone combat feel, fair deaths, satisfying upgrade cadence | Needs owner acceptance from real gameplay, not automated metrics | Owner gate |

## What this checkpoint changes

- Keeps the proven invulnerable structural test to catch navigation/essence/extraction wiring regressions.
- Separately instruments **two real, damageable attempts** with the fresh tutorial flag, actual Web point spending between attempts and JSON save/reload of selected nodes. Neither health nor combat outcomes are manipulated. The test is a domain/simulation integration proof; it does **not** execute the browser settlement handler. The only movement helper sidesteps static props when it gets stuck walking to the exit, equivalent to player direction input.
- Adds a real browser test of first-time Pyromancer character creation through the World Gate and into the opening Fire Hunt with **no seeded save state or invulnerability URL switches**, capturing both mobile widths. It checks entry only, not victory.
- Allows a legitimate defeat as trial evidence. A defeat is **not** counted as a successful Hunt-to-Nexus loop. Tests log their exact outcome and fail on a time-out, abandoned run or no observed combat damage.
- Caps each diagnostic damageable attempt at 900 simulated seconds or 60 real seconds (whichever occurs first). A stalled run fails with an explicit time-limit result instead of hanging CI; the structural smoke remains unrestricted by this wall-clock cap.
- Adds no balance changes. Hunt success and device feel will be judged from actual runs after the proof harness is stable.

## Next acceptance work

1. Inspect the damageable trial logs and decide whether an actual deterministic skillful input replay is needed for a successful extraction; record the seed and reproducible inputs.
2. Extend the new fresh-storage 320px and 390px visible-UI entry test through a genuine damageable victory, Essence choice, ritual and return to Town, with artifacts attached to CI.
3. Continue in the Arcane Nexus: assert inventory totals, the first five-level Fireball upgrade requirement and a legal one/two-click spend, persist, reload and start another Hunt. This must match the current P0 design; Fireball level 1 has no mutator and level 2 unlocks its first socket.
4. Assert interruption/abandon/restart and save migration do not duplicate or silently lose rewards. Exercise selected Tier II and III separately rather than inferring hunt tier from depth.
5. Complete the pass/fail rows above with CI run links, actual screenshots and the owner's phone check. Only then close #479.
