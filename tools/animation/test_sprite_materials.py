"""Synthetic material-marker checks; never character art or visual acceptance."""
import hashlib,json,subprocess,sys,tempfile
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[2]
with tempfile.TemporaryDirectory(dir=root/'artifacts',prefix='sprite-material-test-') as temp:
 p=Path(temp);pack=p/'pack';materials=p/'materials';pack.mkdir();materials.mkdir();directions=['N','NE','E','SE','S','SW','W','NW']
 atlas=Image.new('RGBA',(32,128));cell=Image.new('RGBA',(96,96));cell.putpixel((48,48),(80,90,100,255))
 for row,d in enumerate(directions):
  for f in range(2):atlas.paste(cell.crop((40,40,56,56)),(f*16,row*16))
  for mode,color in [('albedo',(80,90,100,255)),('normal',(128,128,255,255)),('emissive',(255,30,2,255))]:
   folder=materials/mode/'walk'/d;folder.mkdir(parents=True)
   for f in range(2):
    image=Image.new('RGBA',(96,96));image.putpixel((48,48),color);image.save(folder/f'{f:02d}.png')
 atlas.save(pack/'walk.png');manifest={'directions':directions,'sourceBlendSha256':'a'*64,'clips':{'walk':{'frames':2,'cell':96,'columns':2,'crop':[40,40,56,56],'image':'walk.png','sha256':hashlib.sha256((pack/'walk.png').read_bytes()).hexdigest()}}}
 (pack/'manifest.json').write_text(json.dumps(manifest));(pack/'profile.json').write_text('{}')
 receipt={'sourceBlendSha256':'a'*64,'directions':directions,'cell':96,'normalBasis':'camera-right/up/toward','normalBasisVersion':2,'cyclesCameraToNormalBasis':[1,1,-1],'clips':['walk'],'modes':['albedo','normal','emissive']}
 def run(label):
  (materials/'material-receipt.json').write_text(json.dumps(receipt))
  return subprocess.run([sys.executable,str(root/'tools/animation/pack_sprite_materials.py'),str(pack),'--materials',str(materials),'--out',str(p/label)],capture_output=True,text=True)
 good=run('good');assert good.returncode==0,good.stderr
 result=json.loads((p/'good/manifest.json').read_text());clip=result['clips']['walk']
 assert clip['colorRole']=='albedo' and set(clip['materials'])=={'normal','emissive'} and result['decodedTextureBytes']==32*128*4*3
 assert not result['productionReady']
 receipt['sourceBlendSha256']='b'*64;bad=run('wrong-source');assert bad.returncode and 'Blender mismatch' in bad.stderr
 receipt['sourceBlendSha256']='a'*64
 image=Image.open(materials/'normal/walk/N/00.png');image.putpixel((48,48),(128,128,255,0));image.save(materials/'normal/walk/N/00.png')
 bad=run('wrong-alpha');assert bad.returncode and 'alpha mismatch' in bad.stderr
 print('SPRITE_MATERIAL_PASS primary-albedo budget, source provenance and exact alpha rejection')
