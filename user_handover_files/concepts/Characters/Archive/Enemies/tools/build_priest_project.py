from pathlib import Path
from PIL import Image
import struct as s,zlib,zipfile,hashlib
r=Path(__file__).parent;o=r/'Ash-Priest-Aseprite';o.mkdir(exist_ok=True)
items=[('Colour','7cd80f4d-b792-4209-8da0-d7ee83989129',True),('Height_DRAFT','a9d7c2b1-a43d-430e-b0a1-b29c2e686e44',False),('Emissive_DRAFT','15765b9b-4a93-4658-a72c-4a62618159e5',False),('Cast_Reference_UNSLICED','b16b89d6-f889-4579-988d-eca9a36a8a76',False)]
chunks=[];dims=[]
def chunk(t,b):return s.pack('<IH',len(b)+6,t)+b
for i,(name,uid,visible) in enumerate(items):
 p=r/'generated_images'/f'exec-{uid}.png';im=Image.open(p).convert('RGBA');w,h=im.size;dims.append((w,h))
 n=name.encode();chunks.append(chunk(0x2004,s.pack('<HHHHHHB',3 if visible else 2,0,0,0,0,0,255)+bytes(3)+s.pack('<H',len(n))+n))
 chunks.append(chunk(0x2005,s.pack('<HhhBHh',i,0,0,255,2,0)+bytes(5)+s.pack('<HH',w,h)+zlib.compress(im.tobytes())))
 if i in (1,2):(o/(name+'.png')).write_bytes(p.read_bytes())
w=max(x[0] for x in dims);h=max(x[1] for x in dims);b=b''.join(chunks);frame=s.pack('<IHHHHI',len(b)+16,0xF1FA,len(chunks),100,0,0)+b
head=bytearray(128);s.pack_into('<IHHHHH',head,0,len(frame)+128,0xA5E0,1,w,h,32);s.pack_into('<I',head,14,1);s.pack_into('<H',head,18,100);head[36]=head[37]=1
project=o/'Ash-Priest-source-study.aseprite';project.write_bytes(head+frame)
d=project.read_bytes();pos=144
for c in chunks:
 size,t=s.unpack_from('<IH',d,pos);assert len(c)==size
 if t==0x2005:
  cw,ch=s.unpack_from('<HH',d,pos+22);assert len(zlib.decompress(d[pos+26:pos+size]))==cw*ch*4
 pos+=size
assert pos==len(d)==s.unpack_from('<I',d)[0]
