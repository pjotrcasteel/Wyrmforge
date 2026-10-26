// Hollowed bone-shatter deaths: presentation-only pixel bone sprites.
// Rendering is deterministic per C# entity ID. No combat, loot or C# physics changes.
// 25% shatter (two distinct timings); others keep the approved skeletal collapse.
const BONES=Object.freeze({
    skull:[
        '....dddddd....','..ddbbbbbbdd..','.ddbhhhhhhbdd.','dbbhhhhhhhhbbd',
        'dbbhoohhoohbbd','dbbhoohhoohbbd','dbbbhhhhhhbbbd','.dbbsbbssbbbd.',
        '..dbbbbbbbbd..','..dbobobobbd..','...dbbbbbbd...','....dddddd....'
    ],
    ribs:[
        '.....dddd.....','....dbbbbd....','..ddbshhsbdd..','.dbbbbssbbbbd.',
        '.dbbbd..dbbbd.','..dbbd..dbbd..','.dbbbd..dbbbd.','.dbbbd..dbbbd.',
        '..dbbd..dbbd..','...dbbbbbd...','....dbbbd....','.....dd......'
    ],
    pelvis:[
        '.ddd......ddd.','dbbbdd..ddbbbd','dbbbbhddhbbbbd','.dbbbbbbbbbb d',
        '..dbbboobb bd.','...dbbbbbbd...','....dbbbbd....','.....dddd.....'
    ],
    long:[
        'dd....dd','dbd..dbd','dbbddbbd','.dbbbbd.','..dbbd..','..dbbd..',
        '..dbbd..','..dbbd..','..dbbd..','.dbbbbd.','dbbddbbd','dd....dd'
    ],
    short:[
        'dd...dd','dbd.dbd','dbbbb bd','.dbbbd.','..dbd..','.dbbbd.','dbbdbbd','dd...dd'
    ],
    hand:[
        'd.d.d.d.','dbdbdbdd','.dbbbbdd','..dbbbd.','...dbd..','...ddd..'
    ],
    jaw:[
        '.dddddddd.','dbbbbbbbbd','dbodbd bod','dbbbbbbbbd','.dddddddd.'
    ],
    spine:[
        '.ddd.','dbbbd','.dbd.','dbbbd','.dbd.','dbbbd','.ddd.'
    ]
});
const COLORS=Object.freeze({d:'#454c4a',b:'#c6c4b3',h:'#e7e0ca',s:'#818981',o:'#262c2c'});
const SOURCE_PARTS=Object.freeze([
    {name:'skull',kind:'skull',x:0,y:-68,side:0},
    {name:'jaw',kind:'jaw',x:0,y:-55,side:0},
    {name:'ribs',kind:'ribs',x:0,y:-44,side:0},
    {name:'spineA',kind:'spine',x:0,y:-37,side:0},
    {name:'spineB',kind:'spine',x:0,y:-28,side:0},
    {name:'pelvis',kind:'pelvis',x:0,y:-21,side:0},
    {name:'upperL',kind:'long',x:-16,y:-42,side:-1,limb:'leftArm'},
    {name:'upperR',kind:'long',x:16,y:-42,side:1,limb:'rightArm'},
    {name:'handL',kind:'hand',x:-22,y:-27,side:-1,limb:'leftArm'},
    {name:'handR',kind:'hand',x:22,y:-27,side:1,limb:'rightArm'},
    {name:'thighL',kind:'long',x:-9,y:-21,side:-1},
    {name:'thighR',kind:'long',x:9,y:-21,side:1},
    {name:'shinL',kind:'long',x:-9,y:-10,side:-1,limb:'leftLeg'},
    {name:'shinR',kind:'long',x:9,y:-10,side:1}
]);
const SPRITES=new Map();
const STYLES=Object.freeze(['collapse','shatter-burst','buckle-burst']);

function hash32(id,salt=0) {
    const n=Number(id);
    if(!Number.isSafeInteger(n)||n<0)return 0;
    let value=(Math.imul(n|0,0x9e3779b1)^((Math.floor(n/4294967296)|0)>>>0)^salt)>>>0;
    value=Math.imul(value^(value>>>16),0x7feb352d)>>>0;
    value=Math.imul(value^(value>>>15),0x846ca68b)>>>0;
    return (value^(value>>>16))>>>0;
}
function unit(seed){return (seed>>>0)/4294967296;}

export function selectHollowDeathStyle(entityId) {
    const n=Number(entityId);
    if(!Number.isSafeInteger(n)||n<0)return 'collapse';
    const dice=hash32(n,0x42b0c0de)%12;
    return dice===0?'shatter-burst':dice<=2?'buckle-burst':'collapse';
}
export function hollowBoneBurstDelay(style) {
    return style==='buckle-burst'?.25:style==='shatter-burst'?.035:Infinity;
}
export function hollowBoneFragments(injury='standard') {
    const missingLeftArm=injury==='one-arm-left';
    return SOURCE_PARTS.filter(part=>!(missingLeftArm&&part.limb==='leftArm')).map(part=>({
        ...part,kind:injury==='broken-arm-right'&&part.name==='upperR'?'short':
            injury==='broken-leg-left'&&part.limb==='leftLeg'?'short':part.kind
    }));
}

