// Town T2 opt-in, NONPRODUCTION playable geometry review.
// Uses the already-shared universal GPU LightingEngine; no competing renderer or AI.
// This review page is intentionally separate from the approved production Town.
import * as T from "../lighting/vendor/three.module.js";
import {LightingEngine} from "../lighting/engine.js";
import {validateTownScene} from "./town-scene-schema.js";
import {parseTownObj} from "./town-obj-parser.js";

const base = new URL("../../art/town/geometry/", import.meta.url);
const materialPalette = Object.freeze({
    stone_paving: ["#46444b", .94],
    stone_well: ["#78767a", .83],
    timber: ["#513725", .92],
    slate_roof: ["#242d43", .72],
    board: ["#75543b", .88],
    lantern: ["#d9a35f", .33]
});
const positions = Object.freeze({
    "behind-well": [0, .50, .60],
    "behind-noticeboard": [-1.57, 1.04, .60],
    "in-front": [-1.57, -.75, .60]
});

const standardMaterial = (id, color, roughness, options = {}) => ({
    id, color, roughness, metalness: 0, specular: .35, reflection: "direct",
    emission: "#000000", emissionIntensity: 0, alphaCutoff: 0,
    doubleSided: true, ...options
});

function previewSnapshot(scene, mode, actorPosition) {
    const zero = mode === "zero", day = mode === "day";
    const materials = Object.entries(materialPalette).map(([id, [color, roughness]]) =>
        standardMaterial(id, color, roughness, id === "lantern" ? {
            emission: "#ffb45e", emissionIntensity: 1.8
        } : {}));
    materials.push(standardMaterial("npc-proxy", "#718caa", .8));

    const objects = scene.nodes.filter(n => n.roles.includes("visual") && n.meshId).map(node => {
        const groupId = node.meshId.split("#")[1];
        return {
            id: node.id, ownerId: node.id, geometry: groupId, material: node.materialId,
            position: node.transform.position, rotation: node.transform.rotationDegrees.map(v => v * Math.PI / 180),
            scale: node.transform.scale, receivesLight: true, receivesShadow: true,
            castsShadow: node.roles.includes("occluder")
        };
    });
    objects.push({
        id: "town.review.actor-proxy", ownerId: "town.review.actor-proxy",
        geometry: "town.review.actor-proxy", material: "npc-proxy",
        position: positions[actorPosition], rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 1],
        receivesLight: true, receivesShadow: true, castsShadow: true
    });

    const light = (id, type, position, color, intensity, priority) => ({
        id, ownerId: id, type, enabled: true, position, direction: [0, 0, -1],
        color, intensity, range: 22, coneAngle: .55, penumbra: .25,
        castsShadow: true, priority
    });
    return {
        version: 1, time: 0, objects, materials,
        lights: zero ? [] : [
            light("town.review.sky", "directional", [-4, -5, 9], day ? "#f8ddbd" : "#8eaacb",
                day ? 1.8 : .45, 10),
            light("town.review.lantern", "point", [2.65, -1.5, 1.83],
                "#ff9a4c", day ? 6 : 15, 9)
        ],
        environment: {
            ambient: zero ? 0 : day ? .46 : .045,
            color: day ? "#e2e0d8" : "#8196b9",
            exposure: 1, emission: !zero
        }
    };
}

export async function initializeTown3DReview(canvas, status) {
    if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError("Town review canvas is required");
    const response = await Promise.all([
        fetch(new URL("t1-central-square-preview.obj", base)),
        fetch(new URL("t1-central-square.scene.json", base))
    ]);
    for (const r of response) if (!r.ok) throw new Error(`Town geometry load failed: HTTP ${r.status}`);
    const [obj, scene] = await Promise.all([response[0].text(), response[1].json()]);
    validateTownScene(scene);
    const parsed = parseTownObj(obj);

    const engine = new LightingEngine(canvas);
    for (const group of parsed.groups.values()) {
        const geometry = new T.BufferGeometry();
        geometry.setAttribute("position", new T.Float32BufferAttribute(group.positions, 3));
        geometry.computeVertexNormals();
        engine.registerGeometry(group.id, geometry);
    }
    for (const node of scene.nodes.filter(n => n.meshId)) {
        const groupId = node.meshId.split("#")[1];
        const group = parsed.groups.get(groupId);
        if (!group || group.materialId !== node.materialId)
            throw new Error(`Town geometry/material mismatch: ${node.id}`);
    }
    const actor = new T.CylinderGeometry(.18, .22, 1.2, 10);
    engine.registerGeometry("town.review.actor-proxy", actor);
    let mode = "night", actorPosition = "behind-well", view = "lit", alive = true;

    const redraw = () => {
        if (!alive) return;
        engine.apply(previewSnapshot(scene, mode, actorPosition));
        engine.setCamera([0, 0, 1], 4.7);
        engine.setDebugView(view);
        engine.render();
        status.textContent = `${scene.nodes.length} scene nodes · ${parsed.triangleCount} triangles · ${mode} · ${actorPosition}`;
    };
    const resize = new ResizeObserver(() => redraw());
    resize.observe(canvas);
    const api = {
        getState() {
            return {ready: true, sceneNodes: scene.nodes.length, triangles: parsed.triangleCount,
                groups: [...parsed.groups.keys()], mode, actorPosition, view};
        },
        setMode(next) {
            if (!["day", "night", "zero"].includes(next)) throw new RangeError("Invalid environment");
            mode = next; redraw();
        },
        setActorPosition(next) {
            if (!Object.hasOwn(positions, next)) throw new RangeError("Invalid preview actor position");
            actorPosition = next; redraw();
        },
        setView(next) {
            if (!["lit", "geometry", "normals", "albedo"].includes(next)) throw new RangeError("Invalid diagnostic");
            view = next; redraw();
        },
        pixelSample() { engine.render(); return [...engine.pixels()]; },
        dispose() { alive = false; resize.disconnect(); engine.dispose(); }
    };
    redraw();
    return api;
}

export async function mountTown3DReview() {
    const canvas = document.getElementById("town3d-canvas");
    const status = document.getElementById("town3d-status");
    try {
        const api = await initializeTown3DReview(canvas, status);
        window.__town3dReview = api;
        for (const [id, method] of [
            ["town3d-mode", "setMode"],
            ["town3d-actor", "setActorPosition"],
            ["town3d-view", "setView"]
        ]) document.getElementById(id).addEventListener("change", event => api[method](event.target.value));
        window.addEventListener("pagehide", () => api.dispose(), {once: true});
    } catch (error) {
        status.textContent = `Town 3D review error: ${error.message}`;
        status.dataset.error = "true";
        throw error;
    }
}
