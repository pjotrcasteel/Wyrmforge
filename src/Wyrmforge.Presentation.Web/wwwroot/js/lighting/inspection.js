import * as T from './vendor/three.module.js';

/** Diagnostic-only visualizations of actual renderer resources; never scene illumination. */
export class LightingInspection {
    constructor() {
        this.scene = new T.Scene();
        this.camera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.material = new T.ShaderMaterial({
            uniforms: { shadowDepth: { value: null } }, depthTest: false, depthWrite: false,
            vertexShader: 'varying vec2 uvDepth; void main() { uvDepth=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
            fragmentShader: `#include <packing>
                uniform sampler2D shadowDepth; varying vec2 uvDepth;
                void main() { float depth=unpackRGBAToDepth(texture2D(shadowDepth,uvDepth)); gl_FragColor=vec4(vec3(depth),1.0); }`,
        });
        this.quad = new T.Mesh(new T.PlaneGeometry(2, 2), this.material);
        this.scene.add(this.quad);
    }
    depth(renderer, light) {
        this.material.uniforms.shadowDepth.value = light?.shadow?.map?.texture ?? null;
        if (!this.material.uniforms.shadowDepth.value) { renderer.clear(); return; }
        renderer.render(this.scene, this.camera);
    }
    bounds(scene, lights) {
        const helpers = [];
        for (const light of lights) {
            let helper;
            if (light.isPointLight) {
                helper = new T.Group();
                helper.add(new T.PointLightHelper(light, .15));
                const range = new T.Mesh(new T.SphereGeometry(light.distance, 24, 12),
                    new T.MeshBasicMaterial({ color: light.color, wireframe: true, toneMapped: false }));
                range.position.copy(light.position); helper.add(range);
            } else if (light.isSpotLight) helper = new T.SpotLightHelper(light);
            else helper = new T.DirectionalLightHelper(light, 1);
            scene.add(helper); helper.update?.(); helpers.push(helper);
        }
        return () => {
            for (const helper of helpers) {
                scene.remove(helper);
                helper.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
            }
        };
    }
    dispose() { this.quad.geometry.dispose(); this.material.dispose(); }
}
