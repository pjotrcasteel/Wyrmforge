# Ashfang animation catalog

41 actions on `zagmatorah-112/v1`. Source 24 fps; sprite samples 12 fps. Eight independently rendered directions per action. Timings are editable presentation data; C# remains authoritative for gameplay.

| Action | Seconds | Sprite frames/view | Loop | Events |
|---|---:|---:|---|---|
| idle | 2.000 | 24 | yes | {} |
| alert | 2.000 | 24 | yes | {} |
| look | 3.000 | 36 | yes | {} |
| alert_start | 1.000 | 13 | no | {} |
| alert_end | 1.000 | 13 | no | {} |
| walk_start | 1.333 | 17 | no | {} |
| walk_stop | 1.333 | 17 | no | {} |
| run_start | 1.000 | 13 | no | {} |
| run_stop | 1.000 | 13 | no | {} |
| walk | 2.000 | 24 | yes | {"footfalls": [0, 0.25, 0.5, 0.75]} |
| stalk | 2.667 | 32 | yes | {"footfalls": [0, 0.25, 0.5, 0.75]} |
| run | 1.333 | 16 | yes | {"footfalls": [0.04, 0.18, 0.54, 0.68]} |
| turn_left | 1.667 | 21 | no | {"turn": 0.5} |
| turn_right | 1.667 | 21 | no | {"turn": 0.5} |
| pounce | 2.000 | 25 | no | {"launch": 0.3, "impact": 0.68} |
| claw_left | 1.667 | 21 | no | {"hit": 0.47} |
| claw_right | 1.667 | 21 | no | {"hit": 0.47} |
| claw_combo | 2.667 | 33 | no | {"hit": [0.31, 0.64]} |
| bite | 1.667 | 21 | no | {"hit": 0.5} |
| tail_left | 2.000 | 25 | no | {"hit": 0.55} |
| tail_right | 2.000 | 25 | no | {"hit": 0.55} |
| roar | 2.667 | 33 | no | {"voice": 0.32} |
| breath_start | 1.333 | 17 | no | {"mouth_ready": 1} |
| breath_loop | 2.000 | 24 | yes | {"vfx": "continuous mouth attachment"} |
| breath_end | 1.333 | 17 | no | {"vfx_stop": 0} |
| breath_sweep | 2.667 | 33 | no | {"vfx_start": 0.23, "vfx_stop": 0.77} |
| takeoff | 2.000 | 25 | no | {"liftoff": 0.36} |
| fly | 1.333 | 16 | yes | {"downstroke": 0.25} |
| hover | 1.667 | 20 | yes | {"downstroke": 0.25} |
| glide | 2.000 | 24 | yes | {} |
| bank_left | 1.667 | 21 | no | {"bank": 0.5} |
| bank_right | 1.667 | 21 | no | {"bank": 0.5} |
| air_breath | 2.667 | 33 | no | {"vfx_start": 0.25, "vfx_stop": 0.75} |
| land | 2.000 | 25 | no | {"touchdown": 0.68} |
| hit_front | 1.000 | 13 | no | {"recoil": 0.2} |
| hit_left | 1.000 | 13 | no | {"recoil": 0.2} |
| hit_right | 1.000 | 13 | no | {"recoil": 0.2} |
| stagger | 2.000 | 25 | no | {"stumble": 0.35} |
| recover | 2.000 | 25 | no | {} |
| death | 3.000 | 37 | no | {"collapse": 0.55, "hold": 1} |
| death_alt | 3.333 | 41 | no | {"collapse": 0.6, "hold": 1} |

Locomotion start/stop handoffs use phase zero. Breath start/loop/end and idle/takeoff/fly/land transitions are checked against actual deformed mesh poses. Death variants settle into a held pose. Turns change facing by 45 degrees and hand off to the corresponding neighboring facing.

All actions use full-body rendering because this wyvern’s wing forelimbs carry ground support. Arbitrary flat sprite region blending is not enabled. The editable skeletal actions can support new blended variants later.
