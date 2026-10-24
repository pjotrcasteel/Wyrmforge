import test from 'node:test';
import assert from 'node:assert/strict';
import { WIZARD_STAFF_SCHOOLS, wizardStaffCharge, wizardStaffLightDescriptors } from '../wizard-staff-light.mjs';

test('six schools emit distinct colors through one generic light descriptor', () => {
    const colors=new Set();
    for (const school of Object.keys(WIZARD_STAFF_SCHOOLS)) {
        const {emitter,material}=wizardStaffLightDescriptors({
            ownerId:'player',school,staffTip:[2,4,1.4],castMotion:{progress:.35},
        });
        colors.add(emitter.color);
        assert.equal(emitter.type,'point');
        assert.equal(emitter.id,'player:staff');
        assert.equal(emitter.enabled,true);
        assert.deepEqual(emitter.position,[2,4,1.4]);
        assert.equal(material.emission,emitter.color);
    }
    assert.equal(colors.size,6);
});

test('charge builds during windup, stays high at release, falls during recovery',()=>{
    assert.equal(wizardStaffCharge(null),0);
    assert.equal(wizardStaffCharge({progress:0}),0);
    assert.ok(wizardStaffCharge({progress:.14})>0);
    assert.ok(wizardStaffCharge({progress:.14})<wizardStaffCharge({progress:.35}));
    assert.equal(wizardStaffCharge({progress:.55}),1);
    assert.ok(wizardStaffCharge({progress:.95})<wizardStaffCharge({progress:.55}));
    assert.equal(wizardStaffCharge({progress:1}),0);
});

test('inactive or invalid casts cannot leak permanent light',()=>{
    for (const castMotion of [null,{progress:NaN},{progress:-1},{progress:1}]) {
        const {emitter,material}=wizardStaffLightDescriptors({
            ownerId:'player',school:'fire',staffTip:[0,0,1.5],castMotion,
        });
        assert.equal(emitter.enabled,false);
        assert.equal(emitter.intensity,0);
        assert.equal(material.emissionIntensity,0);
    }
});

test('invalid school and missing pose-correct staff position fail fast',()=>{
    assert.throws(()=>wizardStaffLightDescriptors({
        ownerId:'p',school:'fire',staffTip:[0,0],
    }),/Staff tip/);
    assert.throws(()=>wizardStaffLightDescriptors({
        ownerId:'p',school:'unknown',staffTip:[0,0,0],
    }),/school/);
});
