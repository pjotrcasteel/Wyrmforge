# Head and carried-limb performance — 21 October 2026

Owner accepts V48's body, rejects the head, and requests curled rather than
straight airborne claws. Preserve the body source and player size. Canonical
art/creatures and the original Ashfang card remain intended-design authority.

## References actually consulted

- [Framestore, How to Train Your Dragon](https://www.framestore.com/work/how-train-your-dragon): production describes anatomy/muscle-based performance and reference animals including bats, hawks, lizards and big cats. Inspected the official front-flight still in the browser: limbs are carried folded beneath the chest rather than held in a standing pose. Transfer: deliberate carried pose plus delayed extremity response to the wingbeat. Do not copy Toothless's cute face or silhouette. No frame-rate or joint-angle measurements claimed.
- [Cornell Naturalist Outreach, Building a Better Bird](https://bpb-us-e1.wpmucdn.com/blogs.cornell.edu/dist/7/3643/files/2013/09/Bird-Morphology-z1vqh2.pdf): leg/toe morphology section distinguishes ankle and digit function and specialized raptor feet. Transfer: wrist/ankle orientation is not a substitute for articulated digits. The document does not supply dragon flight timing or justify a literal avian skeleton.
- [Weta FX, Smaug](https://www.wetafx.co.nz/films/case-studies/smaug): skeleton, movement and surface developed together; performance informs the creature. Transfer: skull/jaw/sockets must function coherently before armor or glow is applied. Written account consulted; no complete video/frame analysis claimed.
- Original Ashfang card hero and head/side/pixel views reinspected: tapered predatory muzzle, recessed eyes beneath brows, angular cheeks and backward horns. Preserve identity without the current broad, bright permanent mouth line.

## Specific diagnosis and implementation

Existing paws were a single rigid distal foot segment with no digit joints.
Cruise kept the standing toe direction despite some leg tuck. The carried offset
was in world coordinates, so it could also detach the gesture from the body's
pitch during a climb. The new source adds three two-joint digits per foot,
rotates wrists/ankles into a carried pose, and moves hocks in the parent body's
coordinates. Toe curl is gated by lift and existing tuck controls, then opens
as landing reach develops. Proximal/distal lag follows the existing wing signal,
with different fore/hind and left/right response delays, not arbitrary noise.

Head correction: narrower tapered skull/snout, deeper forehead, better placed
eye slits, a closing jaw and fangs mostly covered at rest. Skull and jaw receive
charcoal rather than painted throat-fire UVs; mouth emission follows the new jaw
location. Head acts through existing neck/head controls; body geometry and its
approved movement should remain unchanged and be checked against V48 samples.

Review gates: close/side/game head views, visible wrist and toe curvature in
flight, unfurl-before-catch, finite/floor checks and exact flight-loop closure.
Also compare core body samples to V48; a passing numeric check is not owner
acceptance of the face or organic performance. No new gameplay behavior implied.
