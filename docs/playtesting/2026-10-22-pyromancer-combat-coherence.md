# Pyromancer acceptance — real Fireball core and Arcane Web bonuses (0.0.175)

## Scope: Fire first
This milestone deliberately completes the **Pyromancer** vertical slice before extending Frost, Storm or Arcane. Cryomancer PR #289 has been closed, unmerged. The school icon artwork, spacious node spacing, and six-school world-map framing remain unchanged.

The three independent progression systems remain:
- **Main Spell — Fireball:** Level 1–5 grants one equipped mutation slot per level **and** +8% base Fireball damage per level beyond 1 (maximum +32% at level 5). The permanent core level is snapshotted when a Hunt is prepared; later changes cannot affect a running Hunt. Other spell schools never receive the modifier.
- **Research:** existing discovered and crafted mutations remain authoritative. Locked and unimplemented mutations are not granted by Web skill points.
- **Arcane Web:** learn minor (1 point), medium (2), and major (3) nodes from character level points; previous school knowledge remains retained. Mutation amplifier sockets bind only previously equipped compatible mutations, save to existing character/build and loadout state and cannot provide free spell slots.

## Conflagration
Web area passives now affect **actual Fireball combat**:
- Detonation explosion radius combines generic Web `MutationRadius` bonuses and the bound Crown of Ash mutation amplifier (capped by the socket system). The old one-point nodes are no longer mutation-specific.
- With Scorched Earth equipped, burning-ground **effective radius** also uses generic Web `MutationRadius`. Both spatial damage targeting and the ground-fire snapshot use the same radius. Merely rendering a larger visual effect without a hit radius is forbidden.
- Area nodes do not silently boost unrelated damage or non-Fire spells.

## Immolation
- The existing +14% minor `BurnDamage` applies to real burning-ground ticks only; it is not mislabeled as all Burning-status damage.
- With Scorched Earth equipped, generic Web `MutationDuration` and the assigned Heart of the Furnace amplifier affect burning-ground lifetime. No outdated mutation-specific minor enhancer remains.
- Damage, area and duration stay distinct. Burning-ground lifetime and effective radius are clamped to ×2, preventing runaway effects.

## Modifier pipeline fix

The standard passive profile already applies general damage, casting speed, vitality and defence. Separately, `RunSimulation.BuildModifiers` now adds only the Web's `MutationRadius`, `MutationDuration`, and `BurnDamage` stats to the authoritative runtime modifier set. This keeps the Fire specializations functional **without double-counting** any general passive.

Dedicated combat tests inspect actual Fireball projectiles and burning-ground instances, not just isolated stat calculations. Core upgrades also have a regression test for real Fireball projectile damage versus an unchanged Frost projectile.

## Regression/acceptance
- Application tests: actual burning-ground damage radius and duration, multiplier bounds, immutable Hunt snapshot of Fireball level, no free discovered mutations, correct Fireball level scaling and caps.
- Browser test: the Fireball core panel displays damage progression before spending and after the Lv 1→2 upgrade at 390px; the existing socket tests verify persistence across a real reload.
- GitHub validation, browser smoke and WebKit must all pass on this exact commit before merge. Physical iPhone capture is still required for artistic acceptance.
- Prior dependency order: #283 → #286 → #288 → this Fire polish PR; do not merge out of order.

## Four legacy enhancement nodes migrated to generic minor bonuses
All four previous Fireball-mutation-specific one-point nodes are now generic Fire bonuses while **preserving their existing IDs, connections and costs**:
- `fire-needle-practice` → Kindled Reach, +3% mutation area;
- `fire-molten-density` → Hot Coals, +3% burning-ground damage;
- `fire-blast-shaping` → Shock Front, +4% mutation area;
- `fire-banked-embers` → Banked Embers, +4% mutation duration.

These no longer require mutation discovery. They do not teach Fireball mutations and never change another school's unrelated spell effects. Existing saves and learned paths remain intact. Only major amp sockets assign to a **specific equipped mutation**, keeping Main Spell, Research, and Web progression separate.

## Remaining Fire-only acceptance
- Balance test early, mid and late Hunts with measured TTK, mobility and skill-point efficiency, not just paper multipliers.
- Verify node silhouettes, route legibility and pan/zoom gestures on real iPhone at 320px/390px before calling Pyromancer reference-quality.
- Do not work on Frost, Storm, Arcane or other schools until Fire is accepted.
