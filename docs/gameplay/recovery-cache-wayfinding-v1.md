# Recovery cache readability — first production presentation slice

**Intent.** Health caches currently use an XP-like hovering diamond, and the large scrolling camera can put an opened one off-screen. Wounded players need a visual affordance to discover a real healing opportunity without UI panels, arrows covering combat, or an invisible perk.

## Rules
- The game already has **one actual health cache** per combat encounter, physically blocked until the Surge phase. It heals 8% of maximum HP once, upon collection, regardless of presentation.
- Replace the *opened health* cache's generic floating crystal with a restrained **broken stone medicinal basin**: rough masonry, pale-green contents and herb sprigs. XP stays a crystal. Sealed caches remain visibly sealed.
- While HP is at or below **65%**, the health cache is **unlocked** and outside the useful mobile view, three small scratched marks near the mage point toward its actual world coordinates. They are world paint, not a UI overlay or interactive control.
- The scratches do not appear for healthy players, sealed/collected caches, visible nearby caches, extraction, or trail exits. Marks do not change the physics, combat, pickup amount, RNG, or targeting.
- Reduced-motion mode holds scratches static. Their muted geometry stays readable without animation, floating rings, outlines or extra pop-ups.

## Testing
JavaScript verifies world-to-screen transformations and suppressions. Real Playwright canvas checks painted and absent pixels in a 390px mobile view; existing roaming/Safari touch and simulation tests still run. Seeded run comparison should remain unchanged if this is truly presentation-only.
- The mage's approved slate-blue cloak and pale collar remain unchanged. This is environmental affordance art built in code, not a substitute for future authored sprites.
