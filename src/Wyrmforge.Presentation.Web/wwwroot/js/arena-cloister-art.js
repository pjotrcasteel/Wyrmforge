// Source-informed original ruined-cloister art, not a Legion Breaker asset.
// Only the C# barrier rectangles appear as blocking masonry. Everything else is floor.
const ink = { water:'#253d3d', floor:'#3c5046', recess:'#131e20', stone:'#526157', mortar:'#8a9989', moss:'#2b3d32', parchment:'#bca885' };
function rng(seed) {
    let n=(seed|0)^0x6725a81b;
    return () => { n^=n<<13; n^=n>>>17; n^=n<<5; return (n>>>0)/4294967296; };
}
export function createCloisterPlan(env, width, height) {
    if (!env || env.district!=='sanctuary' || /caldera|ridge|snow|rime|glacier|frost/i.test(env.biome??'')) return null;
    const gates=(env.barriers??[]).filter(b=>b.kind==='gate').map(b=>b.y+b.height*.5).sort((a,b)=>a-b);
    const north=height*(gates[0]??.33), south=height*(gates[1]??.69);
    const court={x:width*.2,y:north+height*.045,w:width*.6,h:Math.max(height*.12,south-north-height*.09)};
    const path=Math.max(14,Math.min(width*.06,court.w*.16)), random=rng(env.seed);
    const slabs=Array.from({length:52},(_,i)=>{
        const side=i%4,t=random(),u=random();
        return {x:side===0||side===2?court.x+t*court.w:side===1?court.x+court.w-path*u:court.x+path*u,
            y:side===0?court.y+path*u:side===2?court.y+court.h-path*u:court.y+t*court.h,
            w:6+random()*16,h:5+random()*10,tone:random()};
    });
    const grass=Array.from({length:20},()=>({x:court.x+court.w*(.16+random()*.68),
        y:court.y+court.h*(.18+random()*.64),w:4+random()*21,h:2+random()*10}));
    return {width,height,north,south,court,path,slabs,grass,seed:env.seed};
}
export function drawCloisterFloor(ctx, plan) {
    if (!plan) return false;
    const {court:c,path:p}=plan;
    ctx.save();
    ctx.globalAlpha=.6;ctx.fillStyle=ink.recess;ctx.fillRect(c.x-5,c.y-5,c.w+10,c.h+10);
    ctx.globalAlpha=.45;ctx.fillStyle=ink.stone;ctx.fillRect(c.x,c.y,c.w,c.h);
    ctx.globalAlpha=.95;ctx.fillStyle='#203b34';ctx.fillRect(c.x+p,c.y+p,c.w-2*p,c.h-2*p);
    // Flooded monastery garden. Flat damp ground is intentionally traversable.
    ctx.globalAlpha=.54;ctx.fillStyle=ink.water;
    ctx.fillRect(c.x+p*1.7,c.y+c.h*.52,c.w-p*3.4,c.h*.16);
    ctx.globalAlpha=.23;ctx.fillStyle='#a6bbac';
    ctx.fillRect(c.x+p*2,c.y+c.h*.59,c.w*.28,2);
    for(const slab of plan.slabs){
        if(slab.tone<.28)continue;
        ctx.globalAlpha=.12+slab.tone*.2;ctx.fillStyle=slab.tone>.68?ink.mortar:ink.floor;
        ctx.fillRect(Math.round(slab.x),Math.round(slab.y),Math.round(slab.w),Math.round(slab.h));
    }
    // Pillar footprints are low, eroded inlays; no phantom solid columns.
    for(const y of [c.y+p*.55,c.y+c.h-p*.55])
        for(const x of [c.x+c.w*.18,c.x+c.w*.5,c.x+c.w*.82]){
            ctx.fillStyle=ink.recess;ctx.globalAlpha=.55;ctx.fillRect(x-10,y-7,20,14);
            ctx.fillStyle=ink.stone;ctx.globalAlpha=.38;ctx.fillRect(x-7,y-5,11,4);
            ctx.fillStyle=ink.moss;ctx.globalAlpha=.5;ctx.fillRect(x+4,y+1,6,5);
        }
    for(const mark of plan.grass){
        ctx.globalAlpha=.21;ctx.fillStyle=ink.moss;ctx.fillRect(mark.x,mark.y,mark.w,mark.h);
    }
    // Rectangular chapter-house foundation, deliberately adjacent to the north wing.
    const nx=plan.width*.73,ny=plan.north-plan.height*.052;
    ctx.globalAlpha=.54;ctx.fillStyle=ink.recess;ctx.fillRect(nx-43,ny-23,86,46);
    ctx.globalAlpha=.4;ctx.fillStyle=ink.stone;
    ctx.fillRect(nx-42,ny-22,84,4);ctx.fillRect(nx-42,ny-22,4,44);
    ctx.fillRect(nx+38,ny-22,4,17);ctx.fillRect(nx+38,ny+7,4,15);
    ctx.fillRect(nx-42,ny+19,29,3);ctx.fillRect(nx+9,ny+19,33,3);
    // Scriptorium foundation: a single distinct paper and timber footprint.
    const sx=plan.width*.81,sy=(plan.north+plan.south)*.5;
    ctx.globalAlpha=.37;ctx.fillStyle=ink.recess;ctx.fillRect(sx-32,sy-29,64,58);
    ctx.globalAlpha=.63;ctx.fillStyle='#534941';ctx.fillRect(sx-20,sy-7,40,17);
    ctx.globalAlpha=.58;ctx.fillStyle=ink.parchment;ctx.fillRect(sx-8,sy-5,18,11);
    ctx.globalAlpha=.63;ctx.fillStyle=ink.recess;ctx.fillRect(sx-5,sy,10,1);
    // A low cistern with water, near the south walk. This is not a collision.
    const bx=plan.width*.31,by=plan.south-plan.height*.07;
    ctx.globalAlpha=.55;ctx.fillStyle=ink.stone;
    ctx.fillRect(bx-24,by-14,48,4);ctx.fillRect(bx-24,by+10,48,4);
    ctx.fillRect(bx-24,by-10,5,20);ctx.fillRect(bx+19,by-10,5,20);
    ctx.globalAlpha=.63;ctx.fillStyle=ink.water;ctx.fillRect(bx-19,by-10,38,20);
    ctx.globalAlpha=.32;ctx.fillStyle='#9bbab1';ctx.fillRect(bx-13,by-3,18,2);
    ctx.restore();
    return true;
}
export function drawCloisterWall(ctx, barrier, width, height) {
    if(!barrier)return false;
    const x=barrier.x*width,y=barrier.y*height,w=barrier.width*width,h=barrier.height*height;
    if(!(w>0&&h>0))return false;
    ctx.save();
    if(barrier.open){
        if(barrier.kind==='gate'){
            ctx.globalAlpha=.36;ctx.fillStyle=ink.recess;ctx.fillRect(x,y,w,h);
            ctx.globalAlpha=.5;ctx.fillStyle=ink.stone;
            ctx.fillRect(x,y,Math.min(8,w*.12),h);
            ctx.fillRect(x+w-Math.min(8,w*.12),y,Math.min(8,w*.12),h);
        }
        ctx.restore();return true;
    }
    // Exact C# AABB hitbox; dark shadow is purely cosmetic.
    ctx.globalAlpha=.45;ctx.fillStyle=ink.recess;ctx.fillRect(x+3,y+h,w,7);
    ctx.globalAlpha=1;ctx.fillStyle=barrier.kind==='gate'?'#35463d':ink.stone;ctx.fillRect(x,y,w,h);
    ctx.globalAlpha=.4;ctx.fillStyle=ink.mortar;ctx.fillRect(x,y,w,Math.max(2,h*.2));
    ctx.globalAlpha=.22;ctx.fillStyle=ink.recess;
    for(let offset=17;offset<w;offset+=31)ctx.fillRect(x+offset,y+h*.38,2,h*.62);
    if(barrier.kind==='gate'){
        ctx.globalAlpha=.75;ctx.fillStyle='#142720';ctx.fillRect(x+4,y+4,Math.max(1,w-8),Math.max(1,h-8));
        ctx.globalAlpha=.6;ctx.fillStyle='#8ba393';
        ctx.fillRect(x+w*.5-8,y+h*.4,4,3);ctx.fillRect(x+w*.5+4,y+h*.4,4,3);
    }
    ctx.restore();return true;
}
export function drawCloisterMist(ctx,plan,seconds,reducedMotion=false){
    if(!plan)return;
    const c=plan.court;
    ctx.save();
    for(let i=0;i<3;i++){
        const drift=reducedMotion?0:Math.sin(seconds*.23+i*1.3)*c.w*.06;
        ctx.globalAlpha=.035+i*.005;ctx.fillStyle='#9fb1a5';
        ctx.fillRect(c.x+c.w*.12+drift,c.y+c.h*(.18+i*.27),c.w*.7,Math.min(10,c.h*.032));
    }
    ctx.restore();
}

