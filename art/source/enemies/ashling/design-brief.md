# Ashling — local animated sprite production

Next Fire card after the accepted Hollow: `user_handover_files/concepts/Fire/02-ashlings.png`. The owner authorized starting this enemy while Hollow release 0.0.135 deploys. All inference and rendering stay on the existing local RTX 5090; no hosted generation, paid service or hardware setting changes.

Identity: small wiry scavenger demon; paired swept horns, pointed ears, long clawed hands, digitigrade legs, thin tail and ragged waist trophies. Dark red-brown hide and restrained ember eyes. Low, forward and fast; do not reuse the Hollow's upright zombie waddle or add armor/weapons. Preserve readable horns, claws and tail at the game's mobile pixel scale.

The concept card's turnaround supplies the initial source. Cropping and local foreground extraction preserve its pixels; a low-resolution reference is a candidate input, not an accepted model. Inspect the horns, hands, tail and back before rigging. Preserve failed candidates as failed rather than replacing them silently.

Existing gameplay: `EnemyKind.Ashling` (2), pressure swarmer, speed multiplier 1.45, health/contact damage multiplier .65. Pack coordination, priest morale and resurrection remain C# authority. The card's suggested leap is a motion reference, not authorization to add a new damage or movement mechanic. Presentation integration must follow current simulation signals.

Production: offline TRELLIS 1/DINOv2 from already installed weights → editable textured mesh → anatomy-specific deforming rig → one convincing three-quarter scuttle with a ground-contact test → eight directions → attack/death and reusable layer metadata. Keep full-body policy available for a leap. Each stage requires technical and visual review; no automatic runtime replacement and no owner acceptance inferred from passing tests.

Current status: source analysis and local reference preparation. No accepted model, rig, animation or runtime replacement yet. Hollow's accepted PNGs and the live game stay intact. Remote checkpoints precede long GPU/render jobs.
