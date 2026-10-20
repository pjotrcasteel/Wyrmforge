# Divine-magic five-tier foundation — implementation checkpoint (20 October 2026)

**Status: partial foundation / draft PR.** This file tracks implementation evidence only. The ONE authoritative product specification is `docs/design/WyrmForge_MASTER_DESIGN_FOR_CLAUDE_2026-10-18_v1.2.md` (§3.0); do not treat this as another source of design authority.

## Delivered on task branch

- Updated the authoritative design with the **locked six Divine archetypes**, one signature ability per character school, **later full-school respec with unlock requirements TBD**, and **ten initial mutation design targets per school**.
- Explicitly separated **World Gate Hunt/Wyrm tier I–V**, **mutation mastery tier I–V**, and temporary **spell Rank I–III**. A harder Hunt must never silently confer higher spell rank or mutation authority.
- Added `DivineArchetypeCatalog`: Pyromancer, Cryomancer, Stormcaller, Arcanist, Necromancer and Summoner. The four current schools point to their pre-existing SpellId and lesser Wyrm; the last two remain reserved with null legacy anchors. **No Divine Wyrm names invented.**
- Added `MutationMasteryTier` as its own five-value type, separate from `WyrmTier`.
- World Gate: **six** Wyrm lineage tiles (Fire, Frost + four anonymous future placeholders) rather than twelve, reflowed into two mobile rows. Label clarified: the World Gate chooses a **Hunt Wyrm lineage/region**, not the character's magical school.
- Added MSTest domain contracts covering exact six identities, known legacy signature/Wyrm mappings, unresolved future schools, and independently ordered magic tiers.

## Not yet implemented

1. Persist a character's Divine school and creation-time signature. Integrate with active character art/onboarding work, not in isolation.
2. Implement Fireball as the Pyromancer's signature without breaking existing `FireBolt` saves. Make Cinder Needle a mutated form rather than a second selectable base foundation, preserving Forge/mastery history.
3. Implement, balance and visually test ten Fire Tier-I mutation candidates, then independently author ten Frost and other schools. The existing legacy evolutions are **not** equivalent to a playable ten-mutation system.
4. Define prerequisites and balanced content for magic Tiers II–V. The World Gate remains Tier I only. Wyrm Divine tier fights are still reserved.
5. Bind higher-tier Hunt choices to actual encounter difficulty only after authored bosses, navigation, reward and validation contracts exist.
6. Implement school respec **only when its unlock trigger, cost and migration rules are approved**; current Web respec is not a full class respec.
7. Verify browser builds and visuals at 320/390px and on physical iOS Safari. No images, art assets, fighting mechanics or magic FX have been changed in this slice.

## Compatibility & validation

- No existing `SpellId`, `SpellSchool`, `WyrmTier`, saved key, domain simulation or combat math changed.
- Four established lesser Wyrms preserve existing definitions and current region availability.
- Reserved Death/Binding entries are **not playable** and cannot be accidentally instantiated through legacy `SpellSchool`.
- MSTest source is present but **not executed in this tool environment**: the `dotnet` CLI and Git network are unavailable. Require GitHub Actions results before accepting/merging and a visual QA pass for the World Gate tile-count change.
- Check `AGENTS.md`, repository HEAD and open PRs for concurrent work before continuing. This change intentionally does not alter town artwork or character creation UI.

## Next safe vertical slice

Work on the explicit Fireball migration plan (save alias + typed mutation slots + compatibility/complexity validation), then a **single end-to-end Fire mutation** with C# gameplay + real Nexus preview + automated tests + mobile acceptance. Only then expand to ten. Preserve legacy combination behavior including Frostfire and prevent double application.
