"""WyrmForge - isolated Fireball (unapproved) pixel-material motion-study v5.
Single physical projectile; no gameplay/world rendering or duplicate light engine.
"""
from pathlib import Path
import math, random, struct, zlib
from PIL import Image, ImageDraw

class Tools:
    NAMES=['albedo','emissive','normal','height','cutout']

    @staticmethod
    def color(value):
        value=value.lstrip('#')
        return tuple(int(value[i:i+2],16) for i in (0,2,4))+(255,)

    @staticmethod
    def hash01(x,y,z=0):
        n=(x*73856093)^(y*19349663)^(z*83492791)
        n=(n^(n>>13))*1274126177
        return ((n^(n>>16))&0xffff)/65535

    @staticmethod
    def aseprite_write(frames,output):
        def layer_chunk(name):
            name=name.encode()
            payload=struct.pack('<HHHHHHB3xH',1,0,0,0,0,0,255,len(name))+name
            return struct.pack('<IH',len(payload)+6,0x2004)+payload
        def cel_chunk(index,image):
            payload=struct.pack('<HhhBHh5xHH',index,0,0,255,2,0,W,H)+zlib.compress(image.tobytes(),6)
            return struct.pack('<IH',len(payload)+6,0x2005)+payload
        frames_data=[]
        for i,frame in enumerate(frames):
            chunks=([layer_chunk(name) for name in Tools.NAMES] if i==0 else [])+[
                cel_chunk(j,frame[name]) for j,name in enumerate(Tools.NAMES)]
            data=b''.join(chunks)
            frames_data.append(struct.pack('<IHHH2xI',16+len(data),0xF1FA,len(chunks),83,0)+data)
        raw=b''.join(frames_data);header=bytearray(128)
        struct.pack_into('<IHHHHHIH',header,0,128+len(raw),0xA5E0,len(frames),W,H,32,1,83)
        output.write_bytes(bytes(header)+raw)

w=Tools()
W,H,N=120,72,16
OUT=Path(__file__).resolve().parent
C=(87,36)
P={name:w.color(c) for name,c in {
 'ink':'#11171a','basalt':'#211a1c','char':'#302124','oxide':'#492324','smoke':'#252025',
 'dim':'#66302a','ember':'#9b3225','flame':'#c44a26','orange':'#e16d2a',
 'copper':'#e98d3b','gold':'#f6ab4c','sun':'#ffd074','white':'#fff0b0'}.items()}

def S(i,k):return w.hash01(i,k,37)

