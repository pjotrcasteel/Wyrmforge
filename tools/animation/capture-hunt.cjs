// Actual published Blazor encounter; source JS overlay is this branch's code.
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const published=path.resolve(process.env.WYRMFORGE_PUBLISHED_ROOT||'artifacts/web/wwwroot');
const source=path.resolve(__dirname,'../../src/Wyrmforge.Presentation.Web/wwwroot');
const out=path.resolve(process.env.AN_CAPTURE_DIR||'artifacts/animation-hunt');fs.mkdirSync(out,{recursive:true});
const foundationMode=process.env.AN_FOUNDATION_MODE||'1',bakedSpriteMode=foundationMode==='sprite-walk'||foundationMode==='sprite-claw',expectsGpu=!bakedSpriteMode||process.env.AN_SPRITE_GPU==='1';
const candidate=process.env.AN_CANDIDATE!=='0',width=Number(process.env.AN_WIDTH||390),liveTrail=process.env.AN_SCENE==='trail',selector=liveTrail?'canvas.game-canvas':'.enemy-lab canvas';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.svg':'image/svg+xml','.ogg':'audio/ogg','.mp3':'audio/mpeg','.bin':'application/octet-stream'};
let browser;
const server=http.createServer((req,res)=>{
 const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(route.includes('..')){res.writeHead(403);return res.end();}
 const assetPrefix=foundationMode==='sprite-claw'?'/art/review/animation-foundation-sprite-claw/':foundationMode==='sprite-walk'?'/art/review/animation-foundation-sprite-walk/':'/art/review/animation-foundation-skin/';
 if(process.env.AN_ASSET_ROOT&&route.startsWith(assetPrefix)){
  const asset=path.join(path.resolve(process.env.AN_ASSET_ROOT),route.slice(assetPrefix.length));
  if(fs.existsSync(asset)){res.setHeader('Content-Type',mime[path.extname(asset)]||'application/octet-stream');fs.createReadStream(asset).pipe(res);return;}
 }
 const base=route.startsWith('/js/')||route.startsWith('/art/review/animation-foundation')?source:published;
 let file=path.join(base,route.endsWith('/')?route+'index.html':route);
 if(!path.extname(file)&&!fs.existsSync(file))file=path.join(published,'index.html');
 if(!fs.existsSync(file)){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(Number(process.env.AN_SERVE_PORT||0),'127.0.0.1',r));
 if(process.env.AN_SERVE_ONLY){console.log('AN review server http://127.0.0.1:'+server.address().port);return;}
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage',...(process.env.AN_NO_WEBGL?['--disable-webgl']:[])]});
 const errors=[],consoleErrors=[],failedResources=[];
 const page=await browser.newPage({viewport:{width,height:844},isMobile:process.env.AN_MOBILE==='1',hasTouch:process.env.AN_MOBILE==='1',deviceScaleFactor:process.env.AN_MOBILE==='1'?3:1,recordVideo:{dir:out,size:{width,height:844}}});
 page.on('response',response=>{if(response.status()>=400)failedResources.push({url:response.url(),status:response.status()});});
 page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('renderer crash'));
 page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,400));});
 await page.addInitScript(({trail,selector})=>{window.__anCanvasSelector=selector;window.__anModulePath=trail?'/js/arena-performance.js':'/js/arena.js';if(trail){localStorage.setItem('wyrmforge.firstHunt.v1','2');localStorage.setItem('wyrmforge.arcaneBuild.v1',JSON.stringify({Budget:24,Nodes:[]}));localStorage.setItem('wyrmforge.characterSchool.v1','Pyromancer');}},{trail:liveTrail,selector});
 const flags=candidate?'&animationFoundation='+encodeURIComponent(foundationMode)+(expectsGpu?'&arenaGpu=1':''):'';
 const route=liveTrail?`/?${flags.slice(1)}`:`/enemy-lab?kind=Hollow&seed=42&autoplay=false&cast=false&paused=true&entityId=5${flags}`;
 await page.goto(`http://127.0.0.1:${server.address().port}${route}${process.env.AN_CONTACTS?'&animationContacts=1':''}`);
 if(liveTrail){
  await page.locator('#wyrmforge-ignition').waitFor({state:'hidden',timeout:60000});
  await page.getByRole('button',{name:/^START GAME/}).click();await page.getByRole('region',{name:'Town square'}).waitFor({timeout:30000});
  await page.getByRole('button',{name:/^BEGIN (FIRST )?HUNT$/}).click();
  await page.getByRole('button',{name:'Enter Free Play',exact:true}).click();await page.locator('.gate-action--primary').click();await page.locator('.gate-lineage--fire').click();await page.locator('.gate-tier--ready').click();
  await page.locator('button.route-node.available').first().click();await page.getByRole('button',{name:/^Enter (rare )?trail$/}).click();
 }

 await page.locator(selector).waitFor({timeout:60000});
 await page.locator('#wyrmforge-ignition').waitFor({state:'hidden',timeout:60000});
 if(candidate)await page.waitForFunction(async ({noWebgl,gpu})=>{
  const m=await import(window.__anModulePath??'/js/arena.js'),d=m.readArenaDiagnostics(document.querySelector(window.__anCanvasSelector));
  return d?.hollow?.foundation?.ready===true&&(!gpu|| (noWebgl?d?.gpuWorld?.error:d?.gpuWorld?.backend));
 },{noWebgl:Boolean(process.env.AN_NO_WEBGL),gpu:expectsGpu},{timeout:60000});
 if(process.env.AN_INSPECTION&&!expectsGpu)throw Error('GPU inspection is not a source-lit spritesheet acceptance test');
 // Capture the actual mobile play surface, rather than spending most of the
 // portrait video on developer controls above it. No layout or art is changed.
 if(!liveTrail)await page.locator(selector).evaluate(canvas=>canvas.scrollIntoView({block:'start'}));
 if(process.env.AN_INSPECTION)await page.evaluate(async view=>{
  const m=await import(window.__anModulePath??'/js/arena.js');m.setArenaLightingInspection(document.querySelector(window.__anCanvasSelector),view);
  const label=document.createElement('div');label.textContent='DEVELOPER '+view.toUpperCase()+' INSPECTION / ACTUAL C# ENCOUNTER';
  label.style='position:fixed;bottom:0;left:0;background:#fff;color:#000;font:11px sans-serif;padding:5px;z-index:9999';document.body.appendChild(label);
 },process.env.AN_INSPECTION);
 await page.evaluate(async()=>{
  const m=await import(window.__anModulePath??'/js/arena.js');window.__anTrace=[];
  window.__anTraceTimer=setInterval(()=>{const d=m.readArenaDiagnostics(document.querySelector(window.__anCanvasSelector));if(d)window.__anTrace.push({at:performance.now(),simulationTimeSeconds:d.simulationTimeSeconds,enemies:d.enemies,player:d.player,hollow:d.hollow,performance:d.performance,gpuWorld:d.gpuWorld});},50);
 });
 if(candidate&&bakedSpriteMode&&!process.env.AN_INSPECTION)await page.evaluate(({gpu,claw})=>{const label=document.createElement('div');label.textContent=claw?'SOURCE-LIT BAKED WHOLE-BODY CLAW / NOT ACCEPTED':gpu?'BAKED SPRITE MATERIALS / SHARED GPU / EXISTING ATTACK FALLBACK':'SOURCE-LIT BAKED SPRITESHEET WALK PROOF / EXISTING ATTACK FALLBACK';label.style='position:fixed;bottom:0;left:0;background:#fff;color:#000;font:11px sans-serif;padding:5px;z-index:9999';document.body.appendChild(label);},{gpu:expectsGpu,claw:foundationMode==='sprite-claw'});
 const initial=await page.evaluate(async()=>{const m=await import(window.__anModulePath??'/js/arena.js');return m.readArenaDiagnostics(document.querySelector(window.__anCanvasSelector));});
 fs.writeFileSync(path.join(out,'initial-diagnostics.json'),JSON.stringify(initial,null,2));
 await page.screenshot({path:path.join(out,'hunt-ready.png')});
 // Keep genuine C# Canvas frames without surrounding developer controls.
 // No image generation, fake sprites, layout manipulation or art acceptance.
 await page.locator(selector).screenshot({path:path.join(out,'hunt-canvas-ready.png')});
 if(!liveTrail)await page.getByRole('button',{name:'Resume',exact:true}).click();
 await page.locator(selector).focus();
 await page.waitForTimeout(2500);
 for(const [key,duration] of [['ArrowRight',1300],['ArrowUp',1100],['ArrowLeft',1800],['ArrowDown',900]]){
  await page.keyboard.down(key);await page.waitForTimeout(duration);await page.keyboard.up(key);await page.waitForTimeout(350);
 }
 await page.waitForTimeout(2000);
 await page.screenshot({path:path.join(out,'hunt-passby.png')});
 await page.locator(selector).screenshot({path:path.join(out,'hunt-canvas-passby.png')});
 const trace=await page.evaluate(()=>{clearInterval(window.__anTraceTimer);return window.__anTrace;});
 fs.writeFileSync(path.join(out,'motion-trace.json'),JSON.stringify(trace,null,2));
 fs.writeFileSync(path.join(out,'browser-errors.json'),JSON.stringify({errors,consoleErrors,failedResources},null,2));
 const fallbackCanvasPixels=process.env.AN_NO_WEBGL?await page.evaluate(selector=>{const c=document.querySelector(selector),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let lit=0;for(let i=0;i<p.length;i+=4)if(p[i]+p[i+1]+p[i+2])lit++;return lit;},selector):null;
 const video=await page.video().path();await page.close();await browser.close();server.close();

 const summary={foundationMode,representation:!candidate?'default-production-sprites':bakedSpriteMode?'baked-full-body-sprites':'source-skin-research',contactMeasurement:!candidate?'candidate markers not active':bakedSpriteMode?'unsnapped source markers; not evaluated skin soles':'source-skin diagnostics',expectedWebglUnavailable:Boolean(process.env.AN_NO_WEBGL),fallbackCanvasPixels,scene:liveTrail?'real-first-trail':'real-development-encounter',mobileEmulated:process.env.AN_MOBILE==='1',candidate,inspection:process.env.AN_INSPECTION??'lit',physicalDevice:false,viewport:{width,height:844},samples:trace.length,solveFailures:trace.flatMap(r=>r.hollow.entities.filter(e=>e.foundationError).map(e=>({time:r.simulationTimeSeconds,error:e.foundationError}))),maximumProjectedSoleDrift:Math.max(...trace.flatMap(r=>r.hollow.entities.map(e=>e.foundation?.maxSlip??0))),gpuErrors:trace.filter(r=>r.gpuWorld?.error),video,errors,consoleErrors,failedResources};
 summary.maximumNativeMarkerSlip=candidate&&bakedSpriteMode?Math.max(0,...trace.flatMap(r=>r.hollow.entities.map(e=>e.foundation?.maxNativeMarkerSlip??0))):null;
 summary.markerContactWithinOneNativePixel=summary.maximumNativeMarkerSlip==null?null:summary.maximumNativeMarkerSlip<=1;
 fs.writeFileSync(path.join(out,'capture-summary.json'),JSON.stringify(summary,null,2));
 if(errors.length||summary.solveFailures.length||(!process.env.AN_NO_WEBGL&&summary.gpuErrors.length)||(process.env.AN_NO_WEBGL&&!fallbackCanvasPixels))throw Error(JSON.stringify(summary));
 console.log(JSON.stringify(summary,null,2));
})().catch(async e=>{console.error(e);await browser?.close();server.close();process.exitCode=1;});
