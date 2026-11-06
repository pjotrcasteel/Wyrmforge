# Wyrmforge Fire School mage

This fresh player mage source project has three static 32×40 frames. The tags are front, side_right and back. The feet share the same baseline. Use (16, 38) as the draft root in zero-based frame coordinates and tune it with the game camera. Inspect the sprite in Aseprite before authoring the walk.

| Layer | Use |
| --- | --- |
| Shared body and shaft | Neutral grey mage, right hand and straight wooden shaft shared by all schools. |
| Fire staff head | Swappable ember shard and iron setting. Anchor a replacement to the top of the same shaft in each facing. |
| Fire robe sigil | Swappable cloth overlay, visible on the rear view. The base robe has neutral cloth underneath. |
| Fire emissive | Hidden by default. Staff ember core only. Export independently and check the renderer's channel and intensity conventions. |

Build each school as a set of replacement head, sigil and emission cels on the shared canvas. Preserve staff length and handedness. When the staff animates, use a common rigid transform and attach the head and emission to the same socket. Attach the sigil to the robe so it follows cloth motion. Keep cast VFX separate from the sprite.

The preview shows the colour composite at 1× and 6×. The Aseprite cels were structurally verified. Editor opening, animation authoring, relief and in-game playback remain pending. Start with the side walk and verify the tip stays planted as the mage steps past it.
