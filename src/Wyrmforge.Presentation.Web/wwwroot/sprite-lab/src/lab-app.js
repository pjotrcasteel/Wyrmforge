/* WyrmForge Sprite Lab: dependency-free browser renderer and importer. */
(() => {
    'use strict';
    const C = globalThis.SpriteLabCore;
    const $ = id => document.getElementById(id);
    const dom = Object.fromEntries(['assetLabel','assetNote','fileInput','dropzone','imageDimensions','loadDemo','loadWalk','loadBefore','layoutPreset',
        'columns','rows','frameWidth','frameHeight','offsetX','offsetY','fps','fpsValue','scale','scaleValue','resetLayout',
        'stageCanvas','stageHint','sheetCanvas','playBtn','stepBtn','manualBtn','chaseBtn','modeStatus','compass',
        'directionName','directionMeta','frameIndicator','filmstrip','checkList','resultPill','statFrames','statDirections',
        'statNative','statSize','exportAtlas','exportManifest','exportReport','footerState'].map(id => [id, $(id)]));
    const ctx = dom.stageCanvas.getContext('2d');
    const sheetCtx = dom.sheetCanvas.getContext('2d');
    const state = {
        image: null, filename: 'hollow-walk-reference-5dir.png', pixelData: null,
        cfg: { ...C.DEFAULT_CONFIG }, dir: 'S', frame: 0, fps: 8, playing: true, scale: 1,
        mode: 'manual', player: { x: 530, y: 270 }, actor: { x: 360, y: 240 }, pixelCandidate: false,
        started: 0, last: 0, elapsed: 0, checks: [], dragging: false, mage: null,
    };
    function readConfig() {
        state.cfg = {
            layout: dom.layoutPreset.value, columns: Number(dom.columns.value), rows: Number(dom.rows.value),
            cellWidth: Number(dom.frameWidth.value), cellHeight: Number(dom.frameHeight.value),
            offsetX: Number(dom.offsetX.value), offsetY: Number(dom.offsetY.value), fps: Number(dom.fps.value),
        };
        return state.cfg;
    }
    function updateFields(cfg) {
        Object.entries({layoutPreset:cfg.layout,columns:cfg.columns,rows:cfg.rows,frameWidth:cfg.cellWidth,
            frameHeight:cfg.cellHeight,offsetX:cfg.offsetX,offsetY:cfg.offsetY,fps:cfg.fps}).forEach(([key,value]) => {dom[key].value = value;});
        readConfig();
    }
    function autoGrid(w, h, mode = 'five') {
        if(mode==='single')return {...C.DEFAULT_CONFIG,layout:'single',rows:1,columns:16,cellWidth:w/16,cellHeight:h,fps:12};
        // The annotated image from chat includes a title and compass labels. Detect that known poster size on import.
        if (w === 1536 && h === 1024) return { ...C.DEFAULT_CONFIG, offsetX: 154, offsetY: 151, cellWidth: 166, cellHeight: 159 };
        const rows = mode === 'eight' ? 8 : 5;
        return { ...C.DEFAULT_CONFIG, layout: mode, rows, cellWidth: Math.floor(w / 8), cellHeight: Math.floor(h / rows), offsetX: 0, offsetY: 0 };
    }
    function readPixels(img) {
        const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        const c = cv.getContext('2d',{willReadFrequently:true}); c.drawImage(img,0,0);
        try { return c.getImageData(0,0,cv.width,cv.height); } catch { return null; }
    }
    function loadImage(src, name, isDemo = false) {
        const img = new Image();
        img.onload = () => {
            state.image = img; state.filename = name; state.pixelData = readPixels(img);
            state.pixelCandidate = name==='hollow-local-3d-pixel-walk-v1.png';
            dom.stageCanvas.style.imageRendering=state.pixelCandidate?'pixelated':'auto';
            if(state.pixelCandidate&&!state.mage)loadMageReference();
            const layout = img.naturalWidth===img.naturalHeight*16?'single':isDemo || img.naturalHeight * 5 === img.naturalWidth * 3 ? 'five' : 'eight';
            updateFields(autoGrid(img.naturalWidth, img.naturalHeight, layout));
            state.dir = layout==='single'?'SE':'S'; state.frame = 0; state.elapsed = 0; state.playing = true; state.mode = 'manual';
            state.actor = { x: 360, y: 240 }; state.player = { x: 530, y: 270 };
            dom.playBtn.textContent = '❚❚'; dom.assetLabel.textContent = name.replace(/\.(png|jpg|jpeg|webp)$/i,'').replaceAll('-',' ').toUpperCase();
            dom.imageDimensions.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
            dom.footerState.textContent = `Loaded ${name}`;
            dom.assetNote.textContent = state.pixelCandidate ? 'Local RTX 5090 proof: one textured, skinned 3D character; 16 crisp pixel frames. Native-size review; one facing only. Art approval and runtime integration remain pending.' : isDemo
                ? 'Original concept reference: painted background and five drawn views. This is not a production atlas.'
                : layout==='single'?'Rigged walk: one painted character, constant limb lengths, alternating planted feet. One view only; review the gait before adding facings.'
                : 'Earlier generated walk. Compare its changing anatomy and inconsistent foot motion with the rigged version.';
            dom.exportAtlas.textContent=layout==='single'?'Export walk sheet ↗':'Export 8-way atlas ↗';
            dom.chaseBtn.textContent=layout==='single'?'Stride test':'Chase player';
            dom.chaseBtn.disabled=state.pixelCandidate;
            setMode('manual'); refresh();
        };
        img.onerror = () => { dom.footerState.textContent = `Unable to load ${name}. Use Import to select a local image.`; };
        img.src = src;
    }
    function loadFile(file) {
        if (!file || !file.type.startsWith('image/')) return;
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {URL.revokeObjectURL(url); loadImageFromImage(img,file.name);};
        img.onerror = () => {URL.revokeObjectURL(url);dom.footerState.textContent='Invalid image file.';};
        img.src=url;
    }
    async function loadMageReference() {
        try {
            const manifest=await fetch('../art/manifest.json').then(r=>r.json());
            const frame=manifest.atlases.actors.frames['mage.S.idle'];
            const image=new Image();
            image.onload=()=>{state.mage={image,frame};};
            image.src='../art/actors.png';
        } catch { /* The existing player marker remains if reference art is offline. */ }
    }
    function loadImageFromImage(img, name) {
        // Reuse a decoded upload directly: object URLs are revoked safely after decode.
        state.image=img;state.filename=name;state.pixelData=readPixels(img);state.pixelCandidate=false;dom.chaseBtn.disabled=false;
        const mode = img.naturalWidth===img.naturalHeight*16?'single':(img.naturalHeight * 5 === img.naturalWidth * 3 || img.naturalHeight === 800 && img.naturalWidth === 1328) ? 'five' : 'eight';
        updateFields(autoGrid(img.naturalWidth,img.naturalHeight,mode));
        state.dir=mode==='single'?'SE':'S';state.frame=0;state.elapsed=0;state.playing=true;
        dom.playBtn.textContent='❚❚';dom.imageDimensions.textContent=`${img.naturalWidth} × ${img.naturalHeight}`;
        dom.assetLabel.textContent=name.toUpperCase();dom.footerState.textContent=`Loaded ${name}`;
        dom.assetNote.textContent='Imported artwork. Format checks do not establish motion quality or visual approval.';
        setMode('manual');refresh();
    }
    function setMode(mode) {
        state.mode=mode;dom.manualBtn.classList.toggle('active',mode==='manual');dom.chaseBtn.classList.toggle('active',mode==='chase');
        dom.modeStatus.textContent=mode==='chase'?'CHASE ACTIVE':'MANUAL';
        dom.stageHint.textContent=state.cfg.layout==='single'?(mode==='chase'?'Stride test: ground speed follows the walk cycle':'One three-quarter view · inspect planted and passing feet'):mode==='chase'?'Move the target: the Hollow will pursue':'Tap the arena to position the player target';
        dom.compass.querySelectorAll('button[data-dir]').forEach(b=>b.disabled=b.dataset.dir==='STAY'||mode==='chase'||state.cfg.layout==='single'&&b.dataset.dir!=='SE');
        if(state.cfg.layout==='single')state.dir='SE';
        updateDirection();
    }
    function setDir(dir) {
        if (!C.DIRECTIONS.includes(dir)) return;
        state.dir=dir; state.elapsed=0; updateDirection();buildFilmstrip();drawSheet();
    }
    function updateDirection() {
        const info=C.DIR_INFO[state.dir],p=C.directionFrame(state.cfg,state.dir,state.frame);
        dom.directionName.innerHTML=`${info[0]} <span>${info[1]}</span>`;
        dom.directionMeta.textContent=state.cfg.layout==='single'?'One drawn view · 16 rigged frames':`Row ${p.row+1} · ${p.flipX?'mirrored original':'original artwork'}`;
        dom.compass.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.dir===state.dir));
    }
    function refresh() {
        if (!state.image) return;
        state.checks=C.validate(state.image.naturalWidth,state.image.naturalHeight,state.cfg,state.pixelData);
        const fatal=state.checks.some(c=>c.severity==='fail');
        const warnings=state.checks.some(c=>c.severity==='warn');
        dom.resultPill.className=`result-pill ${fatal?'fail':warnings?'warn':'pass'}`;
        dom.resultPill.textContent=fatal?'NOT READY':warnings?'REVIEW':'FORMAT PASS';
        dom.checkList.replaceChildren(...state.checks.map(item=>{
            const el=document.createElement('div');el.className='check';
            const marker=document.createElement('div');marker.className='check-icon '+item.severity;marker.textContent={pass:'✓',warn:'!',fail:'×'}[item.severity];
            const content=document.createElement('div');const title=document.createElement('strong'),desc=document.createElement('p');
            title.textContent=item.title;desc.textContent=item.message;content.append(title,desc);el.append(marker,content);return el;
        }));
        const meta=C.describeLayout(state.cfg);
        dom.exportAtlas.disabled=state.checks.some(c=>c.severity==='fail'&&c.title!=='Background is not transparent');
        dom.statFrames.textContent=meta.framesPerDirection;dom.statDirections.textContent=meta.playableDirections;
        dom.statNative.textContent=meta.authoredDirections;dom.statSize.textContent=`${state.cfg.cellWidth} × ${state.cfg.cellHeight}`;
        dom.fpsValue.textContent=`${state.cfg.fps} FPS`;dom.scaleValue.textContent=`${Math.round(state.scale*100)}%`;
        updateDirection();buildFilmstrip();drawSheet();
    }
    function renderFrame(g,image,config,dir,frame,x,y,scale=1) {
        if (!image) return;
        const p=C.directionFrame(config,dir,frame);
        const sourceValid=p.x>=0&&p.y>=0&&p.width>0&&p.height>0&&p.x+p.width<=image.naturalWidth&&p.y+p.height<=image.naturalHeight;
        if (!sourceValid) return;
        const h=p.height*scale,w=p.width*scale;
        g.save();g.translate(Math.round(x),Math.round(y));if(p.flipX)g.scale(-1,1);
        g.imageSmoothingEnabled=!state.pixelCandidate;
        g.drawImage(image,p.x,p.y,p.width,p.height,-w/2,-h*(state.pixelCandidate?72/96:.85),w,h);
        g.restore();
    }
    function drawSheet() {
        const g=sheetCtx,{width:w,height:h}=dom.sheetCanvas;
        g.clearRect(0,0,w,h);g.fillStyle='#0e1417';g.fillRect(0,0,w,h);
        if (!state.image) return;
        const pad=12, sx=(w-pad*2)/state.image.naturalWidth, sy=(h-pad*2)/state.image.naturalHeight;
        const scale=Math.min(sx,sy),drawW=state.image.naturalWidth*scale,drawH=state.image.naturalHeight*scale;
        const ax=(w-drawW)/2,ay=(h-drawH)/2;
        g.drawImage(state.image,ax,ay,drawW,drawH);
        const p=C.directionFrame(state.cfg,state.dir,state.frame);
        const px=ax+p.x*scale,py=ay+p.y*scale;
        if(px>w||py>h||px+p.width*scale<0||py+p.height*scale<0)return;
        g.fillStyle='rgba(218,177,119,.16)';g.fillRect(px,py,p.width*scale,p.height*scale);
        g.strokeStyle='#f1c17e';g.lineWidth=2;g.strokeRect(px+.5,py+.5,p.width*scale,p.height*scale);
    }
    function buildFilmstrip() {
        if (!state.image)return;
        const existing=dom.filmstrip.children.length===state.cfg.columns;
        if(!existing){dom.filmstrip.replaceChildren();for(let i=0;i<Math.min(32,state.cfg.columns);i++){
            const btn=document.createElement('button');btn.type='button';btn.className='frame-cell';btn.dataset.frame=i;
            const cv=document.createElement('canvas');cv.width=72;cv.height=72;const caption=document.createElement('span');caption.textContent=String(i+1).padStart(2,'0');
            btn.append(cv,caption);btn.addEventListener('click',()=>{state.frame=i;state.elapsed=0;state.playing=false;dom.playBtn.textContent='▶';markFilmstrip();drawSheet();});dom.filmstrip.append(btn);
        }}
        [...dom.filmstrip.children].forEach((btn,i)=>{
            const cv=btn.querySelector('canvas'),g=cv.getContext('2d');g.clearRect(0,0,72,72);
            const s=Math.min(64/state.cfg.cellWidth,64/state.cfg.cellHeight);
            try {renderFrame(g,state.image,state.cfg,state.dir,i,36,Math.min(66,60+(state.cfg.cellHeight*.18*s)),s);}catch{/* invalid layout warning is displayed */}
        });markFilmstrip();
    }
    function markFilmstrip() {
        [...dom.filmstrip.children].forEach((el,i)=>el.classList.toggle('active',i===state.frame));
        dom.frameIndicator.textContent=`${String(state.frame+1).padStart(2,'0')} / ${String(state.cfg.columns).padStart(2,'0')}`;
    }
    function drawStage() {
        const w=dom.stageCanvas.width,h=dom.stageCanvas.height;
        ctx.fillStyle='#182025';ctx.fillRect(0,0,w,h);
        // Quiet top-down game-space, not a fake image asset.
        const grad=ctx.createRadialGradient(w*.49,h*.65,20,w*.5,h*.55,w*.75);grad.addColorStop(0,'#303934');grad.addColorStop(1,'#0d1519');
        ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
        ctx.lineWidth=1;ctx.strokeStyle='rgba(160,177,162,.06)';for(let x=0;x<w;x+=44){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
        for(let y=0;y<h;y+=44){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
        // Player marker: orange central rune with a small readable target indicator.
        const player=state.player;
        if(state.pixelCandidate&&state.mage){
            const {image,frame:f}=state.mage;
            const nativeScale=dom.stageCanvas.width/Math.max(1,dom.stageCanvas.getBoundingClientRect().width);
            ctx.save();ctx.imageSmoothingEnabled=false;
            ctx.drawImage(image,f.x,f.y,f.w,f.h,player.x-f.w*nativeScale/2,player.y-f.h*nativeScale,f.w*nativeScale,f.h*nativeScale);
            ctx.restore();
        } else {
        ctx.strokeStyle='rgba(214,166,110,.46)';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(player.x,player.y,24,0,Math.PI*2);ctx.stroke();
        ctx.fillStyle='rgba(218,171,109,.16)';ctx.beginPath();ctx.arc(player.x,player.y,21,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#efc68b';ctx.font='bold 19px Georgia,serif';ctx.textAlign='center';ctx.fillText('✦',player.x,player.y+7);
        }
        ctx.fillStyle='#c7b899';ctx.font='10px system-ui,sans-serif';ctx.fillText('PLAYER',player.x,player.y+42);
        // Locomotion path and footprint (the real game will own the movement physics).
        if(state.mode==='chase'){
            ctx.save();ctx.setLineDash([5,8]);ctx.strokeStyle='rgba(210,171,114,.25)';ctx.lineWidth=1;
            ctx.beginPath();ctx.moveTo(state.actor.x,state.actor.y);ctx.lineTo(player.x,player.y);ctx.stroke();ctx.restore();
        }
        ctx.save();ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(state.actor.x,state.actor.y+8,40,13,0,0,Math.PI*2);ctx.fill();ctx.restore();
        if(state.image){const fit=(state.pixelCandidate?dom.stageCanvas.width/Math.max(1,dom.stageCanvas.getBoundingClientRect().width):Math.min(200/state.cfg.cellWidth,208/state.cfg.cellHeight))*state.scale;
            try{renderFrame(ctx,state.image,state.cfg,state.dir,state.frame,state.actor.x,state.actor.y,fit);}catch{/* inspector reports layout errors */}
        }
        ctx.fillStyle='rgba(203,213,206,.75)';ctx.font='12px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('THE HOLLOW',state.actor.x,state.actor.y+29);
    }
    function tick(ms) {
        if(!state.started)state.started=ms;
        const delta=state.last?Math.min((ms-state.last)/1000,.05):0;state.last=ms;
        if(state.image&&state.playing){
            state.elapsed+=delta;
            const frameDuration=1/Math.max(1,Number(state.cfg.fps)||8);
            if(state.elapsed>=frameDuration){
                const advance=Math.floor(state.elapsed/frameDuration);state.frame=(state.frame+advance)%Math.max(1,state.cfg.columns);
                state.elapsed%=frameDuration;markFilmstrip();drawSheet();
            }
        }
        if(state.mode==='chase'&&state.image&&state.cfg.layout==='single'&&state.playing){
            const fit=Math.min(200/state.cfg.cellWidth,208/state.cfg.cellHeight)*state.scale;
            const speed=(32/.62)*Number(state.cfg.fps)/state.cfg.columns*fit;
            state.actor.x+=speed*delta;
            if(state.actor.x>dom.stageCanvas.width+100)state.actor.x=-100;
        }else if(state.mode==='chase'&&state.image&&state.cfg.layout!=='single'){
            const dx=state.player.x-state.actor.x,dy=state.player.y-state.actor.y,dist=Math.hypot(dx,dy);
            if(dist>52){const speed=63; const step=Math.min(speed*delta,dist-52);state.actor.x+=dx/dist*step;state.actor.y+=dy/dist*step;}
            const dir=C.directionFromVector(dx,dy);
            if(dir!==state.dir){state.dir=dir;updateDirection();buildFilmstrip();drawSheet();}
        }
        drawStage();requestAnimationFrame(tick);
    }
    function stageCoord(evt) {
        const rect=dom.stageCanvas.getBoundingClientRect();
        return { x:Math.max(20,Math.min(700,(evt.clientX-rect.left)/rect.width*720)),
            y:Math.max(20,Math.min(420,(evt.clientY-rect.top)/rect.height*440)) };
    }
    function downloadBlob(name,blob) {
        const link=document.createElement('a');const url=URL.createObjectURL(blob);link.href=url;link.download=name;
        document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
    }
    function downloadJson(name,value) {downloadBlob(name,new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}));}
    function stem() {return state.filename.replace(/\.(png|jpg|jpeg|webp)$/i,'').replace(/[^\w-]+/g,'-');}
    function exportAtlas() {
        if(state.cfg.layout==='single'){
            const cv=document.createElement('canvas');cv.width=state.cfg.columns*state.cfg.cellWidth;cv.height=state.cfg.cellHeight;
            cv.getContext('2d').drawImage(state.image,0,0);
            cv.toBlob(blob=>{if(blob)downloadBlob(`${stem()}-walk.png`,blob);},'image/png');return;
        }
        if(!state.image||state.checks.some(c=>c.title==='Frames outside image'||c.title==='Invalid grid configuration'||c.title==='Missing direction rows'))return;
        const fw=state.cfg.cellWidth,fh=state.cfg.cellHeight,cols=state.cfg.columns;
        const cv=document.createElement('canvas');cv.width=cols*fw;cv.height=8*fh;
        if(cv.width*cv.height>64_000_000){dom.footerState.textContent='Atlas too large to export';return;}
        const g=cv.getContext('2d');
        C.DIRECTIONS.forEach((dir,row)=>{for(let frame=0;frame<cols;frame++){
            const p=C.directionFrame(state.cfg,dir,frame);g.save();
            if(p.flipX){g.translate((frame+1)*fw,row*fh);g.scale(-1,1);g.drawImage(state.image,p.x,p.y,fw,fh,0,0,fw,fh);}
            else g.drawImage(state.image,p.x,p.y,fw,fh,frame*fw,row*fh,fw,fh);
            g.restore();
        }});
        cv.toBlob(blob=>{if(blob)downloadBlob(`${stem()}-8way-export.png`,blob);},'image/png');
    }
    function bind() {
        dom.loadWalk.addEventListener('click',()=>loadImage('./assets/hollow-walk-rig-v2.png','hollow-walk-rig-v2.png'));
        dom.loadBefore.addEventListener('click',()=>loadImage('./assets/hollow-walk-v1.png','hollow-walk-v1.png'));
        dom.loadDemo.addEventListener('click',()=>loadImage('./assets/hollow-walk-reference-5dir.png','hollow-walk-reference-5dir.png',true));
        dom.fileInput.addEventListener('change',e=>loadFile(e.target.files?.[0]));
        dom.dropzone.addEventListener('dragover',e=>{e.preventDefault();dom.dropzone.classList.add('dragging');});
        dom.dropzone.addEventListener('dragleave',()=>dom.dropzone.classList.remove('dragging'));
        dom.dropzone.addEventListener('drop',e=>{e.preventDefault();dom.dropzone.classList.remove('dragging');loadFile(e.dataTransfer.files?.[0]);});
        dom.compass.querySelectorAll('button[data-dir]').forEach(btn=>btn.addEventListener('click',()=>{if(state.mode==='manual')setDir(btn.dataset.dir);}));
        dom.manualBtn.addEventListener('click',()=>setMode('manual'));
        dom.chaseBtn.addEventListener('click',()=>setMode('chase'));
        dom.playBtn.addEventListener('click',()=>{state.playing=!state.playing;dom.playBtn.textContent=state.playing?'❚❚':'▶';});
        dom.stepBtn.addEventListener('click',()=>{state.playing=false;dom.playBtn.textContent='▶';state.frame=(state.frame+1)%Math.max(1,state.cfg.columns);markFilmstrip();drawSheet();});
        ['columns','rows','frameWidth','frameHeight','offsetX','offsetY'].forEach(id=>dom[id].addEventListener('change',()=>{readConfig();state.frame=0;refresh();}));
        dom.layoutPreset.addEventListener('change',()=>{
            const mode=dom.layoutPreset.value;dom.rows.value=mode==='single'?1:mode==='five'?5:8;
            dom.columns.value=mode==='single'?16:8;
            if(state.image){dom.frameHeight.value=Math.floor((state.image.naturalHeight-Number(dom.offsetY.value))/Number(dom.rows.value));dom.frameWidth.value=Math.floor((state.image.naturalWidth-Number(dom.offsetX.value))/Number(dom.columns.value));}
            readConfig();setMode('manual');refresh();
        });
        dom.resetLayout.addEventListener('click',()=>{if(state.image){updateFields(autoGrid(state.image.naturalWidth,state.image.naturalHeight,dom.layoutPreset.value));refresh();}});
        dom.fps.addEventListener('input',()=>{state.cfg.fps=Number(dom.fps.value);dom.fpsValue.textContent=`${state.cfg.fps} FPS`;});
        dom.scale.addEventListener('input',()=>{state.scale=Number(dom.scale.value)/100;dom.scaleValue.textContent=`${dom.scale.value}%`;});
        dom.stageCanvas.addEventListener('pointerdown',e=>{state.dragging=true;dom.stageCanvas.setPointerCapture(e.pointerId);state.player=stageCoord(e);});
        dom.stageCanvas.addEventListener('pointermove',e=>{if(state.dragging)state.player=stageCoord(e);});
        ['pointerup','pointercancel'].forEach(type=>dom.stageCanvas.addEventListener(type,()=>state.dragging=false));
        dom.exportAtlas.addEventListener('click',exportAtlas);
        dom.exportManifest.addEventListener('click',async()=>{
            if(!state.image)return;
            if(state.pixelCandidate){
                try {
                    const manifest=await fetch('./assets/hollow-local-3d-pixel-walk-v1.manifest.json').then(r=>r.json());
                    downloadJson('hollow-local-3d-pixel-walk-v1.manifest.json',manifest);
                } catch {dom.footerState.textContent='Candidate manifest unavailable; use the saved source manifest.';}
                return;
            }
            downloadJson(`${stem()}-8way-manifest.json`,C.normalizedManifest(state.cfg,state.filename,state.image.naturalWidth,state.image.naturalHeight,state.checks.every(c=>c.severity==='pass')));
        });
        dom.exportReport.addEventListener('click',()=>{if(state.image)downloadJson(`${stem()}-qa-report.json`,{
            source:state.filename,createdAt:new Date().toISOString(),checks:state.checks,
            technicalPass:state.checks.every(c=>c.severity==='pass'),ready:false,visualAccepted:false
        });});
        window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
            if(e.code==='Space'){e.preventDefault();dom.playBtn.click();}
            if(e.code==='ArrowRight')dom.stepBtn.click();
        });
    }
    bind();
    if(new URLSearchParams(globalThis.location.search).get('candidate')==='hollow-local-pixel-v1')
        loadImage('./assets/hollow-local-3d-pixel-walk-v1.png','hollow-local-3d-pixel-walk-v1.png');
    else loadImage('./assets/hollow-walk-rig-v2.png','hollow-walk-rig-v2.png');
    requestAnimationFrame(tick);
})();
