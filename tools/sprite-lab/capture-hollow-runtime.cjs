/* Inspect the published C#/canvas game, not a standalone animation mockup. */
const {chromium}=require('C:/Users/Pjotr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const output=path.resolve(process.argv[2]);const base=(process.argv[3]||'http://127.0.0.1:4183/').replace(/\/$/,'');
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const errors=[];const assets=new Set();page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().includes('/hollow-rigged/')&&r.ok())assets.add(new URL(r.url()).pathname);});
 const diagnostics=async()=>page.evaluate(async()=>{const m=await import(new URL('js/arena.js',document.baseURI).href);return m.readArenaDiagnostics(document.querySelector('.enemy-lab canvas'));});
 await page.goto(base+'/enemy-lab?kind=Hollow&seed=42&autoplay=true&cast=false');
 const attach=async()=>{await page.locator('.enemy-lab canvas').waitFor({state:'visible'});await page.locator('#wyrmforge-ignition').waitFor({state:'hidden'});await page.evaluate(async()=>{window.__hollowArena=await import(new URL('js/arena.js',document.baseURI).href);});};
 await attach();
 const wait=async(clip)=>page.waitForFunction(clip=>{
  const canvas=document.querySelector('.enemy-lab canvas');if(!canvas)return false;
  const d=window.__hollowArena.readArenaDiagnostics(canvas);
  return d?.hollow.ready&&!d.renderingFailed&&d.hollow.entities.some(p=>p.clip===clip&&p.frame>0);
 },clip,{timeout:45000});
 await wait('walk');const walk=await diagnostics();await page.screenshot({path:path.join(output,'hollow-walk-390.png'),fullPage:true});
 await page.goto(base+'/enemy-lab?kind=Hollow&seed=42&autoplay=false&cast=false');await attach();
 await wait('attack');const attack=await diagnostics();await page.screenshot({path:path.join(output,'hollow-attack-390.png'),fullPage:true});
 await page.goto(base+'/enemy-lab?kind=Hollow&seed=42&autoplay=false&cast=true');
 await attach();
 await page.waitForFunction(()=>{
  const canvas=document.querySelector('.enemy-lab canvas');if(!canvas)return false;
  const d=window.__hollowArena.readArenaDiagnostics(canvas);
  return d?.hollow.ready&&d.hollow.corpses.some(p=>p.frame>=4&&p.frame<=15);
 },null,{timeout:45000});
 const collapse=await diagnostics();await page.screenshot({path:path.join(output,'hollow-collapse-390.png'),fullPage:true});
 await page.waitForFunction(()=>{
  const d=window.__hollowArena.readArenaDiagnostics(document.querySelector('.enemy-lab canvas'));
  return d?.hollow.corpses.some(p=>p.age>2&&p.age<3&&p.frame===23);
 });
 const held=await diagnostics();await page.screenshot({path:path.join(output,'hollow-held-corpse-390.png'),fullPage:true});
 await page.getByRole('button',{name:'Pause',exact:true}).click();await page.waitForTimeout(150);
 const pausedBefore=await diagnostics();await page.waitForTimeout(400);const pausedAfter=await diagnostics();
 const pauseStable=JSON.stringify(pausedBefore.hollow.corpses)===JSON.stringify(pausedAfter.hollow.corpses);
 const result={base,errors,assets:[...assets],walk:walk.hollow,attack:attack.hollow,collapse:collapse.hollow,held:held.hollow,pauseStable,
  renderingFailed:[walk,attack,collapse,held].some(d=>d.renderingFailed),performance:attack.performance};
 result.passed=errors.length===0&&['manifest.json','walk.png','attack.png','death.png'].every(name=>[...assets].some(url=>url.endsWith('/'+name)))&&pauseStable&&!result.renderingFailed;
 fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 await browser.close();if(!result.passed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
