// Deterministic procedural sound sketches; browser and offline exports share DSP.
const TAU=Math.PI*2;
function noiseGenerator(seed){let state=seed>>>0;return()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/2147483648-1;};}
export function synthesizeSpellSound(look,{event='release',sampleRate=22050}={}){
 if(!['release','impact'].includes(event))throw Error('Unknown sound event');
 const impact=event==='impact',duration=impact?.44:.38;
 const samples=new Float32Array(Math.ceil(sampleRate*duration));
 const seed=[...look.spellId].reduce((s,c)=>((s*31+c.charCodeAt(0))>>>0),1973)+look.rank*103+(impact?7:0);
 const noise=noiseGenerator(seed),rank=look.rank,school=look.school;
 let low=0,phase=0;
 for(let i=0;i<samples.length;i++){
  const t=i/sampleRate,n=noise();low+=.12*(n-low);const high=n-low;
  const attack=Math.min(1,t/.0015),decay=Math.exp(-t*(impact?13:10)),body=Math.exp(-t*(impact?9:8));
  let value;
  if(school==='Fire'){
   const rate=look.soundIdentity==='ember'?19:10;
   phase+=TAU*(55+155*Math.exp(-t*24))/sampleRate;
   value=(low*2.2*Math.exp(-t*rate)+Math.sin(phase)*.36*body+high*.20*Math.exp(-t*24));
   if(rank>=2)value+=Math.sin(TAU*47*t)*.13*Math.exp(-t*7);
   if(rank===3)value+=low*.65*Math.exp(-t*5);
  }else if(school==='Frost'){
   const frequencies=look.soundIdentity==='ice-weight'?[710,1433,2167]:[1570,2477,3919];
   value=frequencies.reduce((s,f,k)=>s+Math.sin(TAU*(f+t*35)*t)*(.27/(k+1))*Math.exp(-t*(13+k*7)),0)+high*.24*Math.exp(-t*35);
   if(rank>=2)value+=Math.sin(TAU*379*t)*.14*Math.exp(-t*10);
   if(rank===3)value+=Math.sin(TAU*181*t)*.20*Math.exp(-t*8);
  }else if(school==='Storm'){
   const snap=Math.exp(-t*95)+.45*Math.exp(-Math.max(0,t-.022)*150)*(t>=.022?1:0);
   value=high*.7*snap+low*.65*Math.exp(-t*18)+Math.sin(TAU*89*t)*.14*Math.exp(-t*14);
   if(look.soundIdentity==='coil')value+=Math.sin(TAU*211*t+Math.sin(TAU*39*t)*3)*.10*Math.exp(-t*13);
   if(rank>=2)value+=high*.19*Math.exp(-Math.max(0,t-.045)*100)*(t>=.045?1:0);
   if(rank===3)value+=Math.sin(TAU*58*t)*.20*Math.exp(-t*9);
  }else{
   phase+=TAU*(145+370*Math.exp(-t*16))/sampleRate;
   const short=look.soundIdentity==='phase'?17:8;
   value=(Math.sin(phase)*.35+Math.sin(phase*1.504)*.13)*Math.exp(-t*short)+low*.25*decay;
   if(rank>=2)value+=Math.sin(phase*2.006)*.10*Math.exp(-t*14);
   if(rank===3)value+=Math.sin(TAU*72*t)*.19*body;
  }
  samples[i]=value*attack*(impact?1:Math.exp(-t*1.5))*(1-Math.min(1,(t/duration)**8));
 }
 // Equal bounded peak: higher ranks gain spectral weight, not a volume multiplier.
 const peak=samples.reduce((m,v)=>Math.max(m,Math.abs(v)),0);for(let i=0;i<samples.length;i++)samples[i]*=.52/Math.max(peak,1e-9);
 return {samples,sampleRate,duration:samples.length/sampleRate};
}
export function encodeWave(samples,sampleRate){
 const bytes=new Uint8Array(44+samples.length*2),view=new DataView(bytes.buffer);
 const str=(at,s)=>{for(let i=0;i<s.length;i++)bytes[at+i]=s.charCodeAt(i);};
 str(0,'RIFF');view.setUint32(4,bytes.length-8,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,samples.length*2,true);
 for(let i=0;i<samples.length;i++)view.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),true);return bytes;
}
export function createSpellAudioPlayer(context){
 const master=context.createGain();master.gain.value=.25;master.connect(context.destination);
 const cache=new Map(),active=new Set();
 function play(look,event,delay=0){
  const key=`${look.spellId}/${look.rank}/${event}`;
  if(!cache.has(key)){const sound=synthesizeSpellSound(look,{event,sampleRate:context.sampleRate}),buffer=context.createBuffer(1,sound.samples.length,context.sampleRate);buffer.copyToChannel(sound.samples,0);cache.set(key,buffer);}
  const source=context.createBufferSource();source.buffer=cache.get(key);source.connect(master);active.add(source);source.onended=()=>{active.delete(source);source.disconnect();};source.start(context.currentTime+delay);
 }
 return {async resume(){await context.resume();},cast(look,impactDelay){play(look,'release');play(look,'impact',impactDelay);},stop(){for(const source of active){source.stop();source.disconnect();}active.clear();}};
}
