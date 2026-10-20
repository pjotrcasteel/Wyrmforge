# WyrmForge character-school entry + sigil blending fix (20 Oct 2026)

## Gameplay implemented
- A new **character creation** page appears after START GAME for new characters, before the Refuge. The existing six Divine Wyrm identities appear with the canonical pixel emblems; the four schools with real spells can be selected, and Necromancer/Summoner are visible but disabled until they have playable mechanics.
- Selection saves `wyrmforge.characterSchool.v1` and pins the school's existing signature in the legacy `wyrmforge.preferredPrimary.v1` for compatibility. The World Gate still chooses the **Hunt target** and Wyrm tier, not the character's school.
- Existing character saves with a legacy preferred primary are migrated to their corresponding Divine school. Invalid or absent older preferences require a **one-time** character choice; no school is guessed.
- First Oath is no longer shown in Arena. The stored signature is automatically committed after the arena module initializes. Run resources/research are charged/recorded only by the existing successful commitment callback, not by merely opening the World Gate.
- Saved loadouts can no longer silently change the Divine school. Applying a loadout from another school keeps the current signature and reports the unavailable primary in its skip notice. Full school respec is **not** unlocked; prerequisites are still TBD.

## Icon correction
- The six icons are still the **same approved artwork** already tracked in `docs/art/divine-lineage-pixel-icons-2026-10-20.md`, not replacements or AI redraws.
- For this small visual repair, CSS applies a centered elliptical alpha mask to the existing 192×128 WebP atlas, retaining the central flame/crystal/bolt/sigil/skull/bear while clipping baked-in captions and hard rectangular background edges. The label under each frame is now the only visible label.
- This is non-destructive and keeps the original atlas and reproducible extractor unchanged. A fully regenerated transparent RGBA atlas remains a possible later art-pipeline quality step.
- The gate still shows only Fire and Frost as playable Hunt lineages and Tier I as selectable. Character schools Storm/Arcane are independent of unavailable Storm/Arcane regions.

## Test scope
- Mobile welcome screenshot and character-creation selection.
- New character choice and local profile persistence across refresh.
- Migration of legacy FrostShard -> Cryomancer, no new oath in Arena, existing Fireball/FireBolt simulation preserved.
- Existing World Gate region choice and tier tests, atlas loading, mobile layout, and run-start resource safety.
- Validate on GitHub CI, then check physical iPhone Safari separately.

## Adjacent work
- Character art and town panorama workstreams remain untouched; the added creation UI is a compact first step and does not redesign their canonical art.
- Tier II–V and additional Divine schools are reserved, not enabled by this PR.
