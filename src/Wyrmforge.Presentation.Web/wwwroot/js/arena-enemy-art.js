// Original compact enemy pixel sprites. Four canonical enemy kinds use different
// anatomical silhouettes; C# still owns hitboxes, health, AI and attacks.
const palettes = [
    {edge:'#242726',body:'#788079',shade:'#4d5d58',light:'#bcc0aa',head:'#c0bda7',eye:'#242728',weapon:'#8b9382'},
    {edge:'#221b2d',body:'#5a486b',shade:'#3b3155',light:'#9477a8',head:'#72658b',eye:'#bcdbe7',weapon:'#ae9dbe'},
    {edge:'#301f1f',body:'#785442',shade:'#513629',light:'#bb8860',head:'#ac8c70',eye:'#281f20',weapon:'#d6b49a'},
    {edge:'#271d26',body:'#692e38',shade:'#482632',light:'#b86468',head:'#ae8379',eye:'#e6bc94',weapon:'#877c82'},
];
// Coordinates are drawn by hand at a single 32 x 36 scale. Material separation
// and limb/weapon outline, not saturated outlines, carry actor recognition.
export const enemyPixelFrames = [
    [ // Bone scavenger: ivory skull, exposed ribs and splayed two-foot gait.
        ['edge',-7,-13,14,12],['head',-6,-13,12,10],['shade',-5,-4,10,3],
        ['eye',-4,-9,3,3],['eye',2,-9,3,3],['edge',-2,-4,4,3],
        ['shade',-7,0,14,12],['light',-5,1,10,2],['head',-7,4,14,2],
        ['head',-6,8,12,2],['edge',-11,0,4,13],['body',-10,2,3,11],
        ['edge',8,0,4,13],['body',8,2,3,11],
        ['edge',-6,12,5,8],['edge',2,12,6,8],
        ['head',-5,13,3,6],['head',3,13,3,6],
        ['edge',-9,19,8,3],['edge',2,19,9,3],
    ],
    [ // Wraith: clear hood and torn hem, no circular purple orb.
        ['edge',-9,-15,18,17],['shade',-8,-15,16,15],
        ['body',-7,-14,14,8],['edge',-5,-10,10,8],['head',-4,-10,8,6],
        ['eye',-4,-7,3,2],['eye',2,-7,3,2],
        ['shade',-9,-1,18,13],['body',-8,-1,15,9],
        ['light',-8,0,4,9],['light',4,2,3,5],
        ['edge',-11,8,8,12],['shade',-10,7,7,13],
        ['edge',-1,7,11,14],['body',0,7,8,10],
        ['shade',-13,0,4,12],['shade',9,-3,4,16],
        ['light',-4,3,2,5],['shade',2,7,3,5],
        ['weapon',10,-9,3,8],
    ],
    [ // Executioner: cowl, asymmetrical pauldrons, narrow spear.
        ['edge',-7,-16,14,12],['head',-6,-15,12,10],
        ['shade',-5,-10,10,6],['eye',-3,-9,6,2],
        ['edge',-12,-4,24,8],['body',-11,-3,22,6],
        ['light',-11,-4,7,3],['light',4,-4,7,3],
        ['shade',-8,3,16,11],['body',-7,4,14,7],
        ['edge',-9,12,7,9],['edge',3,12,8,9],
        ['shade',-8,13,5,7],['shade',4,13,5,7],
        ['weapon',12,-17,3,38],['head',11,-19,5,6],
        ['shade',-3,-3,6,2],['light',-10,1,3,6],['weapon',12,-5,5,2],
        ['edge',-13,0,4,12],
    ],
    [ // Heavy armored revenant: broad red pauldrons, horned crest, massive arms.
        ['edge',-10,-15,20,12],['shade',-9,-14,18,11],
        ['light',-9,-17,6,7],['light',4,-17,6,7],
        ['head',-6,-12,12,7],['eye',-4,-9,3,2],['eye',2,-9,3,2],
        ['edge',-16,-4,32,13],['body',-14,-3,28,10],
        ['shade',-10,1,20,14],['body',-9,3,18,10],
        ['light',-10,-4,5,5],['light',7,-4,6,5],
        ['edge',-16,6,7,14],['shade',-14,7,6,12],
        ['edge',10,6,7,14],['shade',11,7,5,12],
        ['edge',-9,14,8,10],['edge',2,14,9,10],
        ['body',-8,15,6,7],['body',3,15,6,7],
    ],
];
const cached=new Map();
function paletteFor(enemy) {
    const kind=Math.max(0,Math.min(3,Number(enemy?.kind)||0));
    if(enemy?.hitFlash)return {edge:'#8e827a',body:'#f2e7d1',shade:'#b6a79c',
        light:'#fff7e5',head:'#fff4df',eye:'#7f655e',weapon:'#f6e8cf'};
    if(enemy?.frozen)return {edge:'#284b57',body:'#8abcc6',shade:'#5a91a3',
        light:'#d0edf0',head:'#badde7',eye:'#395c68',weapon:'#c6e7eb'};
    return palettes[kind];
}
export function drawEnemyPixelArt(ctx,enemy,light=null){
    if(!enemy)return;
    const kind=Math.max(0,Math.min(3,Number(enemy.kind)||0));
    const variant=enemy.hitFlash?'hit':enemy.frozen?'frozen':'normal';
    const key=kind+':'+variant;
    let art=cached.get(key);
    if(!art){
        const image=document.createElement('canvas');
        image.width=36;image.height=44;
        const brush=image.getContext('2d');
        const colors=paletteFor(enemy);
        for(const [part,x,y,w,h] of enemyPixelFrames[kind]){
            brush.fillStyle=colors[part];brush.fillRect(x+18,y+20,w,h);
        }
        art=image;cached.set(key,image);
    }
    const scale=Math.max(.62,Math.min(1.9,(Number(enemy.radius)||12)/12));
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(art,enemy.x-18*scale,enemy.y-20*scale,36*scale,44*scale);
    // Directional local illumination from actual spell cast, projectile or impact.
    // No halo, fake target ring or gameplay-based damage adjustment.
    if(light?.intensity>.045){
        const alpha=Math.min(.48,light.intensity*.58);
        const [r,g,b]=light.color;
        const side=light.sourceX<enemy.x?-1:1;
        ctx.fillStyle=`rgba(${r},${g},${b},${alpha})`;
        ctx.fillRect(enemy.x+(side<0?-9:5)*scale,enemy.y-10*scale,4*scale,15*scale);
        ctx.fillRect(enemy.x+(side<0?-6:2)*scale,enemy.y-14*scale,4*scale,3*scale);
    }
    ctx.restore();
}
