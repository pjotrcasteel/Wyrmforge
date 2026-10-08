# WyrmForge long-term progression contract

## North star

Persistent progression exists to make the player think **"one more run, because I want to try or unlock that"**, not to make old content trivial through permanent numerical inflation.

The long-term loop is:

**Goal → Run → Progress → Achievement → Celebration → New possibility → New build idea → Goal**

When the meta-game is mature, the post-run screen, Forge and Codex should normally expose at least **three meaningful next goals** a player can choose between.

## Reward hierarchy

The strongest persistent rewards widen the game:

1. new spell evolution branches;
2. new spells, relics, Synergies or offerings entering future pools;
3. new Atlas/Forge route options;
4. access to new Wyrm challenges, Ascendant/Elder variants or Great Hunt targets;
5. cosmetics, trophies, titles and visual Forge changes;
6. information and discovery: Codex entries, hints and revealed conditions.

Permanent flat damage, health or cooldown bonuses are not the primary progression currency. If persistent numerical bonuses ever exist, they must remain small enough that unlocked possibility is still the reason to progress.

## How the existing milestones carry the endgame

### 0.0.74 — Build Evolution

Rank III spells gain a two-way evolution crossroads. These base branches are available during runs and establish the system future unlocks extend.

The important architectural rule is that **an evolution is content in a pool**. Forge/Mastery systems can therefore unlock another branch without rewriting spell progression.

Example future shape:

**Fire Bolt Rank III → Meteor Heart / Phoenix Volley / 🔒 Wyrmfire**

The third branch can remain hidden or teased until its persistent requirements are met.

### 0.0.75 — Forge 2.0

Forge 2.0 makes secured Essence lead to real future possibilities. Its first layer now shows a three-goal board in the Run Hub, Forge and post-run report, generated from the player’s real discovered Wyrm lineages, secured Essence and next unfinished mastery. The four Masterwork recipes each unlock an additional spell evolution blueprint on top of their existing reward.

These unlocks use existing Forge persistence and expand only the future evolution pool. Fresh profiles cannot draft locked branches. Previously forged Masterworks receive their new blueprint automatically.

The goal board is an actionable Forge starting point, not the complete endgame. Once all current craft lines are completed it must say so rather than invent false objectives; later Mastery, hidden Lineages, Codex feats and Great Hunt content will provide additional long-term horizons.

The Forge should answer three questions:

- **What did I just make progress toward?**
- **What can I unlock next?**
- **What new thing will become possible when I do?**

Targets for Forge 2.0 include a goal surface, clearer discovery/mastery paths, unlock previews, Codex hooks and progression rewards that add content to future runs rather than simply increasing account stats.

### 0.0.76 — Spell Mastery & Wyrmforged Lineages

The first persistent Spell Mastery layer is shipped for the four original spells. Each has an aspirational Wyrmforged evolution gated behind four meaningful Rank II+ hunts and an associated Wyrm defeat with that spell at Rank III **at the time of the kill**. Progress and feat can occur in any order; abandoned runs and instant quits award nothing.

The Codex tracks both conditions, without revealing a locked form's name. Run Hub, Forge ledger and post-run goals now mix Mastery with Forge objectives. The post-run story marks incremental Mastery and celebrates the four new possibilities on discovery. Future runs gain access through their progression-scoped evolution pool.

New lineages: Fire Bolt / Ashfang → Wyrmfire; Frost Shard / Rimeclaw → Glacial Requiem; Chain Lightning / Stormcoil → Tempest Ascendant; Arcane Orb / Voidweaver → Void Constellation.

The four remaining spells and the deeper Wyrm-related feats will be added in existing later endgame/content work. Ascendant/Elder Wyrms, Great Hunt chains and other rare discoveries are still future goals, not part of 0.0.76.

### Existing later content/endgame work

Later roadmap work should deepen the same model rather than introduce an unrelated endgame currency treadmill.

It should support:

- per-spell Mastery history across runs;
- thematic hidden requirements for Wyrmforged Lineages;
- Wyrm feats and challenge conditions;
- teased locked Codex entries;
- Ascendant/Elder Wyrms and Great Hunt targets;
- rare trails/challenges tied to long-term accomplishments;
- cosmetic/trophy rewards that communicate difficult achievements without affecting balance.

