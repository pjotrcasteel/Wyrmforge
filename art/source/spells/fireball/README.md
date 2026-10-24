# Fireball material and animation authoring gate — Draft PR #336

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
- Build locally to export the native layered Aseprite source and five channel sheets. The derived binary sheets are *not* checked in at this checkpoint: manifest `candidates.core-original.rendersIncluded=false` makes that explicit. Do not confuse a generator with production-ready art.
- Keep the production `assets` map empty and `awaiting-authored-source` until final approved gameplay animation and actual lighting integration.
