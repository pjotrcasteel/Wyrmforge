# Fireball material and animation authoring gate — Draft PR #336

## Integration on hold (LOCKED, 24 October 2026)

**All Fireball visual/runtime integration must wait** until the one shared lighting/material/visibility engine in [PR #332](https://github.com/pjotrcasteel/Wyrmforge/pull/332) is **finished, merged and validated for production world VFX**. This includes new Fireball sprites, mutation composition, emitters, materials and effects in Hunts, Nexus, Town, arena/lighting labs and runtime previews. Do **not** use a temporary Canvas/CSS glow, separate Fireball shader/light engine or full-bright effect to bypass the dependency.

**Permitted now:** isolated editable source art and animations, Aseprite and five material channels, validation tests, offline frame studies and clearly labelled *non-gameplay* 320/390px composites. Existing C# spell state/behavior and approved live art are preserved.

**Only after PR #332 is ready:** connect real C# spell event identities to the shared renderer, validate real in-engine GIFs and mobile/zero-light behavior, then request explicit owner approval before enabling the new art. [Blocked TODO and acceptance sequence](../../../../docs/canon/roadmap.md#fireball-visual-integration--blocked-until-shared-lighting-engine-completion-locked-24-october-2026).

The four playable mutations produce **16 mechanical combinations**. This area has **no runtime wiring** and contains **no substitute procedural art**. It is the handoff contract for the owner-approved animation/source files.

- Base Fireball is the **existing original**, not the rejected glowing-square prototype.
- Meteor Heart and Cinder Needle physically reshape the same projectile. The combined Meteor+Needle body requires a **separately authored and reviewed** body, not a stack of two CSS filters or a dynamically stretched texture.
- Detonation adds only an impact-fragment **authored** clip, and only when the simulation reports a real event; the damaging explosion radius must be read from C#.
- Scorched Earth adds only an aftermath **material** clip, and only where real C# burning-ground instances actually exist. A circular overlay is not adequate; actual leaf/wood/wet/stone surface interactions are authoritative.
- Cast, flight, impact and aftermath share the same mutation mask. Each physical projectile/impact/burning patch owns a distinct C# `FireballSourceId`; a cast cue may precede **multiple** real projectiles.
- For each required named art role, save editable pixel-art source under `art/source/spells/fireball/`. Export animation frames with stable anchor, actual world size, and **albedo, emissive, normal, height, cutout** sheets for integration via the **single lighting engine** being built in PR #332. The engine must not be recreated here.
- Run `node tools/art/fireball/check-source.mjs` from the repository root for a **manual strict release-readiness check**. It should fail until every frame/material channel is real and owner-reviewed; do not weaken CI or fake approvals to force it green.
- The manifest deliberately says `awaiting-authored-source`; `validateFireballArtManifest` **rejects** this as shippable. Only the owner can approve final source art. Do not change its status or add fictitious files to game output as a workaround.
- Tests: `node --test tests/javascript/fireball-authoring-contract.test.mjs` plus existing `tests/javascript/*.test.mjs`.

Actual art acceptance: review each approved base role against Hollowed/Ashling and the new mage in a real 320px and 390px Hunt, produce real frame-captured GIFs, confirm cast/flight/impact/afterburn, mobile performance and universal real lighting/occlusion. **Do not merge until those happen.**

## Base Fireball V5 candidate source — preserved in GitHub

- The 16-frame V5 direction is now versioned under [candidates/base-v5](candidates/base-v5/README.md), with editable reproducible Python pixel-authoring source. It is a **candidate, not approved artwork**.
- Build locally to export the native layered Aseprite source and five channel sheets. The editable Aseprite, animated GIF and five PNG channel sheets are now stored as **unapproved source/review exports** in the same candidate directory; they are not installed in production.
- Keep the production `assets` map empty and `awaiting-authored-source` until final approved gameplay animation and actual lighting integration.
