/* Building Lab's deterministic, browser-independent authoring contract. No gameplay state. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.BuildingLabCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function () {
  'use strict';
  const FORMAT = 'wyrmforge-building-lab';
  const VERSION = 1;
  const SIZE = { width: 2172, height: 724 };
  const STAGES = ['vacant', 'stirring', 'active', 'masterwork'];
  const LABELS = { vacant: 'Vacant', stirring: 'Stirring', active: 'Active', masterwork: 'Masterwork' };
  const builtIn = [
    { id: 'wyrmforge', name: 'Wyrmforge', crop: [0, 284, 724, 440], slots: [
      ['roof', 'Roof and damage', [22, 326, 455, 165]],
      ['chimney', 'Chimney and smoke', [68, 299, 75, 129]],
      ['window', 'Window light', [37, 487, 160, 103]],
      ['lamp', 'Entrance lamp', [377, 448, 73, 84]],
      ['furnace', 'Crucible / furnace', [88, 471, 187, 155]],
      ['rack', 'Essence rack', [397, 498, 135, 111]],
      ['workbench', 'Rune workbench', [219, 547, 176, 112]],
      ['sign', 'Forge sign', [421, 402, 106, 123]],
      ['npc', 'Workers and movement', [271, 488, 213, 183]],
    ] },
    { id: 'nexus', name: 'Arcane Nexus', crop: [0, 0, 724, 362], slots: [
      ['roof', 'Roof', [49, 22, 490, 129]],
      ['chimney', 'Chimney', [162, 0, 74, 110]],
      ['windows', 'Windows', [77, 149, 446, 120]],
      ['lamp', 'Entrance lighting', [242, 158, 183, 125]],
      ['apparatus', 'Arcane apparatus', [422, 75, 175, 135]],
      ['rack', 'Specimen rack', [371, 231, 228, 95]],
      ['npc', 'Researchers', [212, 203, 239, 153]],
    ] },
    { id: 'codex', name: 'Codex', crop: [1448, 0, 724, 367], slots: [
      ['roof', 'Roof', [1664, 11, 475, 167]],
      ['windows', 'Archive windows', [1624, 186, 524, 116]],
      ['entrance', 'Door and lamps', [1739, 192, 184, 141]],
      ['brazier', 'Braziers', [1849, 224, 203, 100]],
      ['npc', 'Keepers', [1633, 203, 360, 151]],
    ] },
    { id: 'hall', name: 'Hall of Fame', crop: [1448, 293, 724, 431], slots: [
      ['roof', 'Roof', [1544, 328, 603, 168]],
      ['chimney', 'Chimney', [1987, 307, 87, 147]],
      ['windows', 'Windows', [1638, 451, 490, 112]],
      ['sign', 'Hall sign', [1600, 461, 143, 113]],
      ['lamps', 'Hall lamps', [1754, 487, 329, 109]],
      ['trophies', 'Display and tables', [1628, 548, 510, 110]],
      ['npc', 'Attendants and visitors', [1744, 492, 393, 192]],
    ] },
  ];
  const BUILDINGS = Object.freeze(builtIn.map(b => ({ id: b.id, name: b.name })));
  const slug = text => String(text || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
  const clone = value => JSON.parse(JSON.stringify(value));
  function stageValues(slots, stage) {
    const values = {};
    for (const slot of slots) {
      const lit = stage === 'active' || stage === 'masterwork'
        || stage === 'stirring' && ['furnace', 'lamp', 'npc', 'entrance'].includes(slot.id);
      values[slot.id] = lit ? 'reference' : 'base';
    }
    return { locked: false, values };
  }
  function createProject(id = 'wyrmforge') {
    const spec = builtIn.find(b => b.id === id);
    if (!spec) throw new Error('Unknown starting building');
    const slots = spec.slots.map(([key, label, rect]) => ({ id: key, label, rect: clone(rect) }));
    return { format: FORMAT, version: VERSION, id: spec.id, name: spec.name,
      sourceSize: clone(SIZE), crop: clone(spec.crop),
      baseSource: 'refuge-town-vacant.webp', referenceSource: 'refuge-town-panorama.png',
      slots, stages: Object.fromEntries(STAGES.map(s => [s, stageValues(slots, s)])),
      assets: {}, visualAccepted: false };
  }
  function createCustomProject(name, width, height) {
    const id = slug(name);
    const w = Number(width), h = Number(height);
    if (!id || !Number.isInteger(w) || !Number.isInteger(h) || w < 64 || h < 64 || w > 4096 || h > 4096)
      throw new Error('Supply a name and image dimensions from 64 to 4096 pixels.');
    const p = createProject('wyrmforge');
    p.id = id; p.name = String(name).trim().slice(0, 100);
    p.sourceSize = { width: w, height: h }; p.crop = [0, 0, w, h];
    p.baseSource = ''; p.referenceSource = '';
    p.slots = []; p.stages = Object.fromEntries(STAGES.map(s => [s, { locked: false, values: {} }]));
    return p;
  }
  function validRect(rect, size) {
    return Array.isArray(rect) && rect.length === 4 && rect.every(n => Number.isInteger(n)) &&
      rect[0] >= 0 && rect[1] >= 0 && rect[2] > 0 && rect[3] > 0 &&
      rect[0] + rect[2] <= size.width && rect[1] + rect[3] <= size.height;
  }
  function isImageData(src) {
    return typeof src === 'string' && /^data:image\/(?:png|webp|jpeg);base64,[a-z0-9+/]+=*$/i.test(src) && src.length < 12500000;
  }
  function validSource(src) {
    return src === '' || src === 'refuge-town-vacant.webp' ||
      src === 'refuge-town-panorama.png' || isImageData(src);
  }
  function validateProject(p) {
    if (!p || p.format !== FORMAT || p.version !== VERSION || !/^[a-z0-9-]{1,48}$/.test(p.id || ''))
      throw new Error('Not a compatible Building Lab v1 project.');
    if (!p.sourceSize || !Number.isInteger(p.sourceSize.width) || !Number.isInteger(p.sourceSize.height) ||
        p.sourceSize.width < 64 || p.sourceSize.height < 64 || p.sourceSize.width > 4096 || p.sourceSize.height > 4096 ||
        !validRect(p.crop, p.sourceSize)) throw new Error('Invalid panorama or crop dimensions.');
    if (!validSource(p.baseSource) || !validSource(p.referenceSource)) throw new Error('Untrusted image source.');
    if (!Array.isArray(p.slots) || p.slots.length > 48 || !p.assets || typeof p.assets !== 'object')
      throw new Error('Invalid slot list or image library.');
    const keys = new Set();
    for (const slot of p.slots) {
      if (!slot || !/^[a-z0-9-]{1,48}$/.test(slot.id || '') || keys.has(slot.id) ||
          !validRect(slot.rect, p.sourceSize) || typeof slot.label !== 'string' || slot.label.length > 100)
        throw new Error('Invalid or duplicate slot geometry.');
      keys.add(slot.id);
    }
    const assets = Object.entries(p.assets);
    if (assets.length > 96 || assets.some(([id, src]) => !/^[a-z0-9-]{1,80}$/.test(id) || !isImageData(src)))
      throw new Error('Invalid embedded image data.');
    for (const stage of STAGES) {
      const s = p.stages?.[stage];
      if (!s || typeof s.locked !== 'boolean' || !s.values || Object.keys(s.values).length !== keys.size)
        throw new Error('Missing stage or slot values.');
      for (const id of keys) {
        const value = s.values[id];
        if (value !== 'base' && value !== 'reference' &&
            !(typeof value === 'string' && value.startsWith('upload:') && p.assets[value.slice(7)]))
          throw new Error('Invalid slot option or missing uploaded artwork.');
      }
    }
    return p;
  }
  function updateSlot(p, stage, slotId, value) {
    validateProject(p);
    if (!STAGES.includes(stage) || p.stages[stage].locked) throw new Error('Unlock this stage before editing.');
    if (!p.slots.some(s => s.id === slotId)) throw new Error('Unknown slot.');
    if (value !== 'base' && value !== 'reference' &&
        !(value.startsWith('upload:') && p.assets[value.slice(7)])) throw new Error('Unknown slot asset.');
    p.stages[stage].values[slotId] = value;
    return p;
  }
  function updateRect(p, slotId, rect) {
    validateProject(p);
    if (STAGES.some(s => p.stages[s].locked)) throw new Error('Unlock all four stages before moving shared slot geometry.');
    if (!validRect(rect, p.sourceSize)) throw new Error('Slot must fit inside the source image.');
    const slot = p.slots.find(s => s.id === slotId);
    if (!slot) throw new Error('Unknown slot.');
    slot.rect = clone(rect);
    return p;
  }
  function addSlot(p, label, rect) {
    validateProject(p);
    if (STAGES.some(s => p.stages[s].locked)) throw new Error('Unlock all four stages before adding shared slots.');
    const id = slug(label);
    if (!id || p.slots.some(s => s.id === id) || p.slots.length >= 48 || !validRect(rect, p.sourceSize))
      throw new Error('Choose a unique slot name and valid rectangle.');
    p.slots.push({ id, label: String(label).slice(0, 100), rect: clone(rect) });
    for (const stage of STAGES) p.stages[stage].values[id] = 'base';
    return p;
  }
  function visibleSlots(p, stage) {
    validateProject(p);
    return p.slots.map(s => ({ ...s, value: p.stages[stage].values[s.id] }));
  }
  return Object.freeze({ FORMAT, VERSION, SIZE, STAGES, LABELS, BUILDINGS, slug, createProject,
    createCustomProject, validateProject, validRect, updateSlot, updateRect, addSlot, visibleSlots, clone });
});
