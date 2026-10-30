// Original editable 2D pixel source. Reuses the established Bitmap painter.
// Authored pose keys, not a live animation/physics engine; C# remains authoritative.
export const cell = [64, 80];
export const pivot = [34, 70];
export const palette = {
    ink:'#22232b', deep:'#30303a', shadow:'#41414b', grey:'#60616a', fold:'#73747b',
    light:'#898b90', rim:'#a2a3a3', wool:'#50515b', inner:'#393a43', worn:'#6b6668',
    skinShadow:'#76503d', skin:'#b5805d', skinLight:'#d4a783', skinPale:'#e0bc96',
    hairDark:'#767572', hair:'#aaa9a1', hairLight:'#d0cec0', beardLight:'#e4dfce',
    woodDark:'#312b2a', wood:'#675044', woodLight:'#92715a', iron:'#454550',
    leatherDark:'#332b29', leather:'#594337', leatherLight:'#826349', buckle:'#9c835a',
    redDark:'#692d32', red:'#b63c31', orange:'#e86f34', ember:'#f6b157', core:'#f2d9a2',
};

// Sixteen authored contact/recoil/pass/high poses. Coordinates are native pixels.
// [bodyX, bodyY, leftFootX, leftFootY, rightFootX, rightFootY, leftKneeX,
//  rightKneeX, freeHandY, staffHandY, hemLeft, hemRight, beardLag, hatLag]
export const walkKeys = [
    [0,0,27,70,39,66,28,38,46,44,-1,1,0,0],
    [0,1,27,70,39,65,28,37,45,44,-1,2,0,0],
    [1,1,27,69,38,65,29,36,44,43,0,2,-1,0],
    [1,0,28,68,38,66,29,36,44,43,1,1,-1,-1],
    [1,-1,28,67,39,67,30,37,45,44,2,0,-1,-1],
    [1,-1,28,66,39,68,30,38,46,44,2,-1,0,-1],
    [0,0,28,65,40,69,30,39,47,45,1,-1,0,0],
    [0,0,28,65,40,70,29,39,47,45,0,-1,1,0],
    [0,0,28,66,40,70,29,39,47,45,1,-1,1,0],
    [0,1,28,65,40,70,30,39,47,45,2,-1,1,0],
    [-1,1,29,65,40,69,31,38,46,44,2,0,1,0],
    [-1,0,29,66,39,68,31,38,45,44,1,1,1,1],
    [-1,-1,28,67,39,67,30,37,44,43,0,2,0,1],
    [-1,-1,28,68,39,66,29,37,44,43,-1,2,0,1],
    [0,0,27,69,39,65,28,37,45,43,-1,1,-1,0],
    [0,0,27,70,39,65,28,38,46,44,-1,0,-1,0],
];
export const idleKey = [0,0,28,69,39,69,29,38,46,44,0,0,0,0];

