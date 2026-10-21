# V51 surface work in progress

The owner explicitly confirms that the texture must still be finished. V50 is
not a final material. Preserve its accepted body and animation while replacing
the noisy card projection and flat head tile with an editable rest-space bake.

This checkpoint adds independent per-loop UV charts, a local CUDA material
recipe, and backwards-compatible source preview support. Geometry, skeletal
motion, mouth sockets and gameplay remain unchanged. The recipe is a candidate;
no visual validation or final texture acceptance is claimed at this checkpoint.

Reference direction: original Ashfang concept card, Smithsonian Komodo anatomy
(https://nationalzoo.si.edu/animals/komodo-dragon), NPS volcanic glass
(https://www.nps.gov/band/learn/nature/obsidian.htm). These inform coarse scales,
leathery membranes and fractured charcoal stone; no external assets are copied.

Remaining: bake on RTX 5090, inspect native views and animation, adjust material,
verify all nine motion arrays against V50, pack the editable Blender source and
save evidence. PR #186 stays draft. Main 5dc180fd and open PRs checked.


## V51–V53 result

V51 replaced the projected concept texture/flat head tile with a locally baked
rest-space material. Its scales were too fine and its horns shared the skin
pattern. V52 enlarged scales, separated dark keratin and rigid wing ribs from
leather, and retained selected warm cracks, eyes, fangs and ventral bands. V53
adds three texels of colored atlas padding to remove uncovered edge samples.
Earlier source and evidence remain intact. No external texture assets used.

Current candidate: `rigged-block-v53-surface/ashfang-rigged.blend` with packed
2688px albedo and persistent per-loop UVs. Geometry vertices and UV indices
are separate: seams do not alter skinning, normals or exported motion arrays.
The source recipe is `tools/sprite-lab/bake-ashfang-surface.py`; Blender
preparation/installation is `prepare-ashfang-surface.py`. Reproduction starts
from V50; prepare, bake, install, then source preview tools. The generator
build-ashfang-rig.py still produces the original V50 projection; this texture
postprocess must be run explicitly rather than assuming it happens in that build.

Local RTX 5090 receipts: all six regular motion reviews finite and unclipped;
walk and flight loops close exactly. Eight genuine camera directions rendered.
`motion-preservation.json` verifies every non-UV array in all nine samples is
exactly equal to V50, including faces, positions, bones, mouth and root motion.
Head inspection uses 500px/unit; turnaround and motion use native 80px/unit,
shown at integer enlargement in GIFs. This is source evidence, not live gameplay.

Texture remains explicitly UNFINISHED. The new skin is coherent and readable,
but broad wing leather needs anatomical veins/variation, scale flow needs more
local direction, and native tonal contrast needs owner review. No finished
spritesheet, runtime replacement, final VFX or owner texture acceptance claimed.
PR #186 remains draft. No screenshots or screenshot composites were published.
