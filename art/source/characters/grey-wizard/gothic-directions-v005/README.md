# Rear-facing refinement and eight-direction review

Source study only; no production atlas cutover or new locomotion.

NW and NE now show rear three-quarter profiles distinct from N, with matching
head/body orientation and the right-hand staff partly hidden in NW. Six native
views are byte-identical to v004: S, SW, W, N, E, SE. The generator's incidental
changes to other panels were excluded when sampling. Originals and exact built-in
ImageGen prompt remain in the parent directory. No third-party pack art used.

Contact sheet / atlas order: S, SW, W, NW / N, NE, E, SE.
`facing-review.gif` holds each view for500ms, showing a turn, NOT a walk or an
authored turning transition. It is native160px source review, not a gameplay scale
capture. Source128px silhouette height and common96-colour palette are retained.
No interpolation, mirrored views or manufactured animation frames were added.

Rebuild: `node tools/art/grey-wizard/prepare-directions.mjs --rear-refinement`.
Add `--check` to verify eleven deterministic files. Run
`review-directions.py` with Pillow to verify alpha/palette/unclipped bounds,
six unchanged facings and all eight decoded GIF frames against source PNGs.

Remaining: exact rear view angles, foot/anatomical landmark registration and
cross-facing costume/staff consistency need scene review. Pivots are guides and
worldSize72.944643 is a guide to preserve the approved working scale; these new
facings have not passed actual arena/Hunt/phone checks. Eight-direction walk,
cast, hurt, death and relightable source material maps remain unmade.
Keep current v003 south motion and lab baseline intact.
