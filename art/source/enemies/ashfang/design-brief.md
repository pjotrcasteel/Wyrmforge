# Ashfang — Cinder Wyrm animated character

Owner requested extra creative freedom, research into fire dragons/wyrms and a substantially more capable creature: walking, sitting/rearing upright, fire breath, takeoff and flying overhead. All production remains local on the existing RTX 5090; no hosted generation, subscriptions, downloads or GPU setting changes. This is new source production, not an automatic replacement of the live boss.

Authority: [canonical art](../../../../docs/canon/art-and-animation.md), [creatures](../../../../docs/canon/creatures-and-encounters.md) and original `10-ashfang-the-cinder-wyrm.png` card. The card is the identity anchor: black volcanic plates, separated molten seams, horned predatory skull, a powerful chest, long balancing tail and ragged membrane wings. Four walking legs plus a separate wing pair, as interpreted from the front/side turnaround. No cute proportions, copied cinematic dragon or blanket orange glow.

## Research and concrete transfer

- [Wētā's Smaug case study](https://www.wetafx.co.nz/films/case-studies/smaug): skeleton-first construction and performance informing movement. Transfer: one persistent anatomy with an articulated neck/jaw and expressive weight shifts; no movie mesh, footage or likeness copied.
- [Framestore's How to Train Your Dragon production breakdown](https://www.framestore.com/work/how-train-your-dragon): real-animal references, skeletal/muscle credibility and effort in massive flight; separate fire sources on breath and body. Transfer: grounded predator locomotion, chest-powered wing beats and a costly launch; distinguish breath emission from molten cracks. Ashfang keeps his card identity.
- [AMNH's pterosaur anatomy reference](https://www.amnh.org/explore/ology/ology-cards/266-pterosaurs): membrane wings supported by elongated digits. Transfer: actual deforming wing spars and tensioned membranes rather than rigid flapping triangles. This is a fantasy six-limbed dragon, not a claim that pterosaur anatomy or launch physics directly applies.

These written sources and their displayed stills were consulted; no downloaded third-party assets or claimed frame-by-frame film measurements. The following performance is original design inference within the owner's creative authorization.

## Performance and source architecture

Heavy, deliberate low stalking walk with shoulder/hip transfer and planted paws. Rear/sit: haunches settle, tail braces, sternum lifts, forepaws pull inward, neck rises. Breath: visible inhale, throat/chest heat, jaw opening and a directional mouth-bound jet, then recoil and cooling. Launch: crouch, wing opening, leg drive and a strong first downstroke before altitude; flight: slower power stroke, recovering folded wing, tucked limbs and a lagging tail. Banking/overflight and landing have separate authored transitions; landing catches paws before wing folding. Also preserve idle, hit and death/recovery potential.

Rig requirements: independent jaw, multi-joint neck/spine/tail, four articulated legs with sole contacts, separate shoulder/elbow/wrist/finger chains for each wing, membrane skinning and a mouth emitter socket. Validate folded wings, open wings and raised posture before committing to the animation library. Render a native 160–256px candidate only after body proportions pass a side/front motion gate; choose final cell from actual mobile footprint and fully extended wing bounds. Maintain pixel density and world anchor across clips; no mirrored views.

Eight-direction export follows convincing single-view motions. Wing/ground occlusion, altitude/shadow and actual breath origin need explicit review. Generic animation profiles must permit full-body stance/flight, independently aimed breath and interrupted transitions without foot sliding. Transparent membranes must retain clear native-pixel edges.

## Existing simulation boundary

Current `DragonCatalog.Ashfang` uses grounded pursuit (radius 60), two-phase scaling and telegraphed cone breath. There is no implemented takeoff/altitude/overflight cycle. Aerial gameplay needs explicit C# encounter states, clear danger telegraphs, collision/targetability rules and tests; art alone must not invent immunity, damage or invisible attacks. First produce and review the source anatomy/motion set, then integrate legal behaviour. Preserve the released Ashling/Hollow and concurrent work.

## First gate

Inspect original front/side cutouts, reconstruct an offline model candidate and compare actual views for four usable legs, separate wings/membranes, complete tail, jaw and skull. Reject scenery, fused limbs or unreadable silhouettes. Reconstruction is a starting surface, not a finished rig or proof of animation. Preserve failed candidates, source latent/appearance and remote checkpoints before long GPU work.
