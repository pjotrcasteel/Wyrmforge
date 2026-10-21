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
