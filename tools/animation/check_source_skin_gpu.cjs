// Real shared-engine browser proof; not a Hunt/physical-device acceptance claim.
const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'../..'),asset=path.resolve(process.argv[2]||'artifacts/an-skin-lod1800');
const out=path.resolve(process.env.AN_GPU_OUT||'artifacts/an-source-skin-gpu');fs.mkdirSync(out,{recursive:true});
const mime={'.js':'text/javascript','.json':'application/json','.png':'image/png','.bin':'application/octet-stream'};
let activeBrowser;
const server=http.createServer((req,res)=>{
 const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(route.includes('..')){res.writeHead(403);return res.end();}
 if(route==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><style>body{margin:0;background:#000}canvas{width:390px;height:390px}</style><canvas width="390" height="390"></canvas>');}
 const file=route.startsWith('/assets/')?path.join(asset,route.slice(8)):path.join(root,route.slice(1));
 if(!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=activeBrowser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:390,height:390}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 const setup=await page.evaluate(async()=>{
  const base='/src/Wyrmforge.Presentation.Web/wwwroot/js/';
  const [T,{LightingEngine},{loadSourceSkinResources},{sampleSourceSkinSurface,sourceSkinPoseMatrices},{solveSupportedSourcePose}]=await Promise.all([
   import(base+'lighting/vendor/three.module.js'),import(base+'lighting/engine.js'),import(base+'source-skin-assets.js'),import(base+'source-skin-pose.js'),import(base+'sprite-contact-kinematics.js')]);
  const manifestBytes=await (await fetch('/assets/skin.json')).arrayBuffer(),sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',manifestBytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
  const resource=await loadSourceSkinResources(new URL('/assets/',location.href),{manifest:'skin.json',sha256:sha});
  const engine=new LightingEngine(document.querySelector('canvas'),{shadowViews:6,maxLights:8});
  const geometry=new T.BufferGeometry();for(const [name,a] of Object.entries(resource.attributes))if(name==='index')geometry.setIndex(new T.BufferAttribute(a.array,1));else geometry.setAttribute(name,new T.BufferAttribute(a.array,a.itemSize));
  engine.registerGeometry('skin',geometry,{skinBinding:{bones:resource.surface.bones,influenceSets:resource.manifest.influenceSets,skinningMode:resource.manifest.skinningMode,motionRadius:resource.surface.strideMetres*1.5}});
  engine.registerGeometry('floor',new T.PlaneGeometry(4,4));const texture=new T.Texture(resource.image);texture.needsUpdate=true;engine.registerTexture('albedo',texture,true);
  const baseMaterial={roughness:.85,metalness:0,specular:.1,reflection:'direct',alphaCutoff:.1,doubleSided:resource.manifest.doubleSided??true};
  const materials=[{...baseMaterial,id:'body',color:'#ffffff',albedo:'albedo',flatShading:resource.manifest.flatShading,emission:resource.manifest.emission,emissionIntensity:resource.manifest.emissionIntensity},{...baseMaterial,id:'floor',color:'#666666',emission:'#000000',emissionIntensity:0}];
  const light={id:'point',ownerId:'fixture',type:'point',enabled:true,position:[-1,-2,3],direction:[0,0,-1],color:'#fff3dc',intensity:14,range:8,coneAngle:.7,penumbra:0,castsShadow:true,priority:1};
  engine.halfWidth=390/48/2;const elevation=Math.asin(34.730770111083984/61.93548774719238);
  engine.camera.position.set(0,-8*Math.cos(elevation),8*Math.sin(elevation));engine.camera.lookAt(0,0,0);
  engine.inspectionObject='body';window.__skinProof={engine,resource};
  window.__renderSkin=(phase,progress,{view='lit',zero=false,body=true,yaw=0}={})=>{
   const source=sampleSourceSkinSurface(resource.surface,{clip:'attack-travel',gaitPhase:phase,actionProgress:progress});
   const targets=Object.fromEntries(Object.entries(source.sourceContacts).map(([id,c])=>[id,{point:[...c.sourceContact],planted:c.planted}]));
   const pose=solveSupportedSourcePose(source,targets,{massWeights:resource.surface.massWeights,rootBone:resource.surface.rootBone,...resource.surface.authoringEnvelope,minimumSupportMargin:resource.surface.minimumSupportMarginMetres});
   const objects=[{id:'floor',ownerId:'fixture',geometry:'floor',material:'floor',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],castsShadow:false,receivesShadow:true,receivesLight:true}];
   if(body)objects.push({id:'body',ownerId:'actor',geometry:'skin',material:'body',position:[0,0,.625],rotation:[0,0,yaw],scale:[1.25,1.25,1.25],castsShadow:true,receivesShadow:true,receivesLight:true,skinPose:sourceSkinPoseMatrices(resource.surface,source,pose)});
   engine.apply({version:1,time:1,lights:zero?[]:[light],environment:{ambient:zero?0:.2,color:'#aabaca',exposure:1,emission:!zero},materials,objects});engine.setDebugView(view);engine.render(390,390);
   const pixels=engine.pixels();let nonblack=0,sum=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i]+pixels[i+1]+pixels[i+2]>0)nonblack++;sum+=pixels[i]+pixels[i+1]+pixels[i+2];}
   return {nonblack,sum,diagnostics:engine.diagnostics(),sourceBytes:resource.decodedBytes};
  };
  const gl=engine.renderer.getContext(),info=gl.getExtension('WEBGL_debug_renderer_info');
  window.__stressSkin=(count)=>{window.__renderSkin(.27,.56,{});const body=engine.snapshot.objects.find(o=>o.id==='body'),floor=engine.snapshot.objects.find(o=>o.id==='floor'),frame=engine.snapshot;const times=[];for(let tick=0;tick<30;tick++){const start=performance.now();const source=sampleSourceSkinSurface(resource.surface,{clip:'attack-travel',gaitPhase:tick/30,actionProgress:.56}),matrices=sourceSkinPoseMatrices(resource.surface,source,source);engine.apply({...frame,objects:[floor,...Array.from({length:count},(_,i)=>({...body,id:'stress-'+i,skinPose:matrices,position:[(i%8-3.5)*.36,(Math.floor(i/8)-1.5)*.36,.625]}))]});engine.render(390,390);gl.finish();if(tick>=6)times.push(performance.now()-start);}times.sort((a,b)=>a-b);return {actors:count,samples:times.length,meanMilliseconds:times.reduce((s,n)=>s+n,0)/times.length,p95Milliseconds:times[Math.floor(times.length*.95)],diagnostics:engine.diagnostics(),sharedPoseRendererStudy:true};};
  return {graphics:info?{vendor:gl.getParameter(info.UNMASKED_VENDOR_WEBGL),renderer:gl.getParameter(info.UNMASKED_RENDERER_WEBGL)}:null,browser:navigator.userAgent,sourceBytes:resource.decodedBytes,sourceVertices:resource.manifest.vertices,triangles:resource.manifest.triangles};
 });
 await page.evaluate(()=>window.__renderSkin(.27,.56,{}));
 const cases={};
 for(const [i,direction] of ['E','SE','S','SW','W','NW','N','NE'].entries()){await page.evaluate(args=>window.__renderSkin(...args),[.27,.56,{yaw:(2-i)*Math.PI/4}]);cases[direction]=await page.evaluate(args=>window.__renderSkin(...args),[.27,.56,{view:'albedo',yaw:(2-i)*Math.PI/4}]);await page.screenshot({path:path.join(out,'facing-'+direction+'.png')});}

 for(const [name,args] of Object.entries({claw:[.27,.56,{}],normals:[.27,.56,{view:'normals'}],albedo:[.27,.56,{view:'albedo'}],mask:[.27,.56,{view:'object-mask'}],recovery:[.73,.93,{}],bodyless:[.27,.56,{body:false}],zero:[.27,.56,{zero:true}]})){
  cases[name]=await page.evaluate(args=>window.__renderSkin(...args),args);await page.screenshot({path:path.join(out,name+'.png')});
 }
 if(['E','SE','S','SW','W','NW','N','NE'].some(d=>cases[d].nonblack<100))throw Error('Eight-facing inspection did not render');
 if(cases.zero.nonblack!==0)throw Error('Zero-light source skin revealed world pixels');
 if(cases.claw.nonblack<100||cases.normals.nonblack<100)throw Error('Source skin or normal pass did not render');
 if(cases.claw.sum===cases.bodyless.sum||cases.mask.nonblack<20)throw Error('Only the fixture floor rendered; source skin is absent');
 const performance=process.env.AN_GPU_STRESS?await page.evaluate(()=>[1,12,32].map(n=>window.__stressSkin(n))):null;
 const data={performance,sourceStudyOnly:true,huntAccepted:false,physicalDevice:false,setup,cases,errors};fs.writeFileSync(path.join(out,'gpu-proof.json'),JSON.stringify(data,null,2));
 await browser.close();server.close();if(errors.length)throw Error(JSON.stringify(errors));console.log(JSON.stringify(data,null,2));
})().catch(async e=>{console.error(e);await activeBrowser?.close();server.close();process.exitCode=1;});
