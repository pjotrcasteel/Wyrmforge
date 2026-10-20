# Refuge town — visual integration rebuild (20 October 2026)

**Status:** preproduction / art and geometry audit. **Not approved for shipping.**  
**Starting point:** main at `5c72a9b` (v0.0.131, PR #159).  
**Approved content:** 8 source PNGs in `user_handover_files/concepts/buildings/{ArcaneNexus,Blacksmith,Codex,HallOfFame}/{active,vacant}.png`.

## Why v0.0.131 is not an integrated town

The central gate uses a tightly cropped portion of the *old* 2172×724 Refuge panorama, which is frontal painterly/pixel imagery. The four newer buildings are 1536×1024 three-quarter-view isolated game paintings on a dark studio gradient. The current runtime merely displays them in two stacked panels either side of the old gate and navigates via WEST/GATE/EAST. Buildings have no shared paving, correct perspective relationship, grounding, neighboring facades, or convincing routes to the World Gate. On iPhone the lower building is cropped. The paintings cannot be freely rotated like 3D assets.

**Do not correct this using negative margins, a flipX on arbitrary facades, CSS darkening, per-card backgrounds, four standalone scenes or artificial district menus.** It needs a unified authored town composition.

## Non-negotiable visual contract

1. **One physical location.** The World Gate at the north/upper end of a single continuous courtyard, with four buildings on its flanks; one walkable paving/road surface, one scale/camera, one shared light direction, one weather/atmosphere layer. No panels, no floating card labels. A building's visible entrance leads to a walkway/plaza. An empty opening must not be visually disconnected.
2. **The eight canonical originals are immutable source-of-truth.** Preserve their identity, banners, architectural features, color hierarchy, window designs and active/vacant semantics. Use derived cutouts or alternate-facing renders only as scene assets; do not overwrite the approved originals.
3. **Correct perspective.** Choose one elevated fixed-camera three-quarter (2.5D/orthographic) projection. Buildings on opposite edges of a courtyard must **face the plaza**. Existing front-right-facing images cannot simply be mirrored if the heraldry/signage and entrances then become incoherent. Produce art-matched orientation variants only where a genuine different facade is necessary, and visually review them side by side against the canonical front images.
4. **Replace/reconstruct the old gate area's environment as needed.** The legacy gate's painterly style/perspective differs markedly from the new buildings. Preserve its established narrative function/iconography and WorldGate navigation, but do not allow that old plate to force warped architecture. A single shared scene background/plaza should be rebuilt/matched before wiring the 4 buildings.
5. **No painted people.** NPCs in future are independent world-anchored entities with feet positions, depth ordering and shadows. No baked characters, static workers or smoke pretending to be an NPC. World environmental light/active forge smoke can later use local sprites or effects.
6. **Distinct active/vacant art** per independent existing unlock predicate. No universal black overlays or shader hacks; light sources should be genuinely extinguished in the vacant painting, not tinted at runtime.
7. **Subtle lights.** Shared subdued nighttime skylight and selective warm window light; no torch spam. Magic stays Arcane Nexus-only; academia stays Codex; memorial prestige stays Hall; the approved workshop remains the Blacksmith destination.
8. **Mobile as a camera, not three pages.** One world with drag-pan, gentle camera focus/recenter, and tap targets on buildings. A 320/390px portrait must not stretch assets, crop the entire lower building, hide the Gate, or force a card-list layout. Use camera/world transforms, not hard-coded `100vw` slides. Player/settings remain fixed safe-area overlays.

## Findings from art preflight

- All eight source assets are RGB 1536×1024. There is no source transparency.
- Matching active/vacant building pairs are virtually identical in geometric registration (ORB-RANSAC on half-resolution samples found median feature displacement of zero and approximately unit scale for all four pairs). Use the same fixed anchor/footprint for state swaps.
- A rough foreground extraction using the painted blue-black background is feasible while preserving roofs, banners, props and most paving. **It is not production-perfect yet.** Shared matte applied indiscriminately to both states can create **fake black smoke or shadows** where an active state had an effect absent in vacant; transient smoke must be removed from static mattes and added as its own animated layer later.
- Derived PNG cutouts will still look pasted on until the **shared floor**, **camera alignment**, **scale**, **lighting**, **foundation depth**, **surface occlusion** and **gate** are authored together. This is not solvable by segmentation alone.
- The current Blacksmith canonical image visually reads as an alchemy/apothecary workshop. Preserve it for this pass because it was explicitly approved, but verify the gameplay association remains intuitive in the final composition.

## Production slices (no main merge until visual acceptance)

### A — Isolate & measure
- Record source hashes, register active/vacant, mark landmarks (front entrance foot point, rear corners, paving outline, chimney and canopy) and silhouette masks.
- Produce high-resolution, alpha-safe cutouts as **derived** assets. Review on checkerboard and paving texture at 100% scale for blue halos, smoke ghosts, missing dark roof, detached vegetation and floor edges.
- Test that toggling states moves neither building nor its clickable footprint. Include explicit active/vacant visual diff and screenshot tests.

### B — One town blockout
- Define the world-space plaza polygon, Gate threshold, four foundations/entrance paths and occlusion/height relationships.
- Use one camera projection and a **single** ground plane. Render proper side-oriented building reference variants where required. Verify navigation and perspective first with no UI.
- Present high-res desktop-wide and 390px portrait **single-world** concept proofs, including all four buildings in context, **before** touching the live screen.

### C — Author finished town layers
- Build one matching background and grounded paved city block (existing panorama is a reference, **not** a giant duplicated collage).
- Buildings use exact active/vacant projected positions and authored contact shadows. All static art uses one consistent palette/contrast/noise/detail scale.
- Environment layers: sky/distant city, paving/walls, buildings sorted by world depth, atmosphere/lighting, eventually NPCs. No hot spots covering roads or the entire building's dark art rectangle.
- Accessibility: names via labels/focus/selection, not permanent billboard text.

### D — Integrate safely
- Replace the existing `CanonicalTownView.razor` / `town-canonical.css` district-panel implementation on the feature branch.
- Keep `TownBuildingVisuals.Resolve`, the same four existing unlock conditions, Hall leaderboard, WorldGate view, quests/settings, and no door sound on locked buildings.
- Use correct camera transform on JS pointer/touch, preserve native Safari scrolling where appropriate, and cancel click gestures after pan.
- Implement real walking NPCs **later**, after town navigation masks and ground depth sorting are reviewed.

### E — Acceptance gates
- Mobile screenshots at 320×568, 390×844 and taller iPhone sizes; desktop 1280×720 / 1440×900. At least one screenshot must show **all four buildings and the Gate in a single logical world**, even if a mobile player pans.
- Compare identical camera state before and after each of four unlock transitions; no geometry jump, smoke ghost, odd lighting, clipping, stretched doors or flickering overlays.
- Confirm five taps go to their real destinations, vacant locations explain unlocks, the Gate cancel flow returns correctly and no global page overflow.
- Run .NET and browser tests; view **actual screenshots**, not merely count passing tests.
- Request explicit visual sign-off before merging / deploying this overhaul.

## Delivery discipline

Maintain a dedicated branch and keep progress and decisions in this one document. Never claim an isolated card-based layout is the completed town. GitHub main continues to run the current town until an approved, tested replacement is ready.
