(function buildingLabApp() {
  'use strict';
  const C = globalThis.BuildingLabCore;
  const $ = id => document.getElementById(id);
  const DOM = Object.fromEntries([
    'buildingSelect','newBuildingName','newBuildingFile','addBuilding','stageList','lockStage','slotList',
    'newSlotName','addSlot','showGuides','buildingCanvas','canvasSize','previewTitle','renderNote',
    'quickStages','quickSlot','quickSlotTitle','quickAvailability','quickChoices','quickHelp','quickLock',
    'slotTitle','slotVariant','slotFile','rectX','rectY','rectW','rectH','applyRect','baseFile',
    'referenceFile','sourceInfo','exportJson','exportPng','importJson','resetProject','status',
  ].map(id => [id, $(id)]));
  const previews = Array.from(document.querySelectorAll('#compareGrid button'));
  const storagePrefix = 'wyrmforge-building-lab-v1:';
  const projects = new Map(), imageCache = new Map(), overlayCache = new Map();
  // Existing live town art is immutable. Stage differences may only be
  // introduced through explicit slot art, never whole-panorama dark patches.
  const starterVariants = slot => slot.id === 'roof'
    ? [['base', 'Intact'], ['roof:damaged', 'Beschadigd']]
    : [['base', 'Origineel']];
  function migrateOldPainting(project) {
    // The first editor saved a dark 'vacant' panorama and composited rectangular
    // chunks from a brighter reference, which produced the rejected dark blocks.
    // Keep uploaded artwork and actual locks; replace only built-in bad presets.
    if (!C.BUILDINGS.some(b => b.id === project.id)) return project;
    if (project.baseSource === 'refuge-town-vacant.webp') {
      project.baseSource = 'refuge-town-panorama.png';
      if (project.referenceSource === 'refuge-town-panorama.png') {
        for (const stage of C.STAGES) {
          for (const slot of project.slots) {
            if (project.stages[stage].values[slot.id] === 'reference')
              project.stages[stage].values[slot.id] = 'base';
          }
        }
      }
    }
    return project;
  }
  let project = null, stage = 'vacant', selectedSlot = null;
  const sourceUrl = src => src.startsWith('data:') ? src : `../../art/${src}`;
  const anyLocked = () => C.STAGES.some(s => project.stages[s].locked);
  function message(text, error = false) {
    DOM.status.textContent = text;
    DOM.status.dataset.error = String(error);
  }
  function image(src) {
    if (!src) return null;
    const url = sourceUrl(src);
    if (imageCache.has(url)) return imageCache.get(url).ready ? imageCache.get(url).img : null;
    const record = { img: new Image(), ready: false, failed: false };
    imageCache.set(url, record);
    record.img.onload = () => { record.ready = true; drawAll(); };
    record.img.onerror = () => {
      record.failed = true; message('An artwork source could not be loaded. Check its filename or upload a replacement.', true);
      drawAll();
    };
    record.img.src = url;
    return null;
  }
  function projectKey(id) { return storagePrefix + id; }
  function loadProject(id) {
    if (projects.has(id)) return projects.get(id);
    try {
      const saved = localStorage.getItem(projectKey(id));
      if (saved) {
        const loaded = C.validateProject(migrateOldPainting(JSON.parse(saved)));
        loaded.visualAccepted = false;
        projects.set(id, loaded);
        return loaded;
      }
    } catch { message('Saved data was invalid; starting from the default building.', true); }
    const fresh = C.createProject(id);
    projects.set(id, fresh);
    return fresh;
  }
  function save() {
    if (!project) return;
    project.visualAccepted = false;
    projects.set(project.id, project);
    try {
      localStorage.setItem(projectKey(project.id), JSON.stringify(project));
    } catch {
      message('Browser storage is full. Export JSON now to preserve uploaded images.', true);
      return;
    }
    message('Saved locally. Export JSON to hand off your chosen states.');
  }
  function edit(action) {
    try { action(); save(); updateUI(); }
    catch (error) { message(error.message, true); }
  }
  function allBuildings() {
    return [...C.BUILDINGS, ...[...projects.values()]
      .filter(p => !C.BUILDINGS.some(b => b.id === p.id))
      .map(p => ({ id: p.id, name: p.name }))];
  }
  function selectBuilding(id) {
    project = loadProject(id); stage = 'vacant'; selectedSlot = project.slots[0]?.id || null;
    updateUI(); message('Editing ' + project.name + '. No gameplay files are affected.');
  }
  function populateBuildings() {
    DOM.buildingSelect.replaceChildren(...allBuildings().map(b => {
      const option = document.createElement('option');
      option.value = b.id; option.textContent = b.name; return option;
    }));
    DOM.buildingSelect.value = project.id;
  }
  function updateUI() {
    if (!project) return;
    populateBuildings();
    DOM.previewTitle.textContent = `${project.name} · ${C.LABELS[stage]}`;
    DOM.canvasSize.textContent = `${project.crop[2]} × ${project.crop[3]}`;
    DOM.sourceInfo.textContent = project.baseSource
      ? `Base: ${project.baseSource.startsWith('data:') ? 'Uploaded painting' : project.baseSource}. Active: ${
        project.referenceSource.startsWith('data:') ? 'Uploaded painting' : project.referenceSource || 'not provided'}.`
      : 'Load a base painting first to preview this building.';
    DOM.stageList.replaceChildren(...C.STAGES.map((s, i) => {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.dataset.stage = s;
      btn.className = 'stage-option' + (stage === s ? ' selected' : '');
      btn.setAttribute('aria-pressed', String(stage === s));
      const name = document.createElement('strong'); name.textContent = `${i} · ${C.LABELS[s]}`;
      const state = document.createElement('small'); state.textContent = project.stages[s].locked ? 'LOCKED' : 'EDITABLE';
      btn.append(name, state); return btn;
    }));
    DOM.lockStage.textContent = project.stages[stage].locked ? 'Unlock this state' : 'Lock this state';
    DOM.slotList.replaceChildren(...project.slots.map(slot => {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.dataset.slot = slot.id;
      btn.className = 'slot-option' + (selectedSlot === slot.id ? ' selected' : '');
      btn.setAttribute('aria-pressed', String(selectedSlot === slot.id));
      const name = document.createElement('span'); name.textContent = slot.label;
      const mark = document.createElement('small');
      const value = project.stages[stage].values[slot.id];
      mark.textContent = value === 'base' ? 'BASE' : value === 'reference' ? 'ACTIVE REF.' : 'CUSTOM';
      btn.append(name, mark); return btn;
    }));
    updateInspector();
    updateQuickEditor();
    previews.forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.stage === stage);
      btn.querySelector('span').textContent = `${C.STAGES.indexOf(btn.dataset.stage)} · ${C.LABELS[btn.dataset.stage].toUpperCase()}${project.stages[btn.dataset.stage].locked ? ' · LOCKED' : ''}`;
    });
    drawAll();
  }
  function updateInspector() {
    const slot = project.slots.find(s => s.id === selectedSlot);
    DOM.slotTitle.textContent = slot ? slot.label : 'No slots yet';
    const readonly = !slot || project.stages[stage].locked;
    DOM.slotVariant.disabled = readonly;
    DOM.slotFile.disabled = readonly;
    DOM.applyRect.disabled = !slot || anyLocked();
    DOM.addSlot.disabled = anyLocked();
    DOM.baseFile.disabled = anyLocked();
    DOM.referenceFile.disabled = anyLocked();
    for (const input of [DOM.rectX, DOM.rectY, DOM.rectW, DOM.rectH])
      input.disabled = !slot || anyLocked();
    if (!slot) { DOM.slotVariant.replaceChildren(); return; }
    [DOM.rectX.value, DOM.rectY.value, DOM.rectW.value, DOM.rectH.value] = slot.rect;
    const previous = project.stages[stage].values[slot.id];
    const options = [
      ...starterVariants(slot),
      ...Object.keys(project.assets).map(id => [`upload:${id}`, `Eigen artwork · ${id}`]),
    ];
    // Legacy JSON can contain 'reference'. Show it as a removable legacy
    // value, not an invented valid architectural roof/light variant.
    if (previous === 'reference') options.push(['reference', 'Oude referentie (niet gebruiken)']);
    DOM.slotVariant.replaceChildren(...options.map(([value, label]) => {
      const node = document.createElement('option');
      node.value = value; node.textContent = label; return node;
    }));
    DOM.slotVariant.value = previous;
  }
  function updateQuickEditor() {
    DOM.quickStages.replaceChildren(...C.STAGES.map((s, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';btn.dataset.stage=s;
      btn.textContent = `${i} · ${C.LABELS[s]}${project.stages[s].locked ? ' 🔒' : ''}`;
      btn.className = 'quick-stage' + (stage===s ? ' selected' : '');
      btn.setAttribute('aria-pressed', String(stage === s));return btn;
    }));
    DOM.quickSlot.replaceChildren(...project.slots.map(slot => {
      const opt=document.createElement('option');opt.value=slot.id;opt.textContent=slot.label;return opt;
    }));
    if (selectedSlot) DOM.quickSlot.value = selectedSlot;
    const slot=project.slots.find(s=>s.id===selectedSlot);
    DOM.quickSlotTitle.textContent=slot?.label || 'Geen slots';
    const locked=project.stages[stage].locked;
    DOM.quickAvailability.textContent=locked ? 'Vergrendeld' : 'Bewerkbaar';
    DOM.quickLock.textContent=locked ? 'Ontgrendel deze fase' : 'Vergrendel deze fase';
    DOM.quickChoices.replaceChildren();
    if (!slot) {DOM.quickHelp.textContent='Voeg een slot toe om te beginnen.';return;}
    const variants=[
      ...starterVariants(slot),
      ...Object.keys(project.assets).map(id=>[`upload:${id}`, 'Eigen artwork · '+id])
    ];
    const current=project.stages[stage].values[slot.id];
    for (const [value,label] of variants) {
      const btn=document.createElement('button');
      btn.type='button';btn.dataset.variant=value;btn.textContent=label;
      btn.className='quick-choice'+(current===value?' selected':'');
      btn.setAttribute('aria-pressed',String(current===value));
      btn.disabled=locked;DOM.quickChoices.append(btn);
    }
    if (!locked) {
      const add=document.createElement('button');
      add.type='button';add.dataset.upload='true';add.className='quick-choice upload-choice';
      add.textContent='+ Eigen slotafbeelding uploaden';DOM.quickChoices.append(add);
    }
    DOM.quickHelp.textContent = slot.id==='roof'
      ? 'Dak intact of beschadigd: dit verandert de dakpannen zichtbaar. Dit is nog een proeflaag. Andere fasen blijven onafhankelijk.'
      : 'Voor dit onderdeel is nog geen goedgekeurde tweede tekening. Upload een transparante PNG/WebP in plaats van een donkere voorbeeldfilter.';
  }
  function featheredReference(source, rect) {
    const key = source.src + ':' + rect.join(',');
    if (overlayCache.has(key)) return overlayCache.get(key);
    const [x, y, w, h] = rect;
    const layer = document.createElement('canvas');
    layer.width = w; layer.height = h;
    const g = layer.getContext('2d');
    g.drawImage(source, x, y, w, h, 0, 0, w, h);
    const feather = Math.max(1, Math.min(7, Math.floor(Math.min(w, h) / 7)));
    g.globalCompositeOperation = 'destination-in';
    const gx = g.createLinearGradient(0, 0, w, 0);
    gx.addColorStop(0, 'transparent'); gx.addColorStop(feather / w, '#fff');
    gx.addColorStop(1 - feather / w, '#fff'); gx.addColorStop(1, 'transparent');
    g.fillStyle = gx; g.fillRect(0, 0, w, h);
    const gy = g.createLinearGradient(0, 0, 0, h);
    gy.addColorStop(0, 'transparent'); gy.addColorStop(feather / h, '#fff');
    gy.addColorStop(1 - feather / h, '#fff'); gy.addColorStop(1, 'transparent');
    g.fillStyle = gy; g.fillRect(0, 0, w, h);
    overlayCache.set(key, layer);
    if (overlayCache.size > 100) overlayCache.clear();
    return layer;
  }
  // Hand-authored exploratory missing slate tiles. Exactly the same geometry
  // in every state, no global opacity/black layer and no AI image synthesis.
  // On future buildings, replace this proof-of-concept with an approved alpha
  // image in the same shared slot. It is deliberately modest.
  function drawRoofDamage(g, x, y, w, h) {
    if (w < 60 || h < 45) return;
    g.save();
    // Use a few missing slate tiles rather than a broad dark stain.
    // Their footprint follows the unchanged original roof plane.
    g.translate(x + w * .51, y + h * .35);
    const scale = Math.min(w / 455, h / 165) * 1.0;
    g.scale(scale, scale);
    function face(points, color) {
      g.beginPath();g.moveTo(points[0][0],points[0][1]);
      for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);
      g.closePath();g.fillStyle=color;g.fill();
    }
    // Uneven broken edges along three adjacent slate courses.
    face([[0,7],[8,5],[16,7],[22,4],[31,6],[36,10],
      [34,16],[27,18],[21,16],[16,21],[7,19],[1,16]], '#0f1317');
    face([[6,10],[15,8],[22,11],[29,9],[31,15],[24,16],[17,16],[11,18]], '#181d20');
    // A rafter glimpsed below the roofing, not an unsupported beam.
    g.strokeStyle='#322b25';g.lineWidth=2;g.beginPath();
    g.moveTo(9,10);g.lineTo(27,17);g.stroke();
    // Chipped slate pieces, shaded just below the neighboring rows.
    for (const [tx,ty,ex,ey] of [[-3,8,7,10],[24,3,33,5],[29,19,37,21],[7,20,14,22]]) {
      g.strokeStyle='#292f35';g.lineWidth=1.5;g.beginPath();g.moveTo(tx,ty);g.lineTo(ex,ey);g.stroke();
      g.strokeStyle='#11181c';g.lineWidth=1;g.beginPath();g.moveTo(tx,ty+2);g.lineTo(ex,ey+2);g.stroke();
    }
    g.restore();
  }
  function draw(canvas, selectedStage, guides = false) {
    const [cx, cy, cw, ch] = project.crop;
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    const g = canvas.getContext('2d');
    g.fillStyle = '#101719'; g.fillRect(0, 0, cw, ch);
    const base = image(project.baseSource);
    if (base) g.drawImage(base, cx, cy, cw, ch, 0, 0, cw, ch);
    else {
      g.fillStyle = '#aab4af'; g.textAlign = 'center'; g.font = '16px sans-serif';
      g.fillText('Load a base painting', cw / 2, ch / 2);
    }
    for (const slot of project.slots) {
      const value = project.stages[selectedStage].values[slot.id];
      if (value === 'base' || value === 'reference') continue;
      const rect = slot.rect, [x,y,w,h] = rect, dx = x - cx, dy = y - cy;
      if (dx + w <= 0 || dy + h <= 0 || dx >= cw || dy >= ch) continue;
      if (slot.id === 'roof' && value === 'roof:damaged') {
        drawRoofDamage(g, dx, dy, w, h);
      } else if (value.startsWith('upload:')) {
        const uploaded = image(project.assets[value.slice(7)]);
        if (uploaded) g.drawImage(uploaded, dx, dy, w, h);
      }
    }
    if (guides) {
      g.save(); g.lineWidth = 2; g.setLineDash([6, 4]);
      for (const slot of project.slots) {
        const [x,y,w,h] = slot.rect;
        g.strokeStyle = slot.id === selectedSlot ? '#ebc187' : 'rgba(200,215,211,.48)';
        g.strokeRect(x-cx+.5, y-cy+.5, w, h);
      }
      g.setLineDash([]);
      const current = project.slots.find(s => s.id === selectedSlot);
      if (current) {
        const [x,y] = current.rect, left = Math.max(2, x-cx), top = Math.max(14, y-cy-4);
        g.font = 'bold 12px system-ui';
        const text = current.label;
        g.fillStyle='rgba(13,17,19,.88)';
        g.fillRect(left, top-14, Math.min(220,g.measureText(text).width+12),18);
        g.fillStyle='#f5d4a2';g.fillText(text,left+5,top);
      }
      g.restore();
    }
  }
  function drawAll() {
    if (!project) return;
    draw(DOM.buildingCanvas, stage, DOM.showGuides.checked);
    previews.forEach(btn => draw(btn.querySelector('canvas'), btn.dataset.stage));
  }
  function safeDownload(name, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function fileData(file) {
    return new Promise((resolve, reject) => {
      if (!file || !['image/png','image/webp','image/jpeg'].includes(file.type) || file.size > 8500000) {
        reject(new Error('Use a PNG, WebP or JPG image smaller than 8.5 MB.')); return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Unable to read image.'));
      reader.readAsDataURL(file);
    });
  }
  function imageDimensions(data) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve([img.naturalWidth, img.naturalHeight]);
      img.onerror = () => reject(new Error('Invalid image.'));
      img.src = data;
    });
  }
  async function importSource(file, field) {
    try {
      const data = await fileData(file);
      const [w,h] = await imageDimensions(data);
      if (w !== project.sourceSize.width || h !== project.sourceSize.height)
        throw new Error(`Source must be ${project.sourceSize.width} × ${project.sourceSize.height}; got ${w} × ${h}.`);
      if (anyLocked()) throw new Error('Unlock all stages before replacing shared source artwork.');
      project[field] = data; overlayCache.clear(); save(); updateUI();
    } catch (error) { message(error.message, true); }
  }
  async function importSlot(file) {
    const stageAtStart = stage, slotAtStart = selectedSlot, buildingAtStart = project.id;
    try {
      const data = await fileData(file);
      if (!slotAtStart) throw new Error('Select a slot first.');
      await imageDimensions(data);
      if (project.id !== buildingAtStart || stage !== stageAtStart)
        throw new Error('Switch back to the original slot before importing.');
      edit(() => {
        if (project.stages[stageAtStart].locked) throw new Error('Unlock the stage to change its artwork.');
        const id = 'asset-' + Math.random().toString(36).slice(2, 12);
        project.assets[id] = data;
        C.updateSlot(project, stageAtStart, slotAtStart, 'upload:' + id);
      });
    } catch (error) { message(error.message, true); }
  }
  DOM.buildingSelect.addEventListener('change', () => selectBuilding(DOM.buildingSelect.value));
  DOM.quickStages.addEventListener('click', event => {
    const btn=event.target.closest('button[data-stage]');
    if (btn) {stage=btn.dataset.stage;updateUI();}
  });
  DOM.quickSlot.addEventListener('change', () => {
    selectedSlot=DOM.quickSlot.value;updateUI();
  });
  DOM.quickChoices.addEventListener('click', event => {
    const btn=event.target.closest('button');
    if (!btn || btn.disabled) return;
    if (btn.dataset.upload) {DOM.slotFile.click();return;}
    if(btn.dataset.variant) edit(()=>C.updateSlot(project,stage,selectedSlot,btn.dataset.variant));
  });
  DOM.quickLock.addEventListener('click',()=>edit(()=>{
    project.stages[stage].locked=!project.stages[stage].locked;
  }));
  DOM.stageList.addEventListener('click', event => {
    const btn = event.target.closest('button[data-stage]');
    if (btn) { stage = btn.dataset.stage; updateUI(); }
  });
  DOM.slotList.addEventListener('click', event => {
    const btn = event.target.closest('button[data-slot]');
    if (btn) { selectedSlot = btn.dataset.slot; updateUI(); }
  });
  previews.forEach(btn => btn.addEventListener('click', () => { stage = btn.dataset.stage; updateUI(); }));
  DOM.buildingCanvas.addEventListener('click', event => {
    const bounds = DOM.buildingCanvas.getBoundingClientRect();
    const x = project.crop[0] + (event.clientX - bounds.left) / bounds.width * project.crop[2];
    const y = project.crop[1] + (event.clientY - bounds.top) / bounds.height * project.crop[3];
    const matching = [...project.slots].reverse().find(slot => {
      const [sx,sy,w,h] = slot.rect;
      return x >= sx && x <= sx+w && y >= sy && y <= sy+h;
    });
    if (matching) { selectedSlot = matching.id; updateUI(); }
  });
  DOM.lockStage.addEventListener('click', () => edit(() => {
    project.stages[stage].locked = !project.stages[stage].locked;
  }));
  DOM.slotVariant.addEventListener('change', () =>
    edit(() => C.updateSlot(project, stage, selectedSlot, DOM.slotVariant.value)));
  DOM.slotFile.addEventListener('change', async () => {
    const file = DOM.slotFile.files[0]; DOM.slotFile.value = '';
    if (file) await importSlot(file);
  });
  DOM.baseFile.addEventListener('change', async () => {
    const file = DOM.baseFile.files[0]; DOM.baseFile.value = '';
    if (file) await importSource(file, 'baseSource');
  });
  DOM.referenceFile.addEventListener('change', async () => {
    const file = DOM.referenceFile.files[0]; DOM.referenceFile.value = '';
    if (file) await importSource(file, 'referenceSource');
  });
  DOM.applyRect.addEventListener('click', () => edit(() => C.updateRect(project, selectedSlot,
    [DOM.rectX, DOM.rectY, DOM.rectW, DOM.rectH].map(node => Number(node.value)))));
  DOM.addSlot.addEventListener('click', () => edit(() => {
    const [x,y,w,h] = project.crop;
    const rect = [x+Math.floor(w/3), y+Math.floor(h/3), Math.max(16,Math.floor(w/4)), Math.max(16,Math.floor(h/4))];
    C.addSlot(project, DOM.newSlotName.value.trim(), rect);
    selectedSlot = C.slug(DOM.newSlotName.value.trim()); DOM.newSlotName.value = '';
  }));
  DOM.addBuilding.addEventListener('click', async () => {
    const file = DOM.newBuildingFile.files[0];
    try {
      const data = await fileData(file), [w,h] = await imageDimensions(data);
      const fresh = C.createCustomProject(DOM.newBuildingName.value, w, h);
      if (projects.has(fresh.id) || C.BUILDINGS.some(b => b.id === fresh.id))
        throw new Error('That building ID already exists.');
      fresh.baseSource = data; C.validateProject(fresh);
      projects.set(fresh.id, fresh);
      try {
        const ids = JSON.parse(localStorage.getItem(storagePrefix + 'custom-ids') || '[]');
        localStorage.setItem(storagePrefix + 'custom-ids', JSON.stringify([...new Set([...ids, fresh.id])]));
      } catch { message('Browser storage is unavailable; export project JSON.', true); }
      project = fresh; stage = 'vacant'; selectedSlot = null; save(); updateUI();
      DOM.newBuildingName.value = ''; DOM.newBuildingFile.value = '';
    } catch (error) { message(error.message, true); }
  });
  DOM.showGuides.addEventListener('change', drawAll);
  DOM.exportJson.addEventListener('click', () => {
    try {
      C.validateProject(project);
      const clean = C.clone(project); clean.visualAccepted = false;
      safeDownload(`${project.id}-building-states.json`, new Blob([JSON.stringify(clean, null, 2) + '\n'], {type:'application/json'}));
      message('JSON exported. A locked state is still not approved game artwork.');
    } catch (error) { message(error.message, true); }
  });
  DOM.exportPng.addEventListener('click', () => {
    const exportCanvas = document.createElement('canvas');
    draw(exportCanvas, stage, false);
    exportCanvas.toBlob(blob => {
      if (blob) { safeDownload(`${project.id}-${stage}-preview.png`, blob); message('Stage preview exported.'); }
      else message('PNG export is unavailable in this browser.', true);
    }, 'image/png');
  });
  DOM.importJson.addEventListener('change', async () => {
    const file = DOM.importJson.files[0]; DOM.importJson.value = '';
    try {
      if (!file || file.size > 28000000) throw new Error('Project JSON must be smaller than 28 MB.');
      const imported = C.validateProject(migrateOldPainting(JSON.parse(await file.text())));
      imported.visualAccepted = false; projects.set(imported.id, imported);
      if (!C.BUILDINGS.some(b => b.id === imported.id)) {
        try {
          const ids=JSON.parse(localStorage.getItem(storagePrefix+'custom-ids') || '[]');
          localStorage.setItem(storagePrefix+'custom-ids',JSON.stringify([...new Set([...ids,imported.id])]));
        } catch {}
      }
      project = imported; stage = 'vacant';selectedSlot = project.slots[0]?.id || null;
      save();updateUI();
      message('Imported project. Its stage locks and uploaded artwork are retained.');
    } catch(error) {message('Import rejected: '+error.message,true);}
  });
  DOM.resetProject.addEventListener('click', () => {
    if (!confirm(`Reset ${project.name}? This clears local edits. Export JSON first if needed.`)) return;
    try {
      const old = project;
      if (!C.BUILDINGS.some(b => b.id === old.id))
        throw new Error('Custom projects cannot be reset. Import an earlier JSON instead.');
      project = C.createProject(old.id); projects.set(project.id, project);
      stage = 'vacant'; selectedSlot = project.slots[0]?.id || null;
      imageCache.clear();overlayCache.clear();save();updateUI();
    } catch(error) {message(error.message,true);}
  });
  try {
    const ids=JSON.parse(localStorage.getItem(storagePrefix+'custom-ids') || '[]');
    for(const id of ids) {
      try {
        const saved=localStorage.getItem(projectKey(id));
        if(saved) projects.set(id,C.validateProject(JSON.parse(saved)));
      } catch {}
    }
  } catch {}
  selectBuilding('wyrmforge');
})();