# Hollowed claw — VFX H1

- **Source:** user-supplied `FX (2)(1).zip` (PVFX Foundry 1.0),
  `effects/melee/shadow-claw/strict/grid/sprite-sheet.png`.
- **Source SHA-256:** `8db49da73c932476675e6eb7bbe912af240fc2f45bee0beec0bdef35f3925fe6`.
- **Runtime SHA-256:** `c733c0fd70952ed5597bbc7f91a98876ff31aec634931bdbfc3f530786a0098e`.
- **License:** PVFX Foundry CC0 1.0 Universal; commercial use and edits allowed.
  Credit: VFX from PVFX Foundry by Pixel VFX Studio.
- **Transformation:** original 12 strict-opaque 56×56 frames retained pixel-for-pixel, with
  the six opaque colors replaced with Wyrmforge's dark ink, bruised flesh and cold bone
  palette. No alpha blur or synthetic frames. Atlas is 448×112, 3,049 bytes.
- **Runtime:** `hollow-claw-vfx.js` attaches the visual trail during 0.36–0.72 s of
  the existing 16-frame Hollowed attack animation. Draw after the actor, before
  terrain occlusion, in either Canvas or the shared GPU actor capture. No extra
  simulation state, damage, hitboxes, new enemy AI, terrain repaint or gameplay RNG.
- **Important:** the current Hollowed attack animation is contact-triggered presentation,
  while authoritative C# contact damage is continuous DPS. A trail means *a claw
  swing*, **not a confirmed hit**. Do not add impact/contact blood VFX until the
  authoritative simulation exposes an actual damage event with victim identity.
- **Lab:** `/enemy-lab?kind=Hollow&autoplay=false&cast=false&count=3`;
  tick/untick *Hollowed claw VFX* to compare the same seed. A pack of 8 can use
  `count=8`. Pause, freeze and reduced motion are bounded by the established
  Hollowed animation state. Other monsters unaffected.
- **Acceptance:** inspect the slash at both 320px and 390px on real iPhone/Android
  in the Enemy Lab and Hunt. Check eight facings, damaged-arm silhouettes, attack
  readability under night lighting and no performance regression in a pack. Technical
  tests do not substitute for artistic/mobile approval.
