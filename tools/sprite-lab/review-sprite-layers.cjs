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
  const phases=[3,5,7,8,10,13];const frames=[];let supportPixelDifferences=0,supportPixelsChecked=0,actionOccludedSupportPixels=0;
  for(let phase=0;phase<16;phase++){
   const board=document.createElement('canvas');board.width=128*4;board.height=144*2;
   const ctx=board.getContext('2d');ctx.fillStyle='#16141b';ctx.fillRect(0,0,board.width,board.height);ctx.imageSmoothingEnabled=false;
   metadata.directions.forEach((direction,row)=>{
    const x=row%4*128,y=Math.floor(row/4)*144;ctx.fillStyle='#cdbfae';ctx.font='12px monospace';ctx.fillText(direction,x+4,y+13);
    const tile=compositor.compose({direction,baseClip:'walk',baseFrame:(phase+4)%16,clip:'attack',frame:phase,baseRegion:'support',actionRegion:'action',useBasePose:phase===0||phase===15});
    const reference=new OffscreenCanvas(128,128),r=reference.getContext('2d');
    const baseFrame=(phase+4)%16;r.drawImage(images.get('walk'),baseFrame*96,row*96,96,96,16,16,96,96);
    const expected=r.getImageData(0,0,128,128).data,actual=tile.getContext('2d').getImageData(0,0,128,128).data;
    // Screen height is not anatomy: a reaching hand can cross the feet.
    // Check every visible support pixel except where the action legitimately
    // occludes it. These masks come from the existing rig's skin ownership.
    const support=metadata.clips.walk[direction][baseFrame],action=metadata.clips.attack[direction][phase];
    const dx=Math.round(support.attachment[0]-action.attachment[0]),dy=Math.round(support.attachment[1]-action.attachment[1]);
    const occluded=new Set();
    if(phase!==0&&phase!==15)for(const [y,x,width] of action.regions.action)for(let n=0;n<width;n++)occluded.add((y+dy)*128+x+n+dx);
    for(const [y,x,width] of support.regions.support)for(let n=0;n<width;n++){
      const pixel=y*128+x+n,i=pixel*4;
      if(occluded.has(pixel)){actionOccludedSupportPixels++;continue;}
      supportPixelsChecked++;if([0,1,2,3].some(c=>expected[i+c]!==actual[i+c]))supportPixelDifferences++;
    }
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
  const detail=document.createElement('canvas');detail.width=1536;detail.height=288;const detailCtx=detail.getContext('2d');detailCtx.imageSmoothingEnabled=false;detailCtx.drawImage(sheet,0,144*3,768,144,0,0,1536,288);
  const durations=[];const target=new OffscreenCanvas(390,844),g=target.getContext('2d');
  for(let f=0;f<90;f++){
    const start=performance.now();g.clearRect(0,0,390,844);
    for(let actor=0;actor<96;actor++){
      const tile=compositor.compose({direction:metadata.directions[actor%8],baseClip:'walk',baseFrame:(f+actor)%16,clip:'attack',frame:(f+Math.floor(actor/8))%16,baseRegion:'support',actionRegion:'action'});
      g.drawImage(tile,actor%8*45-40,Math.floor(actor/8)*65-30);
    }
    durations.push(performance.now()-start);
  }
  durations.sort((a,b)=>a-b);
  return {frames,sheet:sheet.toDataURL('image/png'),detail:detail.toDataURL('image/png'),stats:compositor.stats,bytes:compositor.estimatedBytes(),supportPixelDifferences,supportPixelsChecked,actionOccludedSupportPixels,benchmark:{actors:96,frames:90,medianMilliseconds:durations[45],p95Milliseconds:durations[85]}};
 });
 for(let i=0;i<16;i++)fs.writeFileSync(path.join(out,`blend-${String(i).padStart(2,'0')}.png`),Buffer.from(result.frames[i].split(',')[1],'base64'));
 fs.writeFileSync(path.join(out,'contact-poses.png'),Buffer.from(result.sheet.split(',')[1],'base64'));
 fs.writeFileSync(path.join(out,'se-detail.png'),Buffer.from(result.detail.split(',')[1],'base64'));
 const report={stats:result.stats,cacheBytes:result.bytes,supportPixelDifferences:result.supportPixelDifferences,supportPixelsChecked:result.supportPixelsChecked,actionOccludedSupportPixels:result.actionOccludedSupportPixels,benchmark:result.benchmark};
 fs.writeFileSync(path.join(out,'compositor-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));await browser.close();if(result.supportPixelDifferences!==0||result.stats.allocatedTiles>96)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
