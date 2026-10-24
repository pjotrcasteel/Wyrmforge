/* Actual Sprite Lab: every facing, readable poses, non-looping recovery, replay. */
const {chromium}=require('C:/Users/Pjotr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const output=path.resolve(process.argv[2]);fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8766/sprite-lab/?candidate=hollow-attack-8dir-v1');
 await page.waitForFunction(()=>document.querySelector('#assetLabel').textContent.includes('ATTACK'));
 const result={errors,views:[]};
 for(const direction of ['N','NE','E','SE','S','SW','W','NW']){
  await page.locator(`[data-dir="${direction}"]`).click();
  for(const [index,phase] of [[5,'wind-up'],[8,'strike']]){
   await page.locator('#filmstrip button').nth(index).click();
   await page.locator('#stageCanvas').screenshot({path:path.join(output,direction+'-'+phase+'.png')});
  }
  await page.locator('#playBtn').click();
  await page.waitForFunction(()=>document.querySelector('#frameIndicator').textContent==='16 / 16');
  await page.waitForTimeout(200);
  result.views.push({direction,frame:await page.locator('#frameIndicator').textContent(),paused:(await page.locator('#playBtn').textContent())==='▶',meta:await page.locator('#directionMeta').textContent()});
 }
 const event=page.waitForEvent('download');await page.locator('#exportManifest').click();
 const download=await event;await download.saveAs(path.join(output,'exported-manifest.json'));
 const manifest=JSON.parse(fs.readFileSync(path.join(output,'exported-manifest.json'),'utf8'));
 await page.locator('#playBtn').click();await page.waitForTimeout(200);result.replayFrame=await page.locator('#frameIndicator').textContent();
 result.manifest={source:manifest.source,playback:manifest.playback,anchor:manifest.anchor,visualContactFrames:manifest.visualContactFrames};
 result.format=await page.locator('#resultPill').textContent();
 await page.locator('#loadMovement').click();await page.waitForFunction(()=>document.querySelector('#frameWidth').value==='96');
 result.walkPreset=true;
 await page.locator('#loadAttack').click();await page.waitForFunction(()=>document.querySelector('#assetLabel').textContent.includes('ATTACK'));
 result.attackPreset=(await page.locator('#frameWidth').inputValue())==='128';
 result.passed=errors.length===0&&manifest.frames===128&&manifest.playback.loop===false&&manifest.playback.onComplete==='walk'&&manifest.playback.holdLastFrame===false&&manifest.anchor[1]===88&&result.replayFrame!=='16 / 16'&&result.attackPreset&&result.format!=='NOT READY'&&result.views.every(v=>v.frame==='16 / 16'&&v.paused&&!/mirror/i.test(v.meta));
 fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 await browser.close();if(!result.passed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
