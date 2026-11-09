// Ancient Waygate: presentation only. The C# exit snapshot remains authoritative.
const TAU = Math.PI * 2;
const stones = ['#36363f', '#4a4750', '#59535b', '#67616a', '#777079'];
const runes = [[-35,-22],[-34,-4],[-34,15],[35,-22],[34,-4],[34,15],[-22,-48],[0,-57],[22,-48]];
function polygon(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
}
function brick(ctx, x, y, w, h, index) {
    ctx.fillStyle = '#17151d';
    ctx.fillRect(x-2,y-2,w+4,h+4);
    ctx.fillStyle = stones[index % stones.length];
    ctx.fillRect(x,y,w,h);
    ctx.fillStyle = 'rgba(204,190,183,.17)';
    ctx.fillRect(x+2,y+2,Math.max(1,w-4),2);
    ctx.fillStyle = 'rgba(0,0,0,.24)';
    ctx.fillRect(x+w-4,y+4,3,Math.max(1,h-6));
}
export function drawAncientWaygate(ctx, exit, elapsedSeconds = 0, locked = false) {
    if (!exit) return;
    const t = Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0;
    ctx.save();
    ctx.translate(Math.round(exit.x), Math.round(exit.y));
    // Footprint stays anchored to the existing authoritative exit location.
    ctx.fillStyle = 'rgba(3,4,9,.48)';
    ctx.beginPath(); ctx.ellipse(0,30,57,16,0,0,TAU); ctx.fill();
    ctx.fillStyle = '#27232d';
    polygon(ctx,[[-29,27],[-29,-20],[-25,-40],[-11,-51],[11,-51],[25,-40],[29,-20],[29,27]]);
    ctx.fill();
    if (!locked) {
        // No gradients, filters, offscreen allocations or per-frame texture uploads.
        ctx.save();
        polygon(ctx,[[-26,26],[-26,-19],[-22,-36],[-10,-45],[10,-45],[22,-36],[26,-19],[26,26]]);
        ctx.clip();
        ctx.fillStyle = '#1c102d'; ctx.fillRect(-30,-50,60,80);
        for (let i=0;i<7;i++) {
            const phase=t*.7+i*.87;
            ctx.strokeStyle = i%2 ? 'rgba(173,94,248,.34)' : 'rgba(106,68,199,.47)';
            ctx.lineWidth = i%3===0 ? 4 : 2;
            ctx.beginPath();
            ctx.ellipse(Math.sin(phase)*5, -8+Math.cos(phase*.8)*4, 9+i*4, 17+i*5, phase*.12, 0, TAU);
            ctx.stroke();
        }
        ctx.restore();
    } else {
        ctx.fillStyle = '#17171c';
        polygon(ctx,[[-26,26],[-26,-19],[-22,-36],[-10,-45],[10,-45],[22,-36],[26,-19],[26,26]]);
        ctx.fill();
        ctx.fillStyle = 'rgba(104,105,114,.13)';
        ctx.fillRect(-22,-8,44,2);
    }
    // Blocky masonry and keystone create a readable silhouette at mobile scale.
    for (const side of [-1,1]) {
        for (let i=0;i<4;i++) brick(ctx,side<0?-48:30,20-i*18,18,16,i+(side>0?2:0));
        brick(ctx,side<0?-52:29,24,23,13,3);
        for (let i=0;i<4;i++) {
            const angle=(side<0?Math.PI:0)+(side<0?-1:1)*(.16+i*.23);
            const cx=side*(29-i*6),cy=-42-i*5+(i*i*1.5);
            ctx.save();ctx.translate(cx,cy);ctx.rotate(angle*.17);
            brick(ctx,-10,-8,20,16,i+1);ctx.restore();
        }
    }
    brick(ctx,-12,-66,24,17,4);
    // Carved dragon crest and chipped stone teeth.
    ctx.fillStyle='#24232b';
    polygon(ctx,[[-12,-66],[-5,-75],[0,-69],[5,-75],[12,-66],[7,-57],[0,-53],[-7,-57]]);ctx.fill();
    ctx.fillStyle='#89818a';
    ctx.fillRect(-4,-64,3,3);ctx.fillRect(2,-64,3,3);
    ctx.strokeStyle='#9b8e9d';ctx.lineWidth=1;
    for (let i=0;i<runes.length;i++) {
        const [x,y]=runes[i];
        ctx.save();ctx.translate(x,y);
        ctx.strokeStyle=locked?'#69636e':(Math.sin(t*2.5-i*.5)>.0?'#d6a3ff':'#9563d9');
        ctx.globalAlpha=locked?.55:.88;
        ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(4,0);ctx.lineTo(0,5);ctx.lineTo(-4,0);ctx.closePath();ctx.stroke();
        ctx.beginPath();ctx.moveTo(0,-3);ctx.lineTo(0,3);ctx.stroke();ctx.restore();
    }
    // Ground threshold tells players where to enter without a floating label.
    ctx.fillStyle=locked?'#55515b':'#9c65d8';
    ctx.fillRect(-24,29,48,3);
    if (!locked) {
        ctx.fillStyle='rgba(188,123,255,.32)';
        ctx.fillRect(-21,33,42,3);
    }
    ctx.restore();
}
