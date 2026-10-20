/* Verify actual mobile Sprite Lab non-looping death playback and exports. */
const {chromium}=require('C:/Users/Pjotr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const output=path.resolve(process.argv[2]);fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8766/sprite-lab/?candidate=hollow-death-8dir-v1');
 await page.waitForFunction(()=>document.querySelector('#statFrames').textContent==='24');
 const result={errors,views:[]};
 for(const direction of ['N','NE','E','SE','S','SW','W','NW']){
  const button=page.locator(`[data-dir="${direction}"]`);
  if(await button.isDisabled())throw Error('Direction disabled: '+direction);
  await button.click();
  await page.waitForTimeout(650);
  const falling=await page.locator('#frameIndicator').textContent();
  await page.locator('#stageCanvas').screenshot({path:path.join(output,direction+'-fall.png')});
  await page.waitForFunction(()=>document.querySelector('#frameIndicator').textContent==='24 / 24');
  await page.waitForTimeout(300);
  const held=await page.locator('#frameIndicator').textContent();
  await page.locator('#stageCanvas').screenshot({path:path.join(output,direction+'-corpse.png')});
  result.views.push({direction,falling,held,paused:(await page.locator('#playBtn').textContent())==='▶',meta:await page.locator('#directionMeta').textContent()});
 }
 const event=page.waitForEvent('download');await page.locator('#exportManifest').click();
 const download=await event;await download.saveAs(path.join(output,'exported-manifest.json'));
 const manifest=JSON.parse(fs.readFileSync(path.join(output,'exported-manifest.json'),'utf8'));
 await page.locator('#playBtn').click();await page.waitForTimeout(200);
 result.replayFrame=await page.locator('#frameIndicator').textContent();
 result.manifest={columns:manifest.source.columns,rows:manifest.source.rows,frames:manifest.frames,anchor:manifest.anchor,playback:manifest.playback,drawCellWorldSize:manifest.drawCellWorldSize};
 result.format=await page.locator('#resultPill').textContent();
 await page.locator('#loadMovement').click();
 await page.waitForFunction(()=>document.querySelector('#statFrames').textContent==='16');
 result.movementPreset={columns:await page.locator('#columns').inputValue(),width:await page.locator('#frameWidth').inputValue()};
 await page.locator('#loadDeath').click();
 await page.waitForFunction(()=>document.querySelector('#statFrames').textContent==='24');
 result.deathPreset={columns:await page.locator('#columns').inputValue(),width:await page.locator('#frameWidth').inputValue()};
 result.passed=errors.length===0&&result.format!=='NOT READY'&&result.movementPreset.columns==='16'&&result.movementPreset.width==='96'&&result.deathPreset.columns==='24'&&result.deathPreset.width==='128'&&manifest.frames===192&&manifest.source.columns===24&&manifest.source.rows===8&&manifest.playback.loop===false&&manifest.playback.holdLastFrame===true&&manifest.anchor[1]===88&&result.replayFrame!=='24 / 24'&&result.views.every(v=>v.held==='24 / 24'&&v.paused&&v.falling!=='24 / 24'&&!/mirror/i.test(v.meta));
 fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));await browser.close();if(!result.passed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
