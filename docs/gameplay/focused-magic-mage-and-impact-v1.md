# Focused magic: readable mage and compound impact slice

## Approved direction
The canonical mage art has a **slate-blue cloak, pale collar and staff**, per `art/README.md`. White-robed and burgundy-robed studies were rejected; don't silently change the character between scenes. The current live placeholder was a pale circle. This slice replaces that with an intentionally limited but recognisable pixel-geometry mage: irregular cloak hem, hood/face opening, pale collar, staff with a deliberate grip, small foot shadow. The live canvas rendition remains **temporary**, not approved production sprite art.

## Animation and impact design
- Mage staff aim and follow-through derive from the same authoritative `CastMotion` as the spell effects; it never modifies movement, health, cooldown, damage, or simulation timing.
- Upgrade rank increases visual staff reach and the size of magic impacts. Reduced-motion users get a stable staff aim without sweeping.
- Projectile and impact snapshots capture both rank and selected combination at cast/hit time. Switching focus while a spell travels cannot visually reclassify its impact.
- Fire impact: expanding angular ember burst; Frost: distinct crystalline fractures; Storm: jagged electrical cracks; Arcane: asymmetrical concentric sigil fractures; Frostfire: a **single** two-layer fire/frost impact; Stormglass: icy electrical style. This is one original hit with one visual effect, not bonus damage or independent cast.
- Projectile travel leaves one muted streak aligned with real velocity; longer at earned ranks. No particle spam, random movement, or additional projectile entities.
- Impact lifecycle remains presentation-only. Responsive phone screens maintain clear silhouettes against low-contrast terrain.

## Release gate
The generated silhouette is a readability intermediary, **not a finished pixel sprite**. Keep PR #107 draft until full .NET CI, browser smoke, matched seeded balance, and human phone/combat-readability checks are done. No production deployment is claimed.

Next: individually authored animation frames from approved world assets, separate release silhouettes for each school and rank, and data-driven recipe/VFX composition to support future Arcane Laboratory issue #108.
