# AR4-B quiet grass / authored road study — live Hunt evidence (1 November 2026)

These are three **genuine screenshots** from the WyrmForge Playwright browser session
on code commit [fa14eb1](https://github.com/pjotrcasteel/Wyrmforge/commit/fa14eb1c3de96bebe6bbfe1553bac65b8b8b533c).
Source: [Browser smoke run 41292452400](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/41292452400),
shard 1, via the PR-only `AR4_IMAGE_BEGIN` log evidence stream.
The browser navigated **Town → Free Play → Chart → playable Hunt**, then switched
only the optional cosmetic `?arenaTerrain=source32b` view for the exact same C# Hunt.

1. [Wet Forest Hunt / forest fork, native 320×568](ar4-forest-fork-quiet-road-study-320.png) —
   a quieter, clearly 32px source-authored ground and a warmer dirt-road bank.
   **Still flawed**: large rectangular moss repetitions, little ecological staging,
   road perimeter too quantized and incomplete corner combinations.
2. [Mountain pass Hunt, native 390×844](ar4-mountain-pass-quiet-road-study-390.png) —
   road remains a source-authored **study**; rock/cliff faces are intentionally flat
   diagnostic C# obstacle presentations, not approved 32px stone.
3. [Monastery-region Hunt, native 390×844](ar4-mountain-monastery-quiet-road-study-390.png) —
   C# monastery spectator focus. Flat-building outlines and untextured
   paving remain obvious; not a monastery art-direction approval.

Both original paths stay available for faithful comparisons:
`arenaTerrain=materials` uses P1i continuous source albedo, and
`arenaTerrain=source32` uses the **unchanged** original #429 32px atlas.
This `source32b` experiment has an **independent 26-frame offline-authored
atlas** and paints a C# surface choice at native pixel phase; it does not
alter AR3 C# movement, material weights, obstacles or site topology, and
does not alter G lighting/shadows or production mode.

**Owner response “Yes” earlier accepted pixel scale/crispness only.**
AR4-B full visual acceptance, rock/stone authoring, monastery composition,
lighting integration, mobile device profiling and any merge remain pending.
No approval is inferred from these captures or CI checks.
