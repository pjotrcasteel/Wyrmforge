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

## Live Hunt GPU integration checkpoint

PR #381 now includes `arena-gpu-world.js`, reusing the existing LightingEngine and Three vendor. The real arena draw loop can route its ground and individual animated actor layers through shared lit materials with alpha-tested shadow casting/receiving via `?arenaGpu=1`. The GPU path skips Canvas terrain/actor light spill and the Gothic darkness mask. C# source IDs, colors, enabled state, lifetime and scene time remain authoritative. The adapter performs pixel-to-GPU coordinate conversion, follows the real camera, culls distant actors, keeps stable resource IDs and disposes stale maps. Initialization failure retains legacy rendering; render failure disables the experimental adapter.

Projectile source radius was 3 while its positions and boss/effect radii use world pixels, and its height was zero. Source metadata now uses a provisional 144px range and 24px height for the existing four school profiles; the strength/color remain unchanged. Added a C# regression for source position/range/height. This requires .NET CI and visual calibration; it is not a gameplay damage change.

All 464 repository JavaScript tests pass locally, including the new camera-relative projection/zero-source test. Added 320/390px browser GPU adapter checks using an actual Hollowed atlas, light response, selected shadow source, strict zero-light framebuffer, and screenshots. These are committed but not yet run successfully. They are adapter integration checks, not complete Hunt acceptance.

Important incomplete gates: planar sprite receivers/casters currently approximate elevation and do not replace authored depth/normal geometry. Normals, correct foot-ground depth, all live effects/telegraphs, varied actor/boss framing, actual shadow pixel movement/occlusion, physical phone budgets and a full live-Hunt review remain unverified. The GPU path is deliberately opt-in on this draft; normal Hunts have NOT switched yet. Latest-head CI is queued. Do not merge, enable by default, or describe G5 as finished from this checkpoint.

### Standing-actor correction

Replaced flat elevated actor planes with camera-facing alpha cutouts anchored at the drawn foot position. Ground projection compensates for the 45-degree camera so existing screen coordinates/proportions remain stable. The cutout geometry rises above ground and can project actual GPU shadow-map silhouettes; this still does not supply true character volume or authored normal/depth maps. Added geometry normal, foot anchor and apparent-height regression coverage. All 465 JS tests pass locally. Browser smoke revision 9d20753f compiled successfully, installed Chromium, published the game and entered browser execution; no result or screenshot approval yet. New standing-geometry revision still requires its own latest-head browser run.
