import struct as s,zlib,json
from pathlib import Path
from PIL import Image,ImageDraw
def read(p):
 b=p.read_bytes();size,magic,n,w,h,depth=s.unpack_from('<I5H',b);assert size==len(b) and magic==0xA5E0 and depth==32
 pos=128; layers=[];frames=[];tags=[];raw=[]
 for f in range(n):
  fs,fm,nc,dur=s.unpack_from('<I3H',b,pos);assert fm==0xF1FA
  end=pos+fs;nc=s.unpack_from('<I',b,pos+12)[0] or nc;pos+=16;cels={};chunks=[]
  for _ in range(nc):
   cs,ct=s.unpack_from('<IH',b,pos);d=b[pos+6:pos+cs];chunks.append((ct,d));assert cs>=6
   if ct==0x2004:
    flags,typ,child,_,_,blend=s.unpack_from('<6H',d);ln=s.unpack_from('<H',d,16)[0];layers.append(dict(name=d[18:18+ln].decode(),visible=bool(flags&1),opacity=d[12],blend=blend))
   elif ct==0x2005:
    li,x,y,op,typ=s.unpack_from('<HhhBH',d);assert op==255
    if typ in (0,2):
     cw,ch=s.unpack_from('<HH',d,16);data=zlib.decompress(d[20:]) if typ==2 else d[20:];assert len(data)==cw*ch*4
     im=Image.new('RGBA',(w,h));im.paste(Image.frombytes('RGBA',(cw,ch),data),(x,y));cels[li]=im
    elif typ==1:cels[li]=frames[s.unpack_from('<H',d,16)[0]]['cels'][li].copy()
    else:raise ValueError(typ)
   elif ct==0x2018:
    count=s.unpack_from('<H',d)[0];q=10
    for _ in range(count):
     a,e,di=s.unpack_from('<HHB',d,q);ln=s.unpack_from('<H',d,q+17)[0];name=d[q+19:q+19+ln].decode();tags.append(dict(name=name,start=a,end=e,direction=di));q+=19+ln
   pos+=cs
  assert pos==end and dur>0
  frames.append(dict(duration=dur,cels=cels));raw.append(chunks)
 assert pos==len(b)
 for t in tags:assert 0<=t['start']<=t['end']<n
 return dict(path=str(p),size=[w,h],layers=layers,frames=frames,tags=tags,raw=raw,header=b[:128])
def composite(a,f):
 im=Image.new('RGBA',a['size'])
 for li,l in enumerate(a['layers']):
  if l['blend']!=0 or l['opacity']!=255:raise ValueError('Use the editor exporter for non-normal blend modes or layer opacity')
  if l['visible'] and li in f['cels']:im=Image.alpha_composite(im,f['cels'][li])
 return im
