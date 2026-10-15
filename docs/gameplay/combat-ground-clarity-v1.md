# Combat ground readability (live iPhone feedback)

The v0.0.117 iPhone screenshots showed square pavement repeated across the entire field and oversized arcane, fire and storm marks brighter than the hunter. Previously, 7 stone lanes repeated every 42 world units; the arcane landform painted four 7px rings plus eight gigantic spokes. These were *environment art*, not spell projectiles.

This change reduces repeat frequency, line widths, contrast and area for the ritual inlay, lava crevices and storm fractures; leaves wide quiet earth around the actual mage and boss telegraphs; and retains seeded biome, district, landmarks, terrain material and actual masonry collision.

The revised road uses irregular missing flagstones; ritual marks are localized cracked inscriptions rather than multiple giant targets. All changes stay within the cached, deterministic Canvas2D environment texture. No damage, hitboxes, spell cooldowns, movement or combat logic changes.

Next human playtest should compare full-screen visual hierarchy, character/attacks and whether spell lighting reaches genuine walls without a sea of glowing circles.
