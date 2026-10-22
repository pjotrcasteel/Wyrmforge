"""Register the contact-entry study without replacing earlier reviewed exports."""
from pathlib import Path
import json
base=Path('art/source/enemies/ashfang/restart-2026-10-21')
page=base/'motion-review.html'
text=page.read_text(encoding='utf-8')
text=text.replace('<button data-clip="breath"', '<button data-clip="entry" aria-pressed="false">Idle → stalk</button><button data-clip="breath"',1)
text=text.replace('const clips={idle:', "const clips={entry:{src:'idle-stalk-entry-001/entry-atlas.png',w:320,h:192,n:160,fps:24,once:true,ref:'action-reference-001/stalk-original.png',note:'Planted idle into accelerating stalk. Foot anchors stay in world space through support; original textures deform through the shared rig. One-shot entry only; stopping and breath entry remain unfinished.'},idle:",1)
text=text.replace('playing=true;', "playing=true,entryRoots=[];fetch('idle-stalk-entry-001/contact-track.json').then(r=>r.json()).then(track=>entryRoots=track.map(f=>f.root));",1)
text=text.replace('clock=0;frame=0;', "clock=0;frame=0;playing=true;$('play').textContent='Pause';",1)
text=text.replace('frame/current.n*(current.travel||0)*3','(current.once?(entryRoots[frame]||0):frame/current.n*(current.travel||0))*3',1)
text=text.replace('frame=Math.floor(clock*current.fps/1000)%current.n', "const next=Math.floor(clock*current.fps/1000);frame=current.once?Math.min(next,current.n-1):next%current.n;if(current.once&&next>=current.n){playing=false;$('play').textContent='Replay'}",1)
text=text.replace("$('play').onclick=()=>{playing=!playing;", "$('play').onclick=()=>{if(current.once&&frame===current.n-1){clock=0;frame=0;}playing=!playing;",1)
page.write_text(text,encoding='utf-8')
production=Path('art/source/enemies/ashfang/production.json')
p=json.loads(production.read_text());p['locomotionEntryStudy']='restart-2026-10-21/idle-stalk-entry-001';p['remaining'][0]='Complete stalk stopping and breath entry; idle-to-stalk contact-entry study exists but is not accepted.'
production.write_text(json.dumps(p,indent=2)+'\n')
with (base/'README.md').open('a') as f:
 f.write('''

## 22 October: planted locomotion entry

idle-stalk-entry-001 exports 160 actual frames at 24 fps. It starts supported,
ramps body pose and actor travel, and releases each paw into swing independently.
World-space contact anchors prevent stance joints sliding while root speed changes.
No rendered-image crossfade is used. contact-track.json preserves root travel,
pose blend and foot contacts; skin-source.json preserves the editable mesh weights.
The gallery plays this entry once and uses its actual root travel for the grid.

Local RTX 5090 render: minimum triangle area ratio 0.287 (no flips), no unreachable
targets, maximum joint contact drift below 4e-14 source pixels. Contact-sheet review
retains card silhouette; this is not owner acceptance or proof of raster contact.
The initial supported hold, acceleration and first foot releases still need motion
review. This is an entry, not a complete idle/walk/stop controller. Stopping,
breath entry, collapse, flight and additional directions remain unfinished.
Current main checked at 1e630566; no shipped files changed.
''')