## Spell Mastery and Wyrmforged Lineages

Mastery measures meaningful history with a spell: runs where it became part of the build, Wyrms slain with it, depths reached and thematic feats.

Mastery thresholds do **not** mean "Fire Bolt permanently deals +20% damage."

They reveal or unlock new possibilities.

Example direction:

1. complete enough meaningful runs with Fire Bolt;
2. defeat Ashfang with a Fire-focused Fire Bolt build;
3. discover the hidden **Wyrmfire** Lineage;
4. Wyrmfire enters future Fire Bolt evolution crossroads;
5. Wyrmfire itself enables new Synergies, Codex discoveries or Great Hunt conditions.

Different schools should ask different things. Frost can care about control/shatter feats, Storm about movement/tempo and Arcane about echoes, geometry or multiplication.

## Great Hunt structure

The Great Hunt is an aspirational layer, not merely a deeper health multiplier.

Example:

**ASCENDANT ASHFANG — locked**

- ✓ defeat Ashfang at a required Depth;
- ✓ discover a defining Fire evolution;
- ✓ secure enough Ashfang Essence;
- ☐ discover a Wyrmforged Fire Lineage.

Completing the conditions unlocks a hunt with new rules/mechanics and a new reward pool.

This gives ordinary runs strategic context: a player can enter because they are progressing a spell, chasing Essence, solving a hidden lineage condition or preparing an Ascendant hunt.

## Goal presentation

Goals should be layered by horizon:

- **this run:** evolve a spell, clear a Rare trail, hunt a particular Wyrm;
- **next few runs:** finish a Forge unlock, Mastery threshold or known challenge;
- **long term:** discover a hidden Lineage, unlock an Ascendant Wyrm, complete a Great Hunt chain or Codex collection.

Avoid daily chore lists and arbitrary engagement timers. Goals should emerge from the game's systems and player curiosity.

## Celebration contract

A meaningful unlock must not silently increment a counter.

Major moments such as a Wyrmforged Lineage discovery should get:

- a strong visual/audio reveal;
- a name and fantasy description;
- an explicit statement of what is now possible;
- an immediate Codex/Forge change;
- a clear reason to start another run.

The reward hit comes from **earned accomplishment plus a newly available toy**, not from opaque variable rewards.

## Success criterion

The endgame succeeds when the player can finish a run, look at the Forge/Codex, and naturally say:

> "I want to do that next."

Preferably in three different directions.

## 0.0.77 implementation: the first Great Hunt layer

Four oath seals are earned by slaying each Wyrm, preserving at least one of its Essences, performing a school-matched evolved defeat at Depth II+ and awakening the related Wyrmforged Spell Lineage. Conditions accumulate independently across meaningful runs. A seal becomes a permanent ceremonial trophy and marks an Ascendant path as prepared; no encounter is represented as playable until its distinct combat mechanics ship.

The Great Hunt altar is a compact, selectable ritual surface in the Forge sanctum and Codex, not a separate currency shop. The goals board reserves space for Forge, Spell Mastery and Great Hunt horizons while those pursuits remain active. Existing Forge discoveries restore historically known slay/Essence feats; older deep evolved duels cannot be inferred accurately, so they must be earned moving forward.

**Next gameplay gate:** implement a distinctly telegraphed Ascendant hunt with fair portrait/mobile positioning, novel attack sequencing and clear encounter unlock/selection, then evaluate feel and deterministic balance. After Ascendants, extend the chain toward Elder Wyrms. Continue extending Build Evolution where new mechanics genuinely alter builds.

## 0.0.79: first playable Ascendant

**Ascendant Ashfang — Crown of Embers** is the first opt-in rite, unlocked by sealing the First Flame oath. Selecting it from the Run Hub preserves normal Depth I gameplay and guarantees an upgraded Ashfang at the Depth II Wyrm gate. It has an extended cinematic reveal, stronger health, a shifting-safe-lane Crownfall signature and a third volley in phase two. A permanent, non-stat Crown of Embers trophy marks the first victory on the existing Great Hunt altar, and the fight is replayable.

The three other Ascendants must each gain a distinctive movement problem instead of inheriting Ashfang's Crownfall or being presented as playable. Then Elder Wyrms can extend the same progression architecture. Normal combat balance must remain unchanged for non-rite runs.