function boneSprite(kind){
    if(SPRITES.has(kind))return SPRITES.get(kind);
    const rows=BONES[kind],width=Math.max(...rows.map(r=>r.length)),height=rows.length;
    const doc=globalThis.document;
    if(!doc?.createElement)return null;
    const surface=doc.createElement('canvas');
    surface.width=width;surface.height=height;
    const target=surface.getContext('2d',{alpha:true});
    if(!target)return null;
    paintBone(target,kind);
    SPRITES.set(kind,surface);
    return surface;
}
function paintBone(ctx,kind){
    const rows=BONES[kind];
    for(let y=0;y<rows.length;y++){
        const row=rows[y];
        for(let x=0;x<row.length;){
            const glyph=row[x];
            if(!COLORS[glyph]){x++;continue;}
            let end=x+1;
            while(end<row.length&&row[end]===glyph)end++;
            ctx.fillStyle=COLORS[glyph];
            ctx.fillRect(x,y,end-x,1);
            x=end;
        }
    }
}
function drawPiece(ctx,kind) {
    const sprite=boneSprite(kind);
    if(sprite)ctx.drawImage(sprite,-sprite.width/2,-sprite.height/2);
    else {
        const rows=BONES[kind],width=Math.max(...rows.map(r=>r.length));
        ctx.translate(-width/2,-rows.length/2);
        paintBone(ctx,kind);
    }
}
function fragmentMotion(corpse,part,index,elapsed,reducedMotion){
    const seed=hash32(corpse.entityId,0x52744111^Math.imul(index+1,0x63d83595));
    const s1=unit(seed),s2=unit(hash32(seed,0x172a9a11));
    const settle=1.04+s2*.28;
    const t=Math.min(Math.max(0,elapsed),settle);
    const initialX=part.x*.25;
    const vx=(part.side===0?(s1-.5)*100:part.side*(29+25*s1))+(s2-.5)*24;
    const vy=-(62+50*s2);
    const floor=-4-(index%3)*2;
    // A short impulse makes the creature visibly SHATTER, rather than showing
    // a recognisable upright skeleton at the first few rendered frames.
    const impulse=1-Math.exp(-t*14);
    let x=initialX+vx*(.15+.76*t)*impulse;
    let y=Math.min(floor,part.y+vy*(t+.07*impulse)+145*t*t);
    if(t<settle&&y>=floor){
        const amplitude=4+8*s1;
        y=floor-amplitude*Math.abs(Math.sin(t*14+index))*(1-t/settle);
    }
    const rotation=(s1-.5)*1.1+(s2>.5?1:-1)*(1.6+s1*3.1)*(reducedMotion?settle:t);
    if(reducedMotion||elapsed>=settle){
        x=initialX+vx*(.15+.76*settle)*(1-Math.exp(-settle*14));
        y=floor;
    }
    return {x,y,rotation:reducedMotion?rotation*.5:rotation};
}

export function drawHollowBoneBurst(ctx,corpse,age,reducedMotion=false) {
    const delay=hollowBoneBurstDelay(corpse?.deathStyle);
    if(!Number.isFinite(delay)||!Number.isFinite(age)||age<delay)return false;
    const elapsed=Math.max(0,age-delay);
    const opacity=Math.max(0,Math.min(1,Number(corpse.opacity??(age<3?1:4-age))));
    const scale=Math.max(.65,Math.min(1.8,Number(corpse.radius||11)/11))*
        Math.max(.9,Math.min(1.1,Number(corpse.visualScale)||1));
    ctx.save();
    ctx.globalAlpha*=opacity;
    ctx.imageSmoothingEnabled=false;
    ctx.filter='none';
    ctx.translate(corpse.x,corpse.y);
    ctx.scale(scale,scale);
    const pieces=hollowBoneFragments(corpse.deathInjury);
    // Grounded shadow supports visual depth while the pieces land and settle.
    ctx.fillStyle='rgba(11,15,16,.30)';
    ctx.fillRect(-45,-2,90,3);
    for(let i=0;i<pieces.length;i++){
        const piece=pieces[i],pose=fragmentMotion(corpse,piece,i,elapsed,reducedMotion);
        ctx.save();
        ctx.translate(Math.round(pose.x),Math.round(pose.y));
        ctx.rotate(pose.rotation);
        drawPiece(ctx,piece.kind);
        ctx.restore();
    }
    // A compact dust-and-impact plume, never a damaging gameplay projectile.
    if(!reducedMotion&&elapsed<.58){
        const count=14;
        for(let i=0;i<count;i++){
            const s=unit(hash32(corpse.entityId,0x5d177a^Math.imul(i+1,0x51e6)));
            const angle=i*Math.PI*2/count+s*.45;
            const distance=elapsed*(20+60*s);
            const y=-34+Math.sin(angle)*distance+140*elapsed*elapsed;
            const x=Math.cos(angle)*distance;
            ctx.fillStyle=i%3?'rgba(171,163,140,.58)':'rgba(214,199,169,.72)';
            const size=elapsed<.12?3:2;
            ctx.fillRect(Math.round(x),Math.round(Math.min(-4,y)),size,size);
        }
    }
    ctx.restore();
    return true;
}
