# Ashfang Tier I Aseprite draft

Open `Ashfang-Tier-I.aseprite`. The six tagged frames are static turnaround keys. Each frame is **72×48 px** with a provisional ground pivot at **(42, 40)** in zero-based frame coordinates. This canvas is an art-authoring choice. Keep the approved youngling scale and verify the world scale in the current game before binding the sprite.

| Atlas row | Form | Columns from left to right |
| --- | --- | --- |
| Top | Normal | Front, right-facing side, back |
| Bottom | Enraged | Front, right-facing side, back |

The four PNG exports use the same 216×96 layout. The project opens with Albedo visible. Toggle the other layers independently.

| Layer | Purpose |
| --- | --- |
| Albedo | Draft colour cut from the approved turnaround sheets with the human scale guide removed. Some warm detail remains in the painted colour. |
| Height_DRAFT | Grayscale local surface relief based on simple hand-placed volumes. Wings have low relief and torso, head and spine read higher. Refine individual plates and wing spars in the native pass. |
| Emissive_DRAFT | Black is off. Ember-coloured pixels flag selected cracks, eyes and hot membrane veins. Inspect continuity of the thin seams and keep teeth and base membranes dark. |
| VFX_VentFlame_DRAFT | Isolated dorsal vent flame pixels for the enraged side and back keys. Animate separately and attach to verified sockets. The front key has no visible vent flame in this draft. |

Albedo, height and emissive share exact frame coordinates and body alpha. The vent layer has its own alpha. Recheck silhouette registration after each redraw, and verify colour space and channel interpretation in the actual material loader. Dynamic ground illumination needs the engine emitter. Keep breath, cinders, impact and overhead shadow separate from the actor textures.

The original motion studies remain in the sibling folders. Use the approved turnaround frames as identity keys and keep the reference-to-animation mappings in the existing handover notes. Claude owns native cleanup and animation, including reconciling anatomy between forms, authoring the missing directions required by the renderer, slicing, timing and mobile playback validation. Retain the C# encounter's attack phases and event ownership. Verify the existing renderer against the repo before export.

File headers and cel payloads were structurally read back and the cel pixels compared to the exported PNGs. Opening the project in Aseprite and validating it in-game are pending.
