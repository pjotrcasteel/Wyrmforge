// Actual published Blazor encounter; source JS overlay is this branch's code.
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const published=path.resolve(process.env.WYRMFORGE_PUBLISHED_ROOT||'artifacts/web/wwwroot');
const source=path.resolve(__dirname,'../../src/Wyrmforge.Presentation.Web/wwwroot');
const out=path.resolve(process.env.AN_CAPTURE_DIR||'artifacts/animation-hunt');fs.mkdirSync(out,{recursive:true});
const candidate=process.env.AN_CANDIDATE!=='0',width=Number(process.env.AN_WIDTH||390);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.svg':'image/svg+xml','.ogg':'audio/ogg','.mp3':'audio/mpeg','.bin':'application/octet-stream'};
let browser;
const server=http.createServer((req,res)=>{
 const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(route.includes('..')){res.writeHead(403);return res.end();}
 if(process.env.AN_ASSET_ROOT&&route.startsWith('/art/review/animation-foundation-skin/')){
  const asset=path.join(path.resolve(process.env.AN_ASSET_ROOT),route.slice('/art/review/animation-foundation-skin/'.length));
  if(fs.existsSync(asset)){res.setHeader('Content-Type',mime[path.extname(asset)]||'application/octet-stream');fs.createReadStream(asset).pipe(res);return;}
 }
 const base=route.startsWith('/js/')||route.startsWith('/art/review/animation-foundation-skin/')?source:published;
 let file=path.join(base,route.endsWith('/')?route+'index.html':route);
 if(!path.extname(file)&&!fs.existsSync(file))file=path.join(published,'index.html');
 if(!fs.existsSync(file)){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
 const errors=[],consoleErrors=[];
 const page=await browser.newPage({viewport:{width,height:844},recordVideo:{dir:out,size:{width,height:844}}});
 page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('renderer crash'));
 page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,400));});
 const flags=candidate?'&animationFoundation=1&arenaGpu=1':'';
 await page.goto(`http://127.0.0.1:${server.address().port}/enemy-lab?kind=Hollow&seed=42&autoplay=false&cast=false&paused=true&entityId=5${flags}${process.env.AN_CONTACTS?'&animationContacts=1':''}`);
 await page.locator('.enemy-lab canvas').waitFor({timeout:60000});
 await page.locator('#wyrmforge-ignition').waitFor({state:'hidden',timeout:60000});
 if(candidate)await page.waitForFunction(async()=>{
  const m=await import('/js/arena.js'),d=m.readArenaDiagnostics(document.querySelector('.enemy-lab canvas'));
  return d?.hollow?.foundation?.ready===true&&d?.gpuWorld?.backend;
 },{},{timeout:60000});
 if(process.env.AN_INSPECTION)await page.evaluate(async view=>{
  const m=await import('/js/arena.js');m.setArenaLightingInspection(document.querySelector('.enemy-lab canvas'),view);
  const label=document.createElement('div');label.textContent='DEVELOPER '+view.toUpperCase()+' INSPECTION / ACTUAL C# ENCOUNTER';
  label.style='position:fixed;bottom:0;left:0;background:#fff;color:#000;font:11px sans-serif;padding:5px;z-index:9999';document.body.appendChild(label);
 },process.env.AN_INSPECTION);
 await page.evaluate(async()=>{
  const m=await import('/js/arena.js');window.__anTrace=[];
  window.__anTraceTimer=setInterval(()=>{const d=m.readArenaDiagnostics(document.querySelector('.enemy-lab canvas'));if(d)window.__anTrace.push({at:performance.now(),simulationTimeSeconds:d.simulationTimeSeconds,enemies:d.enemies,player:d.player,hollow:d.hollow,performance:d.performance,gpuWorld:d.gpuWorld});},50);
 });
 const initial=await page.evaluate(async()=>{const m=await import('/js/arena.js');return m.readArenaDiagnostics(document.querySelector('.enemy-lab canvas'));});
 fs.writeFileSync(path.join(out,'initial-diagnostics.json'),JSON.stringify(initial,null,2));
 await page.screenshot({path:path.join(out,'hunt-ready.png')});
 await page.getByRole('button',{name:'Resume',exact:true}).click();
 await page.locator('.enemy-lab canvas').focus();
 await page.waitForTimeout(2500);
 for(const [key,duration] of [['ArrowRight',1300],['ArrowUp',1100],['ArrowLeft',1800],['ArrowDown',900]]){
  await page.keyboard.down(key);await page.waitForTimeout(duration);await page.keyboard.up(key);await page.waitForTimeout(350);
 }
 await page.waitForTimeout(2000);
 await page.screenshot({path:path.join(out,'hunt-passby.png')});
 const trace=await page.evaluate(()=>{clearInterval(window.__anTraceTimer);return window.__anTrace;});
 fs.writeFileSync(path.join(out,'motion-trace.json'),JSON.stringify(trace,null,2));
 fs.writeFileSync(path.join(out,'browser-errors.json'),JSON.stringify({errors,consoleErrors},null,2));
 const video=await page.video().path();await page.close();await browser.close();server.close();
 const summary={candidate,inspection:process.env.AN_INSPECTION??'lit',physicalDevice:false,viewport:{width,height:844},samples:trace.length,solveFailures:trace.flatMap(r=>r.hollow.entities.filter(e=>e.foundationError).map(e=>({time:r.simulationTimeSeconds,error:e.foundationError}))),maximumProjectedSoleDrift:Math.max(...trace.flatMap(r=>r.hollow.entities.map(e=>e.foundation?.maxSlip??0))),gpuErrors:trace.filter(r=>r.gpuWorld?.error),video,errors,consoleErrors};
 fs.writeFileSync(path.join(out,'capture-summary.json'),JSON.stringify(summary,null,2));
 if(errors.length||summary.solveFailures.length||summary.gpuErrors.length)throw Error(JSON.stringify(summary));
 console.log(JSON.stringify(summary,null,2));
})().catch(async e=>{console.error(e);await browser?.close();server.close();process.exitCode=1;});
