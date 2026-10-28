// Real shared Canvas compositor + sparse solver, synthetic visible-horde workload.
// Not physical-device, real-Hunt GPU, or an aesthetic acceptance check.
const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const pack=path.resolve(process.argv[2]),root=path.resolve('src/Wyrmforge.Presentation.Web/wwwroot');
const server=http.createServer((req,res)=>{
 const route=new URL(req.url,'http://localhost').pathname;
 if(route.includes('..')){res.writeHead(403);return res.end();}
 if(route==='/'){res.setHeader('Content-Type','text/html');return res.end('<canvas width="390" height="844"></canvas>');}
 const file=path.join(route.startsWith('/js/')?root:pack,route.startsWith('/js/')?route:route.slice('/pack/'.length));
 res.setHeader('Content-Type',route.endsWith('.js')?'text/javascript':route.endsWith('.json')?'application/json':'image/png');
 if(!fs.existsSync(file)){res.writeHead(404);return res.end();}fs.createReadStream(file).pipe(res);
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/`);
 const result=await page.evaluate(async()=>{
  const {createCreatureAnimationAssets}=await import('/js/creature-animation-assets.js');
  const assets=createCreatureAnimationAssets(new URL('/pack/',location.href));if(!await assets.preload())throw new Error(assets.error);
  const metadata=await (await fetch('/pack/contact-regions.json')).json(),manifest=assets.manifest;
  const ctx=document.querySelector('canvas').getContext('2d'),times=[],count=500,iterations=60;
  const memoryBefore=performance.memory?.usedJSHeapSize??null;let failures=0;
  for(let tick=0;tick<iterations;tick++){
   const start=performance.now();ctx.clearRect(0,0,390,844);
   for(let i=0;i<count;i++){
    const direction=manifest.directions[i%8],index=(tick+i)%manifest.clips.walk.frames,frame=metadata.clips.walk[direction][index];
    const world={x:(i%15)*26,y:Math.floor(i/15)*24},p=frame.projection,k=manifest.clips.walk.worldSize/manifest.clips.walk.cell,targets={};
    for(const [id,c] of Object.entries(frame.sourceContacts)){
     const v=c.sourceContact;targets[id]={x:world.x+(p[0]*v[0]+p[1]*v[1]+p[2]*v[2]+p[3]-metadata.anchor[0])*k+(i%3-1)*.05,y:world.y+(p[4]*v[0]+p[5]*v[1]+p[6]*v[2]+p[7]-metadata.anchor[1])*k,z:v[2],planted:c.planted};
    }
    const sample={clip:'walk',frame:index,direction,rootOffset:{x:0,y:0}};
    try{const pose=assets.sampleRegions(sample,targets,{world,pixelScale:k,maxCorrection:.01});assets.draw(ctx,pose,world.x,world.y,11);}catch{failures++;}
   }
   times.push(performance.now()-start);
  }
  const sorted=[...times].sort((a,b)=>a-b);return {workload:'500 visible synthetic actors, sparse solve + regional composition + draw at 390x844',iterations,count,meanMs:times.reduce((a,b)=>a+b)/times.length,p95Ms:sorted[Math.floor(sorted.length*.95)],maxMs:Math.max(...times),failures,textureAndCache:assets.stats,memoryBefore,memoryAfter:performance.memory?.usedJSHeapSize??null,userAgent:navigator.userAgent,physicalDevice:false,realHunt:false,gpuAcceptance:false};
 });console.log(JSON.stringify(result,null,2));if(result.failures)process.exitCode=1;
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