def frame(k):
 t=k/N
 out={ch:Image.new('RGBA',(W,H)) for ch in w.NAMES}
 a=ImageDraw.Draw(out['albedo']);e=ImageDraw.Draw(out['emissive'])
 # coherent charcoal vapor and decaying molten shrapnel, carried by the same Fireball
 for i in range(100):
  h0=S(i,9)
  life=(h0+t)%1
  x=C[0]-13-91*life
  phase=i*2.399+life*7
  center=C[1]+4*math.sin((x*.064)+t*math.pi*2)
  y=center+math.sin(phase+t*math.pi*3)*(3+life*17)+(S(i,12)-.5)*(4+life*20)
  r=.7+1.5*S(i,15)*(1-life)
  if x<2 or x>=W-2 or y<3 or y>=H-3:continue
  # smoke is an authored occluding material; never a full-bright pixel by default.
  smokeColor=P['smoke'] if life>.47 else P['oxide'] if i%5<2 else P['char']
  a.rectangle((round(x-r),round(y-r*.8),round(x+r),round(y+r*.8)),fill=smokeColor)
  if i%3!=0 and life<.83:
   heat=P['flame'] if life<.4 else P['ember'] if life<.67 else P['dim']
   e.point((round(x),round(y)),fill=heat)
 # Broken curls of flame: NOT long evenly-spaced streamers.
 for j in range(20):
  age=(S(j,26)+t)%1
  x=75-72*age
  base=C[1]+math.sin(x*.09+t*math.pi*2)*3
  y=base+(S(j,27)-.5)*(7+age*22)
  if 10<x<75:
   length=round(2+8*(1-age)*S(j,28))
   width=1 if age>.5 else 2
   e.line([(int(x),int(y)),(int(x-length*.5),int(y+1.4*math.sin(j+t*math.pi*2))),(int(x-length),int(y-2*math.sin(j*.9)))],
       fill=P['orange'] if age<.33 else P['flame'] if age<.65 else P['ember'],width=width)
 # Several irregular lick masses cling to the main head, frame phase moves their edges.
 for j in range(11):
  cx=74+S(j,37)*13;cy=C[1]+(S(j,34)-.5)*21
  direction=-1 if j%2 else 1
  sway=1.5*math.sin(t*2*math.pi+j*2)
  pts=[(int(cx-6-S(j,30)*8),int(cy+direction*(4+S(j,15)*5))),
       (int(cx-2),int(cy+direction*(2+sway))),
       (int(cx+5),int(cy+direction*2)),
       (int(cx+9),int(cy-direction*2)),(int(cx+4),int(cy-direction*4))]
  a.polygon(pts,fill=P['oxide']);e.polygon(pts,fill=P['flame'] if j%3 else P['orange'])
 # Physical hot core, deliberately irregular polygon. Dark facets interrupt the fire.
 pts=[];theta=2*math.pi*t
 for j in range(42):
  ang=j*2*math.pi/42
  rad=11.2+1.3*math.sin(ang*9+theta)+.9*math.sin(ang*14-theta)
  pts.append((round(C[0]+rad*1.23*math.cos(ang)),round(C[1]+rad*.98*math.sin(ang))))
 mask=Image.new('L',(W,H));ImageDraw.Draw(mask).polygon(pts,fill=255)
 m=mask.load();ap=out['albedo'].load();ep=out['emissive'].load()
 for y in range(C[1]-15,C[1]+16):
  for x in range(C[0]-18,C[0]+19):
   if not m[x,y]:continue
   dx=(x-C[0])/14.;dy=(y-C[1])/12.
   f=math.sqrt(dx*dx+dy*dy)
   grain=.12*math.sin(x*.54+y*.73+t*math.pi*4)+.08*math.sin(x*.98-y*.34+t*math.pi*3)
   # Directional radiant front under a cratered dark-burnt crust.
   if f>.82+grain:
    ap[x,y]=P['basalt'];ep[x,y]=(0,0,0,0)
   elif f>.70+grain:
    ap[x,y]=P['char'];ep[x,y]=P['ember']
   else:
    ap[x,y]=P['oxide']
    val=f + grain -dx*.10
    ep[x,y]=P['white'] if val<.14 else P['sun'] if val<.37 else P['gold'] if val<.56 else P['copper'] if val<.72 else P['orange']
 # Flame's face: asymmetrical jagged cavities near centre, not a smooth smile.
 islands=[[(78,34),(80,29),(85,30),(86,33),(83,36)],[(88,40),(92,41),(93,45),(88,46),(85,44)],[(75,30),(79,29),(81,31),(79,34),(76,33)],[(79,40),(82,39),(84,42),(82,45)]]
 for j,pts in enumerate(islands):
  yy=round(.7*math.sin(theta+j))
  polygon=[(x,y+yy) for x,y in pts]
  a.polygon(polygon,fill=P['basalt']);e.polygon(polygon,fill=(0,0,0,0))
  e.line([polygon[0],polygon[1],polygon[2]],fill=P['orange'] if j%2 else P['gold'],width=1)
 # Crisp fragments break from head and cool as they recede, uneven parallax.
 for j in range(55):
  age=(S(j,77)+t)%1
  x=C[0]-7-age*(71+12*S(j,30))
  y=C[1]+math.sin(j*.78+t*math.pi*2)*(2+age*14)+(S(j,88)-.5)*age*27
  if x<4 or y<4 or y>=H-3:continue
  size= 2 if S(j,89)>.89 and age<.3 else 1
  c=P['sun'] if age<.18 and j%5==1 else P['gold'] if age<.30 and j%4==0 else P['orange'] if age<.50 else P['ember'] if age<.77 else P['dim']
  e.rectangle((round(x),round(y),round(x)+size-1,round(y)+size-1),fill=c)
 # Map separation. Normal/depth only on the solid core and scales, not smoke.
 n=out['normal'].load();h=out['height'].load();cut=out['cutout'].load()
 for y in range(H):
  for x in range(W):
   if ap[x,y][3] or ep[x,y][3]:cut[x,y]=(255,255,255,255)
   if m[x,y]:
    nx=max(-1,min(1,(x-C[0])/15));ny=max(-1,min(1,(y-C[1])/12));nz=math.sqrt(max(.05,1-nx*nx*.5-ny*ny*.5))
    n[x,y]=(int(128+nx*72),int(128-ny*72),int(128+nz*120),255)
    val=max(0,int(210-90*math.sqrt(nx*nx+ny*ny)));h[x,y]=(val,val,val,255)
 return out

def main():
 frames=[frame(k) for k in range(N)]
 for ch in w.NAMES:
  im=Image.new('RGBA',(W*N,H))
  for k,fr in enumerate(frames):im.alpha_composite(fr[ch],(k*W,0))
  im.save(OUT/(ch+'.png'))
 w.aseprite_write(frames,OUT/'base-fireball-v5.aseprite')
 prev=[]
 for fr in frames:
  im=Image.new('RGBA',(W,H),(10,14,19,255));im.alpha_composite(fr['albedo']);im.alpha_composite(fr['emissive']);prev.append(im.resize((W*4,H*4),Image.Resampling.NEAREST).convert('RGB'))
 prev[0].save(OUT/'base-fireball-v5.gif',save_all=True,append_images=prev[1:],loop=0,duration=83,optimize=False)
 print(OUT)
if __name__=='__main__':main()
