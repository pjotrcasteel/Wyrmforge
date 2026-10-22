# Arcane Nexus material consolidation — 22 October 2026

Product direction: [Town & UX](../canon/town-and-ux.md), [Art identity](../canon/art-and-animation.md).

The owner supplied five actual phone screenshots and approved Fireball as the reference. This is a consolidation of that existing design, not a new art direction. Research keeps its elemental combination instrument and the Web keeps its interactive skill graph. Fireball's central artwork stays exclusive to Fireball. The immutable Refuge paintings and canonical Divine emblem atlas were inspected alongside the real game source.

## Implementation

- `ForgeView.razor` adds `menu-nexus` only to the Build section. `wwwroot/css/nexus.css`, loaded after isolated CSS, defines one scoped material palette and consistent frames, headings, socket rims, buttons and states. Town, combat and other destinations retain their styles.
- Research displays its result heading above the working circle inside the shared chamber frame. Its action tray remains in document flow, avoiding the former sticky overlap. Generic SVG/vector elemental symbols are replaced with the approved atlas in both CSS and Canvas; the image loads once, uses nearest-neighbour sampling and follows the existing render loop. Unloaded imagery is skipped safely rather than invented.
- Arcane Web retains all nodes, links, semantic node shapes, school colours, point allocation, zoom/pan, sockets, loadouts and inspector logic. Metal chrome is warm and neutral; available, selected and locked states remain distinct. Locked nodes are more legible. Mobile inspector placement is preserved.
- No domain rules, storage keys, save schema, progression eligibility or material spending change. New stylesheet uses the existing build-version cache key.

## Verification

Validated runtime/test revision: `3171e6ed53070e22dbceecb83a5d39c31da849fa` (Actions PR merge snapshot `05e5423dc8f334d8352a3b09048d74c2851da7f5`). The following evidence-only documentation update does not change runtime or tests.

- JavaScript: **321/321 pass**, including circle animation, reduced-motion, vignette and canonical atlas drawing tests.
- .NET: **349 Domain + 601 Application tests pass**; Release build and web publish pass in [Validate Wyrmforge](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39727355606). Standard balance and portrait hunt samples also pass.
- Browser: **104/104 pass** against the actual published app in [Browser smoke](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39727355546). New checks run at 320×568 and 390×844: town → Fireball → Research → Web → town, original emblem pixels, no Fireball hero in Research, no tray overlap or horizontal overflow, compact crafted-socket controls, 44px graph actions. Existing socket wrapping and inspector placement checks remain green.
- Screenshot review: inspected both phone sizes, including `nexus-research-shared-style-*`, `nexus-web-shared-style-*` and `nexus-sockets-*`. Compared with the actual Refuge and Fireball captures. Review caught and corrected inherited purple shell styling and a legacy grid rule stacking the craft controls. Final captures confirm the neutral background, compact controls, shared frames and unobscured research.
- [Browser captures and playable preview](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39727355546#artifacts). Screenshot artifact: `wyrmforge-browser-05e5423dc8f334d8352a3b09048d74c2851da7f5`.
- CSS parsing, JavaScript syntax and `git diff --check` pass. All nine uploaded source/document files were byte-verified against GitHub blob hashes before final validation.
- This executor blocks Unix sockets and MSBuild task-host pipes, preventing local web publishing/Chrome. GitHub Actions built and exercised the real game independently; no standalone mockup was substituted.
- Physical iPhone Safari acceptance remains unverified. Chromium emulation and agent visual review do not claim owner approval.

PR: https://github.com/pjotrcasteel/Wyrmforge/pull/256
