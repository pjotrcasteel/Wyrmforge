/* Real C# movement and canvas rendering, existing color sheets only. */
const {chromium}=require('C:/Users/Pjotr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const out=path.resolve(process.argv[2]),base=process.argv[3]||'http://127.0.0.1:4184';fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/enemy-lab?kind=Hollow&seed=42&autoplay=false&cast=false');
 await page.locator('.enemy-lab canvas').waitFor();await page.locator('#wyrmforge-ignition').waitFor({state:'hidden'});
 await page.evaluate(async()=>window.__layerArena=await import(new URL('js/arena.js',document.baseURI).href));
 const read=()=>page.evaluate(()=>window.__layerArena.readArenaDiagnostics(document.querySelector('.enemy-lab canvas')));
 await page.waitForFunction(()=>window.__layerArena.readArenaDiagnostics(document.querySelector('.enemy-lab canvas'))?.hollow.entities.some(e=>e.clip==='attack'&&e.frame<4));
 await page.locator('.enemy-lab canvas').focus();await page.keyboard.down('ArrowRight');
 const samples=[];
 let key='ArrowRight';
 for(let i=0;i<12;i++){
  if(i===4||i===8){await page.keyboard.up(key);key=i===4?'ArrowUp':'ArrowLeft';await page.keyboard.down(key);}
  await page.waitForTimeout(60);const d=await read();samples.push(d.hollow);await page.screenshot({path:path.join(out,`combat-${String(i).padStart(2,'0')}.png`)});
 }
 await page.keyboard.up(key);
 const layered=samples.flatMap(d=>d.entities).filter(e=>e.layered&&e.clip==='attack');
 const frames=[...new Set(layered.map(e=>e.baseFrame))],actionFrames=[...new Set(layered.map(e=>e.frame))],directions=[...new Set(layered.map(e=>e.direction))];
 await page.getByRole('button',{name:'Pause',exact:true}).click();await page.waitForTimeout(150);const before=await read();await page.waitForTimeout(300);const after=await read();
 const pauseStable=JSON.stringify(before.hollow.entities)===JSON.stringify(after.hollow.entities);
 const report={passed:errors.length===0&&frames.length>2&&actionFrames.length>2&&directions.length>1&&pauseStable&&!after.renderingFailed,errors,frames,actionFrames,directions,pauseStable,cache:after.hollow.layers,samples};
 fs.writeFileSync(path.join(out,'combat-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,samples:undefined}));
 await browser.close();if(!report.passed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
