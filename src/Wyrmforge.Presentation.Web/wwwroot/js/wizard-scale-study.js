// Developer lab consumer of shared sprites only. No second clock/game authority.
import {createSpriteAnimationState,updateSpriteAnimation} from './sprite-animation.js';
export function wizardScaleStudyEnabled(location=globalThis.location){
    try{return /\/enemy-lab\/?$/.test(location?.pathname??'')&&new URLSearchParams(location.search).get('wizardStudy')==='gothic-south-v003';}catch{return false;}
}
export function createWizardScaleStudy({enabled=false,fetcher=globalThis.fetch,ImageType=globalThis.Image,base=new URL('../art/review/grey-wizard-gothic-v003/',import.meta.url)}={}){
    let manifest,profile,pending,error=null,draws=0,last=null,lastMove=-Infinity,lastPlayer=null,moving=false;
    let animation=createSpriteAnimationState();const images=new Map();
    const preload=()=>!enabled?Promise.resolve(false):pending??=(async()=>{
        try{
            if(!fetcher||!ImageType)return false;
            [manifest,profile]=await Promise.all(['manifest.json','animation-profile.json'].map(async n=>{const r=await fetcher(new URL(n,base),{cache:'no-store'});if(!r.ok)throw Error('Study asset unavailable');return r.json();}));
            if(JSON.stringify(manifest.directions)!=='["S"]'||manifest.clips?.walk?.frames!==16)throw Error('Unsupported source study');
            await Promise.all(['idle','walk'].map(async name=>{
                const clip=manifest.clips[name];const image=await new Promise((ok,fail)=>{
                    const b=new ImageType();b.onload=()=>ok(b);b.onerror=fail;b.src=new URL(clip.image,base).href;
                });
                if(image.naturalWidth!==clip.cell*clip.frames||image.naturalHeight!==clip.cell)throw Error('Study atlas size mismatch');
                images.set(name,image);
            }));return true;
        }catch(e){error=String(e?.message??e);images.clear();manifest=null;return false;}
    })();
    function update(player,seconds,reducedMotion=false,paused=false){
        if(!enabled||!profile||!manifest||!player)return;
        if(last!=null&&seconds<last){animation=createSpriteAnimationState();lastPlayer=null;lastMove=-Infinity;}
        const dt=last==null?0:Math.max(0,Math.min(.1,seconds-last));last=seconds;
        const distance=lastPlayer?Math.hypot(player.x-lastPlayer.x,player.y-lastPlayer.y):0;
        if(!paused&&distance>.001&&distance<64)lastMove=seconds;
        if(!paused)moving=seconds-lastMove<.16;
        if(distance>=64){animation=createSpriteAnimationState();moving=false;}
        lastPlayer={x:player.x,y:player.y};
        updateSpriteAnimation(animation,profile,{direction:'S',distance:distance<64?distance:0,deltaSeconds:dt,moving,paused,reducedMotion});
    }
    function draw(ctx,player,cast){
        if(!enabled||images.size!==2||!manifest||!player)return false;
        // Unmade cast/direction actions are never invented. Inspection disables
        // casting; if someone enables it, original production mage stays fallback.
        if(cast&&Number.isFinite(cast.progress)&&cast.progress>=0&&cast.progress<1)return false;
        const name=moving?'walk':'idle',clip=manifest.clips[name],frame=moving?(animation.sample?.frame??0):0;
        const size=clip.worldSize*Math.max(.7,Math.min(1.45,(Number(player.radius)||12)/12));
        ctx.save();ctx.imageSmoothingEnabled=false;
        ctx.fillStyle='rgba(7,9,14,.38)';ctx.beginPath();ctx.ellipse(player.x,player.y,9,3,0,0,Math.PI*2);ctx.fill();
        ctx.drawImage(images.get(name),frame*clip.cell,0,clip.cell,clip.cell,
            player.x-clip.anchor[0]/clip.cell*size,player.y-clip.anchor[1]/clip.cell*size,size,size);
        ctx.restore();draws++;return true;
    }
    return {preload,update,draw,diagnostics:()=>({enabled,ready:images.size===2,error,draws,frame:animation.sample?.frame??0,moving,
        worldSize:manifest?.clips?.walk?.worldSize??null,scope:'enemy-lab-only S-facing scale/perspective study; not full 2.5D/material acceptance'})};
}
export const wizardScaleStudy=createWizardScaleStudy({enabled:wizardScaleStudyEnabled()});
if(wizardScaleStudyEnabled())void wizardScaleStudy.preload();
