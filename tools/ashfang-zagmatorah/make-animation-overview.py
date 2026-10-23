"""A labeled, actual-frame motion overview with authored world-travel grid."""
from pathlib import Path
import json,math,argparse
from PIL import Image,ImageDraw,ImageFont
parser=argparse.ArgumentParser();parser.add_argument('--input',nargs='+',default=['artifacts/ashfang/motion-library-008/full-render','artifacts/ashfang/motion-library-008/full-render-b']);parser.add_argument('--clips',default='run,claw_right,bite,roar,takeoff,death');parser.add_argument('--title',default='AGGRESSIVE PERFORMANCE REVISION');parser.add_argument('--output',default='art/source/bosses/ashfang/reviews/motion-library-008');args=parser.parse_args();roots=[Path(p) for p in args.input];clips={}
for root in roots:
 for name,c in json.loads((root/'render-manifest.json').read_text())['clips'].items():clips[name]=(root,c)
names=args.clips.split(',');assert len(names)==6;out=Path(args.output);out.mkdir(parents=True,exist_ok=True);font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',18);small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',14)
def panel(name,t):
 root,c=clips[name];period=c['duration']+(0 if c['loop'] else .3);cycle=math.floor(t/period);phase=min(t%period,c['duration']);idx=min(c['frameCount']-1,math.floor(phase*12+1e-7));r=c['directions']['SE'][idx];im=Image.open(root/r['path']).convert('RGBA');bg=Image.new('RGBA',(512,512),(30,37,45,255));d=ImageDraw.Draw(bg);px,py=r['pivot'];travel=cycle*c['travelPerCycle']+r['rootMotion'];az=math.radians(135)
 def point(x,y):return(px+(-math.sin(az)*(x+travel)+math.cos(az)*y)*512/22,py+(math.cos(az)*(x+travel)+math.sin(az)*y)/math.sqrt(3)*512/22)
 for k in range(-30,31,2):d.line([point(k,-30),point(k,30)],fill=(43,52,62),width=1);d.line([point(-30,k),point(30,k)],fill=(43,52,62),width=1)
 bg.alpha_composite(im);tile=Image.new('RGB',(360,390),(19,24,30));tile.paste(bg.convert('RGB').resize((360,360),Image.Resampling.LANCZOS),(0,30));ImageDraw.Draw(tile).text((12,6),name.replace('_',' ').upper(),font=font,fill=(239,210,173));return tile
frames=[]
for f in range(72):
 canvas=Image.new('RGB',(1080,850),(19,24,30));d=ImageDraw.Draw(canvas);d.text((16,9),'ASHFANG | '+args.title,font=font,fill=(244,219,185))
 for i,name in enumerate(names):canvas.paste(panel(name,f/12),((i%3)*360,36+(i//3)*390))
 d.text((16,835),'Actual source frames | 8-direction sheets | Fire and smoke remain game VFX',font=small,fill=(174,182,189));frames.append(canvas)
palette=frames[0].quantize(colors=256);palframes=[f.quantize(palette=palette,dither=Image.Dither.NONE) for f in frames];palframes[0].save(out/'motion-overview.gif',save_all=True,append_images=palframes[1:],duration=83,loop=0,optimize=True,disposal=2)
cover=frames[0].copy()
for i,name in enumerate(names):cover.paste(panel(name,clips[name][1]['duration']*{'run':.25,'claw_right':.38,'bite':.44,'roar':.45,'takeoff':.48,'death':.6,'fly':.25,'land':.65,'death_alt':.92}.get(name,.5)),((i%3)*360,36+(i//3)*390))
cover.save(out/'motion-overview.jpg',quality=92);print('OVERVIEW_SAVED',(out/'motion-overview.gif').stat().st_size)
