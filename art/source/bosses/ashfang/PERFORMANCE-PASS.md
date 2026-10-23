# Performance revision - 23 October 2026

Owner feedback rejects the first library's weak performance while retaining its appearance. Revise all motions for roughly twice the readable gesture, stronger anticipation/acceleration/follow-through and weight. A mechanical 200% joint multiplier is not the requirement: preserve rig deformation and planted contacts while enlarging the visible action.

Specific targets: raised open claw sweeping diagonally across toward the opposite paw; biting reach driven by body and neck; chest-led, braced roar; rearward pivot/deep squat followed by hind-leg push and fast wing downstroke; threatening bounding run; staged struggle and dramatic death with impact and final hold. Fire/smoke remain separate VFX. Previous source/export foundation 001 remains immutable and is not the accepted performance.

## References and application

- [San Diego Zoo tiger](https://animals.sandiegozoo.org/animals/tiger): powerful forepaws and claws bring down prey. Apply the owner's explicit high-to-opposite-paw rake direction, with outward claw orientation; do not substitute a straight punching path. This source describes behavior; it is not a measured swipe trajectory.
- [Smithsonian lion roar reference](https://www.si.edu/object/why-do-lions-roar:yt_8O-jfAURfa8) and [National Zoo lion notes](https://www.nationalzoo.si.edu/animals/news/do-lions-actually-purr-and-other-questions-answered): reference vocal effort as a whole-body performance. Our chest expansion, bracing, jaw opening and sustained head motion are authored interpretation, not copied motion capture. Video playback was not inspected through the text tool.
- [Weta Smaug case study](https://www.wetafx.co.nz/films/case-studies/smaug): actor performance helped inform the dragon's motion. Apply staged intent and changing emotional beats to roar and death, rather than a uniform interpolation. [Battle of the Five Armies breakdown](https://www.wetafx.co.nz/films/filmography/the-hobbit-the-battle-of-the-five-armies) is the owner's cinematic reference context. No film geometry, animation or frames are imported.

Judge the original volcanic Ashfang skin and silhouette at the intended small sprite size using actual rendered poses and playback. Numerical bounds/loop checks establish technical validity, not powerful acting or owner acceptance. Current main 21f28ecd and open Ashfang PRs checked; concurrent work remains untouched. Work continues on draft PR #299.

## Predatory intent addition

Owner additionally requests aggressive, animal-like, quick and irregular-looking behavior, aimed at catching and killing the player character. Authored asymmetric attention snaps, jaw threats, target-focused windups and a bite clamp/wrench are added. These are deterministic source performances; simulation targeting, legal turning, damage and attack selection remain in C#.

- [Field measurements of cheetah hunting](https://www.nature.com/articles/nature12295) and [pace/turn tradeoff study](https://pmc.ncbi.nlm.nih.gov/articles/PMC3971710/): explosive acceleration, braking and prey-directed turning matter more than continuously maximal speed. Apply abrupt intent changes with controlled recovery; avoid uniformly frantic speed.
- [National Zoo tiger behavior](https://www.nationalzoo.si.edu/animals/tiger): stalking leads to an opportunistic pounce and neck-directed bite. Apply focused low stalking, committed launch, forward jaw reach, clamp and brief wrench rather than repeated empty jaw flapping.
- [Cheetah forelimb anatomy and prey capture](https://pmc.ncbi.nlm.nih.gov/articles/PMC3077521/): forelimbs/dewclaw hook and destabilize prey; apply an open-claw across-body rake and body follow-through.
- [Crocodilian feeding mechanics](https://pmc.ncbi.nlm.nih.gov/articles/PMC2780573/): grasp-and-shake involves head/body force after a bite. The short authored post-clamp wrench is a dragon performance interpretation; no claim of a feline shake sequence or copied empirical trajectory.

No white-noise bone jitter: sharp movements use bounded, unevenly spaced bursts and settle while the limbs preserve support. Attack anticipation stays visible and strike/event timing remains explicit for later gameplay fairness review.
