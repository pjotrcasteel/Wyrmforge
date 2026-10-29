# Foundation003 action catalog

All actions retain the original112-bone rig. Source24fps/export12fps;8directions. See [review](reviews/motion-foundation-003/review.md).

| Action | Seconds | Export frames/direction | Loop | Events |
|---|---:|---:|---|---|
| idle | 2.000 | 24 | True | {} |
| alert | 2.000 | 24 | True | {} |
| look | 3.000 | 36 | True | {} |
| alert_start | 1.000 | 13 | False | {} |
| alert_end | 1.000 | 13 | False | {} |
| walk_start | 1.333 | 17 | False | {} |
| walk_stop | 1.333 | 17 | False | {} |
| run_start | 1.000 | 13 | False | {} |
| run_stop | 1.167 | 15 | False | {} |
| walk | 2.000 | 24 | True | {"footfalls":[0,0.25,0.5,0.75]} |
| stalk | 2.667 | 32 | True | {"footfalls":[0,0.25,0.5,0.75]} |
| run | 1.167 | 14 | True | {"footfalls":[0.04,0.18,0.54,0.68]} |
| turn_left | 1.667 | 21 | False | {"turn":0.5} |
| turn_right | 1.667 | 21 | False | {"turn":0.5} |
| pounce | 2.000 | 25 | False | {"launch":0.3,"impact":0.68} |
| claw_left | 1.667 | 21 | False | {"hit":0.48} |
| claw_right | 1.667 | 21 | False | {"hit":0.48} |
| claw_combo | 2.667 | 33 | False | {"hit":[0.33,0.67]} |
| bite | 1.667 | 21 | False | {"hit":0.45} |
| tail_left | 2.000 | 25 | False | {"hit":0.55} |
| tail_right | 2.000 | 25 | False | {"hit":0.55} |
| roar | 3.333 | 41 | False | {"voice":0.3} |
| breath_start | 1.333 | 17 | False | {"mouth_ready":1} |
| breath_loop | 2.000 | 24 | True | {"vfx":"continuous mouth attachment"} |
| breath_end | 1.333 | 17 | False | {"vfx_stop":0} |
| breath_sweep | 2.667 | 33 | False | {"vfx_start":0.23,"vfx_stop":0.77} |
| takeoff | 2.333 | 29 | False | {"wing_spread":0.21428571428571427,"look_up":0.32142857142857145,"downstroke":[0.35714285714285715,0.42857142857142855],"liftoff":0.35714285714285715,"arrow_up":0.42857142857142855} |
| fly | 1.333 | 16 | True | {"downstroke":0.25} |
| hover | 1.667 | 20 | True | {"downstroke":0.25} |
| glide | 2.000 | 24 | True | {} |
| bank_left | 1.667 | 21 | False | {"bank":0.5} |
| bank_right | 1.667 | 21 | False | {"bank":0.5} |
| air_breath | 2.667 | 33 | False | {"vfx_start":0.25,"vfx_stop":0.75} |
| land | 2.000 | 25 | False | {"braking_downstroke":0.4,"hind_touchdown":0.64,"fore_touchdown":0.84,"touchdown":0.64} |
| hit_front | 1.000 | 13 | False | {"recoil":0.2} |
| hit_left | 1.000 | 13 | False | {"recoil":0.2} |
| hit_right | 1.000 | 13 | False | {"recoil":0.2} |
| stagger | 2.000 | 25 | False | {"stumble":0.35} |
| recover | 2.000 | 25 | False | {} |
| death | 4.000 | 49 | False | {"voice":0.22,"collapse":0.62,"hold":0.85,"cool_start":0.3,"cool_end":0.82} |
| death_alt | 4.333 | 53 | False | {"voice":0.22,"collapse":0.62,"hold":0.85,"cool_start":0.3,"cool_end":0.82} |
