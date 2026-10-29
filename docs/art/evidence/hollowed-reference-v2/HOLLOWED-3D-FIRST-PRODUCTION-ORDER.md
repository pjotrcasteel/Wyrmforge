# Hollowed V2 — final modeling pipeline, 3D first

**Owner direction (29 October 2026): FINISH THE ACTUAL 3D MODEL AND ITS POSE, THEN LET BLENDER PIXEL-SIZE IT.** This replaces the earlier *mobile-preview-first* milestone order. The game remains pixelated on mobile, so final export fidelity is a firm requirement, **not the next sculpting task**.

## Selected authentic source

- The owner selected **Sotudios Rotwalker** as the **editable anatomical foundation**, despite its current A/T rest pose. Its skull, narrow body and torn garments were preferred over the failed previous mannequin. Genuine Blender reference: [run 40850752773](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40850752773). Rights are CC BY 4.0 with proper creator attribution.
- The rejected prior H1 **Horror Game Monster**, donor skull, original 70-bone rig, shape keys and procedural attachments must never be copied or used as the new source.
- Current Rotwalker is **only a selected base**, not a finished or player-approved Hollowed. A real new `.blend` modeling iteration must exist before a claim of implemented improvement.

## Milestones — strictly sequential

### M1 — Real 3D body, proportions and pose

Modify and preserve a full-detail **3D Rotwalker source**, not its downscaled raster. Sculpt body silhouette and skull/neck/shoulder connections, gaunt arms, chest, hips and weight-bearing legs; adapt an asymmetric feral idle rather than treating the A/T bind pose as in-game animation. Front, side, back and three-quarter **real neutral-clay Blender renders**, *at full modeling resolution*, plus source mesh and rig/deformation integrity review. Present substantial visual progress regularly for owner steering. The pose must be physically convincing and survive the full turnaround. No cosmetic or lighting shortcuts.

### M2 — Ghoul anatomy and complete sculpt

Long tangled hair with natural scalp roots; ravaged brows/eye sockets/cheeks, opened lower jaw and physical mouth cavity; elongated **connected** hooked claws; prominent bone/rib/shoulder structures; natural asymmetry and body decay. Inspect actual close-ups, front/side/back and deformation tests. The face must read as a ghoul before any fire is added.

### M3 — Clothing, materials and interior corruption

Preserve short ragged waist coverings, straps and greaves without a cape or long coat. Sculpt organic char and cracked/scarred tissue across the upper back and arms; authored albedo/roughness/normal/controlled **interior** emissive textures for eyes/mouth/back/hands. Avoid baking one environment's lighting into albedo. Source material presentation must work both with and without emission. Use WyrmForge's eventual **single universal GPU lighting engine** rather than inventing a per-character system.

### M4 — Production-ready 3D source and pose validation

Review actual anatomy and materials from eight directions at normal 3D inspection resolution. Establish clean topology/UV, asset provenance, bone strategy/weights and complete deforming pose tests (reaching, turning, knee bend, dying) without altering the separately owned universal animation engine. Optimize geometry, materials and texture budgets with mobile in mind, preserving visibly important silhouettes. Archive a **reopenable editable source `.blend`** and revisioned evidence. **Owner visually reviews the finished 3D character** before the pixel export milestone.

### M5 — Blender 3D-to-pixel conversion (AFTER 3D sign-off)

Only after M1–M4 pass: render the **same finished 3D geometry** into the game's native sprite sheets with Blender; no AI-generated substitute frames. Use historical target 96×96 cells and ~56–64px character height as an initial export profile, verifying actual camera, pivot, draw scale and sprite consistency against existing WyrmForge actors. Tune palette / silhouette / binary alpha / sampling to the game's existing pixelated art, and validate at **1× native** and **nearest-neighbor 4×** under actual arena lighting. Ensure hair and claws remain readable; if not, revise the **original 3D source**, never hand-invent an inconsistent frame.

### M6 — In-game review and mobile performance

Only with **separate authorization** integrate the approved model-derived sprites through existing systems; inspect actual game captures, full animation/eight-direction atlas, fog/night visibility, GPU lighting, Ashling parity and mobile-browser/real-device performance. Reuse one animation, lighting and physics engine; no competing engine.

## Progress and acceptance

- Send frequent user-visible updates **during active sessions**, with **genuine full-res Blender views** at M1–M4 and genuine source-derived native sprites only in M5. No asynchronous promise to message outside active sessions.
- Don't equate GitHub success, Blender import or a neutral clay model with quality approval.
- **Hard gate:** do not auto-run native pixel export as a milestone or use it to steer early mesh sculpting. Previous [real 96px T-pose technical proof](NATIVE-MOBILE-96PX-REAL-BLENDER-2026-10-29.md) remains **historical technique validation only**.
- PR #399 remains draft, source-only; PR #391 and animation PR #387 are isolated; running game assets stay unchanged until M6 approval.

**Current state:** Foundation selected, actual custom 3D modeling and meaningful posed edits **not yet completed**, M1 outstanding. M5 pixel exporter is a technical prototype and must not be mistaken for production art.
