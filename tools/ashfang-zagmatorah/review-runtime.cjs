const {chromium}=require('C:/Users/Pjotr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
const out='art/source/bosses/ashfang/reviews/runtime-001';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
const page=await browser.newPage({viewport:{width:402,height:874},deviceScaleFactor:2});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8880/hunt-lab?wyrm=Ashfang&ascendant=false&play=true&cast=false');
await page.evaluate(async()=>{window.runtimeArena=await import('/js/arena.js');window.runtimeSamples=[];window.sampleTimer=setInterval(()=>{const d=window.runtimeArena.readArenaDiagnostics(document.querySelector('.hunt-lab canvas'));if(d)window.runtimeSamples.push({ashfang:d.ashfang,dragon:d.dragon,player:d.player,hazards:d.huntHazards,renderingFailed:d.renderingFailed});},60);});
await page.waitForFunction(()=>window.runtimeSamples.some(s=>s.ashfang?.lastDraw),null,{timeout:60000});
await page.waitForFunction(()=>window.runtimeSamples.some(s=>s.ashfang?.entity?.shadow),null,{timeout:45000});await page.waitForTimeout(400);await page.screenshot({path:path.join(out,'live-shadow-fire-rain-phone.png'),fullPage:true});
const read=()=>page.evaluate(()=>window.runtimeArena.readArenaDiagnostics(document.querySelector('.hunt-lab canvas')));
await page.locator('.hunt-lab canvas').focus();const before=await read();await page.keyboard.down('ArrowLeft');await page.waitForTimeout(1500);await page.keyboard.up('ArrowLeft');const after=await read();assert(Math.hypot(after.player.x-before.player.x,after.player.y-before.player.y)>20,'manual input moves actual player');
await page.keyboard.down('ArrowDown');await page.waitForTimeout(1800);await page.keyboard.up('ArrowDown');await page.waitForTimeout(8000);
await page.getByRole('button',{name:'Ⅱ Pause',exact:true}).click();await page.waitForTimeout(200);const paused=await read();await page.waitForTimeout(350);const still=await read();assert.deepEqual(still.player,paused.player);assert.deepEqual(still.ashfang.entity,paused.ashfang.entity);assert.equal(still.ashfang.lastDraw.frame,paused.ashfang.lastDraw.frame);await page.screenshot({path:path.join(out,'live-predator-paused-phone.png'),fullPage:true});
const samples=await page.evaluate(()=>{clearInterval(window.sampleTimer);return window.runtimeSamples});
assert(samples.some(s=>s.ashfang?.entity?.shadow&&s.dragon.targetable===false),'overhead is shadow-only and untargetable');assert(samples.some(s=>s.hazards.some(h=>h.fromAbove)),'real warned rain hazards');assert(samples.every(s=>!s.renderingFailed));const drawn=samples.filter(s=>s.ashfang?.lastDraw);assert(drawn.length>30);assert(drawn.every(s=>Math.abs(s.ashfang.lastDraw.worldCell-448.53076140099125)<.00001));assert(samples.every(s=>s.ashfang.textures<=8));assert(samples.every(s=>s.ashfang.errors.length===0));
const clips=[...new Set(drawn.map(s=>s.ashfang.lastDraw.clip))],actions=[...new Set(samples.map(s=>s.dragon?.action).filter(Boolean))];assert(actions.length>=3,'reactive action variety');assert(clips.some(c=>['claw_right','bite','pounce','breath_start'].includes(c)));assert.equal(errors.length,0,errors.join('\n'));
// Actual C# fight, including authoritative phase shift and victory, with the hunter casting.
await page.goto('http://127.0.0.1:8880/hunt-lab?wyrm=Ashfang&ascendant=false&cast=true');
await page.evaluate(async()=>{window.runtimeArena=await import('/js/arena.js');window.victorySamples=[];window.victoryTimer=setInterval(()=>{const d=window.runtimeArena.readArenaDiagnostics(document.querySelector('.hunt-lab canvas'));if(d)window.victorySamples.push({ashfang:d.ashfang,dragon:d.dragon,player:d.player});},70);});
await page.waitForFunction(()=>window.victorySamples.some(s=>s.ashfang?.death),null,{timeout:120000});await page.waitForTimeout(4200);await page.screenshot({path:path.join(out,'live-victory-collapse-phone.png'),fullPage:true});
const victory=await page.evaluate(()=>{clearInterval(window.victoryTimer);return window.victorySamples});assert(victory.some(s=>s.ashfang?.death));assert(victory.some(s=>s.ashfang?.lastDraw?.clip==='death'));
fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify({pass:true,actualCSharpSimulation:true,normalHuntRenderer:true,manualMovement:true,pause:true,approvedWorldCell:448.53076140099125,textureCacheLimit:8,clips,actions,samples:samples.length,victorySamples:victory.length,death:true,shadowOnlyFlight:true,authoritativeRainHazards:true,physicalPhoneAcceptance:false,errors},null,2));
console.log('ASHFANG_LIVE_PASS',clips.join(','),actions.join(','));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

