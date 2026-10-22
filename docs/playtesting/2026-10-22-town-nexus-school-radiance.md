# Arcane Nexus — school-aware town radiance

## Intent

The **existing approved Arcane Nexus building** responds to the mage's currently followed magic school. Its color follows the school; its brightness increases as the mage invests earned **Arcane Web points in that school**. This is diegetic feedback only, not a new resource, research unlock, modifier, or spending system.

## Behavior

- The canonical character school controls color: Pyromancer (ember-orange), Cryomancer (ice-blue), Stormcaller (electric blue/gold), Arcanist (violet), Necromancer (poisonous green), Summoner (teal). The last two are palette-ready only, **not additional playable schools**.
- The invested-point count uses the selected nodes' actual point costs and the `ArcaneSchoolCatalog.Owner` school. Knowledge from previously followed schools remains retained, but does not brighten the **currently followed** school's building.
- Intensity `0.16 + 0.70 * sqrt(min(invested, 24) / 24)` is capped at `0.86`. At zero investment there is still a restrained magical glow. Points grow the aura smoothly with diminishing increments rather than making the first level overpowering.
- If the Arcane Nexus is still locked/vacant, no magical overlay is drawn.
- The canonical Refuge town remains **night-only**. This feature does not activate the dormant device-clock lighting experiment or introduce day/auto controls.
- No new image files or tinted replacements. The approved `night-active.webp`, `day-active.webp`, and vacancy artwork remain untouched. The radiance is a **localized additive painted-light layer**, below actors and foreground cutouts, and has `pointer-events:none`. It does not block town gestures or building clicks.
- The only animation is very slow localized light breathing; it is disabled when the device requests reduced motion.

## Verification

- Phone browser at 320 and 390 pixels: increasing Fire Web investments increases computed light intensity; changing the mage's primary school changes the hue.
- Existing night-only artwork and town-clock isolation tests remain untouched.
- Existing town navigation, TownV2/NPC occlusion, keyboard and swipe tests must remain green.
- Validate the actual glow position visually on day and night screenshots; reject if the aura touches the central well, paints over NPCs, or covers the image's Gothic detailing.
- This change is independent of the unmerged Pyromancer progression work; no other school trees are expanded by it.

## Integration
The production render obtains its school from the character's canonical school choice and its invested points from the same `PassiveTreeSelection` used in the Web. A character level without new school investment does not change the glow.
