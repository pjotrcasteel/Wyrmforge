#!/usr/bin/env python3
"""Create TWO truly different Hollowed H1 silhouette source studies.

Art-only rest meshes from Rosswet Mobile's licensed CC BY 3.0 Thin Zombie
source, preserving its existing vertex groups/armature *as source data*.
Neither pose is an animation or production export; absolutely no changes
to WyrmForge's universal animation engine or PR #387.

The goal is to compare skeletal reach and weight, NOT to make two colorways.
The original v1 Ashfall Wretch remains a rejected quality benchmark.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
from pathlib import Path

import bpy  # Bundled Blender wheel registers the mathutils binary module.
from mathutils import Vector

HERE=Path(__file__).resolve().parent
SOURCE=HERE/"sculpt_ashfall_wretch_h1_blender.py"
VALID_VARIANTS=("raker","collapsed")


def load_sculpt():
    spec=importlib.util.spec_from_file_location("ashfall_source_h1",SOURCE)
    if spec is None or spec.loader is None:
        raise RuntimeError("Source-only Ashfall H1 sculpt missing")
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def bell(z, center, width):
    return math.exp(-((z-center)/width)**2)


def ease(a,b,x):
    v=max(0.0,min(1.0,(x-a)/(b-a)))
    return v*v*(3.0-2.0*v)


def raker_rest(point):
    """Tall, hunting, shoulder-led wretch. Human stance, predator reach.

    Jaw/skull is forward, left shoulder lifts, left hand extends and turns
    toward targets, right shoulder shrinks. The thorax and hip counterbalance
    the reached arm so it cannot be read as a disjoint rubber limb.
    """
    x,y,z=point
    high=ease(1.55,2.65,z)
    shoulder=bell(z,2.40,.45)
    skull=ease(2.52,2.91,z)
    left=ease(.20,.65,-x)
    right=ease(.20,.65,x)
    hand=left*ease(.43,.76,-x)*bell(z,1.62,.83)
    hips=bell(z,1.38,.49)
    knees=bell(z,.88,.27)
    # Scapular reach is continuous in upper thorax.
    y-=.125*high+.145*skull+.105*left*shoulder+.145*hand
    x-=.065*high+.065*skull+.070*left*shoulder+.060*hand
    z+=.094*left*shoulder-.075*right*shoulder+.14*hand
    # Other arm trails, more scarred/contracted and low.
    z-=.065*right*bell(z,1.80,.63)
    y+=.038*right*shoulder
    # Weight remains over leg; no isolated limb motion.
    y+=.068*hips
    x+=.056*hips
    x-=.027*knees
    if z<.065:
        z=max(0.0,z)
    return Vector((x,y,z))


def collapsed_rest(point):
    """Twisted, half-broken predator body with staggered arm silhouettes.

    Opposite shoulder leads, one arm appears partly wasted/contracted. The
    spine is canted, pelvis counterweighted, skull still recognizably human.
    No animal paws, long coats, disconnected accessories or asymmetric eyes
    drawn with decals.
    """
    x,y,z=point
    thorax=bell(z,2.18,.55)
    upper=ease(1.44,2.42,z)
    left=ease(.20,.60,-x)
    right=ease(.20,.62,x)
    shoulder=bell(z,2.39,.38)
    head=ease(2.48,2.93,z)
    arm=right*ease(.43,.73,x)*bell(z,1.69,.72)
    pelvis=bell(z,1.43,.52)
    leg=bell(z,.75,.30)
    # The large right shoulder really anchors in chest.
    x+=.105*upper+.09*right*shoulder-.045*left*shoulder
    y-=.095*upper+.11*right*shoulder+.11*arm
    z+=.105*right*shoulder-.16*left*shoulder+.07*arm
    # Counter-tilted human head/upper chest.
    x-=.10*head
    y-=.14*head
    z-=.075*head
    # A wasted left arm droops but remains fully connected at scapula.
    z-=.115*left*bell(z,1.73,.66)
    y+=.055*left*bell(z,1.85,.75)
    x-=.043*left*bell(z,1.85,.60)
    # Human pelvis and foot support; no static frame keys.
    x-=.070*pelvis
    y+=.055*pelvis
    x+=.025*leg
    if z<.065:
        z=max(0.0,z)
    return Vector((x,y,z))


def apply_variant(value, source, variant):
    """Add one independent anatomy pass over the original authoring base."""
    point=Vector(value)
    desired=raker_rest(point) if variant=="raker" else collapsed_rest(point)
    return desired, (desired-Vector(source)).length


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--input",type=Path,required=True)
    parser.add_argument("--output",type=Path,required=True)
    parser.add_argument("--variant",choices=VALID_VARIANTS,required=True)
    args=parser.parse_args()
    root=(Path.cwd()/"artifacts/hollow-rebuild").resolve()
    out=args.output.resolve()
    if not out.is_relative_to(root):
        raise ValueError("Source sculpt cannot output to runtime or engine files")
    sculpt=load_sculpt()
    original=sculpt.original_human_to_hollowed
    name=args.variant

    def authored(point):
        first, first_distance=original(point)
        return apply_variant(first,point,name)

    sculpt.original_human_to_hollowed=authored
    sculpt.create(args.input.resolve(),out)
    qc_path=out/"h1-sculpt-review.json"
    qc=json.loads(qc_path.read_text(encoding="utf-8"))
    qc["source_variant"]=name
    qc["source_shape_type"]="original continuous STATIC rest mesh, no actions"
    qc["comparison_purpose"]="original distinct silhouette at 96px, NOT production art"
    qc["owner_approved"]=False
    qc["generated_animation_clips"]=0
    if qc["modified_vertices"] < 1000 or qc["actions"] != 0:
        raise ValueError("Anatomy is not meaningfully changed or contains animation actions")
    qc_path.write_text(json.dumps(qc,indent=2)+"\n",encoding="utf-8")


if __name__=="__main__":
    main()
