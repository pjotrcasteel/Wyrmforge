# Licensed Anokolisa Wizard pixels — isolated intake v001

**Status:** real artist-drawn pixels imported as a review study, **not approved or used in the game**.

This intake starts from the owner's supplied `Entities.zip` from Anokolisa's
**Pixel Crawler** pack, and the separate `Terms.txt`. It preserves the actual
source pixel clusters. It does not AI-regenerate a figure or derive fake
eight-direction poses by flipping a single facing.

## Provenance and usage

- Artist: **Anokolisa** — [official asset page](https://anokolisa.itch.io/dungeon-crawler-pixel-art-asset-pack)
- Supplied terms permit use in commercial projects, study and other projects.
  Attribution is optional but appreciated. Anokolisa is not affiliated with
  WyrmForge. Credit them voluntarily.
- The archive and editable original `.aseprite` sources are **not committed**.
  Keep the source pack and the accompanying creator's terms together in a
  separate, user-controlled asset location. These generated previews are
  derivative game-production studies, not a reissued asset pack.
- Source pixel hashes are checked by the importer to prevent silently using
  another pack version or mismatched artwork.

## Current outputs

| Output | Content | Status |
| --- | --- | --- |
| `run-side-6f-64x80.png` | Original six source run poses, aligned at foot anchor (32,74) | One side-facing candidate only |
| `idle-side-4f-64x80.png` | Original four idle poses, same cell and anchor | One side-facing candidate only |
| `run-side-review.gif` | Six-frame 8 FPS zoomed preview of the actual pixels | Visual review |
| `run-side-grey-6f-64x80.png` | Same six poses with four cloth colors mapped to Gothic grey | Optional art variant |
| `idle-side-grey-4f-64x80.png` | Same four idle poses with matching grey garment | Optional art variant |
| `run-side-grey-review.gif` | Animated comparison candidate in grey | Owner visual review |

The only transformations are a fixed source crop, **2× nearest-neighbor**
scale and fixed feet alignment inside a transparent **64×80** native cell.
The original-purple outputs preserve every painted source color. The optional
Gothic-grey outputs replace **only four exact garment palette colors** while
preserving the artist's pixel shapes, outlines, shading clusters and alpha.
No AI repaint, interpolation or alpha anti-aliasing is introduced. These are
faithful staging artifacts, not final WyrmForge Wizard body rig or animation.

## Reproduce

From the repository root, after installing Pillow from
`tools/sprite-foundry/requirements.txt`:

```powershell
py tools/sprite-foundry/studies/anokolisa-wizard-v001/import_artist_pixels.py --pack "C:\\path\\to\\Entities.zip" --out "tools/sprite-foundry/output/anokolisa-wizard-v001"
```

The output directory must not already exist; the importer never overwrites art.
The creator's `Terms.txt` is supplied separately from `Entities.zip`.

## Missing before a production Wizard

1. Confirm whether Anokolisa's figure is the new visual foundation for the
   WyrmForge main Wizard. The original purple outfit is not the canonical
   Gothic grey costume; the optional four-color grey variant keeps the artist's
   actual pixels and is not owner-approved yet.
2. Author **genuine N, NE, E, SE, S, SW, W, NW** views; this source does not
   contain them. Do not mirror asymmetric gear or relabel an unsupported facing.
3. Author a **right-hand, planted walking staff** cycle. The supplied source is
   a six-frame *run*, not a staff-assisted walk. Do not claim it solves the gait.
4. Check robe/hand/foot continuity in actual animated GIFs at 1×, 4× and
   gameplay scale. Only after owner approval produce aligned lighting maps
   and a separate runtime integration change.

Neither the current procedural v015 gait experiment nor live game art is
overwritten, and **PR #471 must remain draft** until approved.


## Shared six-school Wizard foundation (owner-approved style, 3 Nov 2026)

The owner approved the **hand-drawn Gothic-grey Anokolisa Wizard as the shared
visual foundation**. This approves the *style and art-source direction* only:
the side-facing run/idle are still studies, and the walking-staff gait,
eight-way art and gameplay integration remain **unapproved**.

All six schools derive from the **same** `run-side-grey-6f-64x80.png` and
`idle-side-grey-4f-64x80.png` frames. Do not fork six character bodies,
regenerate each direction independently, or substitute the earlier procedural
Wizard's rough silhouette.

The new `school_styles.json` owns the per-school visual modifiers. The
`generate_schools.py` build applies them without modifying the original
pixels, alpha, frames or feet anchor.

| School | Initial hat band + hem accent | Reserved character details |
| --- | --- | --- |
| Fire | Ember orange | Ember staff, flame emblem |
| Frost | Ice cyan | Crystal staff, frost emblem |
| Storm | Electric gold | Forked-lightning staff, bolt emblem |
| Arcane | Violet | Arcane-orb staff, rune emblem |
| Necromancer | Sickly green | Soul-flame staff, skull emblem |
| Summoner | Teal | Summoning-ring staff, conjuration emblem |

The initial school pass changes only existing opaque hat-band and robe-hem
pixels. Equipment, school symbols and casting glow are *named extension slots*
but **are not drawn yet**. School accent tuning remains subject to artistic
review at native/mobile size.

Rebuild all six side-facing variants from the checked-in base (no original ZIP
needed for this step):

```powershell
py tools/sprite-foundry/studies/anokolisa-wizard-v001/generate_schools.py --out "tools/sprite-foundry/output/wizard-six-schools"
```

The generator refuses to overwrite an existing review directory. Its output
contains an idle atlas and run atlas for every school, a static six-school
contact sheet, an animated six-school comparison and an explicit manifest.
Tests prove that school variants retain the source alpha, frame dimensions,
feet baseline and original base pixels. They also compare checked-in study
atlases to regenerated output, so modifying the master cannot silently leave
six stale copies.

**Next visual gates:** approve school-specific shapes/details, author
consistent N/NE/E/SE/S/SW/W/NW artist-sourced facings, then animate
the right-hand staff's plant/push/recovery in all directions. School-specific
lighting should be passed through WyrmForge's existing generic G lighting
engine, not hand-painted into arbitrary walk frames.
