// World-space combat aftermath, driven exclusively by C# confirmed damage/death.
// Ground marks are pixel-stable decals, never simulated hitboxes or random bone art.
const FIRE = 1;
const EXPLOSIVE = 2;
const MAX_MARKS = 96;
const MAX_FLAMES = 12;
const MARK_LIFETIME = 32;
const FIRE_LIFETIME = 2.2;
const finite = (...values) => values.every(Number.isFinite);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const incendiary = traits => (Number(traits) & (FIRE | EXPLOSIVE)) === (FIRE | EXPLOSIVE);
const mix = (seed, ordinal) => {
    let v = Math.imul((seed | 0) ^ Math.imul(ordinal + 1, 0x9e3779b1), 0x85ebca6b);
    v = Math.imul(v ^ (v >>> 16), 0xc2b2ae35);
    return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
};

export function createCombatGroundState() {
    return { scope: null, lastHud: null, seen: new Set(), marks: [], flames: [] };
}

export function updateCombatGround(state, snapshot, now) {
    if (!Number.isFinite(now)) return;
    const scope = [snapshot.environment?.seed ?? 'none',
        snapshot.environment?.habitat ?? 'none',
        snapshot.trail?.nodeId ?? 'none',
        snapshot.hunt?.stage ?? 0].join(':');
    const hud = Number(snapshot.hud?.seconds ?? 0);
    if (scope !== state.scope || (Number.isFinite(state.lastHud) && hud < state.lastHud)) {
        Object.assign(state, createCombatGroundState());
        state.scope = scope;
    }
    state.lastHud = Number.isFinite(hud) ? hud : state.lastHud;
    for (const event of snapshot.combatWounds ?? []) {
        const id = Number(event.id);
        if (!Number.isSafeInteger(id) || id <= 0 || state.seen.has('hit:'+id) ||
            !finite(Number(event.x),Number(event.y),Number(event.radius),Number(event.severity))) continue;
        state.seen.add('hit:'+id);
        const dx = finite(event.directionX,event.directionY) ? Number(event.directionX) : 0;
        const dy = finite(event.directionX,event.directionY) ? Number(event.directionY) : 1;
        state.marks.push({
            seed:id,x:Number(event.x),y:Number(event.y),dx,dy,
            radius:clamp(event.radius,4,22),
            severity:clamp(event.severity,.10,1),kind:Number(event.kind),
            burned:Boolean(event.killed) && (Number(event.traits) & FIRE)!==0,
            born:now,life:MARK_LIFETIME
        });
    }
    for (const death of snapshot.deathBursts ?? []) {
        const id = Number(death.entityId);
        if (!Number.isSafeInteger(id) || (Number(death.traits) & FIRE) === 0 ||
            !finite(Number(death.x),Number(death.y),Number(death.bodyRadius ?? death.radius)) ||
            state.seen.has('fire:'+id)) continue;
        state.seen.add('fire:'+id);
        const radius=clamp(Number(death.bodyRadius ?? death.radius),5,24);
        state.flames.push({id,x:Number(death.x),y:Number(death.y),radius,born:now,
            explosive:incendiary(death.traits)});
        state.marks.push({seed:id+1000000,x:Number(death.x),y:Number(death.y),
            dx:0,dy:0,radius,severity:1,kind:Number(death.kind),
            burned:true,born:now,life:MARK_LIFETIME});
    }
    // No unbounded blood/burn memory during Endless. Expire off-screen too.
    state.marks = state.marks.filter(mark => now-mark.born < mark.life).slice(-MAX_MARKS);
    state.flames = state.flames.filter(fire => now-fire.born < FIRE_LIFETIME).slice(-MAX_FLAMES);
    // Keep the dedupe registry bounded while preserving all surviving effect IDs.
    if (state.seen.size > 1024) {
        state.seen.clear();
        for (const mark of state.marks) if (mark.seed < 1000000) state.seen.add('hit:'+mark.seed);
        for (const fire of state.flames) state.seen.add('fire:'+fire.id);
    }
}

// Runs after static terrain but before actors/darkness. Blood stains are grounded
// and deliberately muted; this is not a particle system or a bright ground aura.
export function drawCombatGround(ctx, state, now, reducedMotion=false) {
    for (const mark of state.marks) {
        const age=now-mark.born;
        if (age < 0 || age >= mark.life) continue;
        const fade=clamp((mark.life-age)/5,0,1);
        const scale=mark.radius * (.55+mark.severity*.7);
        const count=reducedMotion?3:7;
        ctx.save();
        ctx.globalAlpha *= fade;
        for (let index=0;index<count;index++) {
            const theta=mix(mark.seed,index*3)*Math.PI*2;
            const distance=Math.sqrt(mix(mark.seed,index*3+1))*scale*.9;
            const dx=mark.dx*scale*.3;
            const dy=mark.dy*scale*.3;
            const x=mark.x+Math.cos(theta)*distance+dx;
            const y=mark.y+Math.sin(theta)*distance*.45+dy;
            const r=scale*(.13 + mix(mark.seed,index*3+2)*.25);
            ctx.beginPath();
            ctx.ellipse(x,y,Math.max(.8,r),Math.max(.6,r*.40),theta*.2,0,Math.PI*2);
            const ashling=mark.kind===2;
            ctx.fillStyle=mark.burned ? 'rgba(35,24,20,.72)' :
                ashling ? 'rgba(83,37,21,.67)' : 'rgba(73,22,25,.67)';
            ctx.fill();
        }
        ctx.restore();
    }
}

// Cosmetic emissive flames over the normal collapse; does NOT imply approved
// dismemberment art or create damage. Real GPU emission follows later G5 work.
export function drawBurningRemains(ctx, state, now, reducedMotion=false) {
    for (const fire of state.flames) {
        const age=now-fire.born,fade=clamp(1-age/FIRE_LIFETIME,0,1);
        if (!fade || age<0) continue;
        ctx.save();
        ctx.globalAlpha*=fade*(fire.explosive?.82:.58);
        const tongues=reducedMotion?2:fire.explosive?6:3;
        for (let i=0;i<tongues;i++) {
            const unit=mix(fire.id,i),offset=(unit-.5)*fire.radius*1.7;
            const x=fire.x+offset,y=fire.y+(mix(fire.id,i+20)-.5)*fire.radius*.55;
            const height=fire.radius*(.5+fade*(.5+mix(fire.id,i+40)*.7));
            ctx.beginPath();
            ctx.moveTo(x-fire.radius*.19,y);
            ctx.quadraticCurveTo(x-fire.radius*.25,y-height*.45,x+fire.radius*.05,y-height);
            ctx.quadraticCurveTo(x+fire.radius*.29,y-height*.40,x+fire.radius*.18,y);
            ctx.closePath();
            ctx.fillStyle=i%2===0?'rgba(224,92,32,.64)':'rgba(246,167,65,.61)';
            ctx.fill();
        }
        ctx.restore();
    }
}

export const combatGroundDiagnostics = state => ({
    groundMarks:state.marks.length,flamingRemains:state.flames.length,
    bounded:state.marks.length<=MAX_MARKS&&state.flames.length<=MAX_FLAMES
});
