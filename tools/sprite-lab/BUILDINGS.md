# Building Lab — slot authoring on GitHub Pages

**URL after deployment:** https://pjotrcasteel.github.io/Wyrmforge/sprite-lab/buildings/

This is an **art-authoring tool**, not another gameplay scene and not automatic art approval. It belongs to the existing Sprite Lab website, uses the same static hosting, works on phones, and makes no API requests to change the game, player progression, or the repository.

## First run

Open **Buildings** from the Sprite Lab header. Select **Wyrmforge** and leave **Vacant** selected. The main canvas shows the lower-left crop of the **existing 2172×724 game panorama**. The dashed slot areas are editable; click a slot on the painting or from the list below the stage selector.

- **Base painting:** leave that part of the underlying panorama unchanged.
- **Active source:** locally composite the corresponding region from the original fully active game panorama. These are *sample reference patches*, **not approved isolated artwork**. They can have visible seams or inconsistent lighting; do not confuse them with finished slots.
- **Upload slot:** choose a transparent PNG/WebP with the content for that region. The browser draws it into the chosen native source rectangle. Transparent surroundings preserve the base painting; JPG works for comparison only.
- **Position:** X/Y/width/height are measured in **absolute native panorama pixels**. Updating geometry changes that slot for all four stages, not just one. Moving source geometry requires **all stages to be unlocked**.

Select each stage (**Vacant / Stirring / Active / Masterwork**) and choose the slot variants. The four-image comparison view refreshes immediately. Click a small image to switch stage. **Lock this state** makes that stage read-only until unlocked. Other stages remain independently editable.

Use **Export current stage PNG** for a clean preview without guides. Use **Export complete project JSON** for the real handoff: it includes building ID, measured shared slot geometry, per-stage variants, locks and embedded uploaded images. Send the resulting JSON and screenshots to the developer. **Locking does not mean approved or ready to ship** — \`visualAccepted\` stays false. Approval from the owner is required before integrating artwork in the actual WyrmForge game.

**Load previous project JSON** restores the stage selections, locks, geometry and any embedded images. The browser also attempts to save each building in localStorage; that may fill up with multiple high-resolution uploads, so **export JSON regularly**. For art handoff, treat the exported file rather than local browser storage as authoritative.

## Future buildings

The selector includes Wyrmforge, Arcane Nexus, Codex and Hall of Fame. Each has its own initial slot placement and crop, but uses the same editor and stage structure. **Add a future building** can create a project from a native PNG/WebP/JPG; use **Add a slot** for its individual replaceable features. The imported base image defines its source dimensions. Custom buildings are included in local persistence and can be restored with JSON import.

For canonical town scenes, use matching native pixel coordinates and keep the base artwork untouched. Build stages with transparent layers for individual lamps, windows, roof repair, shelves, Essence crystals, crucible, smoke and working NPCs. Do not use generated full panoramas that accidentally change roofs or building proportions.

## Current limitations / acceptance gate

- The Lab is a **static stage editor** in this first slice; actual flickering lamps, smoke particles, portal swirl and animated NPC walk/work loops will be authored and validated separately. Nothing on the screen claims to produce those motions today.
- Starter slots are **approximate authoring rectangles**, not visually verified production masks. The original reference patches use small feathered edges so beginners can explore states; a final art export needs *approved source-aligned assets* before game integration. A line or lighting seam means reject the asset rather than hide it under a dark global CSS wash.
- No arbitrary external image URL loading; JSON accepts only known bundled art or embedded data URLs to make the project portable and keep third-party network dependencies out.
- A newly imported native building image can have a different size, but images replacing that building's **full source** must match its saved pixel dimensions. Slot PNG/WebP can be smaller and will be drawn into their recorded rectangle.
- Existing Blazor Forge, Arcane Nexus, World Gate, Codex and Hall interactions and their actual progression gates remain unchanged. Future runtime integration must derive state from the authoritative progression and use only approved artwork.
- Mobile QA: test 320px and 390px portrait, switching buildings/stages/slots, locking/unlocking, PNG/JSON export and JSON re-import. Physical iPhone Safari approval is still a separate manual visual gate.

## Developer tests

Run from the WyrmForge repository root:

\`\`\`sh
node --test tools/sprite-lab/tests/*.test.js
node --check src/Wyrmforge.Presentation.Web/wwwroot/sprite-lab/buildings/src/building-core.js
node --check src/Wyrmforge.Presentation.Web/wwwroot/sprite-lab/buildings/src/building-app.js
\`\`\`

These tests are wired into the existing Validate Wyrmforge workflow. Browser Playwright tests for 320px and 390px are part of \`WyrmforgeBrowserTests.cs\`.

## Handoff and follow-up

**This delivery is deliberately limited to the tool and its reusable data contract.** It does not replace the current town artwork or build a new progression system. After the owner exports and approves the four states for one building, add the approved masks and animations as a separate tested game vertical slice. Use the shared production rules in [town-building-production-template.md](../../docs/art/town-building-production-template.md) and the authoritative master design. Preserve the current mobile UI, town scroll/swipe hotspots and Sprite Lab animation viewer.

Workflow artifact creation, painting in a professional art tool and sprite-sheet authoring remain separate; this Lab helps inspect and combine those controlled inputs without asking an image generator to invent a complete town each time.
