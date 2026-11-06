from pathlib import Path
from PIL import Image
import struct as s,zlib,zipfile,hashlib
r=Path(__file__).parent;o=r/'Ashling-Aseprite';o.mkdir(exist_ok=True)
items=[('Colour','22f62f51-4656-4424-8eb0-2ebde87024b6',True),('Height_DRAFT','2c5e06e8-0a79-4e6c-9e3e-c5de73fcbb62',False),('Emissive_DRAFT','35694b30-997e-4bf4-8545-ef8b00da0a42',False),('Attack_Reference_UNSLICED','be18f285-d51c-478c-b374-f49bc95c0225',False)]
chunks=[];dims=[]
def chunk(t,b):return s.pack('<IH',len(b)+6,t)+b
for i,(name,uid,visible) in enumerate(items):
 p=r/'generated_images'/f'exec-{uid}.png';im=Image.open(p).convert('RGBA');w,h=im.size;dims.append((w,h))
 n=name.encode();chunks.append(chunk(0x2004,s.pack('<HHHHHHB',3 if visible else 2,0,0,0,0,0,255)+bytes(3)+s.pack('<H',len(n))+n))
 chunks.append(chunk(0x2005,s.pack('<HhhBHh',i,0,0,255,2,0)+bytes(5)+s.pack('<HH',w,h)+zlib.compress(im.tobytes())))
 if i in (1,2):(o/(name+'.png')).write_bytes(p.read_bytes())
w=max(x[0] for x in dims);h=max(x[1] for x in dims);b=b''.join(chunks);frame=s.pack('<IHHHHI',len(b)+16,0xF1FA,len(chunks),100,0,0)+b
head=bytearray(128);s.pack_into('<IHHHHH',head,0,len(frame)+128,0xA5E0,1,w,h,32);s.pack_into('<I',head,14,1);s.pack_into('<H',head,18,100);head[36]=head[37]=1
project=o/'Ashling-source-study.aseprite';project.write_bytes(head+frame)
d=project.read_bytes();pos=144
for c in chunks:
 size,t=s.unpack_from('<IH',d,pos);assert len(c)==size
 if t==0x2005:
  cw,ch=s.unpack_from('<HH',d,pos+22);assert len(zlib.decompress(d[pos+26:pos+size]))==cw*ch*4
 pos+=size
assert pos==len(d)==s.unpack_from('<I',d)[0]
archive=r/'Wyrmforge-Fire-Tier-1-Mobs.zip';base='Wyrmforge-Fire-Tier-1-Mobs/'
with zipfile.ZipFile(archive) as z:entries={n:z.read(n) for n in z.namelist()}
with zipfile.ZipFile(r/'Hollowed-Material-Study.zip') as z:
 for n in z.namelist():entries[base+'Hollowed/aseprite/'+Path(n).name]=z.read(n)
