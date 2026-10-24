# Wizard secondary cloth and school-staff lighting checkpoint (24 Oct 2026)

**Scope: player wizard only.** PR #332 owns the shared renderer, while separate work improves Hollowed and Ashling. Do not move anything into their assets or renderers.

## Robe and cape

Previous prototype had **no physics**: the hem and cape were displaced by simple sine waves. The current source generator uses **bounded spring-damper secondary motion** sampled deterministically per clip/frame: hem vertices and rear cloak nodes use rest lengths, neighbor coupling, damping, inertial gait forcing, limited gravitational sag and a ground-plane clamp. It is a software-authored 3D prototype; not Blender cloth, not validated self collision, not a final deformation rig. Separate legs/feet remain authoring-driven and gait remains rough. Upgrade to skinned Blender robe with collisions against body/legs and believable steps before production acceptance.

## School shaft and charging

All six staff shafts have visible school colors in their ordinary albedo (pigmented weathered wood with school inlays, not an overexposed neon silhouette). Heads differ by school. The **head/rune only** has an independently exported emission mask; black elsewhere in that pass means no material emission. Material passes keep the albedo alpha exactly. The cast animation's earliest windup frames start charging before the actual release; emission increases through release and dies in recovery. Idle/walk stay non-emissive except actual declared future gameplay lights.

`tools/sprite-lab/wizard-staff-light.mjs` defines a **non-runtime** pure adapter that maps authoritative `castMotion.progress` to the generic PR #332 `LightEmitter` and `LitMaterial` shapes. The resulting scene emitter requires the **pose-correct, animated staff-tip XYZ**, and must be registered by the future shared C# snapshot/GPU adapter. There is NO additional hand-written mage light shader, CSS brightness hack, unbounded glow, static character readability light, or change to the current Arena.

**Important:** the current prototype diagnostic images may composite a little glow for inspection. They are explicitly NOT a demonstration of the GPU engine illuminating other world surfaces. The full shared engine must light robe, beard, nearby Hollowed/Ashling, ground and wet surfaces consistently, and pass all-sources-off black-world tests before cutover.

## Remaining before final

- Sculpt and weight a high-quality editable Blender source; preserve `.blend`, all material textures, source motion, school staff meshes, and license records.
- Replace spring-proxy strips with cloth sim/deformation and body/foot contact; current gait and cast are still rough.
- Review material response (normal/depth/caster) at 320px and 390px and in real native/iOS/Android gameplay.
- Add real idle, attack/cast, hurt and death atlases for all directions and schools, share the normal character animation sampler.
- Integrate **only** through PR #332 once its universal material/light pipeline is stable; no alternative renderer.

Current stage: separate, reviewable art/tooling checkpoint only. CI passing is not visual or physical-mobile acceptance.
