# Fixed Primary Oath, combinations, and visual hierarchy

The player's starting hunt now presents one explicit magical oath: Arcane Orb, Fire Bolt, Frost Shard, or Chain Lightning (plus any starter spells genuinely unlocked in the Forge). The decision happens before the first map selection or combat tick. `SpellBook.IsPrimaryCommitted` blocks `TryFocus` thereafter, and the reward pool offers only actual primary ranks, useful runes, evolutions, and host-compatible combinations. Existing direct domain setup paths stay available for deterministic legacy unit tests and developer-only boss test fixtures.

Choosing Fire, Frost or Storm no longer retains the default Arcane knowledge as a false learned primary. Combinations may learn a supporting spell inside the original cast, and no separate cooldown or idle support spell starts auto-firing. Route attunements from a different school choose a genuinely compatible fusion if available; otherwise they reinforce the committed primary instead of giving inactive off-school damage.

The headless balance agent explicitly commits its preferred school before the map begins and records the opening `primary:` decision. This makes the fresh and established sample relevant to the new player progression. Its earlier multi-primary baseline is no longer apples-to-apples; compare under the new rules before making further balance promises.

Live iPhone screenshots exposed terrain ornaments masquerading as active spell signals: huge thick purple ritual rings, dozens of square repeated paving marks, fat lava scribbles. The world now relies on subdued, broken texture and recognizable ruins, not bright ring overlays. The mage's extra-large animated casting circles are replaced by compact forward strokes. Actual projectiles, school lighting, Surge and impact events remain visually prominent and retain their canonical gameplay.

Do not release without both Playwright mobile checks and a 390px human combat review. The screenshots may expose additional art limitations that need a proper sprite overhaul later.
