"""Crimson material variant of the accepted dark fire direction; original pixels only."""
from pathlib import Path
import sys,shutil,json
import numpy as np
from PIL import Image

source=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(exist_ok=False)
for path in source.iterdir():
    if path.is_file() and path.suffix in ('.json','.npz'):shutil.copy2(path,out/path.name)
image=Image.open(source/'ashfang-albedo.png').convert('RGB');rgb=np.asarray(image).astype(np.float32)/255
hot=(rgb[:,:,0]>.48)&(rgb[:,:,0]>rgb[:,:,1]*1.6)
bone=(rgb[:,:,0]>.50)&(rgb[:,:,1]>.43)&(rgb[:,:,2]>.25)
surface=~(hot|bone);value=rgb.max(2)
leather=surface&(rgb[:,:,0]>rgb[:,:,1]*1.7)
crimson=np.stack([np.minimum(.24,value*1.55+.012),value*.38,value*.40],2)
crimson[leather,0]=np.minimum(.32,value[leather]*3.2+.02)
crimson[leather,1]=value[leather]*.45;crimson[leather,2]=value[leather]*.40
rgb[surface]=crimson[surface]
rgb[hot,1]*=.50;rgb[hot,2]*=.45
Image.fromarray((rgb.clip(0,1)*255).astype('uint8')).save(out/'ashfang-albedo.png')
profile=json.loads((out/'profile.json').read_text());profile['bodyFireProfile']='crimson-inferno';(out/'profile.json').write_text(json.dumps(profile,indent=2)+'\n')
(out/'crimson-material.json').write_text(json.dumps(dict(source=str(source),direction='Own Ashfang concept: blackened crimson plate surfaces, deep red leather, scarlet molten breaks and larger red fire',bodyGeometryChanged=False,bodyMotionChanged=False,externalAssetsCopied=False,ownerAccepted=False),indent=2)+'\n');print('Crimson surface prepared',out)
