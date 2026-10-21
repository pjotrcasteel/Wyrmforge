// Ground-only authoring of a seeded Wet Forest recipe. C# owns all raised solid scenery.
// Flat pools and leafbeds are shallow/traversable; do not paint false walls or neon danger.
function rng(seed) {
    let value = (seed | 0) ^ 0x54ad7231;
    return () => { value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return (value >>> 0) / 4294967296; };
}
const mix = (a,b,t) => a + (b-a)*t;
const ease = t => t*t*(3-2*t);

export function wetForestTrailAt(trail, fraction) {
    if (!trail?.length) return { x: .5, width: .12 };
    const n = trail.length - 1;
    const i = Math.min(n - 1, Math.max(0, Math.floor(fraction * n)));
    const a = trail[i], b = trail[i+1];
    const t = ease(Math.max(0, Math.min(1, (fraction - a.y) / (b.y - a.y))));
    return { x: mix(a.x,b.x,t), width: mix(a.width,b.width,t) };
}

function mark(ctx,x,y,rx,ry,fill,alpha=1) {
    ctx.fillStyle=fill;ctx.globalAlpha=alpha;
    ctx.beginPath();ctx.ellipse(Math.round(x),Math.round(y),rx,ry,0,0,Math.PI*2);ctx.fill();
}

