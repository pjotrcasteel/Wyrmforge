import test from 'node:test';
import assert from 'node:assert/strict';
import {spriteFrame,spriteAtlasLayout,spritePlaneGeometry} from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/lit-sprite.js';
import * as THREE from '../../src/Wyrmforge.Presentation.Web/wwwroot/js/lighting/vendor/three.module.js';
const clip={cell:96,frames:256,columns:32,crop:[16,12,80,84],anchor:[48,72],worldSize:93};
test('cropped multi-row pose atlas preserves scale and frame/facing separation',()=>{
 const l=spriteAtlasLayout(clip);assert.equal(l.width,2048);assert.equal(l.height,4608);assert.equal(l.width*l.height*4,36*1024*1024);
 const manifest={directions:['N','NE','E','SE','S','SW','W','NW'],clips:{strike:clip}};
 assert.deepEqual(spriteFrame(manifest,{clip:'strike',direction:'S',frame:255}),{offset:[31/32,1-40/64],repeat:[1/32,1/64]});
 const geometry=spritePlaneGeometry(THREE,clip,1,[0,-1,0]);
 geometry.computeBoundingBox();const box=geometry.boundingBox;
 assert.ok(Math.abs(box.max.x-box.min.x-62)<1e-6);assert.ok(Math.abs(box.max.z-box.min.z-69.75)<1e-6);
 assert.ok(Math.abs(box.min.x+31)<1e-6);assert.ok(Math.abs(box.min.z+11.625)<1e-6);
 geometry.dispose();
});
test('layouts reject out-of-source crops, zero dimensions and overlapping columns',()=>{
 for(const change of [{crop:[-1,0,96,96]},{crop:[0,0,97,96]},{crop:[20,0,20,96]},{columns:0},{columns:257},{columns:1.5},{cell:0},{frames:0}])assert.throws(()=>spriteAtlasLayout({...clip,...change}),RangeError);
});
