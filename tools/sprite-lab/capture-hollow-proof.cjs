/* Actual existing Sprite Lab review; no alternate mockup page. */
const {chromium}=require('C:/Users/Pjotr/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
  const output=path.resolve(process.argv[2]);fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const errors=[];
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:8765/sprite-lab/?candidate=hollow-local-pixel-v1');
  await page.waitForFunction(()=>document.querySelector('#statFrames')?.textContent==='16');
  await page.locator('#stageCanvas').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(output,'sprite-lab-390.png'),fullPage:true});
  const frames=[];
  for(let i=0;i<4;i++){
    await page.waitForTimeout(240);
    frames.push(await page.locator('#frameIndicator').textContent());
    await page.locator('#stageCanvas').screenshot({path:path.join(output,`motion-${i}.png`)});
  }
  const result=await page.evaluate(()=>({
    label:document.querySelector('#assetLabel').textContent,
    frames:document.querySelector('#statFrames').textContent,
    directions:document.querySelector('#statNative').textContent,
    frameWidth:document.querySelector('#frameWidth').value,
    frameHeight:document.querySelector('#frameHeight').value,
    fps:document.querySelector('#fps').value,
    result:document.querySelector('#resultPill').textContent,
    checks:document.querySelector('#checkList').innerText,
    strideDisabled:document.querySelector('#chaseBtn').disabled,
  }))
  result.observedFrames=frames;result.errors=errors;
  result.passed=errors.length===0&&result.frames==='16'&&result.directions==='1'&&new Set(frames).size>1&&result.result!=='NOT READY';
  fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
  await browser.close();
  if(!result.passed)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
