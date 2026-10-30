// Genuine C# Enemy Lab / existing 2.5D arena. Not a standalone mock scene.
const {chromium}=require(process.env.WYRMFORGE_PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const output=path.join(root,'art/source/characters/grey-wizard/gothic-south-v003/scale-review');fs.mkdirSync(output,{recursive:true});
const origin=process.env.WYRMFORGE_REVIEW_ORIGIN||'http://127.0.0.1:5207';
(async()=>{
    const browser=await chromium.launch({headless:true,...(process.env.WYRMFORGE_CHROMIUM?{executablePath:process.env.WYRMFORGE_CHROMIUM}:{})});
    const results=[];
    try{
        for(const width of [320,390]){
            const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:1});
            const errors=[];page.on('pageerror',e=>errors.push(e.message));
            await page.goto(origin+'/enemy-lab?kind=Hollow&seed=42&autoplay=false&cast=false&wizardStudy=gothic-south-v003&seconds=4');
            await page.waitForFunction(async()=>{
                const c=document.querySelector('canvas[aria-label="Live enemy encounter"]');if(!c)return false;
                const arena=await import('/js/arena.js'),study=await import('/js/wizard-scale-study.js');
                const d=arena.readArenaDiagnostics(c);return d?.player&&d.enemies.length&&d.hollow.capeFreeReady&&study.wizardScaleStudy.diagnostics().draws>0;
            },null,{timeout:60000});
            const read=async()=>{
                for(let attempt=0;attempt<120;attempt++){
                const result=await page.evaluate(async()=>{
                const arena=await import('/js/arena.js'),study=await import('/js/wizard-scale-study.js');
                const c=document.querySelector('canvas[aria-label="Live enemy encounter"]');
                const d=c&&arena.readArenaDiagnostics(c);if(!d?.player)return false;
                return {player:d.player,enemies:d.enemies,hollow:d.hollow,paused:d.paused,world:d.world,study:study.wizardScaleStudy.diagnostics(),renderingFailed:d.renderingFailed};
                });
                if(result?.player)return result;
                await page.waitForTimeout(250);
                }
                throw new Error('Arena diagnostics did not stabilize');
            };
            const before=await read();
            await page.keyboard.down('ArrowDown');await page.waitForTimeout(500);await page.keyboard.up('ArrowDown');
            const after=await read();
            const moved=Math.hypot(after.player.x-before.player.x,after.player.y-before.player.y);
            assert.ok(moved>.1,'actual C# player failed to move');
            assert.equal(after.study.ready,true);assert.ok(after.study.draws>0);assert.equal(after.renderingFailed,false);
            await page.waitForTimeout(300);
            await page.locator('canvas[aria-label="Live enemy encounter"]').screenshot({path:path.join(output,`enemy-lab-${width}.png`)});
            const final=await read();assert.deepEqual(errors,[]);
            results.push({width,scope:'actual C# Enemy Lab/arena camera and depth path, desktop Chromium; not real Hunt/physical phone',moved,errors,before,after,final});
            await page.close();
        }
        fs.writeFileSync(path.join(output,'arena-report.json'),JSON.stringify(results,null,2)+'\n');
        console.log(JSON.stringify({passed:true,widths:results.map(r=>r.width),scope:'real C# Enemy Lab scale review'}));
    }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