export function drawCloisterReflections(ctx, plan, lights, seconds = 0, reducedMotion = false) {
    if (!plan || !lights?.length) return 0;
    const c = plan.court, p = plan.path;
    const water = { x: c.x + p * 1.7, y: c.y + c.h * .52,
        w: c.w - p * 3.4, h: c.h * .16 };
    if (water.w <= 0 || water.h <= 0) return 0;
    let reflections = 0;
    ctx.save();
    ctx.beginPath(); ctx.rect(water.x, water.y, water.w, water.h); ctx.clip();
    for (const light of lights) {
        const radius = Math.max(0, Number(light.radius) || 0);
        if (!radius || !(light.strength > 0)) continue;
        const nearestX = Math.max(water.x, Math.min(water.x + water.w, light.x));
        const nearestY = Math.max(water.y, Math.min(water.y + water.h, light.y));
        const distance = Math.hypot(light.x - nearestX, light.y - nearestY);
        if (distance >= radius) continue;
        const falloff = Math.pow(1 - distance / radius, 2);
        const alpha = Math.min(.30, light.strength * falloff * .20);
        if (alpha < .018) continue;
        const [r, g, b] = light.center;
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        // Only 3 one-pixel ripples inside the actual water footprint per light.
        // Surges are brighter because canonical spellLight strength increases.
        for (let line = 0; line < 3; line++) {
            const drift = reducedMotion ? 0 : Math.sin(seconds * 1.3 + line * 2.2) * 4;
            const y = nearestY + (line - 1) * 5;
            const width = Math.min(36 + radius * .13 - line * 7, water.w * .63);
            ctx.fillRect(nearestX + drift - width * .5, y, width, line === 1 ? 2 : 1);
            reflections++;
        }
    }
    ctx.restore();
    return reflections;
}


