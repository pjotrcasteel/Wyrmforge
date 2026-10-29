// Actual published C# encounter and existing shared GPU. No synthetic scene.
const fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const out=path.resolve(process.env.AN_CAPTURE_DIR||'artifacts/an-baked-sprite-gpu-contract');fs.mkdirSync(out,{recursive:true});
 const server=spawn(process.execPath,[path.join(__dirname,'capture-hunt.cjs')],{env:{...process.env,AN_SERVE_ONLY:'1',AN_SERVE_PORT:'0'},stdio:['ignore','pipe','pipe']});
 let browser;
 try{
  const url=await new Promise((resolve,reject)=>{let log='';server.stdout.on('data',chunk=>{log+=chunk;const match=log.match(/AN review server (http:\/\/127\.0\.0\.1:\d+)/);if(match)resolve(match[1]);});server.once('error',reject);server.once('exit',code=>reject(Error('Review server exited '+code)));});
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
  const results=[];
  for(const width of [320,390]){
   const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+new URL(r.url()).pathname);});
   await page.goto(url+'/enemy-lab?kind=Hollow&seed=42&autoplay=false&cast=false&paused=true&entityId=5&animationFoundation=sprite-walk&arenaGpu=1');
   await page.waitForFunction(async()=>{const m=await import('/js/arena.js'),d=m.readArenaDiagnostics(document.querySelector('.enemy-lab canvas'));return d?.gpuWorld?.bakedSpriteActors>0;},{},{timeout:60000});
   const views={};
   for(const view of ['neutral-lit','albedo','normal','zero-light','neutral-lit']){
    const result=await page.evaluate(async view=>{
     const m=await import('/js/arena.js'),c=document.querySelector('.enemy-lab canvas');m.setArenaLightingInspection(c,view);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
     const d=m.readArenaDiagnostics(c),pixels=m.readArenaLightingPixels(c),[w,h]=d.gpuWorld.framebuffer;let maxRGB=0,nonblack=0;
     for(let i=0;i<pixels.length;i++)if(i%4!==3){maxRGB=Math.max(maxRGB,pixels[i]);if(pixels[i])nonblack++;}
     const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',pixels))].map(v=>v.toString(16).padStart(2,'0')).join('');
     const image=document.createElement('canvas');image.width=w;image.height=h;const ctx=image.getContext('2d'),data=ctx.createImageData(w,h);
     for(let y=0;y<h;y++)data.data.set(pixels.subarray((h-y-1)*w*4,(h-y)*w*4),y*w*4);ctx.putImageData(data,0,0);
     return {maxRGB,nonblack,hash,framebuffer:[w,h],gpu:d.gpuWorld,lighting:d.lighting,png:image.toDataURL('image/png').split(',')[1]};
    },view);
    const label=view==='neutral-lit'&&views[view]?'restored':view;
    fs.writeFileSync(path.join(out,width+'-'+label+'.png'),Buffer.from(result.png,'base64'));delete result.png;views[label]=result;
   }
   const accepted=views['neutral-lit'].nonblack>0&&views.albedo.hash!==views.normal.hash&&views['zero-light'].maxRGB===0&&views.restored.hash===views['neutral-lit'].hash&&errors.length===0;
   results.push({width,physicalDevice:false,scope:'actual paused C# encounter; source-derived sprite materials through shared GPU; no contact/art acceptance',accepted,errors,views});await page.close();
  }
  fs.writeFileSync(path.join(out,'gpu-contract.json'),JSON.stringify({results},null,2));console.log(JSON.stringify(results.map(r=>({width:r.width,accepted:r.accepted,errors:r.errors,zeroMaximum:r.views['zero-light'].maxRGB,restored:r.views.restored.hash===r.views['neutral-lit'].hash})),null,2));
  if(results.some(r=>!r.accepted))process.exitCode=1;
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
