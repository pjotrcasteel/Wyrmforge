# WyrmForge Hollowed family — variation-ready art specification (FUTURE H7 ONLY)

**Status:** Approved *direction and constraints*, **not approved artwork or authorized H7 implementation**.  
**Source of truth:** Standard Hollowed's final owner-approved H1–H6 model and rig; currently H1 remains open.  
**Immutable engine boundary:** One universal animation engine, one GPU lighting engine, one AI engine and one physics engine. This document requests **no** engine, renderer, gameplay, existing clips or runtime changes.

## Why this exists

Hollowed must evolve into a family of genuinely different bodies. The user explicitly requires multiple future physical variants, including two extreme **anatomically legless** crawlers. These are distinct Gothic undead, not six textures over the same naked human mesh. We are **not** creating them now: first finish one excellent standard Hollowed, obtain its real owner visual approval, and complete H6 source / compatibility handoff. Only a *separately authorized* H7 may produce the variation batch.

## Six physical archetypes — source planning, NOT generated assets

| Future form | Primary anatomical difference | Distinct stance / weight | Damage and readable gameplay silhouette |
| --- | --- | --- | --- |
| Standard / Wretch | Approved master: uneven brow and jaw, integrated cracked ribcage, connected fingers and ash corruption | Forward-hunched biped, unbalanced shoulders | Recognizable baseline; no coat or cape |
| Wandering | Very wasted back and abdomen, narrow uneven shoulders, hanging head, bent neck | Slow, collapsing biped with uneven knee loads | One shoulder and arm nearly inert, longer dragging limb, different head outline |
| Frenzied | Broad source clavicle / upper back deformation, elongated forearm reach, visibly crooked hands | Forward-loaded aggressive biped ready for swipes | More damaged face and forearm, asymmetric shoulder heights, not just faster animation |
| Crippled | One shoulder/arm physically ruined, shoulder tissues pulled asymmetrically, altered pelvic compensation | Limping biped with valid single-arm strike envelope | Real damaged limb geometry and grounded counterweight, not an animated intact arm made invisible |
| Drag Crawler — legless extreme I | Legs genuinely absent below hip-level wound; closed torn pelvis/tissue source geometry | Full chest weight on forearms, long forward drag reach | Low sprawling profile, forearm wear, asymmetrical torso/shoulders |
| Skitter Crawler — legless extreme II | **Also legless**, with a distinct short ruined pelvis, broken chest/shoulder shape and elongated working arms | Extremely low side-biased / lateral crawling body, different hand placement | Distinct handspan and head orientation from Drag Crawler, never disguised as a standard biped |

## Master source vs derivative geometry

The eventual master source shall provide a legally modifiable editable `.blend`, consistent bone semantic names and joint landmarks, clean original rig and weights, stable source UV/material layering, no coat, no disconnected pixels and no baked global lighting. Source-only shape keys may describe *continuous deformations*; severely missing limbs, ruptured pelvis or exposed skull require *genuinely authored geometry* rather than lowering alpha or shrinking a limb to zero.

Variants can share source rig conventions and rendering contracts without being identical meshes. A crawler may need a documented derivative skin/rig/ground-contact mapping; preserve root, spine, shoulder, arm, wrist, neck and head semantics, and document any absent leg roles. Adaptation to the animation engine is a **future separately authorized integration**, not a change to the shared engine in PR #391. Preserve non-crawler movement, Ashling assets, universal lighting and AI unchanged.

Material families should derive from the same WyrmForge ash-corruption principles, but differ in **physical extent and distribution** of exposed bone, cracked tissue, burnt/necrotic surfaces, and future core-limited internal emission. Avoid bright unrelated red patches, random orange pixels, uniform edge glow or a disconnected ember halo. All emission must ultimately use the existing universal lighting system; no custom per-Hollowed renderer.

## Required H7 source manifest — future implementation contract

For each future body, record at least:

- Stable variant ID; parent approved master asset/version/license; immutable source hash.
- Geometry and physical-damage class; rig semantic profile; optional missing limb roles; pelvis/head/hand/foot-or-stump contact landmarks.
- Authored 3D source and PBR inputs, native-resolution 8-direction render set, real animation/retarget applicability reviewed **without modifying the engine**.
- Art-specific material/corruption profile and future registered emissive feature roles.
- Minimum three measurable silhouette differences from the standard, verified in unlit neutral clay without palette cues.
- Per-variant deformation QC: shoulder/elbow/wrist/head at minimum, plus limb-stump deformation and hand-only ground contacts for crawlers.
- Approved art review images/GIF and separate owner acceptance of the complete six-body batch, *before any production rollout*.

## Quality / non-regression gates

1. First finish standard Hollowed's H1–H6: truly original Gothic undead mesh, connected anatomy, face, wound depth and an actually usable rig. Do not use the currently rejected source as the family master.
2. No two variants may share a near-identical silhouette in front, 3/4 and profile at native 96px. Different movement speeds or recolours do not count.
3. Both crawlers must actually lack functional legs; screenshots, editable mesh and physics/occlusion contact landmarks must agree.
4. Bone ends, fingertips and torn tissue must be fused or correctly embedded; reject floating pieces and dark backpack/cape artifacts.
5. Test in neutral clay, WyrmForge dark Gothic/night lighting and 0-light black, all eight directions. Compare against **real approved Ashling** under identical scale and light, not a mockup.
6. Keep exactly the same engine ownership boundaries. No animation or gameplay changes, no modifying PR #387, no live asset/production integration from this source-only draft.
7. H7 proceeds only after a new explicit owner request, independent of any approval to complete H1–H6.

**Current handover:** Hollowed H1 work is ongoing in [draft PR #391](https://github.com/pjotrcasteel/Wyrmforge/pull/391). This document does not grant approval or authorize future H7 code, clips or deployment.
