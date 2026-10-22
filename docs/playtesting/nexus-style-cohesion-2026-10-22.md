# Arcane Nexus material consolidation — 22 October 2026

Product direction: [Town & UX](../canon/town-and-ux.md), [Art identity](../canon/art-and-animation.md).

The owner supplied five actual phone screenshots and approved Fireball as the reference. This is a consolidation of that existing design, not a new art direction. Research keeps its elemental combination instrument and the Web keeps its interactive skill graph. Fireball's central artwork stays exclusive to Fireball. The immutable Refuge paintings and canonical Divine emblem atlas were inspected alongside the real game source.

## Implementation

- `ForgeView.razor` adds `menu-nexus` only to the Build section. `wwwroot/css/nexus.css`, loaded after isolated CSS, defines one scoped material palette and consistent frames, headings, socket rims, buttons and states. Town, combat and other destinations retain their styles.
- Research displays its result heading above the working circle inside the shared chamber frame. Its action tray remains in document flow, avoiding the former sticky overlap. Generic SVG/vector elemental symbols are replaced with the approved atlas in both CSS and Canvas; the image loads once, uses nearest-neighbour sampling and follows the existing render loop. Unloaded imagery is skipped safely rather than invented.
- Arcane Web retains all nodes, links, semantic node shapes, school colours, point allocation, zoom/pan, sockets, loadouts and inspector logic. Metal chrome is warm and neutral; available, selected and locked states remain distinct. Locked nodes are more legible. Mobile inspector placement is preserved.
- No domain rules, storage keys, save schema, progression eligibility or material spending change. New stylesheet uses the existing build-version cache key.

## Verification at checkpoint

- JavaScript: **321/321 pass**, including existing circle animation/reduced-motion/vignette tests and a real-atlas draw contract.
- `git diff --check`: passes.
- Browser regression added at 320×568 and 390×844: captures town, Fireball, Research, research actions and Web; verifies that Research uses approved emblem pixels, has no Fireball hero, its tray does not overlap its content, page width fits, and Web controls remain at least 44px. The existing socket wrapping/inspector test remains unchanged.
- Local .NET compilation reached all domain/application/infrastructure/bootstrap assemblies. Web publishing and local Chrome are blocked by this executor's refusal of Unix sockets/task-host pipes. GitHub Actions builds and runs the real published app independently; inspect those results and generated screenshots before merging.
- CI, screenshot inspection and physical iPhone acceptance: **pending at this checkpoint**. Chromium emulation is not physical Safari acceptance.

PR: https://github.com/pjotrcasteel/Wyrmforge/pull/256