function road(ctx,recipe,w,h,random) {
    const points=recipe.trail;
    ctx.save();
    ctx.beginPath();
    for(let i=0;i<=90;i++){
        const y=h*i/90, sample=wetForestTrailAt(points,i/90);
        const x=w*(sample.x-sample.width*.5);
        if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    for(let i=90;i>=0;i--){
        const sample=wetForestTrailAt(points,i/90);
        ctx.lineTo(w*(sample.x+sample.width*.5),h*i/90);
    }
    ctx.closePath();ctx.fillStyle='#403e34';ctx.globalAlpha=.72;ctx.fill();
    ctx.strokeStyle='#665c46';ctx.globalAlpha=.18;ctx.lineWidth=3;ctx.stroke();
    // Ruts follow the same meandering path: not a straight road pasted onto a painted backdrop.
    for(const edge of [-.27,.27]){
        ctx.beginPath();
        for(let i=0;i<=80;i++){
            const f=i/80, p=wetForestTrailAt(points,f), x=w*(p.x+p.width*edge)+Math.sin(i*.71)*1.7;
            if(!i)ctx.moveTo(x,f*h);else ctx.lineTo(x,f*h);
        }
        ctx.strokeStyle='#1c2320';ctx.globalAlpha=.36;ctx.lineWidth=3;ctx.stroke();
    }
    for(let i=0;i<215;i++){
        const f=random(),p=wetForestTrailAt(points,f);
        const spread=(random()-.5)*p.width*w*.9;
        const x=w*p.x+spread,y=f*h;
        ctx.fillStyle=random()<.45?'#716954':'#232e2b';
        ctx.globalAlpha=.12+random()*.24;
        ctx.fillRect(Math.round(x),Math.round(y),2+Math.floor(random()*9),1+Math.floor(random()*4));
    }
    // A branch worn by actual travelers connects the main route to the local story site.
    // Its course bends toward the clearing; it is not a forced corridor or solid boundary.
    const junction = wetForestTrailAt(points, recipe.siteY);
    const sx = junction.x * w, sy = recipe.siteY * h;
    const tx = recipe.siteX * w, ty = recipe.siteY * h;
    if (Math.abs(tx - sx) > 42) {
        ctx.globalAlpha = .62;
        ctx.strokeStyle = '#413c31';
        ctx.lineWidth = 22;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(mix(sx,tx,.22),sy-28,mix(sx,tx,.75),ty+21,tx,ty);
        ctx.stroke();
        ctx.strokeStyle = '#685d48';
        ctx.globalAlpha = .19;
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    ctx.restore();
}

function siteTrace(ctx,recipe,w,h,random) {
    const x=recipe.siteX*w,y=recipe.siteY*h;
    ctx.save();
    mark(ctx,x,y,72,39,'#35372f',.83);
    if(recipe.site==='forgotten-graves'){
        for(let i=0;i<6;i++){
            const px=x+(i%3-1)*26+(random()-.5)*10, py=y+(Math.floor(i/3)-.5)*34;
            mark(ctx,px,py,13,6,'#171e1b',.57);
            ctx.fillStyle='#6c6556';ctx.globalAlpha=.48;ctx.fillRect(Math.round(px-2),Math.round(py-9),4,8);
        }
    } else if(recipe.site==='abandoned-camp'){
        mark(ctx,x+11,y-7,19,11,'#1c201c',.7);
        mark(ctx,x+8,y-9,9,5,'#524237',.7);
        for(let i=0;i<5;i++){ctx.fillStyle='#6c5340';ctx.globalAlpha=.48;ctx.fillRect(x-53+i*12,y+14+(i%2)*4,19,3);}
    } else if(recipe.site==='ruined-waystone'){
        for(let i=0;i<9;i++){
            const angle=i*Math.PI*2/9,px=x+Math.cos(angle)*37,py=y+Math.sin(angle)*18;
            mark(ctx,px,py,9,5,i%2?'#474d42':'#596057',.62);
        }
    } else {
        // Wheel ruts lead from the track into the wreck. The upright cart is C# physical scenery.
        ctx.strokeStyle='#201e1b';ctx.globalAlpha=.58;ctx.lineWidth=3;
        for(const dy of [-9,9]){ctx.beginPath();ctx.moveTo(x-88,y+dy-10);ctx.lineTo(x+5,y+dy);ctx.stroke();}
        for(let i=0;i<7;i++){ctx.fillStyle='#685c49';ctx.globalAlpha=.44;ctx.fillRect(x-39+i*12,y+20,9,3);}
    }
    ctx.restore();
}

export function drawWetForestGround(ctx, plan) {
    const recipe=plan.wetForest;
    if(!recipe)return;
    const w=plan.width,h=plan.height,r=randomFromPlan(plan.seed);
    ctx.save();
    // Broad leaf litter and watery depressions create actual identity, not a uniform green wash.
    for(const patch of recipe.ground){
        const x=patch.x*w,y=patch.y*h,rx=patch.radiusX*w,ry=patch.radiusY*h;
        if(patch.kind==='puddle'){
            mark(ctx,x,y,rx+3,ry+3,'#101e1d',.76);
            mark(ctx,x,y,rx,ry,'#273936',.72);
            ctx.strokeStyle='#637166';ctx.globalAlpha=.17;ctx.lineWidth=1.5;
            ctx.beginPath();ctx.ellipse(x-2,y-1,rx*.68,ry*.6,0,Math.PI*1.06,Math.PI*1.82);ctx.stroke();
        }else if(patch.kind==='leafbed'){
            mark(ctx,x,y,rx,ry,'#514333',.47);
            for(let j=0;j<9;j++){ctx.fillStyle='#66523c';ctx.globalAlpha=.21;
                ctx.fillRect(x+(r()-.5)*rx*1.7,y+(r()-.5)*ry*1.6,2,1);}
        }else mark(ctx,x,y,rx,ry,patch.kind==='moss'?'#345047':'#302b27',patch.kind==='moss'?.4:.5);
    }
    road(ctx,recipe,w,h,r);
    siteTrace(ctx,recipe,w,h,r);
    // Wyrm pressure kills discrete patches and trees; it never recolors the whole forest.
    const corruption=Math.max(0,Math.min(1,plan.corruption));
    for(let i=0;i<Math.round(corruption*21);i++){
        const x=(.07+r()*.86)*w,y=(.08+r()*.85)*h,rx=9+r()*33;
        mark(ctx,x,y,rx,5+r()*12,'#241b19',.35+corruption*.25);
        ctx.fillStyle='#805042';ctx.globalAlpha=.13+corruption*.13;
        ctx.fillRect(Math.round(x),Math.round(y),3+r()*5,2);
    }
    ctx.restore();
}
function randomFromPlan(seed){return rng(seed^0x294f10b);}
