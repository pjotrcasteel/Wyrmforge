// Single-source pixel fire. No additional projectile, hitbox, damage or RNG.
// Every ember belongs to a canonical projectile or collision from C#.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function firePixelProfile(event){
    const rank=clamp(Number(event?.rank)||1,1,3);
    const radius=clamp(Number(event?.radius)||7,4,19);
    return {rank,radius,tail:radius*(1.35+.28*rank+(event?.surge? .55:0)),
        pieces:3+rank*2+(event?.surge?5:0),surge:event?.surge===true,
        inferno:event?.inferno===true};
}
export function drawFirePixelProjectile(ctx,event,reducedMotion=false){
    if(!event)return;
    const {rank,radius:r,tail,surge,inferno}=firePixelProfile(event);
    ctx.save();
    if(!reducedMotion){
        // Directional, intermittent hot pixels in the wake; no circular cast UI.
        ctx.fillStyle='#723c31';ctx.globalAlpha=.45;
        ctx.fillRect(-tail,Math.round(r*.2),r*.55,Math.max(2,r*.3));
        ctx.fillStyle='#bb6138';ctx.globalAlpha=.65;
        ctx.fillRect(-tail*.65,-r*.35,Math.max(2,r*.65),Math.max(2,r*.35));
        if(rank>=2){
            ctx.fillStyle='#e78b4a';ctx.globalAlpha=.76;
            ctx.fillRect(-tail*.86,r*.5,3,3);
            ctx.fillRect(-tail*.44,-r*.8,3,3);
        }
        if(surge||inferno){
            ctx.fillStyle='#f3c88a';ctx.globalAlpha=.7;
            ctx.fillRect(-tail*.85,-r*1.03,3,3);
            ctx.fillRect(-tail*.37,r*.83,4,3);
        }
    }
    // Hand-plotted irregular flame tip, charred outside, molten center.
    ctx.globalAlpha=1;
    ctx.fillStyle='#7b392d';ctx.fillRect(-r*.9,-r*.55,r*1.25,r*1.1);
    ctx.fillStyle='#cf6033';ctx.fillRect(-r*.28,-r*.7,r*1.15,r*1.4);
    ctx.fillStyle='#ef9748';ctx.fillRect(-r*.08,-r*.43,r*.95,r*.86);
    ctx.fillStyle='#ffd28b';ctx.fillRect(r*.34,-r*.25,r*.55,r*.5);
    if(rank>=2){
        ctx.fillStyle='#ed8a45';ctx.fillRect(-r*.65,-r*.92,r*.5,r*.3);
        ctx.fillRect(-r*.72,r*.62,r*.45,r*.32);
    }
    if(rank>=3){
        ctx.fillStyle='#f4c889';ctx.fillRect(r*.08,-r*1.18,r*.38,r*.34);
        ctx.fillRect(r*.12,r*.89,r*.52,r*.29);
    }
    if(surge){
        ctx.fillStyle='#f5e1b4';ctx.fillRect(r*.68,-r*.22,r*.44,r*.44);
    }
    ctx.restore();
}
export function fireBurstProfile(impact){
    const rank=clamp(Number(impact?.rank)||1,1,3);
    const t=clamp(Number(impact?.progress)||0,0,1);
    return {rank,progress:t,segments:5+rank*2+(impact?.surge?5:0),
        radius:(11+rank*6)*(.45+t*.84)*(impact?.surge?1.36:1),
        alpha:1-t,surge:impact?.surge===true};
}
export function drawFirePixelImpact(ctx,impact,reducedMotion=false){
    if(!impact)return;
    const profile=fireBurstProfile(impact);
    if(profile.alpha<=0)return;
    const {rank,segments,surge}=profile;
    const radius=profile.radius*(reducedMotion?.72:1);
    const px=clamp(radius*.17,2,7);
    ctx.save();
    ctx.globalAlpha*=profile.alpha;
    ctx.fillStyle='#78382d';ctx.fillRect(-radius*.38,-radius*.3,radius*.76,radius*.6);
    ctx.fillStyle='#c95f35';ctx.fillRect(-radius*.27,-radius*.25,radius*.54,radius*.5);
    ctx.fillStyle='#f6ad61';ctx.fillRect(-radius*.14,-radius*.15,radius*.28,radius*.3);
    // Faceted scatter reads as a collision rather than an unrelated glowing ring.
    const count=reducedMotion?Math.max(5,rank+4):segments;
    for(let i=0;i<count;i++){
        const theta=i*Math.PI*2/count+.21;
        const distance=radius*(.57+(i%3)*.12);
        const x=Math.round(Math.cos(theta)*distance),y=Math.round(Math.sin(theta)*distance);
        ctx.fillStyle=i%3===0?'#ed9c57':i%3===1?'#a74f33':'#f5c07b';
        ctx.fillRect(x-px*.5,y-px*.5,px+(rank===3&&i%4===0?3:0),px);
    }
    if(surge){
        // The real Surge expands the SAME blast with a second cross-shaped set
        // of bright shards; it never invents a second projectile or impact.
        ctx.fillStyle='#f9dfad';
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
            ctx.fillRect(dx*radius*.98-2,dy*radius*.98-2,5,5);
        }
    }
    ctx.restore();
}
