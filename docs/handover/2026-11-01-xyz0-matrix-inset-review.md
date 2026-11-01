# XYZ0 / WF32 — 32px C# matrix review inset (1 November 2026)

## Owner decision and scope

The next proof is a legible, actual-playable-Hunt Wet Forest matrix view, **not** another approval request for the rejected noisy terrain materials. Do not resume mountain-pass or monastery art. The owner asked for a visible **1-pixel line inside each 32×32 block face**: a pair of adjacent faces should therefore show 2 pixels of seam. Choose **pure white** for a dark material and **pure black** for a light one. Do not enlarge the source tile or paint only one outline around two adjacent cells.

The long-term terrain direction is a numbered, sparse C# XYZ grid, permitting dirt and neighboring cells to be destroyed to reveal deeper rock, then Wyrm fire fissures with the same semantics. `GetCell(x,y,z)` remains C# authoritative; changing gameplay collision, damage, rewards or saves based on JavaScript pixel art is forbidden. A native **32px visual edge** and one **physical vertical stratum** are separate concepts: do not imply one vertical Z level equals 32 game-world pixels or 6.4 physical metres without separate explicit approval.

## This implementation

- C# `WorldSiteStrataRenderSnapshot.FromGrid` captures row-major surface finish, body material and integer surface Z from `WorldSiteStrataGrid.GetCell`, including the right/bottom partial site cells. The environment allocates it once for `worldFirstGeography` previews; regular Hunts omit it. No new terrain/random generator or simulation authority.
- Browser `world-site-strata-grid.js` reads those C# IDs in `arenaTerrain=xyzgrid`. Each world tile is exactly 32×32 unscaled source pixels in the 950×1550 world; the first and last pixel row/column are used for the inset stroke. Direct adjacent faces thus contribute 1px each. Contrast is selected by WCAG-style linearized RGB luminance of the **review palette**. The C# semantic ID is never inferred from a painted pixel.
- The 390×844 CI test exposed a pre-existing coordinate mismatch: ordinary roaming Hunts expand the logical world with the viewport, but the C# world-first site has a fixed 950×1550 logical-pixel / 190×310m site frame. **Only when `worldFirstGeography` and a real C# landscape are active**, the C# arena uses that canonical extent on both phone sizes. Ordinary Hunt extents stay untouched. This is necessary for a consistent 32px tile-to-cell identity and also removes device-dependent physical site scaling.
- This is a **colored matrix diagnostic**, not a WF32 finished texture or a claim that old source material integration looks good. A future material atlas must resolve approved native 32px albedo by these same numeric C# surface IDs, with neighbor transitions that preserve the pitch and the inset debug toggle.
- The overlay is **opt-in only**: `?ar1Geography=1&ar1SiteKind=forest-fork&arenaTerrain=xyzgrid`. Ordinary Hunt night, source art, G lighting, C# blockers and the Town are unchanged. The matrix review suppresses misleading old Hunt floor painting and the night veil so the 1px outlines remain legible, without altering the lighting engine.

## Verification and unblocked follow-up

- JavaScript pixel tests assert exact borders at x=31 and x=32, native 32px pitch, opposite material contrasts, and partial 950×1550 edge tiles.
- C# test asserts row-major ID/Z parity with sampled `GetCell`, and that rock still exists below the exposed surface.
- Browser Playwright test enters the **real Chart → playable Wet Forest Hunt** at 320×568 and 390×844; checks the actual C# matrix payload and saves `xyz0-wet-forest-matrix-insets-{width}.png`. Do not present test-only generated scenes as in-Hunt evidence.
- Next steps: review actual rendered screenshots; build native 32px **source-authored material resolution** keyed to the C# IDs; connect the existing deterministic `WorldSiteStrataMutationState` to explicitly scoped Fireball terrain destruction and save/replay; update collision/exposed surfaces through existing C# gameplay services only. Separate matrix data acceptance from **AR4-B owner visual approval**.

**Gate:** drafts [#467](https://github.com/pjotrcasteel/Wyrmforge/pull/467) and [#459](https://github.com/pjotrcasteel/Wyrmforge/pull/459) remain open/unmerged. AR4-B visual approval is pending; no production material or GPU cutover follows from this note.
