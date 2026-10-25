# Wet Forest ground source-art production — continuation

Status: art-only workstream in PR #340; all derivatives unapproved. The 36 original paintings and their hashes are immutable.

## Current: Trampled Earth

Export six deterministic independent source-quilt candidates, six cross-compatible candidate tiles, repeat sheets, mixed edge review and six-role contact sheet. Roles are review INTENT, not automatically proven by the quilt algorithm:

1. Subtle footpath — subdued disturbance, minimal exposed soil.
2. Heavily worn — broad compacted earth, limited vegetation.
3. Cart ruts — paired longitudinal wear marks, not navigation geometry.
4. Muddier wear — damp soil with no inferred physical water.
5. Broken edge — uneven vegetated boundary; no inferred alpha.
6. Chaotic wear — irregular trampling and mixed footprints.

**Acceptance:** inspect each source-backed result at native and mobile preview sizes. Confirm six visibly different motifs; reject random texture quilts masquerading as directional ruts. Confirm seams and 3×3 mixed-bank repetition; retain unapproved status until owner signs off. No scene/game integration.

## Next: road-surface art vocabulary (art only)

Produce source-preserving visual studies for compacted centers, wheel ruts, grassy shoulders, worn edges, mud intrusions and their visual transitions. Compare against existing hand-annotated painted trail motifs. Export review sheets and independent art masks ONLY where manually authored. Do not determine road shape, path width, navigation, collision, procedural terrain or C# road authority: PR #338 owns these.

## Subsequent material families

**Old Paving:** review six original paintings; prepare site-specific cobble/mortar and broken stone studies. No automatic woodland roads; explicit historical-site footprints required before any integration.

**Scorched Ground:** study six paintings for charred soil, ash and separate painted fracture/ember reference regions. Never convert bright painted pixels directly into runtime emissive maps; shared lighting work owns emitters.

**Marsh / Wet Bank:** study six paintings for muddy shore, reeds and bank-edge art. Require hand-authored water and vegetation regions; no black-pixel transparency extraction or water-physics claims.

## Workstream boundaries

Only original-preserving source-art tools, review derivatives, integrity tests and CI exports belong here. No G1–G5 lighting, PR #332 or #338 changes, runtime materials, C# terrain, gameplay, renderer or scene integration.

## Review gates

1. Original six-per-family source hashes remain unchanged.
2. Generated files and metadata are deterministic and separately named.
3. Repeat/contact sheets visibly support review; passing seam checks alone is insufficient.
4. Owner approves appearance and semantic identity before any separate downstream integration.
5. Downstream lighting, physical material and mobile scene acceptance are external dependencies, never claimed by this PR.

## Production reset — Trampled Earth visual acceptance first (25 October 2026)

The six quilted Trampled Earth candidates are **not** six completed role-specific artworks. Their role labels are review intents only. Do not call them finished paths, cart ruts or accepted assets merely because the generator passes seam and hash tests.

**Freeze additional generic texture-generation features.** The next deliverable is six *artistically distinct* Trampled Earth PNGs with unmistakable silhouettes: (1) narrow soft footpath, (2) broad compacted path, (3) paired longitudinal cart ruts, (4) visibly wetter worn soil, (5) irregular grass-invaded path edge, and (6) fragmented chaotic trampling. Preserve the source paintings and make art-only derivatives in a separately named review output; no gameplay road authority or C# geometry.

Acceptance is visual, not numerical: present six full-resolution PNGs and a single side-by-side sheet, plus mobile-scale and 2×2 repetition comparisons. Specifically reject indistinguishable quilt candidates, mirrored landmarks, central stamped shapes, unnatural border bands and any candidate whose named silhouette is absent. The owner chooses which to keep or repaint. No promotion to runtime or material channels before visual sign-off.

**Roadmap checkpoint:** source preservation and candidate infrastructure done; semantic identity and visual quality not achieved; no family approved; no relightable material production or game integration in this PR. Avoid expanding diagnostic tools instead of producing the six artworks.

## Reproducible source-backed segmented Trampled Earth and organic transitions

Art-only PR #340 now has actual CI exporters, not just locally generated review images.

- build_trampled_segment_art_bank.py reads six per-family, hash-verified, unapproved Grass/Moss, Trampled Earth and Wet Mud candidate PNGs. It produces six 640x1600 RGB source-backed path studies and 18 overlapping 640x640 segment PNGs. Each 160px overlap comes from the same underlying strip, so join pixels match exactly.
- build_trampled_organic_transitions.py creates six transitions between neighboring roles. A broad, curved boundary preserves actual pixels from the two painted source strips, except for approximately two pixels of antialiasing along that boundary. It does not generate scene masks or routes.
- The Wet Forest ground concept integrity workflow now runs both scripts and publishes full-size transition PNGs, mobile previews, comparison sheets, manually inspectable art boundary QA and SHA-256 provenance in the workflow artifact.
- New unittest coverage checks unapproved-only inputs, immutable hashes, 160px overlap, deterministic PNGs, original RGB preservation away from transition boundaries, and no runtime claim.

Status: visual review pending; neither isolated strip nor transition is necessarily tileable or relightable. Repeated painted landmarks and baked illumination remain. Do not promote to in-game materials or mark complete without visual owner approval.

## V11 Trampled Earth visual identity checkpoint (25 October 2026)

Six source-backed strips and their 18 overlapping art segments remain **unapproved** and art-only. V11 specifically responds to the latest visual review:

- Along each strip, the three independently selected source paintings now use deliberately different integer UV crop offsets. No RGB is fabricated by the offsets, and the narrow organic joins retain detail; repeated rocks and footprints at the same local coordinates should be less obvious. Repetition remains a visual-review gate, not a proven pass.
- Muddy Wear now selects broad, coherent regions from the hash-verified Wet Mud painting bank rather than weakly crossfading small islands. This makes wet soil visibly different from Heavy Wear; bright painted puddle reflections are still embedded in the source art and **do not** become water geometry or reflection channels.
- Automated tests require a different third-section crop and a clear synthetic palette separation between Muddy Wear and Heavy Wear. Hash-locked sources and segment overlap remain unchanged.

**Next acceptance gate:** inspect full resolution and 240px mobile strips and all cross-variant joins for stamped/repeated landmarks, abrupt soil-versus-mud composition, painterly baked highlights and insufficient role identity. Do not promote any of these review candidates to neutral albedo, physically meaningful material channels or the C# arena until visual owner approval and separate lighting/road integration.
