# Hunt ground repetition correction — 26 October 2026

Canonical authority: [Art and animation](../canon/art-and-animation.md), [Roadmap](../canon/roadmap.md). This is implementation evidence for owner-requested correction PR #381, not a new art specification or AR1–AR7 completion.

## Implemented

Replace bilateral reflected copies in the live source-backed ground sampler with independently seeded overlapping crops. Preserve the existing 0.28 source-to-world scale and C# material layout. A separate scratch canvas holds each feathered crop; it must never alias the live world canvas. Refresh the direct material-kit module cache key.

## Verification

16 focused Node tests pass: arena-live-wet-forest-materials.test.mjs and wet-forest-three-material-kit.test.mjs. Verify crop bounds, deterministic variation across seeds/materials, unique crop origins, opaque core coverage through world edges, no reflected drawing, fallback and live adapter drawing.

Regenerated the three actual production candidate families with the repository's Python build scripts. Rendered a 960×1536 three-material board through the modified batch sampler using @napi-rs/canvas. All 1,474,560 output pixels are opaque. Visual inspection removes reflected bilateral motifs but still shows dense and repetitive source detail. This is a material-board check, not a live gameplay capture or final visual acceptance.

## Remaining and environment limits

Local .NET is unavailable. Playwright Chromium is absent; attempted browser installation returned a truncated archive. No full game/phone/browser visual validation or physical-device performance claim. Keep draft until actual Hunt screenshots and CI validate the final head. Check cache propagation through the deployed app/module graph before shipping.

Hollowed remain unresolved: current arena.js uses Canvas actor drawing, drawGothicNight and light spill, rather than adopting the shared GPU material/shadow renderer. Follow existing G4/G5 work and contracts; do not create a competing lighting engine or conceal the missing integration with permanent full-bright actors. Preserve actor art and C# simulation authority.
