# Fire Tier III — Elder Ashfang, watchtower scouting, Epic loot — implementation checkpoint

Design authority: [Hunts and world](../canon/hunts-and-world.md), [Magic and combat](../canon/magic-and-combat.md), [roadmap](../canon/roadmap.md).

## Scope and implementation

- Branch: `feature/fire-tier-three-scouting-20261021`, stacked on loot rarity (draft PR #218 → #209 → #205). Merge in order.
- Fire Tier III unlocks after a Tier II clear. Route: 10–13 trails over three committed forks; the Tier II refuge stays.
- **Elder Ashfang** is the target (health ×1.75, score 12000, size scale 1.35). The Crown of Embers remains rite-only.
- **Watchtower (optional detour, earned scouting):** completing it reports, for every road of the last fork, whether an elite will spawn. The report replays the real elite roll with the current bell and Reliquary state. A confirmed elite is clamped to the earliest spawn so the kill quota cannot outrun it. Returning to the refuge forgets reports for trails beyond it.
- **Epic Wyrmcinder Core:** Tier III elites drop it alongside Emberglass. Fireball core level 5 now costs Emberglass ×1 + Wyrmcinder ×1 (plus Essences).
- Map: long-route layout, TOWER node, "OPTIONAL/SCOUTED" and "ELITE SIGHTED/NO ELITE" badges, matching sheet lines. Map, World Gate and run summary use the tier-aware target name.

## Verification

- Domain: 349/349.
- Application: `FireTier*` 22/22 (topology over 1000 seeds, ladder, Elder boss without Crown, watchtower reports equal actual elite rolls over 80 seeds, refuge forgetting, Tier III Wyrmcinder drops).
- JavaScript: 282/282.
- Browser (targeted): 6/6, including new `Mobile_FireTierThree_ShowsElderTargetRefugeAndOptionalWatchtower` at 320 and 390 px.
- Screenshots reviewed: `world-gate-fire-tier-three-open-{320,390}`, `fire-tier-three-map-*`, `fire-tier-three-watchtower-*`, `fire-tier-three-watchtower-sheet-*`. Map, TOWER label and sheet read clearly at both widths.
- Full suites: see "Full validation" below.

## Remaining gaps

- Elder Ashfang's 1.35 lair scale has not been visually verified in an actual fight; no in-fight Elder screenshot yet.
- No dedicated Elder art; it reuses Ashfang art at a larger scale.
- Fire Tiers IV–V (Legendary materials) and the Fire Endless frontier are not started.

## Full validation

Pending.