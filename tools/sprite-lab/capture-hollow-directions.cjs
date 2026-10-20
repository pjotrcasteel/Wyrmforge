const {chromium}=require('C:/Users/Pjotr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const output=path.resolve(process.argv[2]);fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8766/sprite-lab/?candidate=hollow-movement-8dir-v1');
 await page.waitForFunction(()=>document.querySelector('#statFrames').textContent==='16');
 const result={errors,views:[]};
 for(const direction of ['N','NE','E','SE','S','SW','W','NW']){
  const button=page.locator(`[data-dir="${direction}"]`);
  if(await button.isDisabled())throw Error('Direction disabled: '+direction);
  await button.click();
  await page.locator('#stageCanvas').scrollIntoViewIfNeeded();
  const first=await page.locator('#frameIndicator').textContent();
  await page.waitForTimeout(260);
  const second=await page.locator('#frameIndicator').textContent();
  await page.locator('#stageCanvas').screenshot({path:path.join(output,direction+'.png')});
  result.views.push({direction,first,second,meta:await page.locator('#directionMeta').textContent()});
 }
 const downloadEvent=page.waitForEvent('download');await page.locator('#exportManifest').click();
 const download=await downloadEvent;await download.saveAs(path.join(output,'exported-manifest.json'));
 const manifest=JSON.parse(fs.readFileSync(path.join(output,'exported-manifest.json'),'utf8'));
 result.nativeDirections=await page.locator('#statNative').textContent();
 result.manifest={columns:manifest.source.columns,rows:manifest.source.rows,frames:manifest.frames,anchor:manifest.anchor};
 result.passed=errors.length===0&&result.nativeDirections==='8'&&manifest.frames===128&&manifest.source.columns===16&&manifest.source.rows===8&&result.views.every(v=>v.first!==v.second&&!/mirror/i.test(v.meta));
 fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));await browser.close();if(!result.passed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
