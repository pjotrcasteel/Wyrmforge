const {chromium}=require('C:/Users/Pjotr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const out='art/source/bosses/ashfang/reviews/runtime-002/browser';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:402,height:874},deviceScaleFactor:2});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')console.log('PAGE_ERROR',m.text());});page.on('requestfailed',r=>{if(r.url().includes('/ashfang/'))console.log('ASSET_FAILED',r.url(),r.failure());});
  await page.goto('http://127.0.0.1:8880/hunt-lab?wyrm=Ashfang&ascendant=false&play=true&cast=true&invulnerable=true');
  await page.evaluate(async()=>{
   window.arena=await import('/js/arena.js');window.samples=[];window.captured={};window.pendingCapture=null;
   window.readFight=()=>window.arena.readArenaDiagnostics(document.querySelector('.hunt-lab canvas'));
   window.captureTimer=setInterval(()=>{
    const d=window.readFight();if(!d)return;
    window.samples.push({at:d.hud?.seconds,health:d.hud?.health,boss:d.dragon?.health,phase:d.dragon?.phase,action:d.dragon?.action,actionPhase:d.dragon?.actionPhase,flight:d.dragon?.flightStage,fx:d.ashfangVfx,effects:d.ashfangEffects.map(e=>({kind:e.kind,progress:e.progress})),pose:d.ashfang.lastDraw,errors:d.ashfang.errors,renderingFailed:d.renderingFailed});
    if(window.pendingCapture||d.paused)return;
    const p=d.dragon?.actionProgress??0;
    const goals={
     failure:d.renderingFailed||d.ashfang.errors.length>0,
     fire:d.ashfangVfx?.fireStage==='strike'&&p>.25&&p<.7,
     claw:d.ashfangEffects.some(e=>e.kind==='claw_right'&&e.progress<.5),
     rain:d.ashfang.entity?.shadow&&d.huntHazards.some(h=>h.fromAbove&&h.progress>.35&&h.progress<.75),
     landing:d.ashfangEffects.some(e=>e.kind==='landing'&&e.progress<.3),
     enrage:d.hunt?.stage===3,
     death:d.ashfang.death?.age>.5&&d.ashfang.death?.age<3
    };
    for(const [key,active]of Object.entries(goals))if(active&&!window.captured[key]){window.pendingCapture=key;break;}
   },35);
  });
  const captures={};let victory=false;
  for(let i=0;i<12;i++){
   await page.waitForFunction(()=>window.pendingCapture!=null,null,{timeout:100000});
   const key=await page.evaluate(()=>window.pendingCapture);
   await page.getByRole('button',{name:'Ⅱ Pause',exact:true}).click();await page.waitForTimeout(90);
   const d=await page.evaluate(()=>window.readFight());assert(!d.renderingFailed);
   captures[key]={imageErrors:d.ashfang.errors,renderingFailed:d.renderingFailed,time:d.hud.seconds,boss:d.dragon?.health??0,fx:d.ashfangVfx,effects:d.ashfangEffects,pose:d.ashfang.lastDraw};
   if(key==='failure'){fs.writeFileSync(path.join(out,'failure-samples.json'),JSON.stringify(d,null,2));throw Error('Live failure: '+JSON.stringify({images:d.ashfang.errors,render:d.renderingFailed}));}
   await page.locator('.hunt-lab-surface').screenshot({path:path.join(out,key+'-phone.png')});
   if(key==='fire'){
    assert.equal(d.ashfangVfx.fireStage,'strike');const before=JSON.stringify({pose:d.ashfang.entity,effects:d.ashfangEffects});await page.waitForTimeout(300);const still=await page.evaluate(()=>window.readFight());assert.equal(JSON.stringify({pose:still.ashfang.entity,effects:still.ashfangEffects}),before,'pause freezes sprite and effect progress');
    await page.screenshot({path:path.join(out,'live-boss-phone.png'),fullPage:true});
   }
   await page.evaluate(key=>{window.captured[key]=true;window.pendingCapture=null;},key);
   await page.getByRole('button',{name:'▶ Resume',exact:true}).click();
   if(key==='death'){victory=true;break;}
  }
  const samples=await page.evaluate(()=>{clearInterval(window.captureTimer);return window.samples});
  assert(victory,'actual Tier I fight reaches victory');for(const key of ['fire','claw','rain','landing','enrage','death'])assert(captures[key],key+' captured');
  const live=samples.filter(s=>s.boss>0);assert(Math.max(...live.map(s=>s.at))>30,'no four-hit default victory');assert(live.some(s=>s.at>=8&&s.boss>550));
  const bad=samples.filter(s=>s.renderingFailed||s.errors.length);if(bad.length)fs.writeFileSync(path.join(out,'failure-samples.json'),JSON.stringify(bad.slice(0,6),null,2));
  assert(samples.every(s=>!s.renderingFailed&&s.errors.length===0),JSON.stringify(bad.slice(0,2)));assert(samples.every(s=>!s.pose||Math.abs(s.pose.worldCell-448.53076140099125)<.001));
  const layouts=[];
  for(const width of [320,390,402,844]){await page.setViewportSize({width,height:width===844?390:874});await page.waitForTimeout(70);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));layouts.push(width);}
  await page.setViewportSize({width:402,height:874});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:8880/hunt-lab?wyrm=Ashfang&ascendant=false&play=true&cast=false&invulnerable=true');
  await page.evaluate(async()=>{window.arena=await import('/js/arena.js');});
  await page.waitForFunction(()=>{const d=window.arena.readArenaDiagnostics(document.querySelector('.hunt-lab canvas'));return d?.ashfangVfx?.fireStage==='strike';},null,{timeout:45000});
  await page.getByRole('button',{name:'Ⅱ Pause',exact:true}).click();await page.locator('.hunt-lab-surface').screenshot({path:path.join(out,'fire-reduced-motion.png')});
  // Verify default play is not invulnerable and normal rank-I spell is used.
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('http://127.0.0.1:8880/hunt-lab?wyrm=Ashfang&ascendant=false&play=true&cast=true');
  await page.evaluate(async()=>{window.arena=await import('/js/arena.js');});
  await page.waitForFunction(()=>window.arena.readArenaDiagnostics(document.querySelector('.hunt-lab canvas'))?.hud?.spells?.length>0);
  const normal=await page.evaluate(()=>window.arena.readArenaDiagnostics(document.querySelector('.hunt-lab canvas')));assert(normal.hud.spells.some(s=>s.isActive&&s.rank===1&&!s.evolutionName));
  await page.locator('.hunt-lab-options summary').click();assert.equal(await page.getByLabel('Invulnerable practice').isChecked(),false);await page.locator('.hunt-lab-options summary').click();
  await page.waitForFunction(()=>window.arena.readArenaDiagnostics(document.querySelector('.hunt-lab canvas'))?.ended,null,{timeout:35000});
  const defeated=await page.evaluate(()=>window.arena.readArenaDiagnostics(document.querySelector('.hunt-lab canvas')));assert.equal(defeated.hud.health,0);assert(defeated.dragon.health>0);
  assert.equal(errors.length,0,errors.join('\n'));
  fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify({pass:true,actualCSharpCombat:true,loadout:'Tier I rank1 no evolution',health:1100,victory:true,captures,simulationSeconds:Math.max(...samples.map(s=>s.at??0)),samples:samples.length,layouts,reducedMotion:true,pauseFreezesEffects:true,manualDefaultFullDamage:true,standingStillLoses:true,physicalPhoneAcceptance:false,errors},null,2));
  console.log('ASHFANG_BOSS_ITERATION_PASS',Object.keys(captures).join(','),Math.max(...samples.map(s=>s.at??0)));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
