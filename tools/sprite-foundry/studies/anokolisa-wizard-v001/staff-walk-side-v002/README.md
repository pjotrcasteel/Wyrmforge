# Staff-contact v002 — bigger movement (UNAPPROVED)

User feedback on v001 (4 Nov 2026): **"Movement should be bigger."**
This version deliberately increases the reach, arm height change, staff
placement distance, lift and planted body travel while retaining the
artist's untouched, licensed grey Wizard source. v001 is preserved.

## Exact change from v001

| Measured change | v001 | v002 |
| --- | ---: | ---: |
| Hand horizontal travel across 12 keys | 5px | 13px |
| Hand vertical travel | 4px | 9px |
| Staff-tip horizontal sweep | 15px | 21px |
| Maximum staff-tip lift from ground | 10px | 19px |
| Root movement during planted support | 13px | 19px |

All units are native pixels in the same 64×80 cell. These are review
motions, not a shipped movement speed or gameplay-root authority.

Keys 02–08 again keep the planted tip fixed in world coordinates (x=60,
y=74) as the model root travels `(0,1,4,7,11,15,19)` px. The right
elbow remains behind and below the hand. The staff is drawn as **one
straight shaft** through the hand, not independently rotated segments.

## Review artifacts

- `staff-motion-before-after.gif`: v001 left, v002 right, same 12 source
  timings and same original body sprites. This is the recommended review.
- `staff-contact-12-keys.png`: all twelve v002 poses at 4×.
- `selected-before-after.png`: four key side-by-side comparisons for mobile review.
- `staff-side-12-keys.gif`: v002 pose loop at 4×.
- `staff-ground-contact-once.gif`: single-pass root-space proof; the
  planted staff remains stationary while the character travels farther.
- `staff-side-12f-64x80.png`: native RGBA sheet, review only.
- `manifest.json`: immutable key positions, phases, tip/root coordinates.

## What this does *not* solve

The source still has only six **run** frames and one side view. Repeating
them across twelve contact keys cannot provide a convincing, independently
painted walking gait, stable left/right foot contacts, weighted robe motion,
or 8 genuine directions. The new arm is still a first-pass pixel overlay
and needs owner review for believable shoulder/elbow/wrist anatomy.

Do not merge or integrate this study or create six school staffs yet.
After visual approval of the larger amplitude, author a real 16-frame
staff-assisted walk and proper leg/cloth motion on one consistent art
foundation. Then adapt the shared staff motion to Fire, Frost, Storm,
Arcane, Necromancer and Summoner, with their approved emblems and the
existing shared lighting engine.

## Reproduce

```powershell
py tools/sprite-foundry/studies/anokolisa-wizard-v001/staff-walk-side-v002/staff_walk.py `
  --out "tools/sprite-foundry/output/staff-motion-v002-review"
```

This loads the checked-in v001 study only to render the side-by-side
comparison; it does not modify v001, the Anokolisa source, or live assets.
Regressions check increased motion, straight shaft, arm joint ordering,
world-fixed tip, no source changes, and reproducibility.

## Source principles

The established WyrmForge staff-walk requirements are informed by
[REI trekking pole technique](https://www.rei.com/learn/expert-advice/how-to-use-trekking-poles.html)
and [South Tees NHS walking-stick guidance](https://www.southtees.nhs.uk/resources/how-to-use-walking-sticks/):
advance opposite the stepping foot, plant, bear weight, pass, recover.
No copyrighted imagery was copied.
