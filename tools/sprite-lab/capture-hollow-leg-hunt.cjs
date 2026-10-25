// Capture the actual C#/Canvas enemy-lab application, NOT a synthetic GIF.
// Run after publishing WyrmForge and starting its SPA server:
// node tools/sprite-lab/capture-hollow-leg-hunt.cjs artifacts/hollow-leg-live-review http://127.0.0.1:4175
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');

(async()=>{
    const output=path.resolve(process.argv[2]||'artifacts/hollow-leg-live-review');
    const base=(process.argv[3]||'http://127.0.0.1:4175').replace(/\/$/,'');
    fs.mkdirSync(output,{recursive:true});
    const browser=await chromium.launch({headless:true});
    const observations=[],errors=[],failedResponses=[];
    try {
        for(const width of [320,390]){
            const dir=path.join(output,String(width));
            fs.mkdirSync(dir,{recursive:true});
            const context=await browser.newContext({viewport:{width,height:width===320?568:844},
                deviceScaleFactor:1,reducedMotion:'no-preference',recordVideo:{dir,size:{width,height:width===320?568:844}}});
            const page=await context.newPage();
            page.on('pageerror',e=>errors.push(e.message));
            page.on('response',response=>{
                if(response.url().includes('/hollow-rigged/review/')&&!response.ok())
                    failedResponses.push({status:response.status(),url:response.url()});
            });
            await page.goto(base+'/enemy-lab?kind=Hollow&seed=42&autoplay=true&cast=false&hollowLegReview=even',
                {waitUntil:'domcontentloaded'});
            await page.locator('.enemy-lab canvas').waitFor({state:'visible',timeout:60000});
            await page.locator('#wyrmforge-ignition').waitFor({state:'hidden',timeout:60000});
            await page.evaluate(async()=>{
                globalThis.__hollowArenaPreview=await import(new URL('js/arena.js',document.baseURI).href);
            });
            await page.waitForFunction(()=>{
                const canvas=document.querySelector('.enemy-lab canvas');
                const result=globalThis.__hollowArenaPreview?.readArenaDiagnostics(canvas);
                return result?.hollow?.legReview?.ready&&result.hollow.legReview.mode==='even'&&result.hollow.entities.some(e=>e.legPreview&&!e.layered&&e.frame>0)
                    &&!result.renderingFailed;
            },null,{timeout:60000});
            const frames=[],canvas=page.locator('.enemy-lab canvas');
            for(let i=0;i<8;i++){
                const status=await page.evaluate(()=>{
                    const c=document.querySelector('.enemy-lab canvas');
                    const d=globalThis.__hollowArenaPreview.readArenaDiagnostics(c);
                    return {renderingFailed:d.renderingFailed,hollow:d.hollow,performance:d.performance,
                        enemyCount:d.enemies.length};
                });
                const selected=status.hollow.entities.filter(e=>e.legPreview);
                frames.push({t:i,selected:selected.map(e=>({id:e.entityId,clip:e.clip,frame:e.frame,direction:e.direction})),
                    total:status.hollow.entities.length,renderingFailed:status.renderingFailed});
                await canvas.screenshot({path:path.join(dir,`frame-${i}.png`)});
                await page.waitForTimeout(145);
            }
            await page.screenshot({path:path.join(dir,'full-arena.png'),fullPage:true});
            const selectedFrames=new Set(frames.flatMap(f=>f.selected.map(s=>s.frame)));
            observations.push({width,frames,uniquePreviewFrames:[...selectedFrames],passed:selectedFrames.size>=3&&
                frames.every(f=>!f.renderingFailed)&&frames.some(f=>f.selected.length>0)});
            await page.close();await context.close();
        }
    }finally{
        await browser.close();
    }
    const result={base,errors,failedResponses,observations,
        scope:'read-only, explicit standard-walk review; attack/death and damaged-arm unaffected',
        realMobileDeviceTested:false,
        passed:observations.length===2&&observations.every(o=>o.passed)&&errors.length===0&&failedResponses.length===0};
    fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify({passed:result.passed,errors,failedResponses,
        viewports:observations.map(o=>({width:o.width,uniqueFrames:o.uniquePreviewFrames,
            selected:Math.max(...o.frames.map(f=>f.selected.length)),passed:o.passed}))},null,2));
    if(!result.passed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
