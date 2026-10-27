import test from 'node:test';
import assert from 'node:assert/strict';
import { emissionMaskPixels, TOWN_EMISSION_PLATES, TOWN_EMISSION_REGIONS }
    from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-emission-masks.js';
import { townPreviewManifest } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-relighting-preview.js';
import { neutralizeBuildingPixels } from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-building-neutral-albedo.js';

const plate = (domain, x, y) => ({ domain, x, y, width: 4, height: 4 });
const pixels = (r, g, b) => {
    const data = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < data.length; i += 4) {
        data[i] = r; data[i+1] = g; data[i+2] = b; data[i+3] = 255;
    }
    return data;
};

test('Four building plates match canonical registered 1672x941 image bounds', () => {
    assert.deepEqual(TOWN_EMISSION_PLATES.map(x => x.domain),
        ['nexus', 'blacksmith', 'codex', 'hall']);
    for (const descriptor of TOWN_EMISSION_PLATES) {
        assert.ok(descriptor.x >= 0 && descriptor.y >= 0);
        assert.ok(descriptor.x + descriptor.width <= 1672);
        assert.ok(descriptor.y + descriptor.height <= 941);
        for (const region of Object.values(TOWN_EMISSION_REGIONS[descriptor.domain]).flat()) {
            assert.equal(region.length, 4);
            assert.ok(region[0] >= descriptor.x && region[1] >= descriptor.y);
        }
    }
});

test('Warm building window emits only if brighter than matching vacant pixels', () => {
    const match = plate('nexus', 100, 195);
    const active = pixels(240, 146, 48);
    const vacant = pixels(15, 10, 8);
    const emission = emissionMaskPixels(active, vacant, 4, 4, match, 'warm');
    assert.ok(emission[3] === 255 && emission[0] > emission[2]);
    const unlit = emissionMaskPixels(vacant, vacant, 4, 4, match, 'warm');
    assert.ok(unlit.every(x => x === 0), 'the renderer cannot turn unlit source art into illumination');
});

test('Dark cloth and blue spell pixels do not become warm windows', () => {
    const cloth = emissionMaskPixels(pixels(36, 46, 130), pixels(5, 5, 5),
        4, 4, plate('nexus', 100, 195), 'warm');
    assert.ok(cloth.every(x => x === 0));
    const magic = emissionMaskPixels(pixels(90, 124, 248), pixels(2, 2, 3),
        4, 4, plate('nexus', 400, 275), 'magic');
    assert.equal(magic[3], 255);
    assert.equal(magic[0], magic[1]);
    assert.equal(magic[1], magic[2], 'magic map is neutral, school tint is runtime material state');
});

test('Outside authored aperture region never emits regardless of RGB delta', () => {
    const mask = emissionMaskPixels(pixels(255, 155, 38), pixels(0, 0, 0),
        4, 4, plate('codex', 1000, 20), 'warm');
    assert.ok(mask.every(x => x === 0));
    assert.throws(() => emissionMaskPixels(new Uint8ClampedArray(7), pixels(0, 0, 0),
        4, 4, plate('codex', 1000, 20), 'warm'), /Invalid authored/);
});

test('Six GPU emissive layers use one generic world material pipeline', () => {
    const original = townPreviewManifest();
    const integrated = townPreviewManifest({ domains: true });
    assert.ok(!original.layers.some(x => x.emissionKind));
    const apertures = integrated.layers.filter(x => x.emissionKind);
    assert.equal(apertures.length, 6);
    for (const aperture of apertures) {
        assert.equal(aperture.castsShadow, false);
        assert.equal(aperture.receivesShadow, false);
        assert.match(aperture.ownerId, /^town-(common|nexus|blacksmith|codex|hall)$/);
        const material = integrated.materials.find(m => m.id === aperture.material);
        assert.ok(material.emissiveMap && material.emissionIntensity > 0);
    }
});


test('The domain scene uses one immutable base receiver rather than overlapping building diffuse paintings', () => {
    const scene = townPreviewManifest({ domains:true });
    assert.equal(scene.layers.filter(layer=>layer.diffuseDomain).length,0);
    assert.equal(scene.layers.filter(layer=>layer.id==='canonical-day-reference').length,1);
    assert.ok(scene.layers.filter(layer=>!layer.emissionKind).every(layer=>!layer.domain));
});

test('Neutral building material stays inside both approved day/night alpha silhouettes', () => {
    const day = new Uint8ClampedArray([220, 200, 170, 255, 255, 235, 200, 255]);
    const night = new Uint8ClampedArray([30, 25, 22, 255, 12, 12, 12, 0]);
    const result = neutralizeBuildingPixels(day, night, 2, 1);
    assert.equal(result.retained, 1);
    assert.deepEqual(Array.from(result.data.slice(4)), [0, 0, 0, 0],
        'Daylight silhouette cannot expose a vacant-night transparent pixel');
    for (let channel = 0; channel < 3; channel++)
        assert.ok(result.data[channel] > night[channel] && result.data[channel] < day[channel]);
    assert.equal(result.data[3], 255);
});
test('Neutral material rejects any unregistered pixel array length or invalid daylight mix', () => {
    const day = new Uint8ClampedArray(8), night = new Uint8ClampedArray(8);
    assert.throws(() => neutralizeBuildingPixels(day, night, 3, 1), /registered RGBA/);
    assert.throws(() => neutralizeBuildingPixels(day, night, 2, 1,
        { daylightContribution: 4 }), /registered RGBA/);
});


