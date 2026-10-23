# V48 charcoal armour and complete existing motion set — 21 October 2026

Authority remains canonical art/creatures and the original Ashfang card.
Current main/open PRs were checked before this slice; no game/player files or
concurrent-session changes were modified. PR #186 remains draft.

V47 adds solid overlapping stone scutes on the torso, neck, forehead and tail.
It also fixes an export mismatch: ember-eye and fang UVs had been changed only
in Blender's mesh loops, not the NPZ UV array consumed by sprite renderers.
Both now use the same coordinates. Scutes have a small original charcoal tile;
reference artwork is preserved. V48 separates cooler stone from incandescent
boundaries and uses neutral charcoal palette entries. Body material is changed,
not geometry/motion. Packed editable Blender source and derived texture retained.

All nine V47 source clips were rebuilt with the repaired wing controls. V48's
nine sample files are byte-identical to V47 (recorded in
`motion-reuse-verification.json`), so their finite/floor checks apply directly.
Worst minimum Z is -0.195635 against floor -0.197. V48 rerenders six regular
actions: walk, rear/breath, takeoff/flight/land, flight loop, landing and connected
flight sequence. All are finite and unclipped in the two review cameras. Walk
and flight-loop endpoints close exactly. Native PNGs/GIFs and technical receipts
are in `rigged-block-v48/motion-review-v1`. Stance clay/texture review is in
`silhouette-review-v1`. All rasterization uses the local RTX 5090.

The private current-Hunt screenshot composite covers all 279 aerial-sequence
frames at 110px/unit in a 440x955 viewport. Player pixels at the starting pose
match the original reference region exactly; no player scaling. During frames
79–210 the dragon body contributes zero visible pixels, while its winged shadow
and ground-fire study remain visible. 74 frames have a computed ground strike.
`native-fit-summary.json` contains numeric public evidence; reference and
composite pixels remain ignored/private. World pass path is unchanged from the
94px/unit source, so its projected offset is now 222.34px rather than 190px.
This is a composite art study, not live gameplay or implemented damage.

Internal result: broad charcoal armour is distinct from orange wing membranes,
eyes and mouth. Finite/floor/clipping checks do not establish aesthetic approval.
Remaining: owner visual acceptance and all-facing native scale, final fire VFX,
hit/death and remaining action/direction library, and explicit C# aerial encounter
integration. No completed spritesheet, shipped boss or owner approval is claimed.
