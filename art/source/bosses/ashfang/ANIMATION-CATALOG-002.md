# Aggressive Ashfang animation catalog

41 source actions on the original 112-bone rig. Source 24 fps; samples 12 fps; 8 independent directions; 7,736 directional frames. Performance revision 002 follows owner feedback; no owner acceptance or runtime integration implied.

| Action | Seconds | Frames/view | Loop | Events |
|---|---:|---:|---|---|
| idle | 2.000 | 24 | yes | {} |
| alert | 2.000 | 24 | yes | {} |
| look | 3.000 | 36 | yes | {} |
| alert_start | 1.000 | 13 | no | {} |
| alert_end | 1.000 | 13 | no | {} |
| walk_start | 1.333 | 17 | no | {} |
| walk_stop | 1.333 | 17 | no | {} |
| run_start | 1.000 | 13 | no | {} |
| run_stop | 1.167 | 15 | no | {} |
| walk | 2.000 | 24 | yes | {"footfalls": [0, 0.25, 0.5, 0.75]} |
| stalk | 2.667 | 32 | yes | {"footfalls": [0, 0.25, 0.5, 0.75]} |
| run | 1.167 | 14 | yes | {"footfalls": [0.04, 0.18, 0.54, 0.68]} |
| turn_left | 1.667 | 21 | no | {"turn": 0.5} |
| turn_right | 1.667 | 21 | no | {"turn": 0.5} |
| pounce | 2.000 | 25 | no | {"launch": 0.3, "impact": 0.68} |
| claw_left | 1.667 | 21 | no | {"hit": 0.48} |
| claw_right | 1.667 | 21 | no | {"hit": 0.48} |
| claw_combo | 2.667 | 33 | no | {"hit": [0.33, 0.67]} |
| bite | 1.667 | 21 | no | {"hit": 0.45} |
| tail_left | 2.000 | 25 | no | {"hit": 0.55} |
| tail_right | 2.000 | 25 | no | {"hit": 0.55} |
| roar | 3.333 | 41 | no | {"voice": 0.3} |
| breath_start | 1.333 | 17 | no | {"mouth_ready": 1} |
| breath_loop | 2.000 | 24 | yes | {"vfx": "continuous mouth attachment"} |
| breath_end | 1.333 | 17 | no | {"vfx_stop": 0} |
| breath_sweep | 2.667 | 33 | no | {"vfx_start": 0.23, "vfx_stop": 0.77} |
| takeoff | 2.333 | 29 | no | {"liftoff": 0.38, "downstroke": 0.46} |
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
| death | 4.000 | 49 | no | {"collapse": 0.56, "hold": 0.85} |
| death_alt | 4.333 | 53 | no | {"collapse": 0.56, "hold": 0.85} |

Run stride 5.4 model units per 1.167s versus the previous 3.4 per 1.333s. Turns retain their legal 45-degree heading contract. Attack-event markers remain presentation data for later C# integration.

Roughly twice-readable movement is the performance target, not a uniform joint multiplier. Peak limb/head excursion and acceleration vary by action. See reviews/motion-library-014/performance-measures.json and PERFORMANCE-PASS.md.
