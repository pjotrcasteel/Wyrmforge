// Metadata-only replay of real captured C# observations through the actual
// Hollowed adapter. No images are decoded or drawn: this cannot accept art.
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const root=pathToFileURL(path.resolve(import.meta.dirname,'../../src/Wyrmforge.Presentation.Web/wwwroot/js')+'/');
const profile=JSON.parse(readFileSync(path.join(process.argv[2],'profile.json'),'utf8'));
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const manifest={directions:['N','NE','E','SE','S','SW','W','NW'],clips:{}};
const stub=uri(`export function createCreatureAnimationAssets(){return {ready:()=>true,manifest:${JSON.stringify(manifest)},profile:${JSON.stringify(profile)},draw:()=>false};}`);
const source=readFileSync(new URL('hollow-sprites.js',root),'utf8')
 .replace(/new URL\('\.\.\/art\/[^']+',\s*import.meta.url\)/g,"new URL('https://example.test/')")
 .replace(/from '(\.\/[^']+)'/g,(_,p)=>'from '+JSON.stringify(p==='./creature-animation-assets.js'?stub:uri(readFileSync(new URL(p,root),'utf8'))));
globalThis.location={search:'?animationFoundation=sprite-walk'};
const h=await import(uri(source)),state=h.createHollowState();
const trace=JSON.parse(readFileSync(process.argv[3],'utf8')),samples=[];
for(const row of trace){
 const time=row.simulationTimeSeconds;
 h.updateHollowSprites(state,{simulationTimeSeconds:time,hud:{seconds:Math.floor(time)},enemies:row.enemies,player:row.player},time);
 for(const e of h.hollowDiagnostics(state).entities)if(e.foundation||e.foundationError)samples.push({time,id:e.entityId,error:e.foundationError,clip:e.foundation?.clip,maxNativeMarkerSlip:e.foundation?.maxNativeMarkerSlip});
}
const result={measurement:'metadata-only source markers through actual adapter and captured C# roots; no images loaded/drawn',runtimeAccepted:false,rows:trace.length,actorSamples:samples.length,maxNativeMarkerSlip:Math.max(0,...samples.map(s=>s.maxNativeMarkerSlip??0)),failures:samples.filter(s=>s.error),samples};
if(process.argv[4])writeFileSync(process.argv[4],JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,samples:result.samples.length},null,2));
if(result.failures.length||result.maxNativeMarkerSlip>1)process.exitCode=1;