test('Golden banner decoration cannot emit even when active-source pixels are bright', async () => {
    const {TOWN_CLOTH_REGIONS,isTownClothPixel}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-emission-masks.js');
    for(const [x,y,w,h] of TOWN_CLOTH_REGIONS) {
        assert.ok(isTownClothPixel(x+w/2,y+h/2));
        const mask=emissionMaskPixels(pixels(255,180,50),pixels(0,0,0),4,4,plate('hall',x+1,y+1),'warm');
        assert.ok(mask.every(value=>value===0));
    }
});


test('Night reflectance candidate never interpolates mismatched daylight geometry or changes alpha', async () => {
    const {liftTownReferencePixels}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-building-neutral-albedo.js');
    const original=new Uint8ClampedArray([20,30,40,255,60,70,80,0]);
    const copy=new Uint8ClampedArray(original);
    const result=liftTownReferencePixels(original,2,1,4);
    assert.deepEqual(original,copy);assert.equal(result[3],255);assert.equal(result[7],0);
    assert.ok(result[0]>original[0] && result[0]<result[1] && result[1]<result[2]);
    assert.throws(()=>liftTownReferencePixels(original,2,1,100),/reflectance/);
});


test('Lower Hall annex and both side crystals are covered by their own source masks', () => {
    const warm=emissionMaskPixels(pixels(250,170,60),pixels(2,2,2),4,4,plate('hall',1540,800),'warm');
    assert.ok(warm[3]>0,'Lower Hall windows must not disappear below the previous y=765 cutoff');
    for(const [x,y] of [[345,310],[485,275]]) {
        const magic=emissionMaskPixels(pixels(100,150,250),pixels(2,2,2),4,4,plate('nexus',x,y),'magic');
        assert.equal(magic[3],255);assert.equal(magic[0],magic[1]);assert.equal(magic[1],magic[2]);
    }
});

test('Bright orange source highlights keep their hue instead of clipping red and green independently', async () => {
    const {liftTownReferencePixels}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-building-neutral-albedo.js');
    const output=liftTownReferencePixels(new Uint8ClampedArray([220,145,80,255]),1,1,4);
    assert.equal(output[0],255);
    assert.ok(output[1]<190 && output[2]<130,'An orange source must not become a pale yellow patch');
    assert.equal(output[3],255);
});

test('Gate masonry correction retains flame/glass, banners and input alpha', async () => {
    const {neutralizeTownGateMasonry}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-building-neutral-albedo.js');
    const source=new Uint8ClampedArray(1672*941*4);
    const at=(x,y)=>(y*1672+x)*4;
    for(const [x,y] of [[735,205],[744,230],[690,205]]) source.set([180,120,60,255],at(x,y));
    const output=neutralizeTownGateMasonry(source,1672,941);
    assert.ok(output[at(735,205)]-output[at(735,205)+2]<100);
    for(const [x,y] of [[744,230],[690,205]])
        assert.deepEqual(output.slice(at(x,y),at(x,y)+4),source.slice(at(x,y),at(x,y)+4));
    assert.equal(output[at(735,205)+3],255);
});

test('Public sconce emission accepts bright flame but rejects neighbouring warm brick', async () => {
    const {commonAperturePixels}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-emission-masks.js');
    const source=new Uint8ClampedArray(1672*941*4),at=(x,y)=>(y*1672+x)*4;
    source.set([180,115,65,255],at(742,230));source.set([255,210,80,255],at(744,230));
    const mask=commonAperturePixels(source,1672,941);
    assert.equal(mask[at(742,230)+3],0,'Warm masonry must not become emissive');
    assert.equal(mask[at(744,230)+3],255,'The real flame must remain emissive');
});


test('Public apertures share light chromaticity despite differently painted flame hues', async () => {
    const {commonAperturePixels}=await import('../../src/Wyrmforge.Presentation.Web/wwwroot/js/town-emission-masks.js');
    const source=new Uint8ClampedArray(1672*941*4),at=(x,y)=>(y*1672+x)*4;
    source.set([245,130,20,255],at(744,230));
    source.set([220,190,120,255],at(922,230));
    const original=source.slice(),output=commonAperturePixels(source,1672,941);
    const linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
    const rgb=(buffer,i)=>[0,1,2].map(c=>linear(buffer[i+c]));
    const luminance=v=>.2126*v[0]+.7152*v[1]+.0722*v[2];
    const colors=[at(744,230),at(922,230)].map(i=>rgb(output,i));
    for(let c=1;c<3;c++) assert.ok(Math.abs(colors[0][c]/colors[0][0]-colors[1][c]/colors[1][0])<.015);
    for(const i of [at(744,230),at(922,230)]) {
        const strength=Math.min(1,Math.max(0,Math.min(source[i]-150,source[i+1]-100)/100));
        const expected=[0,1,2].map(c=>linear(Math.round(source[i+c]*strength)));
        assert.ok(Math.abs(luminance(rgb(output,i))-luminance(expected))<.003);
    }
    assert.deepEqual(source,original);
});
