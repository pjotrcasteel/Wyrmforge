from pathlib import Path
from PIL import Image
import struct as s,zlib,zipfile,hashlib
r=Path(__file__).parent;o=r/'Bell-Warden-Aseprite';o.mkdir(exist_ok=True)
items=[('Normal_Colour_Smash_REFERENCE', '9dca9ff5-788a-47c3-8c7e-c45c5ab11157', False), ('Normal_Height_DRAFT', '6722ec54-053f-4caa-a779-eef6c75d3c8c', False), ('Normal_Emissive_DRAFT', '037a0048-a94f-4ecb-9892-f5717f3374f9', False), ('Molten_Colour_Turnaround', '5ad2b4f9-e9fa-435e-8afe-d4f64171b5e7', True), ('Molten_Height_DRAFT', '240238ee-80c7-4d33-ac96-90c26ae1d34d', False), ('Molten_Emissive_DRAFT', '6a61921c-32b3-41af-81e3-6ea45ba4760b', False), ('Normal_Toll_TOP3ROWS_ONLY', 'ac0a52bd-ab17-4664-a314-17e33f3d9e41', False), ('Normal_Rally_TOP3ROWS_ONLY', '38564488-35be-44e6-a081-add2dbcb5d6d', False), ('Molten_Smash_UNSLICED', 'aa9ed9c7-0c75-409b-8674-81873415ea9b', False), ('Molten_Toll_UNSLICED', 'afebf220-7b7a-4bb0-a4c6-37ff9f93eb70', False), ('Molten_Rally_UNSLICED', '5028711c-aef7-4ba6-8e1f-f5e79f70c406', False), ('Transformation_UNSLICED', '19ce783e-0946-4b6f-bdbc-4a39d0cd758b', False)]
chunks=[];dims=[]
def chunk(t,b):return s.pack('<IH',len(b)+6,t)+b
for i,(name,uid,visible) in enumerate(items):
 p=r/'generated_images'/f'exec-{uid}.png';im=Image.open(p).convert('RGBA');w,h=im.size;dims.append((w,h))
 n=name.encode();chunks.append(chunk(0x2004,s.pack('<HHHHHHB',3 if visible else 2,0,0,0,0,0,255)+bytes(3)+s.pack('<H',len(n))+n))
 chunks.append(chunk(0x2005,s.pack('<HhhBHh',i,0,0,255,2,0)+bytes(5)+s.pack('<HH',w,h)+zlib.compress(im.tobytes())))
 if name.endswith("_DRAFT"):(o/(name+'.png')).write_bytes(p.read_bytes())
w=max(x[0] for x in dims);h=max(x[1] for x in dims);b=b''.join(chunks);frame=s.pack('<IHHHHI',len(b)+16,0xF1FA,len(chunks),100,0,0)+b
head=bytearray(128);s.pack_into('<IHHHHH',head,0,len(frame)+128,0xA5E0,1,w,h,32);s.pack_into('<I',head,14,1);s.pack_into('<H',head,18,100);head[36]=head[37]=1
project=o/'Bell-Warden-both-forms-source-study.aseprite';project.write_bytes(head+frame)
d=project.read_bytes();pos=144
for c in chunks:
 size,t=s.unpack_from('<IH',d,pos);assert len(c)==size
 if t==0x2005:
  cw,ch=s.unpack_from('<HH',d,pos+22);assert len(zlib.decompress(d[pos+26:pos+size]))==cw*ch*4
 pos+=size
assert pos==len(d)==s.unpack_from('<I',d)[0]
