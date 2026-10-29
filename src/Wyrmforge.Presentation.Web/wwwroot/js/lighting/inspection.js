import * as T from './vendor/three.module.js';

/** Diagnostic-only visualizations of actual renderer resources; never scene illumination. */
export class LightingInspection {
    constructor() {
        this.scene = new T.Scene();
        this.camera = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.materials = new Map();
        this.quad = new T.Mesh(new T.PlaneGeometry(2, 2));
        this.quad.frustumCulled = false;
        this.scene.add(this.quad);
    }
    depthMaterial(cube) {
        if (this.materials.has(cube)) return this.materials.get(cube);
        const material = new T.ShaderMaterial({
            uniforms: { shadowDepth: { value: null }, nearFar: { value: new T.Vector2() }, perspectiveDepth: { value: true } },
            depthTest: false, depthWrite: false,
            vertexShader: 'varying vec2 uvDepth; void main() { uvDepth=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
            fragmentShader: `
                uniform ${cube ? 'samplerCubeShadow' : 'sampler2DShadow'} shadowDepth;
                uniform vec2 nearFar; uniform bool perspectiveDepth; varying vec2 uvDepth;
                vec3 faceDirection(vec2 uv) {
                    vec2 tile=floor(uv*vec2(3.0,2.0)); vec2 p=fract(uv*vec2(3.0,2.0))*2.0-1.0;
                    float face=tile.x+3.0*tile.y;
                    if(face<1.0) return vec3(1.0,-p.y,-p.x);
                    if(face<2.0) return vec3(-1.0,-p.y,p.x);
                    if(face<3.0) return vec3(p.x,1.0,p.y);
                    if(face<4.0) return vec3(p.x,-1.0,-p.y);
                    if(face<5.0) return vec3(p.x,-p.y,1.0);
                    return vec3(-p.x,-p.y,-1.0);
                }
                void main() {
                    float low=0.0, high=1.0;
                    // PCF uses native comparison depth textures in Three 0.186.1.
                    // Recover depth to 16-bit precision without mutating the live sampler state.
                    for(int i=0;i<16;i++) {
                        float candidate=(low+high)*0.5;
                        float visible=${cube ? 'texture(shadowDepth,vec4(faceDirection(uvDepth),candidate))' : 'texture(shadowDepth,vec3(uvDepth,candidate))'};
                        if(visible>=0.5) low=candidate; else high=candidate;
                    }
                    float depth=(low+high)*0.5;
                    if(perspectiveDepth) depth=nearFar.x/(nearFar.y-depth*(nearFar.y-nearFar.x));
                    gl_FragColor=vec4(vec3(depth),1.0);
                }`,
        });
        this.materials.set(cube, material);
        return material;
    }
    depth(renderer, light) {
        const texture = light?.shadow?.map?.depthTexture;
        if (!texture) { renderer.clear(); return; }
        const material = this.depthMaterial(light.isPointLight === true);
        material.uniforms.shadowDepth.value = texture;
        material.uniforms.nearFar.value.set(light.shadow.camera.near, light.shadow.camera.far);
        material.uniforms.perspectiveDepth.value = !light.isDirectionalLight;
        this.quad.material = material;
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
    dispose() { this.quad.geometry.dispose(); for (const material of this.materials.values()) material.dispose(); }
}
