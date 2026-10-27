"""The canonical skinned-material internal embers, shared by Hollowed QC renders.

Never paint an RGB/GIF overlay: use actual weighted mesh surface vertices, so
turning, wounds and self-occlusion remain source-authored in every 3D pose.
Do not use this as another runtime lighting engine.
"""
from __future__ import annotations

import math

REGIONS = (
    ("eye-left", -.036, .425, .017, .015, .78),
    ("eye-right", .036, .425, .017, .015, .78),
    ("open-mouth", 0, .387, .027, .015, .85),
    ("rib-wound", -.085, .237, .038, .047, .52),
    ("abdomen-wound", .047, .116, .038, .048, .38),
    ("striking-hand-left", -.258, -.11, .040, .050, .64),
    ("striking-hand-right", .258, -.11, .040, .050, .64),
)


def attach_internal_fire(actor):
    """Return an animatable emission-strength socket and mapped region counts."""
    mesh = actor.data
    if actor.type != "MESH" or not len(mesh.materials):
        raise ValueError("Actual weighted Hollowed source mesh/material required")

    regions = []
    for label, cx, cz, rx, rz, energy in REGIONS:
        nearby = [vertex.co.y for vertex in mesh.vertices
                  if abs(vertex.co.x - cx) < rx * 1.35
                  and abs(vertex.co.z - cz) < rz * 1.35]
        if len(nearby) < 4:
            if label.startswith("striking-hand") or label.endswith("-wound"):
                continue  # Anatomically missing hands/wounds never glow in air.
            raise ValueError(f"No weighted 3D facial geometry for {label}")
        front = sorted(nearby)[max(0, int(len(nearby)*.08)-1)]
        regions.append((label, cx, front, cz, rx, rz, energy))

    old = mesh.attributes.get("hollow_inner_fire")
    if old is not None:
        mesh.attributes.remove(old)
    field = mesh.attributes.new(name="hollow_inner_fire", type="FLOAT", domain="POINT")
    counts = {region[0]: 0 for region in regions}
    for vertex in mesh.vertices:
        x, y, z = vertex.co
        values = []
        for label, cx, front, cz, rx, rz, energy in regions:
            nx, nz = (x-cx)/rx, (z-cz)/rz
            depth = max(0.0, (y-front)/.038)
            value = math.exp(-1.4*(nx*nx+nz*nz)-3.0*depth*depth)*energy
            if value >= .10:
                counts[label] += 1
            values.append(value)
        field.data[vertex.index].value = min(1.0, max(values, default=0.0))

    if any(counts.get(label, 0) < 3 for label in ("eye-left", "eye-right", "open-mouth")):
        raise ValueError(f"Hollowed's face must have TRUE skinned ember sockets: {counts}")

    controls = []
    for i, original in enumerate(list(mesh.materials)):
        material = original.copy()
        material.name = original.name + " | authentic inner fire"
        material.use_nodes = True
        tree = material.node_tree
        output = next((node for node in tree.nodes if node.type == "OUTPUT_MATERIAL"), None)
        if output is None or not output.inputs["Surface"].is_linked:
            raise ValueError("Original source material has no surface shader")
        link = output.inputs["Surface"].links[0]
        surface = link.from_socket
        tree.links.remove(link)

        attr = tree.nodes.new("ShaderNodeAttribute")
        attr.attribute_name = "hollow_inner_fire"
        emission = tree.nodes.new("ShaderNodeEmission")
        emission.inputs["Color"].default_value = (1, .23, .018, 1)
        strength = tree.nodes.new("ShaderNodeMath")
        strength.operation = "MULTIPLY"
        tree.links.new(attr.outputs["Fac"], strength.inputs[0])
        tree.links.new(strength.outputs[0], emission.inputs["Strength"])
        layered = tree.nodes.new("ShaderNodeAddShader")
        tree.links.new(surface, layered.inputs[0])
        tree.links.new(emission.outputs[0], layered.inputs[1])
        tree.links.new(layered.outputs[0], output.inputs["Surface"])
        mesh.materials[i] = material
        controls.append(strength.inputs[1])
    return controls, counts


def strength_for_motion(index, attack_start=8, attack_frames=16):
    """Subtle internal smoulder, distinct charge, sharp hit, natural cooling."""
    t = index-attack_start
    if t < 0 or t >= attack_frames:
        return .85
    if t <= 4:
        return .85 + 1.10 * t/4
    if t <= 8:
        return 1.95 + 2.40 * (t-4)/4
    if t <= 11:
        return 4.35 - 1.55 * (t-8)/3
    return 2.80 - 1.95 * (t-11)/4
