# Approved materials inside the playable Arena Generator Lab — 22 October 2026

## Goal and boundaries
The Material Lab's six approved ground paintings are ready for **visual evaluation in a walkable, C#-simulated arena**. More surface variants are explicitly deferred. The mobile game remains the production goal; Blazor/JavaScript is only an interchangeable visual laboratory.

This slice adds an **optional, off-by-default 'Approved ground preview' toggle** to `/arena-lab`, available only for `WetForest`. Ordinary Hunts and other habitats continue using their existing ground. Keep this behind owner visual approval.

## What the preview actually reuses
- **Canonical topology and movement**: `ArenaEnvironmentState` and its `ArenaEnvironmentRenderSnapshot` from C# still own traversable places, props, damage, supplies, mob navigation and tree positions. No new collider, path, level or gameplay generator.
- **Existing seeded habitat recipe**: `createWetForestTilePlan` translates the C# forest recipe's trail, wetlands, clearing and site into material tile classifications. The approved-ground adapter only translates their semantic labels into fixed approved material identifiers. It does not reroll soil or invent independent islands.
- **Approved assets/blending**: reuse the exact six WebP paintings, `buildGroundQuiltAtlas` with Fine Detail off, and the same `drawReferenceGroundBoard` + `drawGroundMaterialTransitions` algorithms from the Material Lab. There are no cross-material wear stamps or foreign image overlays.
- **Native portability**: mapping IDs / seed / 12px semantic classification to 16px visual samples are documented, deterministic data decisions. The existing JavaScript/Canvas composition is replaceable presentation code; native iOS/Android renderer implementation and on-device performance validation are separate gates.

Semantic mapping for this visual *candidate*: `loam/moss → grass`; `mud → mud`; `leafbed/clearing/road → dirt`; `puddle → marsh`. Not all six art families appear in Wet Forest; paving/scorched remain available for other habitats when those authoritative recipes support them. This avoids inventing stone roads or charred ground unrelated to the C# state.

## Safety and test gates
- Checkbox Off (default) preserves the existing Arena Generator Lab and the live game.
- Approved image loading/atlas baking occurs lazily only when preview is requested; the resulting scene texture is cached by seed and mode, never regenerated every frame.
- Missing art falls back to the existing terrain painter; failed image loading is not retried each animation frame.
- Unit tests verify mapping from existing tiles, deterministic grid conversion, world clipping and material boundary rendering, unchanged default live-Hunt call, and owner-visible opt-in.
- Browser smoke and actual iPhone **walking/panning, trees, trail, collision, lighting, frame pacing, blend continuity** must be reviewed before the preview is promoted to live Hunts.
- No new material variants, new sprites, gameplay rewards, saved progress or level generation in this slice.

## Follow-up
If the playable preview is accepted, extract/reconcile material IDs, parameters and ground recipe semantics into platform-neutral C# and profile a native mobile renderer with real iOS and Android packages. Do not integrate the lab-only JavaScript generator directly as production terrain authority.
