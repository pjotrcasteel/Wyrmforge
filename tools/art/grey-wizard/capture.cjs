// Validate import and playback in the EXISTING Sprite Lab, not a mockup page.
const {chromium}=require(process.env.WYRMFORGE_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
const source=path.join(root,'art/source/characters/grey-wizard/native-south-v001');
const output=path.join(source,'review');fs.mkdirSync(output,{recursive:true});
(async()=>{
    const server=spawn(process.execPath,['tools/sprite-lab/serve-review.cjs'],{cwd:root,stdio:'pipe'});
    let browser;
    try{
        await new Promise((ok,fail)=>{server.stdout.once('data',ok);server.once('error',fail);server.once('exit',code=>code&&fail(Error('review server exited '+code)));});
        browser=await chromium.launch({headless:true,...(process.env.WYRMFORGE_CHROMIUM?{executablePath:process.env.WYRMFORGE_CHROMIUM}:{})});
        const reports=[];
        for(const width of [320,390]){
            const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1});
            const errors=[];page.on('pageerror',e=>errors.push(e.message));
            await page.goto('http://127.0.0.1:8766/sprite-lab/');
            await page.locator('#fileInput').setInputFiles(path.join(source,'walk.png'));
            await page.waitForFunction(()=>document.querySelector('#footerState').textContent.includes('Loaded walk.png'));
            assert.equal(await page.locator('#columns').inputValue(),'16');
            assert.equal(await page.locator('#rows').inputValue(),'1');
            assert.equal(await page.locator('#frameWidth').inputValue(),'80');
            await page.locator('#fps').fill('12');await page.locator('#fps').dispatchEvent('input');
            // Existing lab's 40% minimum is an inspection scale, not Hunt world size.
            await page.locator('#scale').fill('40');await page.locator('#scale').dispatchEvent('input');
            const frames=[];
            for(let i=0;i<8;i++){await page.waitForTimeout(100);frames.push(await page.locator('#frameIndicator').textContent());}
            assert.ok(new Set(frames).size>=4,'walk failed to advance');
            await page.locator('#playBtn').click();
            await page.waitForTimeout(50);const paused=await page.locator('#frameIndicator').textContent();
            await page.waitForTimeout(180);assert.equal(await page.locator('#frameIndicator').textContent(),paused,'pause changed frame');
            await page.locator('#stageCanvas').screenshot({path:path.join(output,`sprite-lab-${width}.png`)});
            assert.deepEqual(errors,[]);
            reports.push({width,columns:16,rows:1,cell:80,observedFrames:frames,pausedFrame:paused,errors,
                scope:'existing Sprite Lab import/play/pause only; desktop Chromium, not Hunt or physical phone',
                sourceFacing:'S',labCompassLimitation:'single-view lab labels its row SE; no new facing is implied'});
            await page.close();
        }
        fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify(reports,null,2)+'\n');
        console.log(JSON.stringify({passed:true,widths:reports.map(r=>r.width),scope:'Sprite Lab only'}));
    }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
