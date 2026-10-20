const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../../src/Wyrmforge.Presentation.Web/wwwroot/sprite-lab/buildings/src/building-core.js');

test('all four town buildings start with the same stable four-stage contract', () => {
  assert.equal(C.BUILDINGS.length, 4);
  for (const b of C.BUILDINGS) {
    const project = C.createProject(b.id);
    assert.equal(C.validateProject(project), project);
    assert.deepEqual(Object.keys(project.stages), C.STAGES);
    assert.equal(project.sourceSize.width, 2172);
    assert.equal(project.sourceSize.height, 724);
    assert.equal(project.stages.vacant.locked, false);
    assert(project.slots.length >= 5);
    assert(project.slots.every(s => C.validRect(s.rect, project.sourceSize)));
    assert(project.slots.every(s => project.stages.vacant.values[s.id] === (s.id === 'roof' ? 'roof:damaged' : 'base')));
    assert(project.slots.every(s => project.stages.active.values[s.id] === 'base'));
    assert.equal(project.baseSource, 'refuge-town-panorama.png');
    assert.equal(project.visualAccepted, false);
  }
});

test('each stage has independent values and independent authoring locks', () => {
  const project = C.createProject('wyrmforge');
  C.updateSlot(project, 'stirring', 'roof', 'roof:damaged');
  assert.equal(project.stages.stirring.values.roof, 'roof:damaged');
  assert.equal(project.stages.vacant.values.roof, 'roof:damaged');
  project.stages.stirring.locked = true;
  assert.throws(() => C.updateSlot(project, 'stirring', 'roof', 'base'), /Unlock/);
  C.updateSlot(project, 'active', 'roof', 'base');
  assert.equal(project.stages.active.values.roof, 'base');
  assert.equal(C.validateProject(project), project);
});

test('slot bounds are measured in native canvas pixels and shared across stages', () => {
  const project = C.createProject('wyrmforge');
  const moved = [10, 350, 190, 130];
  C.updateRect(project, 'roof', moved);
  assert.deepEqual(project.slots.find(s => s.id === 'roof').rect, moved);
  assert.deepEqual(C.visibleSlots(project, 'vacant').find(s => s.id === 'roof').rect, moved);
  assert.deepEqual(C.visibleSlots(project, 'masterwork').find(s => s.id === 'roof').rect, moved);
  assert.throws(() => C.updateRect(project, 'roof', [2100, 700, 300, 300]), /Slot/);
  project.stages.active.locked = true;
  assert.throws(() => C.updateRect(project, 'roof', moved), /Unlock all/);
});

test('user-authored future building can add new named slots without changing other buildings', () => {
  const p = C.createCustomProject('Ward House', 640, 360);
  assert.equal(p.id, 'ward-house');
  assert.deepEqual(p.crop, [0,0,640,360]);
  C.addSlot(p, 'Wall Lantern', [150,100,40,90]);
  for (const stage of C.STAGES) assert.equal(p.stages[stage].values['wall-lantern'], 'base');
  assert.equal(C.validateProject(p), p);
  assert.throws(() => C.addSlot(p, 'Wall Lantern', [150,100,40,90]), /unique/);
  assert.throws(() => C.createCustomProject('Invalid', 20, 360), /64 to 4096/);
});

test('portable JSON preserves locked stages and embedded transparent slot art', () => {
  const p = C.createProject('wyrmforge');
  p.assets['lamp-off'] = 'data:image/png;base64,iVBORw0KGgo=';
  C.updateSlot(p, 'vacant', 'lamp', 'upload:lamp-off');
  p.stages.vacant.locked = true;
  const q = C.validateProject(JSON.parse(JSON.stringify(p)));
  assert.equal(q.stages.vacant.locked, true);
  assert.equal(q.stages.vacant.values.lamp, 'upload:lamp-off');
  assert.equal(q.assets['lamp-off'], p.assets['lamp-off']);
  assert.equal(q.visualAccepted, false);
});

test('rejects unsafe external image sources and invalid image references', () => {
  const p = C.createProject('nexus');
  p.baseSource = 'https://other-domain.example/texture.png';
  assert.throws(() => C.validateProject(p), /Untrusted/);
  p.baseSource = 'refuge-town-vacant.webp';
  p.assets.inject = 'data:text/html;base64,aGk=';
  assert.throws(() => C.validateProject(p), /embedded/);
  delete p.assets.inject;
  p.stages.active.values.roof = 'upload:missing';
  assert.throws(() => C.validateProject(p), /Invalid slot/);
});

test('a locked state cannot be treated as approved production artwork', () => {
  const p = C.createProject('codex');
  p.stages.masterwork.locked = true;
  assert.equal(C.validateProject(p).visualAccepted, false);
});

test('roof can switch intact / damaged without affecting other slots or stages', () => {
  const p = C.createProject('wyrmforge');
  C.updateSlot(p, 'vacant', 'roof', 'base');
  assert.equal(p.stages.vacant.values.roof, 'base');
  assert.equal(p.stages.active.values.roof, 'base');
  C.updateSlot(p, 'vacant', 'roof', 'roof:damaged');
  assert.equal(p.stages.vacant.values.roof, 'roof:damaged');
  assert.equal(p.stages.stirring.values.roof, 'base');
  assert.throws(() => C.updateSlot(p, 'active', 'lamp', 'roof:damaged'), /Unknown/);
  assert.equal(C.validateProject(p), p);
});
