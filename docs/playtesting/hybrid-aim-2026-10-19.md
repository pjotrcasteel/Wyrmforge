# Hybrid automatic / manual aim — 19 October 2026

Implements the latest master design §3.3a: automatic nearby target selection is retained, movement does not steer shots, and deliberate manual aim temporarily takes priority. Automatic casting and existing contextual defenses keep their cadence. Legacy two-coordinate inputs deserialize into automatic mode; `MovementInput.CurrentVersion` is 2.

## Research applied

- [Enter the Gungeon developer explanation of controller aim assistance](https://steamcommunity.com/app/311690/discussions/0/412446292760718217/): transfer the deliberate-control handoff. Wyrmforge retains its own automatic cast cadence and real projectile misses. No external art or code copied.
- [W3C Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/): explicit pointer ownership and capture cancellation; releasing outside the canvas, capture loss, focus loss and viewport changes release the override.
- [W3C Touch Events](https://www.w3.org/TR/touch-events/): process every changed touch by identifier, maintaining independent movement/aim owners. Touch events back up the existing Safari path rather than sharing one virtual-stick owner.

## Controls and authoritative behavior

Desktop: WASD/arrows move; hold the left mouse button on the arena to aim at a world point. An idle mouse does not engage manual aiming. On touch, the left 55% starts movement; the right side starts optional aim. A short right-side drag acts as a directional stick in all directions. A right-side tap briefly aims at that world point for 350ms. Drag release and cancellation restore automatic mode immediately. Gamepad left/right sticks use a radial 0.24 deadzone.

C# owns effective direction, target identity and manual engagement. Primary acquisition rejects dead, out-of-range and masonry-occluded targets; a previous target within 25% of the nearest candidate is retained to reduce flicker. The acquisition range is currently 900 world units. Manual projectiles use the input angle, including empty-space casts and genuine misses. Manual primary lightning uses a 60-degree initial acquisition cone plus physical target radius; subsequent links and triggered support chains retain their existing behavior. Automatic acquisition and projectile motion share closed masonry, gate and locked-cache geometry. Projectiles use continuous swept-circle collision, including their radius and rounded obstacle corners, so a fast shot cannot tunnel through a thin wall. A consumed wall shot produces visual contact feedback without enemy damage, status, splash, chains or rewards.

The snapshot publishes aim angle, manual mode and automatic target ID. The small ground rune and mage facing consume that state; JS does not choose targets. The performance bridge forwards all seven frame arguments. The production arena and HuntLab accept the same optional aim arguments; HuntLab's autonomous agent still drives its demonstration.

## Verification scope

Focused automated tests cover keyboard and held mouse coexistence, both simultaneous touch orders, independent release, a full-direction right-thumb drag, tap expiry, cancellation, blur/background/resize, camera-edge coordinates, controller deadzones, legacy input, invalid aim, automatic selection independent of movement, manual misses and reacquisition, target stability/death/range, and first-link lightning precedence. Physical iPhone Safari testing remains outstanding; synthetic browser touch and Node event tests cannot establish real-device behavior.