// Monastery elevations occupy the EXACT C# wall footprints, not decorative props
// in walkable floor. The fixed world-space roof/front/side planes do not rotate
// toward the viewer as the camera moves.
export function createCloisterElevationLayers(plan, barriers, width, height) {
    if (!plan) return [];
    return (barriers ?? []).filter(barrier => !barrier.open && barrier.width > 0 && barrier.height > 0)
        .map(barrier => ({ kind: 'masonry', depth: (barrier.y + barrier.height) * height,
            barrier, width, height }));
}

// Actors whose feet are north of a wall must disappear behind its masonry;
// actors south of it pass in front. Keep stable ties on the wall's side.
export function sortSceneDepthLayers(layers) {
    return [...layers].sort((a, b) => a.depth - b.depth ||
        Number(a.kind === 'masonry') - Number(b.kind === 'masonry'));
}

function stoneTop(ctx, x, topY, width) {
    ctx.fillStyle = '#778476';
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.lineTo(x + width, topY);
    ctx.lineTo(x + width + 6, topY - 5);
    ctx.lineTo(x + 6, topY - 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#46584e';
    ctx.beginPath();
    ctx.moveTo(x + width, topY);
    ctx.lineTo(x + width + 6, topY - 5);
    ctx.lineTo(x + width + 6, topY + 5);
    ctx.lineTo(x + width, topY + 10);
    ctx.closePath();
    ctx.fill();
}

export function drawCloisterElevation(ctx, barrier, width, height) {
    if (!barrier || barrier.open) return false;
    const x = barrier.x * width, y = barrier.y * height;
    const w = barrier.width * width, h = barrier.height * height;
    if (!(w > 0 && h > 0)) return false;
    const foot = y + h, elevation = Math.min(34, Math.max(21, h * 1.25));
    ctx.save();
    // A short north/south-aligned ruined curtain wall, NOT a camera-facing
    // spire, billboard, or non-colliding tower rooted in the combat floor.
    ctx.fillStyle = 'rgba(5, 10, 11, .4)';
    ctx.fillRect(x + 6, foot - 1, w, 6);
    if (barrier.kind === 'gate') {
        // An enormous iron grille reads as a prison, not a ruined monastery.
        // Preserve the actual crossing and flank it with weathered gateway ends.
        const pier = Math.min(16, Math.max(9, w * .055));
        for (const px of [x, x + w - pier]) {
            ctx.fillStyle = '#47594e';
            ctx.fillRect(px, foot - elevation, pier, elevation);
            stoneTop(ctx, px, foot - elevation, pier);
            ctx.fillStyle = '#839285';
            ctx.fillRect(px + 3, foot - elevation + 7, Math.max(2, pier - 8), 2);
            ctx.fillStyle = '#30443a';
            ctx.fillRect(px + 2, foot - 7, Math.max(2, pier - 4), 3);
        }
        // Faint warded empty space disappears completely when the gate opens.
        const innerX = x + pier, innerWidth = Math.max(0, w - pier * 2);
        ctx.fillStyle = 'rgba(78, 134, 105, .12)';
        ctx.fillRect(innerX, foot - elevation * .82, innerWidth, elevation * .82);
        ctx.fillStyle = 'rgba(147, 186, 143, .44)';
        ctx.fillRect(innerX, foot - 4, innerWidth, 2);
        ctx.fillStyle = 'rgba(151, 188, 160, .28)';
        for (let mark = innerX + 34; mark < innerX + innerWidth - 14; mark += 65) {
            ctx.fillRect(mark, foot - 15, 2, 7);
            ctx.fillRect(mark - 3, foot - 12, 8, 2);
        }
    } else {
        const segment = Math.max(22, Math.min(54, w / 5));
        for (let index = 0, offset = 0; offset < w; index++, offset += segment) {
            const span = Math.min(segment, w - offset);
            // Coherent stepped weather damage, never a repeated needle/spire skyline.
            const damage = [0, 7, 3, 11, 5, 2][index % 6];
            const rise = Math.max(12, elevation - damage);
            const left = x + offset, top = foot - rise;
            ctx.fillStyle = index % 3 === 0 ? '#47584e' : '#566459';
            ctx.fillRect(left, top, Math.max(1, span - 1), rise);
            stoneTop(ctx, left, top, Math.max(1, span - 1));
            ctx.fillStyle = '#303f39';
            ctx.fillRect(left + 2, foot - 7, Math.max(1, span - 6), 2);
            ctx.fillStyle = '#889286';
            ctx.fillRect(left + 5, top + 8, Math.max(1, span * .28), 1);
            ctx.fillStyle = '#33493c';
            ctx.fillRect(left + span * .6, foot - 5, Math.max(1, span * .19), 3);
        }
        // Rare buttresses read as structural supports at the correct footprint.
        // There are no tall random arches, giant pillars, or detached spires.
        ctx.fillStyle = '#394c43';
        for (const fraction of [.08, .92])
            ctx.fillRect(x + w * fraction - 4, foot - elevation * .8, 8, elevation * .8);
    }
    ctx.restore();
    return true;
}
