# Ashfang breath: lingering ground fire

- Source: user-provided \`FX (2).zip\`, PVFX Foundry (\`effects/fire/ground-flames/strict/grid/sprite-sheet.png\`).
- The pack's license permits commercial game use and modification. The runtime uses **all 16 original frames** (64×40 pixels, 75ms each; pivot 32×33), re-encoded **losslessly** to \`ashfang-ground-flames.webp\` (512×80, 2.9KB). No generated replacement motion.
- Every scorched breath point comes from the existing authoritative C# \`ScorchBreathGround\` (same position as existing physical terrain damage). At most 24 patches coexist, overlapping scorches rekindle rather than stack.
- A patch is damaging for **2.75s**, followed by a harmless cooling/charcoal mark until **6s**. A physical player-centre circle of radius **34 world units** and **4 raw damage per 0.5s** is computed only in the simulation; overlapping patches cause **one** tick, never multiplied damage.
- The drawn bright circle is exactly the damage radius and disappears immediately when cooling begins. Ground height Z comes from C#, preserving 2.5D projection. A preloaded sprite atlas animates above the embers; reduced-motion uses one frame.
- No permanent per-frame terrain repaint, no novel texture uploads on contact, no new lighting engine, and no modification to Wyrmforge's physics or the original breath attack's damage. The scorch still makes the same terrain changes it made previously.
- Requires real iPhone Safari / Android Chrome Hunt screenshots and performance confirmation before visual sign-off.
