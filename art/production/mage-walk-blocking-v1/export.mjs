import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {drawView} from '../../motion/walk-reference-v1/render.mjs';
const {createCanvas}=createRequire(import.meta.url)('@napi-rs/canvas');
const cell={width:128,height:128,pivotX:64,pivotY:107.52};
// Rows refer to the projected direction of +Z, not a mirrored character image.
const directions=['S','SE','E','NE','N','NW','W','SW'].map((name,row)=>({name,row,yaw:row*45}));
const states=[['healthy','cleaned'],['hurt','hurt'],['critical','critical']];
const manifest={version:1,status:'motion-blocking',artStyle:'analytical rig; final painted sprites pending',cell,directions,pitchDegrees:25,framesPerDirection:32,framesPerSecond:30,strideDurationSeconds:32/30,injuryVisualOnly:true,staffHand:'right',states:{}};
let frameCount=0,minimumPadding=Infinity;
for(const [name,source] of states){
 const data=JSON.parse(readFileSync(new URL(`../../motion/walk-reference-v1/mage-${source}-motion.json`,import.meta.url)));
 const canvas=createCanvas(32*cell.width,8*cell.height),ctx=canvas.getContext('2d');
 for(const d of directions)for(let frame=0;frame<32;frame++){
  const tile=createCanvas(cell.width,cell.height),tc=tile.getContext('2d');
  drawView(tc,data,frame/32,{x:0,y:0,width:cell.width,height:cell.height,yaw:d.yaw,pitch:25,sprite:true,contacts:false,travel:false});
  const pixels=tc.getImageData(0,0,cell.width,cell.height).data;
  let minX=128,minY=128,maxX=-1,maxY=-1,opaque=0;
  for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(pixels[(y*128+x)*4+3]){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);opaque++;}
  if(!opaque)throw Error(`Empty frame ${name}/${d.name}/${frame}`);
  const padding=Math.min(minX,minY,127-maxX,127-maxY);if(padding<2)throw Error(`Clipped frame ${name}/${d.name}/${frame}: ${padding}`);
  minimumPadding=Math.min(minimumPadding,padding);
  ctx.drawImage(tile,frame*128,d.row*128);frameCount++;
 }
 const filename=`mage-walk-${name}.png`;writeFileSync(new URL(filename,import.meta.url),canvas.toBuffer('image/png'));
 manifest.states[name]={file:filename,width:canvas.width,height:canvas.height,frames:256,durationSeconds:data.duration,source:`mage-${source}-motion.json`};
}
writeFileSync(new URL('./atlas.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');
const report={states:3,directions:8,framesPerDirection:32,totalFrames:frameCount,transparentBackground:true,minimumNontransparentPixelPadding:minimumPadding,noMirroring:true,sharedPivot:cell,sameTimingAcrossInjuryStates:true};
writeFileSync(new URL('./export-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(report);
