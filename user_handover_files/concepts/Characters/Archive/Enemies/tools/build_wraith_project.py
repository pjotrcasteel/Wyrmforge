from pathlib import Path
from PIL import Image
import struct as s,zlib,zipfile,hashlib
r=Path(__file__).parent;o=r/'Drowned-Wraith-Aseprite';o.mkdir(exist_ok=True)
items=[('Colour','c2518ebc-5fb1-4c95-a35c-ec41cd240041',True),('Height_DRAFT','eed2260e-467e-462a-8466-b4da39966e78',False),('Emissive_DRAFT','13f81879-f734-4fd8-848e-4cfc991de255',False),('Ambush_Reference_UNSLICED','51e7a49a-7fa5-4dee-aa51-1a1a447b73f8',False)]
chunks=[];dims=[]
def chunk(t,b):return s.pack('<IH',len(b)+6,t)+b
for i,(name,uid,visible) in enumerate(items):
 p=r/'generated_images'/f'exec-{uid}.png';im=Image.open(p).convert('RGBA');w,h=im.size;dims.append((w,h))
 n=name.encode();chunks.append(chunk(0x2004,s.pack('<HHHHHHB',3 if visible else 2,0,0,0,0,0,255)+bytes(3)+s.pack('<H',len(n))+n))
 chunks.append(chunk(0x2005,s.pack('<HhhBHh',i,0,0,255,2,0)+bytes(5)+s.pack('<HH',w,h)+zlib.compress(im.tobytes())))
 if i in (1,2):(o/(name+'.png')).write_bytes(p.read_bytes())
w=max(x[0] for x in dims);h=max(x[1] for x in dims);b=b''.join(chunks);frame=s.pack('<IHHHHI',len(b)+16,0xF1FA,len(chunks),100,0,0)+b
head=bytearray(128);s.pack_into('<IHHHHH',head,0,len(frame)+128,0xA5E0,1,w,h,32);s.pack_into('<I',head,14,1);s.pack_into('<H',head,18,100);head[36]=head[37]=1
project=o/'Drowned-Wraith-source-study.aseprite';project.write_bytes(head+frame)
d=project.read_bytes();pos=144
for c in chunks:
 size,t=s.unpack_from('<IH',d,pos);assert len(c)==size
 if t==0x2005:
  cw,ch=s.unpack_from('<HH',d,pos+22);assert len(zlib.decompress(d[pos+26:pos+size]))==cw*ch*4
 pos+=size
assert pos==len(d)==s.unpack_from('<I',d)[0]