for p in o.iterdir():entries[base+'Ashling/aseprite/'+p.name]=p.read_bytes()
entries[base+'tools/build_ashling_project.py']=Path(__file__).read_bytes()
for p in r.glob('*-original-concept.png'):entries[base+'source-concepts/'+p.name]=p.read_bytes()
handover='''# Wyrmforge mob artwork handover for Claude

## Goal and delivery status
Continue transforming the approved gothic mob artwork into genuine low-resolution animated Aseprite assets for the existing Wyrmforge game. This archive is the consolidated delivery; all prior artwork remains preserved. Do not describe these generated sheets as finished runtime sprites.

Two editable Aseprite SOURCE STUDIES exist: Hollowed and Ashling. Both have a SINGLE timeline frame containing complete source sheets, NOT sliced animations. Height and Emissive are hidden draft layers. Ashling also includes the complete attack sheet as a hidden unsliced reference layer. Canvas sizes retain generated source resolution and are NOT 32x32. Do not export the whole source-study canvas as a runtime frame. Files were structurally checked (chunk sizes and decompressed RGBA cels), not opened in Aseprite.

## Approved art selection
- Hollowed: human rabid undead, not rabbit. Use hollowed-front-side-back.png and attacks/claw-swipe.png. Rabbit, simplified and earlier detailed drafts are history only.
- Ashling: ashling-approved-front-side-back.png; feral goblin/animal, low crouch, muzzle, torn ears, scorched oxblood flesh, ember eyes/cracks. Approximately half Hollowed height. Attack pounce-rake.png has drifted toward a heavier spiny beast; reconcile to approved turnaround before production rather than silently replacing approved identity.
- Ash Priest: ragged oxblood hood/robes, skull-like goblinoid face, horn stubs, lantern staff, bells; support heal/resurrection cast.
- Ash Slinger: feral Ashling-like ember thrower, basket, right throwing hand; projectile separate.
- Mire Hound: approved SECOND cleaned attack sheet lunging-bite-approved.png, matching gaunt canine turnaround.
- Penitent: ONLY corrected pale hood, visible skull, ragged pale tabard, left shield and lowered right sword. Use corrected turnaround and shield-bash-corrected.png. Earlier masked brute and fiery Penitent second form are superseded. Implemented Penitent has no second phase.
- Bell Warden: original concept has right-hand bell and left-hand chained lantern. Use normal Smash and TOP THREE rows of normal Toll/Rally source sheets; their bottom rows are obsolete subtle phase two. Use phase-2-approved-front-side-back.png and the three phase-2-approved attack sheets plus transformation-approved.png for the approved exaggerated molten phase two. See its README. Earlier two-handed-bell concept is superseded.
- Drowned Wraith: approved blue-grey drowned female spirit with wet hair, chains, cross, ragged spectral dress; use turnaround and emerge-strike-retreat.png.
- Reliquary and Ashfang have not been created in this package. Check original repository concepts before starting them.

## Aseprite production workflow
Start with Hollowed, then Ashling. Inspect actual PNG alpha, locate each character/frame, slice into consistent cells and establish ground/root anchors. Generated sheet layouts are approximate; do not assume exact equal cells. Preserve full source sheets on reference layers. Work at a true logical pixel resolution, 32x32-inspired for common mobs; larger miniboss cells allowed. Do not simply downscale an entire sheet and call it finished.

Author/clean each animation pose so anatomy, equipment handedness and volume remain consistent. Fix clipped edges, stray colored/alpha pixels and frame-size drift. Create tags such as attack_front, attack_side, attack_back with consistent timing; derive timing from authoritative C# attack contracts. Side faces right. Add idle/walk/hit/death animations later; those are not yet complete here. No automatic horizontal flip when asymmetric equipment changes sides. Review actual looping GIF/MP4 at native and mobile scale; still contact sheets do not prove animation quality.

## Material layers and engine contract
Colour/albedo, Height and Emissive must be pixel-registered for EVERY final frame. Current generated material maps are approximate REFERENCE DRAFTS with contour/position drift, not production maps. Preserve them for guidance but author final maps from locked geometry.
- Height means local surface relief, not world elevation or simply grayscale brightness. Knee holes, light teeth or ember light must not become tall merely because bright. Hollowed height study still has this problem at the knee tear.
- Derive normals from final authored relief with the engine's actual coordinate convention and physical scale. Verify light directions before export. Inspect current engine material loader; do not guess shader channels or introduce a separate lighting pipeline.
- Emissive black=off, colored pixels specify emission colour. ONLY eyes, ember wounds, lantern interiors, hot bell cracks and intentional flames emit. Ashling red skin is not all emissive. Map intensity is separate from the dynamic light emitter's energy/radius. Emissive glow alone does not illuminate nearby terrain.
- Keep material maps linear where required by current engine conventions; verify colour-space handling and alpha edges. Roughness/specular can be added based on engine support.
- Separate body/equipment layers in cleaned projects; current source studies retain flattened reference art and do not already provide isolated body/equipment cels.

## Combat source of truth
Repository https://github.com/pjotrcasteel/Wyrmforge . Inspect AGENTS.md and current code before implementation. PenitentBehaviorState owns directional blocking, shield bash and guard break. BellWardenBehaviorState owns Smash, Toll, Rally and half-health crack. Bell Warden cycle Smash/Toll/Smash/Rally; cracked toll fans into three lanes and gaps shorten. Fire exaggeration is approved VISUAL art direction, not permission to add unimplemented damage. Drowned Wraith concept includes extra moves that may not exist in code; implement animations for current authoritative behavior first. C# owns damage, movement, timings and encounter rules; visual effects cannot invent hits.

## Remaining verification
No runtime integration, performance proof, animation playback validation or actual mobile in-game captures have been completed for these assets. Only eight mobs have artwork folders. Make honest status reports, provide images/playback for visual approval, preserve source art, and update this single archive or its repository-backed source coherently.
'''
entries[base+'CLAUDE-HANDOVER.md']=handover.encode()
entries[base+'CONTENTS.sha256']=''.join(hashlib.sha256(b).hexdigest()+'  '+n+'\n' for n,b in sorted(entries.items())).encode()
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for n,b in entries.items():z.writestr(n,b)
with zipfile.ZipFile(archive) as z:assert z.testzip() is None
print('Verified',len(entries),'archive entries; layered Ashling project',w,h)
