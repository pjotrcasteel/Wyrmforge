const {chromium}=require('C:/Users/Pjotr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const out=path.resolve(process.argv[2]),base=process.argv[3]||'http://127.0.0.1:4190';fs.mkdirSync(out,{recursive:true});const b=await chromium.launch({channel:'msedge',headless:true});
 try{
 const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/enemy-lab?kind=Ashling&seed=42&autoplay=false&cast=false');await p.locator('#wyrmforge-ignition').waitFor({state:'hidden'});await p.locator('.enemy-lab canvas').waitFor();
 await p.evaluate(async()=>window.__ashling=await import(new URL('js/arena.js',document.baseURI).href));
 await p.waitForFunction(()=>window.__ashling.readArenaDiagnostics(document.querySelector('.enemy-lab canvas'))?.ashling.entities.some(e=>e.clip==='attack'&&e.frame<4));
 await p.locator('.enemy-lab canvas').focus();await p.evaluate(()=>{window.__samples=[];window.__timer=setInterval(()=>{const d=window.__ashling.readArenaDiagnostics(document.querySelector('.enemy-lab canvas'));window.__samples.push({ashling:d.ashling,renderingFailed:d.renderingFailed});},25);});
 let n=0;
 for(const key of ['ArrowRight','ArrowUp','ArrowLeft']){
  await p.keyboard.down(key);
  for(let i=0;i<4;i++){await p.waitForTimeout(60);await p.screenshot({path:path.join(out,`turn-${String(n++).padStart(2,'0')}.png`)});}
  await p.keyboard.up(key);
 }
 const samples=await p.evaluate(()=>{clearInterval(window.__timer);return window.__samples;});const attacks=samples.flatMap(d=>d.ashling.entities).filter(e=>e.clip==='attack');
 await p.getByRole('button',{name:'Pause',exact:true}).click();await p.waitForTimeout(150);const read=()=>p.evaluate(()=>window.__ashling.readArenaDiagnostics(document.querySelector('.enemy-lab canvas')).ashling);
 const before=await read();await p.waitForTimeout(300);const after=await read();const pauseStable=JSON.stringify(before)===JSON.stringify(after);
 await p.setViewportSize({width:320,height:844});await p.screenshot({path:path.join(out,'ashling-320.png'),fullPage:true});
 const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 const directions=[...new Set(attacks.map(e=>e.direction))],frames=[...new Set(attacks.map(e=>e.frame))],baseFrames=[...new Set(attacks.map(e=>e.baseFrame))];
 const result={passed:errors.length===0&&!overflow&&pauseStable&&directions.length>1&&frames.length>3&&attacks.every(e=>!e.layered)&&!samples.some(d=>d.renderingFailed),errors,overflow320:overflow,pauseStable,directions,frames,baseFrames,fullBody:true,samples};
 fs.writeFileSync(path.join(out,'turning-report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,samples:undefined}));if(!result.passed)process.exitCode=1;
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

