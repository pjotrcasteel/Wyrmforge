# Walking-stick support revision

SE source motion revised from v006: staff now plants, supports the step with
subtle body weight transfer, lifts clear and advances for the next plant.
Rigid shaft and gripping hand share the same tip-pivot transform; the sleeve
follows the grip while the shoulder stays on the body. Sixteen explicit keys,
same Gothic source/palette, same anatomical scale and estimated foot anchor.

Support frames7–15: actual source tip and raster bottom both stay at72.5,146
under the authored root[i,i], with0px drift. Recovery frames0–6 lift up to6px
above the relative ground guide. This is authored source contact, not actual
C# root/physics validation. Source staff mask includes all crystal/wood pixels;
expanded ownership removes the residual old-position gem visible on large swings.

Rebuild: `prepare-gothic.mjs --walking-stick`, then
`build-gothic-walk.mjs --walking-stick`; `--check` verifies25 outputs.
Package/review scripts accept this source directory. OpenRaster retains12 source
layers; GIF/MP4, full contact sheet and existing Sprite Lab320/390 captures remain
in `review/`. Idle reconstitutes the exact original source.

Technical checks pass:16 distinct binary-alpha/unclipped frames, shared playback,
pause/reduced motion,0px source support-tip drift and0 grip displacement error,
two boot stance extent checks,12 packaged layers, GIF16frames/MP4 decode,
320/390 lab import/play/pause with no page errors. Prior south/v006 remain intact.

Live stride/run fit is still unresolved (see package-cadence-audit.json).
This updates source motion, not production gameplay. Hidden sleeves/cloth, foot
anatomy, materials/lighting, directional transitions, other walk facings and real
Hunt/physical-phone gates remain. The staff contact creates no gameplay collider
and adds no character-specific physics engine.
