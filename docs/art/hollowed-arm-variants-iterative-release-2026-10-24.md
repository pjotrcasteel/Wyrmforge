# Hollowed — ARM-ONLY incremental Hunt release (24 October 2026)

**Owner decision:** defer the failed broken-leg variant, ship the other variants
iteratively instead of delaying everything. No broken leg is included in the
production variant selector. Existing cape-free extended-arm imagery is the
approved **visual direction**, not proof that all materials/animations shipped.

## Exactly what the runtime slice changes

- `standard`: outstretched zombie arms, no long cape.
- `broken-arm-right`: damaged right arm hangs/guards while healthy **left**
  arm reaches; source attack is performed by the usable **left** arm.
- `one-arm-left`: left arm unusable, healthy **right** arm reaches and attacks.
- At least two arms are not required to attack. C# contact, damage, target,
  speed, AI, and collision remain unchanged.
- A stable function of `entityId` chooses one of these three looks for each
  Hollowed; entities keep their visual identity during repeated snapshots.
- Source-authored 16×8 **96px** walk and attack atlases are loaded atomically.
  Neither is spliced with old support/action masks.
- `hollow-sprites.js` keeps the old full Hollowed bundle as an offline
  fallback, and the existing **24-frame death** as a temporary bridge until
  its own cape-free source animation is accepted.
- V1/V2/...V7 broken-leg authoring sources remain historical review
  experiments and are NOT reachable from runtime variant metadata or selectors.

## Art, lighting and acceptance boundaries

The source-driven exporter `tools/art/build-hollow-arm-pack.py` copies actual
Blender-reviewed, eight-direction RGB sprites and generates **normal, depth,
caster and non-emissive material passes** from matching 3D sampled positions,
faces, projection and camera directions. It hashes the real albedo and all
passes, rejects frame alpha/pose mismatches and saves one
`*-lit-materials.json` contract per arm variant. In particular, **it does
not reuse the old walk normal map from #332** on a differently posed arm.

This slice still uses the existing Hunt canvas to draw the enemy. It is not
a claim that the isolated #332 G1 lighting engine has been adopted by every
scene. The per-variant maps are source-data for that adoption. The old death
sprite, death lighting contract, and attack-to-death transition remain
deliberately unchanged pending future art review.

## CI and merge rules

`.github/workflows/hollow-arm-runtime-release.yml`:
- JS tests for stable variant distribution, atomic all-or-nothing clip
  loading, intact fallback, direction coordinates and original Hollowed state.
- Samples the actual three original Blender attack poses before deriving
  material passes. The walk sampling exists in Git.
- Validates 3 × (walk + attack) × 128 poses, byte SHA256 provenance,
  alpha alignment and eight compass directions.
- Preserves six paired atlases and their exact-pose material passes on
  the same `feat/actor-lit-sprite-production` branch only if validation
  passes.

**Merge dependency:** PR #333's base is the UNMERGED draft PR #332
(`feat/universal-gpu-lighting-g0-g1`), not `main`.
Do not claim this release is on main merely because the PR's own
checks pass. The dependency must be accounted for at merge: only
validated arm-only runtime art should be promoted to a production-ready
base, and the old broken-leg assets should not be declared shipped.

**What remains:** visually inspect final on-game 320px/390px/Hunt-size
captures and art-to-game scale, confirm real arm-specific attacks at
contact, bring the cape-free 24-frame death animation into line later,
merge validated narrow slices respecting #332's draft dependency.
