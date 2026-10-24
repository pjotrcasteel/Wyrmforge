# Wizard native Blender / mobile-scale review — 24 October 2026

**Scope:** PR #335 wizard only. Hollowed/Ashling improvements and the shared GPU
lighting PR #332 remain in separate workstreams.

## Verified source milestone (real Blender 4.5.15 LTS)

The `Wizard Blender native review` GitHub workflow now downloads and checksums
the official Blender 4.5 LTS package, creates an original editable
`wizard-editable.blend`, reopens it in a new Blender process, validates the
skeleton and control structure, and makes four actual CPU Cycles review images.

Confirmed in the returned `wizard-blender-validation.json`:

- 22 original humanoid bones from the reusable humanoid template.
- Five authored timeline intervals: walk, idle, cast, hurt and death. These are
  **source poses, not accepted gameplay-ready animation clips**.
- Six original school staff collections, eight direction metadata, independent
  animated staff-grip control, moving left/right foot IK.
- Two unbaked cloth meshes with sewn-weight pin groups, not a certified physically
  realistic cloth simulation.
- A 17-sample loop including the repeated first/last contact pose, no bad seam.
- All source-validation and native-render checks pass. The live game is untouched.

The native source and the four PNGs are retained by the workflow as **30-day
GitHub Actions artifacts**. This is temporary source preservation, not an
accepted permanent Git LFS checkout. Preserve any accepted .blend version in
durable repository/source storage before merge.

## Corrected on actual visual inspection

The earlier rig parented every school staff directly to `hand.R`. Its
animated IK wrist rotated the long prop nearly horizontal during both casting
and rear-facing walking. That was visually wrong despite numeric foot tests.

Now all staff meshes use a stable rig root and are parented to a separate
`StaffGripControl`; the socket follows right-hand IK positions, has restrained
cast tilt and rotates with the eight-direction root pivot. The Blender validator
checks staff parenting, grip attachment and an upright wind-up angle, so this
regression is caught automatically.

## Artistic review outcome: **NOT ACCEPTED**

Source execution is proven, but the images do not yet match WyrmForge's
grounded Gothic dark-fantasy style or production actor quality:

1. Sculpt: face, beard and hat remain simplified / too pale, not a richly
   sculpted weathered original character like the earlier owner-liked concept.
2. Materials: primitive surfaces and studio lights make the robes too smooth and
   grey, without convincing worn woven texture and dark tonal breakup.
3. Gait: 16 IK phase samples exist, but real hip/knee/body/robe deformation is
   still visually weak; only a few frames have been rendered.
4. Cloth: pinned Blender cloth modifiers exist but are not baked, evaluated over
   a complete loop or visually reviewed for leg contacts / intersections.
5. Mobile: offline 320/390px scale compositions show the staff silhouette
   clearly, but face/beard and action distinctions become small. These are
   **NOT on-device gameplay screenshots** or physically correct light.
6. Lighting: staff material may emit preview glow, but no shared GPU emitter has
   yet been registered in production. No per-actor alternate lighting path.
7. Game-export: pose-synchronous albedo, normals, roughness, height, independent
   casters and emission atlases are still missing from the Blender source.

## Reuse boundary for future enemies

The source builder uses the same parameterizable humanoid skeleton and biped gait
components introduced earlier in this PR. A future humanoid may change
proportions, equipment, animation and material without inheriting Wizard identity.
Quadrupeds/Wyrms use their own rigs but the shared actor-atlas producer.
The Blender native source verifier is currently wizard-specific; extracting a
general actor verifier is a follow-on AFTER validating one finished art source.

## Next milestone (visual quality, not more plumbing)

Build and preserve a reviewed UV-textured, sculpted original character using the
liked visual design, correct body proportions and genuine separate hands/boots/
beard/fabric weights. Render all 16 South walk frames with visible planted feet
and leg/cloth contact; render the entire cast anticipation/release/recovery.
Then prove all directions and six variants from the same rig and camera, and
finish common material passes for PR #332. No cutover to the temporary mage
until independent owner visual and real 320/390px device acceptance.
