// Replays captured C# observations through the real adapter in an isolated state.
// Does not issue gameplay input or change the simulation.
const fs=require('fs'),path=require('path'),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  if(process.env.AN_ASSET_ROOT)await page.route('**/art/review/animation-foundation-skin/**',route=>route.fulfill({path:path.join(process.env.AN_ASSET_ROOT,path.basename(new URL(route.request().url()).pathname))}));
  await page.goto((process.env.WYRMFORGE_BASE_URL||'http://127.0.0.1:4173')+'/?animationFoundation=1');
  await page.evaluate(async()=>{window.__h=await import('/js/hollow-sprites.js');await window.__h.preloadHollowSprites();});
  await page.waitForFunction(()=>window.__h.hollowDiagnostics(window.__h.createHollowState()).foundation.ready,{},{timeout:60000});
  const trace=JSON.parse(fs.readFileSync(process.argv[2])),result=await page.evaluate(async ({trace,capturePoses})=>{
   const h=window.__h,state=h.createHollowState(),failures=[],poses=[],epochs=new WeakMap();let solved=0,epoch=0;
   for(const row of trace){const time=row.simulationTimeSeconds;h.updateHollowSprites(state,{simulationTimeSeconds:time,hud:{seconds:Math.floor(time)},enemies:row.enemies,player:row.player},time);
    for(const e of h.hollowDiagnostics(state).entities){if(e.foundationError)failures.push({time,id:e.entityId,error:e.foundationError,details:e.foundationFailure});else if(e.foundation)solved++;}
    if(capturePoses)for(const [id,actor] of state.entities){const sample=actor.foundationSample;if(!sample?.skinPose||!sample.sourcePose||sample.debug.transported)continue;const contacts=actor.foundationContacts;if(!epochs.has(contacts))epochs.set(contacts,++epoch);poses.push({sequence:id+'-'+epochs.get(contacts),timestamp:time,scale:actor.foundationActorScale,world:[actor.x,actor.y],yaw:sample.sourceSupport.yaw,matrices:Array.from(sample.skinPose),sourceBones:sample.sourcePose.sourceBones,sourceContacts:sample.sourcePose.sourceContacts,massCenter:sample.sourcePose.massCenter});}
   }
   const profile=await (await fetch('/art/review/animation-foundation-skin/profile.json')).json();
   return {poses,profileSourceSupport:profile.sourceSupport,capturedCSharpSamples:trace.length,solvedActorSamples:solved,failures,readOnlyPresentationReplay:true};
  },{trace,capturePoses:Boolean(process.env.AN_REPLAY_POSES)});if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2));console.log(JSON.stringify({...result,poses:result.poses.length},null,2));if(result.failures.length)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
