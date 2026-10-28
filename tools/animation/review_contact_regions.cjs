// Source QA only. Reuses the real shared compositor and kinematics modules.
const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('src/Wyrmforge.Presentation.Web/wwwroot');
const metadata=path.resolve(process.argv[2]||'artifacts/contact-regions-study/contact-regions.json');
const output=path.resolve('artifacts/contact-region-review');fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{const route=new URL(req.url,'http://localhost').pathname;let file;
 if(route==='/metadata')file=metadata;
 else if(route==='/atlas')file=path.join(root,'art/review/animation-foundation/walk.png');
 else if(route.startsWith('/js/')&&!route.includes('..'))file=path.join(root,route);
 else{res.setHeader('Content-Type','text/html');return res.end('<body style="background:#14151b;color:#eee;font:16px sans-serif"><h2>Contact-region SOURCE QC — not Hunt integration or art acceptance</h2><main style="display:grid;grid-template-columns:repeat(4,256px)"></main></body>');}
 if(!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',route==='/atlas'?'image/png':route.startsWith('/js/')?'text/javascript':'application/json');fs.createReadStream(file).pipe(res);
});
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{const page=await browser.newPage({viewport:{width:1060,height:650}});await page.goto(`http://127.0.0.1:${server.address().port}/`);
 const result=await page.evaluate(async()=>{
  const {createSpriteLayerCompositor}=await import('/js/sprite-layer-compositor.js');const {retargetSourceContactRegion}=await import('/js/sprite-contact-kinematics.js');
  const metadata=await (await fetch('/metadata')).json(),image=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src='/atlas';});
  const compositor=createSpriteLayerCompositor(metadata,{walk:{cell:96,frames:16}},new Map([['walk',image]]));const measurements=[];
  for(const direction of ['S','E'])for(const frameIndex of [0,4,8,12]){
   const frame=metadata.clips.walk[direction][frameIndex],parts=[],markers=[];
   for(const c of Object.values(frame.sourceContacts)){
    const source=frame.sourceBones,target=c.sourceContact.map((v,i)=>v+(i===0?.02:0));
    const solved=retargetSourceContactRegion({...c,upper:source[c.upper],lower:source[c.middle],end:source[c.end],targetContact:target,projection:frame.projection,maxCorrection:.03});
    parts.push(...[[c.upper,solved.upperTransform],[c.middle,solved.lowerTransform],[c.end,solved.endTransform]].map(([region,transform])=>({clip:'walk',frame:frameIndex,direction,region,transform})));
    markers.push(solved.projectedContact);measurements.push({direction,frame:frameIndex,contact:c.id,flexDegrees:solved.flexDegrees,correctionMetres:solved.correctionDistance});
   }
   parts.push({clip:'walk',frame:frameIndex,direction,region:'body',transform:[1,0,0,1,0,0]});const tile=compositor.compose({parts});
   const container=document.createElement('div'),label=document.createElement('div');label.textContent=`${direction}, pose ${frameIndex}: 2cm source contact correction`;container.append(label);
   const canvas=document.createElement('canvas');canvas.width=canvas.height=128;canvas.style='width:256px;height:256px;image-rendering:pixelated';const ctx=canvas.getContext('2d');ctx.drawImage(tile,0,0);ctx.strokeStyle='#72ffd6';
   for(const [x,y] of markers){ctx.beginPath();ctx.arc(x,y,1.5,0,Math.PI*2);ctx.stroke();}container.append(canvas);document.querySelector('main').append(container);
  }
  return {sourceQCOnly:true,rigSignature:metadata.sourceSignature,measurements,compositorStats:compositor.stats};
 });fs.writeFileSync(path.join(output,'source-region-results.json'),JSON.stringify(result,null,2));await page.screenshot({path:path.join(output,'source-region-correction.png')});console.log(JSON.stringify(result));
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
