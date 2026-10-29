#!/usr/bin/env python3
"""Read-only H1 geometry diagnostics for newly authored Hollowed 3D studies.

No renderer, animation or game imports. Technical preflight is not art approval.
"""
from __future__ import annotations
import argparse
import json
import math
from pathlib import Path
import trimesh


def report(path: Path) -> dict:
    scene = trimesh.load(path, force='scene', process=False)
    meshes = [(name, mesh) for name, mesh in scene.geometry.items()
              if isinstance(mesh, trimesh.Trimesh)]
    if not meshes:
        raise ValueError('No editable triangular source mesh found.')
    tissue = [(name, mesh) for name, mesh in meshes
              if name.startswith(('organic_tissue_h1', 'connected_anatomical_tissue'))]
    if len(tissue) != 1:
        raise ValueError('Expected one named primary anatomical source mesh.')
    main = tissue[0][1]
    volumes = main.split(only_watertight=False)
    bounds = scene.bounds
    detached_parts = []
    # Independent meshes are legitimate for bone/inset parts at H1. A full
    # source-to-tissue proximity test is deferred to H2 retopology, not faked.
    for name, mesh in meshes:
        if len(mesh.vertices) < 4 or len(mesh.faces) < 4:
            detached_parts.append(name)
    results = {
        'stage': 'H1 source topology diagnostic (NOT visual approval)',
        'file': path.name,
        'geometry_objects': len(meshes),
        'primary_mesh': tissue[0][0],
        'primary_triangles': len(main.faces),
        'primary_components': len(volumes),
        'primary_watertight': bool(main.is_watertight),
        'total_triangles': sum(len(mesh.faces) for _, mesh in meshes),
        'bounds_m': [[round(float(x), 4) for x in row] for row in bounds],
        'objects_with_insufficient_geometry': detached_parts,
        'finite_coordinates': all(math.isfinite(float(x)) for _, m in meshes for x in m.bounds.reshape(-1)),
    }
    checks = {
        'primary_connected': len(volumes) == 1,
        'primary_closed': bool(main.is_watertight),
        'no_degenerate_mesh_objects': len(detached_parts) == 0,
        'feet_reach_ground': -0.04 <= float(bounds[0][2]) <= 0.10,
        'plausible_study_height': 2.5 <= float(bounds[1][2] - bounds[0][2]) <= 4.2,
        'finite_source_geometry': results['finite_coordinates'],
        'manageable_source_size': results['total_triangles'] < 300000,
    }
    results['preflight'] = checks
    results['passed'] = all(checks.values())
    results['not_tested'] = [
        'Blender reopened source file', 'UV mapping', 'skin deformation',
        'true anatomical quality', 'lighting correctness', 'animation compatibility',
        'owner art approval', 'in-game rendering',
    ]
    return results


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    data = report(args.source)
    rendered = json.dumps(data, indent=2) + '\n'
    print(rendered)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(rendered, encoding='utf-8')
    return 0 if data['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
