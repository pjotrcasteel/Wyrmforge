// Real published Blazor game; no synthetic snapshots or replacement rendering.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(process.env.WEB_ROOT||'../published/wwwroot');
const mode=process.env.CAPTURE_MODE||'after';
const output=path.resolve('docs/playtesting/combat-recovery/evidence',mode);
fs.mkdirSync(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.ogg':'audio/ogg','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{
 let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/Wyrmforge\//,'/');
 let file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep))file=path.join(root,'index.html');
 if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(root,'index.html');
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
 res.setHeader('Cache-Control','no-store');fs.createReadStream(file).pipe(res);
});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const errors=[];
const results=[];
let browser;
async function diagnostic(page){return page.evaluate(async()=>{
 const m=await import('./js/arena.js');return m.readArenaDiagnostics(document.querySelector('canvas'));
});}
async function ready(page,url){
 await page.goto(url,{waitUntil:'networkidle'});
 await page.waitForFunction(async()=>{try {const m=await import('./js/arena.js');return !!m.readArenaDiagnostics(document.querySelector('canvas'))?.player;}catch{return false;}},null,{timeout:45000});
 if(mode==='after')assert.equal(await page.evaluate(async()=>{const m=await import('./js/painted-enemies.js');return m.preloadPaintedEnemies();}),true);
}
async function capture(base,name,route){
 const context=await browser.newContext({viewport:{width:1000,height:900},recordVideo:{dir:output,size:{width:1000,height:900}}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(name+': '+m.text());});
 try { await ready(page,base+route);await wait(1500);await page.screenshot({path:path.join(output,name+'-full.png')});console.log(name,'URL',page.url(),'canvases',await page.locator('canvas').count(),'body',(await page.locator('body').innerText()).slice(0,350)); }
 catch(error) { await page.screenshot({path:path.join(output,name+'-failure.png')});fs.writeFileSync(path.join(output,name+'-failure.txt'),await page.locator('body').innerText());throw error; }
 await page.locator('canvas').screenshot({path:path.join(output,name+'.png')});
 const start=await diagnostic(page);assert.equal(start.renderingFailed,false);
 await wait(5000);const end=await diagnostic(page);assert.equal(end.active,true);assert.equal(end.renderingFailed,false);
 results.push({name,viewport:{width:1000,height:900},start,end});
 const video=page.video();await context.close();await video.saveAs(path.join(output,name+'.webm'));fs.unlinkSync(await video.path());
 console.log('captured',mode,name);
}
async function aimAcceptance(base,mobile){
 const name=mobile?'mobile-aim':'desktop-aim';
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1000,height:900},hasTouch:mobile,isMobile:mobile,recordVideo:{dir:output,size:mobile?{width:390,height:844}:{width:1000,height:900}}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
 await ready(page,base+'enemy-lab?kind=BellWarden&seed=42&autoplay=false&cast=true');
 const initial=await diagnostic(page);const box=await page.locator('canvas').boundingBox();
 if(mobile){
  const cdp=await context.newCDPSession(page);
  const left={id:1,x:box.x+box.width*.2,y:box.y+box.height*.7};
  const right={id:2,x:box.x+box.width*.8,y:box.y+box.height*.5};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left,right]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...left,y:left.y-45},{...right,x:right.x+30}]});
  await wait(350);const held=await diagnostic(page);
  assert.ok(held.player.y<initial.player.y-2,'left thumb moves while right aims');
  assert.ok(Math.hypot(held.aim.x,held.aim.y)>.9,'right thumb supplies independent aim');
  await page.screenshot({path:path.join(output,name+'-held.png')});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(100);
  let released=await diagnostic(page);assert.ok(Math.hypot(released.aim.x,released.aim.y)<.01,'release restores auto');
  await cdp.send('Input.synthesizeTapGesture',{x:right.x,y:right.y,duration:30,gestureSourceType:'touch'});await wait(40);
  const tap=await diagnostic(page);assert.ok(Math.hypot(tap.aim.x,tap.aim.y)>.9,'tap directs aim temporarily');
  await page.screenshot({path:path.join(output,name+'-tap.png')});
  await wait(400);released=await diagnostic(page);assert.ok(Math.hypot(released.aim.x,released.aim.y)<.01,'tap expires');
  results.push({name,initial,held,tap,released,checks:4});
 }else{
  await page.keyboard.down('d');await page.mouse.move(box.x+box.width*.15,box.y+box.height*.65);await page.mouse.down();
  await wait(500);const held=await diagnostic(page);
  assert.ok(held.player.x>initial.player.x+3,'WASD moves while aiming');
  assert.ok(held.aim.x<-.1,'mouse aims opposite movement');
  await page.screenshot({path:path.join(output,name+'-held.png')});
  await page.mouse.up();await page.keyboard.up('d');await wait(150);const released=await diagnostic(page);
  assert.ok(Math.hypot(released.aim.x,released.aim.y)<.01,'mouse release restores auto');
  await page.screenshot({path:path.join(output,name+'-released.png')});
  results.push({name,initial,held,released,checks:3});
 }
 const video=page.video();await context.close();await video.saveAs(path.join(output,name+'.webm'));fs.unlinkSync(await video.path());console.log('passed',name);
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}/`;
 const executablePath=process.env.CHROME_PATH||path.resolve('../chrome-headless-shell-linux64/chrome-headless-shell');
 fs.chmodSync(executablePath,0o755);
 browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const selected=process.env.ACTORS?.split(',');
  if(!process.env.AIM_ONLY){
   for(const [name,kind] of [['hollow','Hollow'],['mire-hound','MireHound'],['whitefang','WhitefangStalker']])if(!selected||selected.includes(name))await capture(base,name,`enemy-lab?kind=${kind}&seed=42&cast=false`);
   if(!selected||selected.includes('ashfang'))await capture(base,'ashfang','hunt-lab?wyrm=Ashfang&ascendant=false&seed=42');
  }
  if(mode==='after'&&!selected){await aimAcceptance(base,false);await aimAcceptance(base,true);}
  assert.deepEqual(errors,[],'no browser errors');
 }finally{
  fs.writeFileSync(path.join(output,process.env.AIM_ONLY?'aim-results.json':process.env.ACTORS?'art-results.json':'results.json'),JSON.stringify({mode,base,results,errors},null,2));
  await browser.close();server.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
