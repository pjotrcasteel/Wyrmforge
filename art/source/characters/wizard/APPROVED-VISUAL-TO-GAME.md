# Wizard approved visual — actual-game replacement gate

**Approved visual target:** the original bearded, weathered, Gothic-grey wizard
in the user's accepted image from 24 October 2026. **Not** the rejected clay-like
procedural Blender model, and **not** the later presentation/collage mockup.

Canonical silhouette: elderly human proportions, dignified posture, split white
beard, battered asymmetrical pointed hat, layered dark navy/charcoal weathered
robe with visible boot movement, real deep cloth folds and a grounded leather
belt. The staff is a dark carved haft with a distinct school-colored socket;
Fire glows orange only when actual cast/event emission is declared by the same
GPU lighting engine used by the world. Never paint permanent environmental
light into neutral robe albedo.

## Real runtime handoff, not a screenshot overlay

- \`wizard-player-sprites.js\` is a **thin player signal adapter** over the
  existing \`createRiggedSpriteRenderer\` and \`updateSpriteAnimation\` that
  already drive actual enemies.
- The eight directions use genuine authored atlas rows, and idle/walk/cast/
  hurt/death use real full-body clips. No whole-image shaking, stretching,
  horizontal mirroring of W, or copying poses to fake a walk.
- The game preserves its previous temporary player until *all* approved bundle
  files are present, dimensions match the manifest, the visual is explicitly
  owner-approved, native gameplay has been reviewed and the shared GPU light
  integration is verified. The fallback remains a fallback, NOT the future art.
- The mage is still drawn by the same depth sorter at its C# feet position;
  movement/collision/aim and spell lifetime never read art values.
- The source render must supply synchronized albedo/normal/roughness/depth/
  caster/emission passes. The source \`.blend\`, rig, UVs and recorded motion
  remain durable authoring artifacts. The old procedural model is excluded.

Expected runtime directory for Fire after visual review:

    wwwroot/art/characters/wizard/fire/manifest.json
    wwwroot/art/characters/wizard/fire/animation-profile.json
    wwwroot/art/characters/wizard/fire/{idle,walk,cast,hurt,death}.png

The bundle manifest must include:

    "acceptance": {
      "visualId": "gothic-grey-wizard-2026-10-24",
      "ownerApproved": true,
      "nativeGameplayReviewed": true,
      "sharedLightingVerified": true
    }

Only set these flags with real evidence: a source approved by the user, real
mobile-scale Hunt screenshots, aligned atlas/material passes and the common
GPU lighting engine. Current PR #335 **does not have a complete approved
actor atlas**, so the live temporary mage remains visible. This is a code
integration checkpoint, **not** a shipped player art milestone.

Future nonhumanoid enemies reuse the same \`rigged-sprites.js\` frame drawer and
universal lighting interfaces, while owning their different body/motion rigs.

Tests: \`node --test tools/sprite-lab/tests/wizard-player-sprites.test.js\`.
