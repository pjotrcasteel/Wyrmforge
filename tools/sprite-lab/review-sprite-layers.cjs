/* Real compositor, existing PNG bytes; technical visual gate before gameplay. */
const {chromium}=require('C:/Users/Pjotr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const out=path.resolve(process.argv[2]);fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage();await page.goto('http://127.0.0.1:8766/sprite-lab/');
 const result=await page.evaluate(async()=>{
  const {createSpriteLayerCompositor}=await import('/js/sprite-layer-compositor.js');
  const base='/art/enemies/hollow-rigged/';const manifest=await fetch(base+'manifest.json').then(r=>r.json());
  const metadata=await fetch(base+'layers.json').then(r=>r.json());const images=new Map();
  for(const [name,clip] of Object.entries(manifest.clips)){const image=new Image();image.src=base+clip.image;await image.decode();images.set(name,image);}
  const compositor=createSpriteLayerCompositor(metadata,manifest.clips,images);
  const phases=[3,5,7,8,10,13];const frames=[];
  for(let phase=0;phase<16;phase++){
   const board=document.createElement('canvas');board.width=128*4;board.height=144*2;
   const ctx=board.getContext('2d');ctx.fillStyle='#16141b';ctx.fillRect(0,0,board.width,board.height);ctx.imageSmoothingEnabled=false;
   metadata.directions.forEach((direction,row)=>{
    const x=row%4*128,y=Math.floor(row/4)*144;ctx.fillStyle='#cdbfae';ctx.font='12px monospace';ctx.fillText(direction,x+4,y+13);
    const tile=compositor.compose({direction,baseClip:'walk',baseFrame:(phase+4)%16,clip:'attack',frame:phase,baseRegion:'support',actionRegion:'action',useBasePose:phase===0||phase===15});
    ctx.drawImage(tile,x,y+16);
   });
   frames.push(board.toDataURL('image/png'));
  }
  const sheet=document.createElement('canvas');sheet.width=128*phases.length;sheet.height=144*8;
  const ctx=sheet.getContext('2d');ctx.fillStyle='#16141b';ctx.fillRect(0,0,sheet.width,sheet.height);ctx.imageSmoothingEnabled=false;
  metadata.directions.forEach((direction,row)=>{
   ctx.fillStyle='#cdbfae';ctx.font='12px monospace';ctx.fillText(direction,4,row*144+13);
   phases.forEach((phase,column)=>ctx.drawImage(compositor.compose({direction,baseClip:'walk',baseFrame:(phase+4)%16,clip:'attack',frame:phase,baseRegion:'support',actionRegion:'action'}),column*128,row*144+16));
  });
  return {frames,sheet:sheet.toDataURL('image/png'),stats:compositor.stats,bytes:compositor.estimatedBytes()};
 });
 for(let i=0;i<16;i++)fs.writeFileSync(path.join(out,`blend-${String(i).padStart(2,'0')}.png`),Buffer.from(result.frames[i].split(',')[1],'base64'));
 fs.writeFileSync(path.join(out,'contact-poses.png'),Buffer.from(result.sheet.split(',')[1],'base64'));
 console.log(JSON.stringify({stats:result.stats,cacheBytes:result.bytes}));await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
