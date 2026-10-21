"""Reference-visible review and editable raster masters; no animation claims."""
from pathlib import Path
import sys,json,zipfile,io
from xml.etree.ElementTree import Element,SubElement,tostring
import numpy as np,cv2
from PIL import Image,ImageDraw

folder=Path(sys.argv[1]);out=folder/'card-review-v1';out.mkdir(exist_ok=False)
reference=Image.open(folder.parent/'references-v4/pixel-idle-reference.png').convert('RGBA');canvas=Image.new('RGBA',(1024,576));canvas.paste(reference.resize((924,460),Image.Resampling.NEAREST),(50,58))
reference_mask=np.asarray(canvas.getchannel('A'))>127
colours=np.asarray(reference)[:,:,:3][np.asarray(reference)[:,:,3]>127];palette=Image.fromarray(colours[None]).quantize(colors=64)
board=Image.new('RGB',(1280,1040),(43,42,45));draw=ImageDraw.Draw(board);reports=[]
panels=[('REFERENCE / ORIGINAL CARD PIXELS',canvas)]
for source in sorted(folder.glob('card-art-*.png')):
    image=Image.open(source).convert('RGB');rgb=np.asarray(image);inner=cv2.erode(reference_mask.astype('uint8'),np.ones((7,7),np.uint8))>0;outer=cv2.dilate(reference_mask.astype('uint8'),np.ones((21,21),np.uint8))>0
    mask=np.full(reference_mask.shape,cv2.GC_BGD,np.uint8);mask[outer]=cv2.GC_PR_BGD;mask[reference_mask]=cv2.GC_PR_FGD;mask[inner]=cv2.GC_FGD
    bg=np.zeros((1,65),np.float64);fg=bg.copy();cv2.grabCut(cv2.cvtColor(rgb,cv2.COLOR_RGB2BGR),mask,None,bg,fg,6,cv2.GC_INIT_WITH_MASK)
    alpha=np.isin(mask,[cv2.GC_FGD,cv2.GC_PR_FGD]);sprite=image.convert('RGBA');sprite.putalpha(Image.fromarray(alpha.astype('uint8')*255));sprite.save(out/(source.stem+'-master.png'))
    clustered=sprite.resize((256,144),Image.Resampling.LANCZOS);pixel_master=clustered.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE).convert('RGBA');pixel_master.putalpha(clustered.getchannel('A').point(lambda a:255 if a>=128 else 0));pixel_master.save(out/(source.stem+'-pixel-master.png'));pixel_master.resize((1024,576),Image.Resampling.NEAREST).save(out/(source.stem+'-pixel-inspection.png'))
    # Editable paint layer and a hidden immutable card-reference layer.
    stack=Element('image',{'w':'1024','h':'576','name':'Ashfang card-guided art master'});layers=SubElement(stack,'stack')
    SubElement(layers,'layer',{'name':'Local art candidate','src':'data/art.png','opacity':'1.0','visibility':'visible','composite-op':'svg:src-over','x':'0','y':'0'})
    SubElement(layers,'layer',{'name':'Original card reference / immutable guide','src':'data/reference.png','opacity':'1.0','visibility':'hidden','composite-op':'svg:src-over','x':'0','y':'0'})
    with zipfile.ZipFile(out/(source.stem+'.ora'),'w',zipfile.ZIP_DEFLATED) as z:
        z.writestr('mimetype','image/openraster');z.writestr('stack.xml',tostring(stack))
        for name,picture in [('data/art.png',sprite),('data/reference.png',canvas),('mergedimage.png',sprite)]:
            buffer=io.BytesIO();picture.save(buffer,format='PNG');z.writestr(name,buffer.getvalue())
    reports.append(dict(source=source.name,referenceSilhouetteIoU=float((alpha&reference_mask).sum()/max(1,(alpha|reference_mask).sum())),ownerAccepted=False,styleAccepted=False,rigged=False))
    panels.append((source.stem+' / LOCAL REFERENCE-GUIDED ART',sprite))
for i,(label,picture) in enumerate(panels):
    x=i%2*640;y=i//2*520;draw.text((x+15,y+12),label,fill=(238,210,177));large=picture.resize((640,360),Image.Resampling.LANCZOS);board.paste(large,(x,y+30),large)
    small=picture.resize((96,54),Image.Resampling.LANCZOS);native=small.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE).convert('RGBA');native.putalpha(small.getchannel('A').point(lambda a:255 if a>=128 else 0));native.save(out/('reference-native.png' if i==0 else panels[i][0].split(' /')[0]+'-native.png'))
    enlarged=native.resize((192,108),Image.Resampling.NEAREST);board.paste(enlarged,(x+15,y+400),enlarged);draw.text((x+225,y+425),'96px camera-width check / shown 2x',fill=(220,200,175));draw.text((x+225,y+446),'Large master above / no rig or animation yet',fill=(220,200,175))
board.save(out/'card-comparison.png');(out/'review.json').write_text(json.dumps(dict(stage='2.5D raster art master; not an animated source or accepted design',masterResolution=[1024,576],nativeReviewResolution=[96,54],candidates=reports,automatedArtAcceptance=False),indent=2)+'\n')
