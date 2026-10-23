# Arcane Nexus school-variant handover — 23 October 2026

## Goal
Display **the exact same Arcane Nexus building** for all six Divine schools; the only change is the hue/intensity of its existing magical glass, crystals and portal. All masonry, collision, hotspots, other buildings, NPC foreground alpha and approved panorama pixels remain canonical. Arcane/purple uses the base artwork exactly, not a regenerated imitation.

## Implementation
- Scene continues to use the approved 1672×941 `art/town/night-active.webp`; no canonical PNG/WebP is replaced.
- A transparent 1672×941 canvas copies **only** qualifying violet-magical pixels within the Nexus-only top-left rectangle (x=58..555, y=36..350; entirely above the Blacksmith district). The browser changes just those pixels to the new school hue, preserving painted variation and pixel positions. Ordinary masonry/non-violet pixels stay transparent. Existing localized CSS emitter masks remain as fallback if pixel access fails, and are disabled once the real repaint is ready.
- Colors: Fire red, Frost icy cyan-blue, Storm yellow, Arcane original violet, Death green, Binding spirit teal. No school becomes playable simply because it can be previewed.
- Non-Arcane magic is dimmer with zero Web points and brightens with points already earned in that particular school, capped at 24. Fire's glow gently flickers; reduced-motion settings disable this.
- **Settings → Debug → Nexus building palette** selects Auto or any of six schools. While active, a compact, accessible seven-button tool appears in the town so switching doesn't require repeatedly opening Settings. Auto restores actual character-school behavior. A locked Nexus may be *visually previewed* as active, but the actual clickable building remains locked.
- No separate save, mutation to character affinity or unlock, or changing of other building assets. Debug state lasts only for the current component session.

## Validation
- `node --test tests/javascript/town-nexus-variants.test.mjs`: all palettes, Arcane source identity, zero/advanced mastery, stone and non-Nexus rejection, debug isolation.
- `node --test tests/javascript/refuge-canonical-town.test.mjs`: original building image bytes and unchanged four-building structure.
- CI/browser smoke and a real device are required before visual approval.

## Manual acceptance
1. With Nexus still locked, visit Settings → Debug and select Fire, return to town. The building painting should look active for inspection, **but clicking it still shows the unlock requirement**. Other buildings maintain their own active/vacant flags.
2. On the town preview toolbar switch Fire → Frost → Storm → Arcane → Death → Binding. The dome, scattered purple crystals and portal should change hue, without purple remaining inside those emitters; walls, sky, torches, blacksmith, Codex and Hall of Fame must not change. Switching Arcane should show the exact original purple.
3. Repeat at 320×568 and 390×844, including swiping between the three districts, idle NPC depth and reduced-motion preferences.
4. Learn a few *actual* Fire Web points and compare zero versus invested. Fire begins subdued and brightens; previewing Frost without Frost investment must not borrow those Fire points.
5. Press Auto. If Nexus was locked, the original vacancy returns; if unlocked, the actual selected-school color returns.
6. Inspect the source artwork at real iPhone pixel scale. This is **not yet a claim of visual owner sign-off**, since no physical-device capture is available from this integration session.

## Scope
This is isolated to the **Nexus painting/palette and visual debug controls**. It does not change TownV2 masks, navigation, the browser-only day/night experiment, game simulation, other buildings, or the playable-school gates.