export function authoredLayers(key) {
    const [bx,by,lx,ly,rx,ry,lk,rk,fy,sy,hl,hr,bl,hat]=key;
    const layers=[];
    let commands;
    const layer=(name,fn)=>{commands=[];fn();layers.push({name,commands});};
    const poly=(colour,points)=>commands.push({op:'poly',colour,points});
    const rect=(colour,x,y,w,h)=>commands.push({op:'rect',colour,x,y,w,h});
    const line=(colour,x0,y0,x1,y1,width=1)=>commands.push({op:'line',colour,x0,y0,x1,y1,width});
    const body=(points)=>points.map(([x,y])=>[x+bx,y+by]);
    const foot=(x,y,k)=>{
        poly('ink',[[k-3,54+by],[k+3,54+by],[x+3,y-4],[x+4,y],[x-4,y],[x-4,y-4]]);
        poly('inner',[[k-2,54+by],[k+2,54+by],[x+2,y-5],[x-3,y-5]]);
        rect('leatherDark',x-3,y-5,6,5);rect('leather',x-3,y-4,5,3);
        line('leatherLight',x-2,y-4,x+1,y-4);line('ink',x-4,y,x+3,y);
        line('wood',x-3,y-1,x+2,y-1);rect('leatherDark',x-1,y-5,1,2);
    };
    layer('legs-boots',()=>{
        // Farther boot drawn first; distinct shin/knee/boot locations per source pose.
        if(ly>ry){foot(rx,ry,rk);foot(lx,ly,lk);}else{foot(lx,ly,lk);foot(rx,ry,rk);}
    });
    layer('inner-robe',()=>{
        poly('ink',body([[26,34],[42,34],[43,61],[40,65],[36,64],[34,58],[31,64],[26,64],[24,59]]));
        poly('inner',body([[28,36],[40,36],[40,60],[37,63],[34,55],[30,63],[27,62]]));
        line('grey',33+bx,44+by,31+bx,61+by);line('deep',36+bx,44+by,38+bx,62+by);
    });
    layer('cloak-body',()=>{
        // Left and right panels change their silhouettes and folds with the authored pose.
        poly('ink',body([[27,32],[23,34],[21,41],[22,49],[20+hl,60],[23+hl,64],[27+hl,63],[30,59],[32,45],[34,37]]));
        poly('wool',body([[27,33],[24,35],[23,41],[24,49],[22+hl,60],[24+hl,62],[27+hl,61],[29,57],[30,44],[33,37]]));
        poly('grey',body([[27,34],[25,36],[25,45],[24+hl,58],[25+hl,61],[27+hl,59],[28,47],[31,37]]));
        poly('light',body([[27,35],[26,40],[26,48],[25+hl,57],[26+hl,57],[28,43],[31,36]]));
        poly('shadow',body([[24,44],[24,50],[22+hl,59],[24+hl,60],[25,48]]));
        poly('ink',body([[38,32],[43,33],[47,37],[46,46],[47+hr,57],[48+hr,62],[44+hr,65],[39+hr,62],[36,49],[35,38]]));
        poly('wool',body([[39,33],[43,34],[45,38],[44,46],[45+hr,57],[46+hr,61],[44+hr,63],[41+hr,60],[38,48],[37,37]]));
        poly('grey',body([[40,34],[42,35],[43,40],[42,48],[44+hr,59],[43+hr,61],[41,55],[39,42]]));
        poly('fold',body([[41,36],[42,37],[42,47],[44+hr,59],[43+hr,59],[40,47]]));
        line('deep',45+bx,48+by,46+bx+hr,60+by);
        // Small worn hem breaks, deliberately sparse; no random texture generation.
        rect('ink',23+bx+hl,62+by,1,2);rect('worn',25+bx+hl,60+by,1,1);
        rect('ink',44+bx+hr,62+by,1,2);rect('shadow',44+bx+hr,57+by,1,2);
        rect('deep',41+bx,56+by,1,1);
    });
    const grip={x:16+bx,y:sy};
    layer('staff-albedo',()=>{
        // Thin continuous haft and a compact, source-selected charred Fire knot.
        line('woodDark',grip.x,grip.y,14,69,3);line('wood',grip.x,grip.y,14,69,1);
        line('woodDark',14,24,grip.x,grip.y,3);line('woodLight',14,25,grip.x,grip.y,1);
        poly('woodDark',[[14,25],[11,22],[10,18],[12,15],[11,12],[13,13],[15,16],[16,19],[15,23]]);
        poly('wood',[[13,23],[12,21],[11,18],[13,17],[12,14],[14,16],[15,19],[14,22]]);
        line('woodLight',12,17,12,21);rect('iron',12,24,4,1);rect('ink',13,26,3,1);
        poly('redDark',[[13,16],[15,18],[14,22],[12,21],[12,19]]);
        poly('red',[[13,17],[14,18],[14,20],[13,22],[12,20]]);
        line('orange',13,18,13,21);rect('ember',13,19,1,1);
    });
    layer('sleeves-hands',()=>{
        // Anatomical right is viewer-left in the south view. Both shoulders/arms articulate.
        poly('ink',body([[25,34],[22,35],[19,39],[grip.x-bx-2,sy-by-2],[grip.x-bx-2,sy-by+3],[20,sy-by+4],[25,44],[28,36]]));
        poly('grey',body([[24,35],[22,37],[21,41],[grip.x-bx,sy-by-2],[grip.x-bx+3,sy-by-1],[22,45],[25,42],[27,36]]));
        line('fold',22+bx,37+by,21+bx,41+by);line('shadow',22+bx,43,20+bx,sy+2);
        rect('skinShadow',grip.x-2,sy-1,5,4);rect('skin',grip.x-2,sy-1,4,3);
        line('skinLight',grip.x-2,sy-1,grip.x+1,sy-1);rect('skinShadow',grip.x,sy+1,2,1);
        poly('ink',body([[42,34],[46,36],[48,41],[47,fy-by+2],[43,fy-by+2],[43,42],[40,37]]));
        poly('grey',body([[43,35],[45,37],[46,41],[45,fy-by],[44,fy-by],[44,41],[41,37]]));
        line('fold',44+bx,37+by,45+bx,41+by);rect('skinShadow',44+bx,fy,3,3);rect('skin',44+bx,fy,2,2);
    });
    layer('belt',()=>{
        poly('leatherDark',body([[29,46],[38,46],[39,49],[29,50]]));
        line('leather',29+bx,47+by,38+bx,47+by);rect('buckle',33+bx,47+by,3,2);
        rect('leatherDark',34+bx,47+by,1,1);line('leather',36+bx,48+by,37+bx,56+by);
        poly('leatherDark',body([[39,48],[42,49],[43,54],[39,55]]));rect('leather',40+bx,50+by,2,3);rect('buckle',40+bx,50+by,1,1);
    });
    layer('shoulder-cowl',()=>{
        poly('ink',body([[27,31],[34,33],[40,31],[44,34],[40,39],[35,41],[29,39],[24,35]]));
        poly('grey',body([[27,32],[34,35],[40,32],[42,34],[38,38],[34,39],[29,37],[26,35]]));
        line('light',27+bx,33+by,33+bx,36+by);line('fold',34+bx,37+by,41+bx,34+by);
        line('shadow',29+bx,38+by,34+bx,40+by);
    });
    layer('hair-face',()=>{
        poly('ink',body([[27,24],[39,24],[42,28],[41,36],[38,38],[29,37],[25,33],[25,28]]));
        poly('hairDark',body([[27,25],[39,25],[40,29],[40,35],[38,37],[36,32],[29,35],[26,33],[26,28]]));
        poly('hair',body([[27,26],[29,27],[28,32],[27,35],[26,32]]));
        line('hairLight',27+bx,28+by,27+bx,33+by);line('hair',39+bx,28+by,40+bx,34+by);
        poly('skinShadow',body([[29,25],[37,25],[39,28],[37,33],[30,33],[28,29]]));
        poly('skin',body([[30,26],[36,26],[38,28],[36,32],[31,32],[29,29]]));
        line('skinLight',30+bx,26+by,35+bx,26+by);rect('skinPale',33+bx,28+by,2,3);
        line('hairLight',29+bx,27+by,31+bx,27+by);line('hairLight',35+bx,27+by,37+bx,27+by);
        rect('ink',30+bx,28+by,1,1);rect('ink',36+bx,28+by,1,1);rect('skinShadow',34+bx,31+by,2,1);
    });
    layer('beard',()=>{
        poly('hairDark',body([[29,31],[32,32],[35,31],[38,32],[38,37],[36+bl,43],[34+bl,47],[33+bl,43],[30+bl,41],[28,36]]));
        poly('hair',body([[29,32],[32,33],[35,32],[37,33],[36,38],[35+bl,44],[33+bl,42],[31+bl,40],[29,36]]));
        poly('hairLight',body([[30,33],[32,34],[34,33],[36,33],[35,39],[34+bl,43],[32+bl,39],[30,36]]));
        line('beardLight',31+bx,34+by,32+bx+bl,39+by);line('hairDark',34+bx,35+by,34+bx+bl,43+by);
        line('hairLight',36+bx,34+by,35+bx+bl,40+by);rect('beardLight',32+bx,32+by,3,1);
        line('hairDark',32+bx,33+by,34+bx,33+by);
    });
    layer('hat',()=>{
        const pts=(p)=>p.map(([x,y])=>[x+bx+(y<16?hat:0),y+by]);
        poly('ink',pts([[20,22],[25,19],[29,11],[35,7],[39,8],[43,13],[42,15],[38,12],[36,12],[38,19],[47,21],[50,23],[42,26],[26,25],[19,24]]));
        poly('wool',pts([[22,22],[27,20],[30,12],[35,8],[38,9],[41,12],[39,11],[35,10],[35,14],[37,20],[46,22],[43,24],[27,24],[21,23]]));
        poly('grey',pts([[29,19],[31,13],[35,10],[37,11],[34,13],[35,18],[33,20]]));
        line('fold',31+bx,15+by,34+bx+hat,11+by);line('shadow',35+bx,14+by,36+bx,19+by);
        poly('leatherDark',body([[27,19],[36,18],[38,20],[27,22],[25,22]]));
        line('leather',28+bx,20+by,36+bx,19+by);rect('leatherLight',29+bx,20+by,2,1);
        line('light',23+bx,22+by,30+bx,22+by);line('grey',32+bx,22+by,44+bx,22+by);
        line('deep',27+bx,24+by,40+bx,25+by);
    });
    layer('crystal-emission',()=>{
        // Separate descriptor/export; review combines it but gameplay/light is untouched.
        rect('orange',13,18,1,3);rect('ember',13,19,1,1);rect('core',13,19,1,1);
    });
    return {layers,grip,feet:{left:[lx,ly],right:[rx,ry]},body:[bx,by]};
}
