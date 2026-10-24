#!/usr/bin/env python3
"""WyrmForge wizard: editable Blender character/rig authoring checkpoint.

Usage (Blender 4.5+): blender --background --python build_wizard_blender.py --
    --output /path/to/wizard-source.blend --school fire

This file *builds* a native character, cloth-ready meshes, IK-controlled limbs,
individual staff objects, and animation actions. The exported .blend and visual
quality MUST be reviewed in Blender; this script is not an accepted runtime atlas
and no Blender execution has been claimed where Blender is unavailable.

No dependency on game C#, Hollowed, Ashling or PR #332 renderer source.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

try:
    import bpy
    from mathutils import Vector
except ImportError:
    raise SystemExit("Requires Blender's embedded Python: run blender --background --python ...")

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))
from wizard_motion import WALK_FRAMES, walk_pose, cast_progress
from character_pipeline.humanoid_rig import humanoid_bones

SCHOOLS = {
    'fire': '#A75436', 'frost': '#729BA9', 'storm': '#B49A42',
    'arcane': '#79648C', 'necromancer': '#6C805C', 'summoner': '#90744E',
}
NEUTRALS = {
    'robe': '#414044', 'robe_shadow': '#28282D', 'robe_raised': '#575359',
    'linen': '#756E66', 'leather': '#342C29', 'leather_edge': '#635043',
    'skin': '#A38E7B', 'skin_shadow': '#6A5C52', 'hair': '#A39F95',
    'hair_shadow': '#696764', 'metal': '#665F58', 'boot': '#242328',
}


def rgb(hex_string):
    return tuple(int(hex_string[i:i+2], 16) / 255 for i in (1, 3, 5))


def move_to_collection(obj, coll):
    for original in tuple(obj.users_collection):
        original.objects.unlink(obj)
    coll.objects.link(obj)
    return obj


def create_collection(name, parent=None):
    coll = bpy.data.collections.new(name)
    (parent or bpy.context.scene.collection).children.link(coll)
    return coll


def material(name, hex_color, roughness=.89, bump=.08, woven=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get('Principled BSDF')
    color = rgb(hex_color)
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    if woven:
        # Actual neutral fabric color breakup; no painted torch or camera lighting.
        # Separate large worn-dye and tiny yarn-scale noise to preserve readability
        # at the mobile sprite size after orthographic sampling.
        wear = nodes.new('ShaderNodeTexNoise')
        wear.name = 'Undyed wool / worn dye irregularity'
        wear.inputs['Scale'].default_value = 6.5
        wear.inputs['Detail'].default_value = 3.2
        wear.inputs['Roughness'].default_value = .72
        variation = nodes.new('ShaderNodeValToRGB')
        variation.name = 'Dark Gothic wool / neutral albedo'
        variation.color_ramp.elements[0].position = .20
        variation.color_ramp.elements[0].color = (*tuple(max(0,v*.68) for v in color),1)
        variation.color_ramp.elements[1].position = .81
        variation.color_ramp.elements[1].color = (*tuple(min(1,v*1.13) for v in color),1)
        mat.node_tree.links.new(wear.outputs['Fac'], variation.inputs['Fac'])
        mat.node_tree.links.new(variation.outputs['Color'],bsdf.inputs['Base Color'])
        yarn = nodes.new('ShaderNodeTexNoise')
        yarn.name = 'Fine wool grain / normal response only'
        yarn.inputs['Scale'].default_value = 110
        yarn.inputs['Detail'].default_value = 2.3
        bump_node = nodes.new('ShaderNodeBump')
        bump_node.inputs['Strength'].default_value = bump
        bump_node.inputs['Distance'].default_value = .0035
        mat.node_tree.links.new(yarn.outputs['Fac'], bump_node.inputs['Height'])
        mat.node_tree.links.new(bump_node.outputs['Normal'], bsdf.inputs['Normal'])
    mat.diffuse_color = (*color, 1)
    return mat


class WizardBuilder:
    def __init__(self, school):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        self.school = school
        self.root = create_collection('Wizard | ORIGINAL EDITABLE SOURCE')
        self.body = create_collection('Neutral body / rig', self.root)
        self.garment = create_collection('Cloth panels and collisions', self.root)
        self.staves = create_collection('Six school staffs', self.root)
        self.controls = create_collection('Animation / IK controls', self.root)
        self.camera_collection = create_collection('Authoring preview only', self.root)
        self.pal = {name: material(name, value, woven=name in ('robe','robe_shadow','robe_raised','linen'))
                    for name, value in NEUTRALS.items()}
        self.school_mats = {name:material(name+' | pigmented shaft', value, roughness=.78, woven=True)
                            for name,value in SCHOOLS.items()}
        self.staff_emit = {name:material(name+' | staff energy (UNLIT SOURCE)',value,roughness=.38)
                           for name,value in SCHOOLS.items()}
        self.arm = self.armature()
        self.make_body()
        self.make_garments()
        self.make_gothic_accessories()
        self.make_staffs()
        self.staff_control = self.create_staff_grip_control()
        self.ik_targets = self.create_ik()
        self.make_actions()
        self.animate_staff_emission()
        self.make_direction_pivot()
        self.make_preview_scene()

    def armature(self):
        data = bpy.data.armatures.new('Wizard control skeleton')
        obj = bpy.data.objects.new('WizardRig', data)
        self.body.objects.link(obj)
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT')
        specs = humanoid_bones(include_beard=True)
        for name,(start,end,parent) in specs.items():
            b = data.edit_bones.new(name)
            b.head,b.tail = start,end
            b.use_connect=False
            if parent:
                b.parent=data.edit_bones[parent]
            if name == 'root':
                b.use_deform=False
        bpy.ops.object.mode_set(mode='OBJECT')
        # Rig requirement: a planted boot retains the actor's forward axis.
        # The shin may pitch/yaw under two-bone IK, but must NOT twist the
        # weighted whole boot 90 degrees along with it. Preserve the authored
        # ankle-to-toe rest orientation, including when the whole actor turns.
        for side in ('L','R'):
            foot=data.bones['foot.'+side]
            foot.use_inherit_rotation=False
        obj.show_in_front=True
        obj.display_type='WIRE'
        obj.select_set(False)
        return obj

    def skin(self, obj, bone, target_collection=None, collision=False):
        if target_collection is not None:
            move_to_collection(obj,target_collection)
        # Bake geometric world transform so skin weights use one stable coordinate convention.
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        group=obj.vertex_groups.new(name=bone)
        group.add(list(range(len(obj.data.vertices))),1.0,'REPLACE')
        modifier=obj.modifiers.new('Same armature as all actors','ARMATURE')
        modifier.object=self.arm
        if collision:
            c=obj.modifiers.new('World cloth body collision','COLLISION')
            if hasattr(c.settings,'thickness_outer'):
                c.settings.thickness_outer=.012
        obj.select_set(False)
        return obj

    def sphere(self,name,pos,size,mat,bone,collection=None,segments=28,rings=18,collision=False):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=pos)
        obj=bpy.context.object
        obj.name=name
        obj.scale=size
        obj.data.materials.append(mat)
        for face in obj.data.polygons: face.use_smooth=True
        return self.skin(obj,bone,collection or self.body,collision)

    def cylinder_between(self,name,a,b,radius,mat,bone,vertices=16,collision=False):
        delta=Vector(b)-Vector(a)
        mid=(Vector(b)+Vector(a))*.5
        bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=radius,radius2=radius*.91,
                                        depth=delta.length,location=mid)
        obj=bpy.context.object
        obj.name=name
        obj.rotation_euler=delta.to_track_quat('Z','Y').to_euler()
        obj.data.materials.append(mat)
        for face in obj.data.polygons:face.use_smooth=True
        return self.skin(obj,bone,self.body,collision)

    def mesh(self,name,vertices,faces,mat,collection,uvs=None):
        data=bpy.data.meshes.new(name)
        data.from_pydata(vertices,[],faces)
        data.update()
        ob=bpy.data.objects.new(name,data)
        collection.objects.link(ob)
        data.materials.append(mat)
        for face in data.polygons:face.use_smooth=True
        if uvs is not None:
            layer=data.uv_layers.new(name='AuthoredUV')
            for poly in data.polygons:
                for li in poly.loop_indices:
                    vi=data.loops[li].vertex_index
                    layer.data[li].uv=uvs[vi]
        return ob

    def sculpt_head(self):
        # Dedicated deformed, UV-mapped head mesh. Neutral albedo, no painted lights.
        ob=self.sphere('Head | cheek and jaw sculpt',(0,-.055,1.815),(.196,.168,.229),
                       self.pal['skin'],'head',segments=40,rings=24)
        # Transform already applied: vertices are world-coordinate positions.
        for v in ob.data.vertices:
            x,y,z=v.co
            h=(z-1.815)/.229
            if z<1.75:
                v.co.x*=max(.77,1-.21*(1.75-z)/.165)
                v.co.y+=.012
            if abs(x)<.135 and y<-.165 and 1.76<z<1.87:
                v.co.y-=.014*(1-abs(x)/.135)
            if y<-.135 and 1.89<z<1.94:
                v.co.y-=.010
        self.sphere('Nose / defined bridge',(0,-.234,1.805),(.056,.071,.085),
                    self.pal['skin'],'head',segments=18,rings=10)
        for sign in (-1,1):
            self.sphere('Deep-set eye '+str(sign),(sign*.074,-.214,1.878),(.033,.014,.014),
                        self.pal['leather'],'head',segments=12,rings=8)
            self.sphere('Heavy brow '+str(sign),(sign*.071,-.193,1.912),(.087,.025,.026),
                        self.pal['skin_shadow'],'head',segments=16,rings=8)
            self.sphere('Cheek plane '+str(sign),(sign*.135,-.165,1.775),(.074,.045,.065),
                        self.pal['skin_shadow'],'head',segments=16,rings=10)
        self.sphere('Hair crown',(0,.016,1.865),(.204,.163,.19),
                    self.pal['hair_shadow'],'head')

    def make_body(self):
        self.sphere('Under-robe collision torso',(0,0,1.32),(.27,.18,.38),
                    self.pal['robe_shadow'],'chest',collision=True)
        self.sphere('Upper coat / chest',(0,-.008,1.43),(.30,.195,.25),
                    self.pal['robe'],'chest')
        self.sphere('Leather belt',(0,0,1.035),(.28,.19,.052),
                    self.pal['leather'],'pelvis')
        self.sculpt_head()
        for side in ['L','R']:
            sign=-1 if side=='L' else 1
            self.cylinder_between('Arm upper '+side,(sign*.30,-.02,1.48),(sign*.40,-.10,1.26),
                                  .13,self.pal['robe_raised'],'upper_arm.'+side)
            self.cylinder_between('Arm forearm '+side,(sign*.40,-.10,1.26),
                                  (sign*.50 if side=='R' else sign*.32,-.24,1.13 if side=='R' else 1.04),
                                  .108,self.pal['robe_shadow'],'forearm.'+side)
            self.sphere('Hand '+side,(sign*.50 if side=='R' else sign*.32,-.275,1.16 if side=='R' else 1.02),
                        (.076,.069,.087),self.pal['skin'],'hand.'+side,segments=18,rings=12)
            self.cylinder_between('Leg upper '+side,(sign*.19,0,.91),(sign*.19,-.082,.55),
                                  .122,self.pal['robe_shadow'],'thigh.'+side,collision=True)
            self.cylinder_between('Shin '+side,(sign*.19,-.082,.55),(sign*.19,-.04,.17),
                                  .098,self.pal['boot'],'shin.'+side,collision=True)
            self.sphere('Boot heel '+side,(sign*.19,-.055,.145),(.13,.145,.115),
                        self.pal['boot'],'foot.'+side,collision=True)
            self.sphere('Boot toe '+side,(sign*.19,-.19,.098),(.138,.19,.08),
                        self.pal['boot'],'foot.'+side,collision=True)
        self.make_beard()
        self.make_hat()
        self.sphere('Field satchel',(-.34,-.24,1.0),(.16,.085,.20),
                    self.pal['leather'],'pelvis')
        self.sphere('Satchel clasp',(-.34,-.338,1.06),(.035,.018,.036),
                    self.pal['metal'],'pelvis',segments=12,rings=8)

    def make_beard(self):
        # Eleven individually UV-authored layers; tips are genuinely skinned to
        # the same original beard bones. No pasted white silhouette decal.
        for index in range(11):
            x=(index-5)*.030
            length=.34+.20*math.cos(index*.54)+.035*math.sin(index*1.87)
            width=.032 if abs(index-5)<4 else .027
            rows=16
            verts=[];uvs=[]
            for j in range(rows):
                t=j/(rows-1)
                z=1.673-length*t
                y=-.243-.070*t-.012*math.sin(math.pi*t+index*.35)
                xoffset=x+(.014*math.sin(2.4*math.pi*t+index*.61))*t
                half=width*(1-.86*t)
                verts.extend([(xoffset-half,y-.004,z),(xoffset+half,y+.004,z)])
                uvs.extend([(0,t),(1,t)])
            faces=[(j*2,j*2+1,j*2+3,j*2+2) for j in range(rows-1)]
            material_name='hair' if index%4 else 'hair_shadow'
            ob=self.mesh('Weighted original beard lock %02d'%index,verts,faces,
                         self.pal[material_name],self.body,uvs)
            root=ob.vertex_groups.new(name='beard.root')
            tip=ob.vertex_groups.new(name='beard.tip')
            for j in range(rows):
                weight=min(1,max(0,(j/(rows-1)-.24)/.67))
                for offset in (0,1):
                    if weight<1: root.add([j*2+offset],max(.001,1-weight),'REPLACE')
                    if weight>0: tip.add([j*2+offset],weight,'REPLACE')
            modifier=ob.modifiers.new('Weighted secondary beard bones','ARMATURE')
            modifier.object=self.arm
        for sign in (-1,1):
            self.sphere('Grey sideburn '+str(sign),(sign*.174,-.13,1.725),
                        (.043,.050,.19),self.pal['hair_shadow'],'head',segments=16,rings=10)

    def make_hat(self):
        # Bent, broad but restrained felt brim, different from licensed film costume.
        n=48
        base=[];inner=[]
        for i in range(n):
            a=2*math.pi*i/n
            r=.39+.045*math.sin(3*a+.63)+.015*math.sin(7*a)
            z=2.041+.017*math.sin(2*a)+.007*math.cos(5*a)
            base.append((r*math.cos(a),.75*r*math.sin(a),z))
            inner.append((.236*math.cos(a),.166*math.sin(a),2.079))
        ob=self.mesh('Stitched irregular brim',base+inner,
                     [(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)],
                     self.pal['robe_shadow'],self.body)
        self.skin(ob,'head')
        rings=[]
        for height,rx,ry,offset in [(2.065,.26,.178,0),(2.15,.235,.16,-.003),
                                    (2.245,.18,.135,.025),(2.35,.09,.075,.07),
                                    (2.382,.015,.02,.115)]:
            rings.extend([(rx*math.cos(2*math.pi*i/n)+offset,
                           ry*math.sin(2*math.pi*i/n),height) for i in range(n)])
        quads=[]
        for row in range(4):
            for i in range(n):
                quads.append((row*n+i,row*n+(i+1)%n,(row+1)*n+(i+1)%n,(row+1)*n+i))
        crown=self.mesh('Uneven folded felt crown',rings,quads,self.pal['robe'],self.body)
        self.skin(crown,'head')
        self.sphere('Old hat leather band',(0,0,2.11),(.248,.168,.031),
                    self.pal['leather'],'head',segments=36,rings=6)

    def make_cloth_panel(self, name, verts, faces, uvs, mat, anchor_bone, row_count, width_count, simulate=True):
        ob=self.mesh(name,verts,faces,mat,self.garment,uvs)
        g=ob.vertex_groups.new(name=anchor_bone)
        pin=ob.vertex_groups.new(name='ClothPins')
        for j in range(row_count):
            for i in range(width_count):
                idx=j*width_count+i
                # Every vertex follows the body part in the PRE-cloth source.
                # Previously only 3 waistband rows followed the animated
                # pelvis/chest: the rest stayed in world space and folded back
                # through the moving legs when simulation began.
                g.add([idx],1.0,'REPLACE')
                if j<3:
                    pin_weight=1.0 if j==0 else (.92 if j==1 else .48)
                    pin.add([idx],pin_weight,'REPLACE')
                elif 'coat' in name.lower():
                    # Weighted secondary spring anchors maintain the open-front
                    # skirt silhouette. Cloth is still free to bend/lag below.
                    t=j/max(1,row_count-1)
                    # A structured wool coat is not a free-falling cape.
                    # High but nonrigid pins retain the authored silhouette;
                    # the secondary cloth motion is left to the loose hem.
                    pin.add([idx],.72+.16*(1.0-t)**2,'REPLACE')
                else:
                    # Keep the cloak behind the shoulders; lower panels still
                    # respond with delayed, damped motion but cannot freely
                    # whip up over the face during the 16-pose gait.
                    t=j/max(1,row_count-1)
                    pin.add([idx],.30+.43*(1.0-t)**2,'REPLACE')
        ar=ob.modifiers.new('Armature carries sewn waistband','ARMATURE')
        ar.object=self.arm
        if not simulate:
            # Inner robe remains body-skinned and visually stable. Only detached
            # hem flaps and the separate rear cape receive free cloth dynamics.
            return ob
        cloth=ob.modifiers.new('Dynamic cloth | body collision','CLOTH')
        cloth.settings.quality=12
        is_coat='coat' in name.lower()
        cloth.settings.mass=.62 if is_coat else .35
        if hasattr(cloth.settings,'vertex_group_mass'):
            cloth.settings.vertex_group_mass='ClothPins'
        for name_,value in [('tension_stiffness',28 if is_coat else 23),
                            ('compression_stiffness',26 if is_coat else 22),
                            ('shear_stiffness',19 if is_coat else 15),
                            ('bending_stiffness',1.65 if is_coat else 2.25),
                            ('air_damping',3.0 if is_coat else 5.0)]:
            if hasattr(cloth.settings,name_):
                setattr(cloth.settings,name_,value)
        if hasattr(cloth.collision_settings,'use_self_collision'):
            cloth.collision_settings.use_self_collision=True
        if hasattr(cloth.collision_settings,'distance_min'):
            cloth.collision_settings.distance_min=.015
        cloth.point_cache.frame_start=-31
        cloth.point_cache.frame_end=200
        # UV authored first, simulation geometry retained; do not apply the cloth modifier.
        return ob

    def make_garments(self):
        n=38;rows=18
        start=-math.pi/2+.22
        end=3*math.pi/2-.22
        verts=[];uv=[];faces=[]
        for j in range(rows):
            t=j/(rows-1)
            width=.245+.19*(t**1.7)
            ydepth=.19+.15*(t**1.5)
            for i in range(n):
                a=start+(end-start)*i/(n-1)
                pleat=.024*math.cos(a*13+.2)*(t*t)+.008*math.sin(a*5.4)*(t**3)
                r=width+pleat
                hem=.027*math.cos(a*8.2+.4)*(t**4)
                verts.append((r*math.cos(a),ydepth*math.sin(a),1.07-.96*t+hem))
                uv.append((i/(n-1),t))
                if i<n-1 and j<rows-1:
                    p=j*n+i
                    # Outer cloth normal follows +radial direction (away from legs).
                    # Previous angular->downward winding pointed INWARD.
                    faces.append((p,p+n,p+n+1,p+1))
        self.make_cloth_panel('Open-front weighty coat / skinned foundation',verts,faces,uv,
                              self.pal['robe'], 'pelvis', rows,n,simulate=False)
        # Two independent light hem flaps carry the secondary physics; their
        # motion cannot collapse the entire torso/leg silhouette.
        for side in (-1,1):
            cols=10;fr=14;flap_verts=[];flap_uv=[];flap_faces=[]
            for j in range(fr):
                t=j/(fr-1)
                for i in range(cols):
                    u=i/(cols-1)
                    x=side*(.155+(.18+.055*t)*u)
                    y=-.165-.185*t+.018*math.sin(u*2*math.pi)*(t*t)
                    z=1.045-.695*t+.027*math.sin(u*math.pi*3)*(t*t)
                    flap_verts.append((x,y,z))
                    flap_uv.append((u,t))
                    if i<cols-1 and j<fr-1:
                        k=j*cols+i
                        flap_faces.append((k,k+cols,k+cols+1,k+1) if side>0 else
                                          (k,k+1,k+cols+1,k+cols))
            self.make_cloth_panel('Weighty coat hem panel '+('L' if side<0 else 'R'),
                                  flap_verts,flap_faces,flap_uv,
                                  self.pal['robe_raised' if side<0 else 'robe_shadow'],
                                  'pelvis',fr,cols)
        # A second loose cape, pinned to shoulders and ending behind the boots.
        cols=26; cr=16;verts=[];uv=[];faces=[]
        for j in range(cr):
            t=j/(cr-1)
            z=1.53-1.21*t
            for i in range(cols):
                u=i/(cols-1)
                x=(-.38+.76*u)*(1+.24*t)
                y=.075+.31*t+.048*math.sin(u*math.pi*5)*t*t
                verts.append((x,y,z+.043*math.cos(3*u*math.pi)*t*t))
                uv.append((u,t))
                if i<cols-1 and j<cr-1:
                    p=j*cols+i
                    faces.append((p,p+1,p+1+cols,p+cols))
        self.make_cloth_panel('Asymmetric rear cape with physical lag',verts,faces,uv,
                              self.pal['robe_shadow'],'chest',cr,cols)
        # Structured shoulder mantle: rigid upper layer over moving outer cape.
        self.sphere('Heavy wool mantle and lapel',(-.045,-.018,1.49),
                    (.39,.24,.105),self.pal['robe_raised'],'chest')
        # A thick broad belt gives readably separated torso and coat at pixel scale.
        self.sphere('Weathered leather cinch',(0,-.004,1.045),
                    (.30,.217,.058),self.pal['leather'],'pelvis')
        # Sew a darker, irregular edge into the same dynamic coat mesh. Material
        # indexing remains attached to the cloth vertices during simulation.
        coat=bpy.data.objects['Open-front weighty coat / skinned foundation']
        coat.data.materials.append(self.pal['robe_shadow'])
        for polygon in coat.data.polygons:
            lower=max(coat.data.vertices[index].co.z for index in polygon.vertices)
            if lower < .21 and polygon.index % 7 != 0:
                polygon.material_index=1

    def make_gothic_accessories(self):
        """Body-weighted field-worn layers, not a second floating costume shell."""
        # Shoulder strap follows torso motion; an offset silhouette on the LEFT
        # shoulder reads more strongly than micro ornaments at gameplay scale.
        self.cylinder_between('Crossbody leather strap / upper',(-.31,-.205,1.48),
                              (-.08,-.282,1.24),.023,self.pal['leather_edge'],'chest',vertices=10)
        self.cylinder_between('Crossbody leather strap / lower',(-.08,-.282,1.24),
                              (.18,-.215,1.075),.023,self.pal['leather'],'chest',vertices=10)
        self.sphere('Antique clasp with low-sheen bronze',(-.09,-.285,1.23),
                    (.043,.027,.045),self.pal['metal'],'chest',segments=14,rings=8)
        # Distinct overlapping lapels show the coat depth and keep the beard
        # free of a bright front-facing flat panel.
        for side in (-1,1):
            x=side*.18
            self.cylinder_between('Folded collar hem '+str(side),(x,-.212,1.54),
                                  (side*.10,-.270,1.24),.023,
                                  self.pal['robe_raised' if side<0 else 'robe_shadow'],
                                  'chest',vertices=8)
        # Small weathered cuff edges stay with arms, not simulated robe vertices.
        for side in ('L','R'):
            x=-.32 if side=='L' else .50
            z=1.04 if side=='L' else 1.16
            self.sphere('Turned wool cuff '+side,(x,-.27,z+.047),(.092,.080,.038),
                        self.pal['robe_shadow'],'forearm.'+side,segments=18,rings=8)

    def make_staffs(self):
        # No wizard-only renderer: these are authentic independently authored objects.
        for school,color in SCHOOLS.items():
            col=create_collection(school+' staff / school selectable',self.staves)
            a=(.55,-.32,.115);b=(.55,-.32,2.49)
            shaft=self.cylinder_between(school+' tinted wood shaft',a,b,.045,
                                        self.school_mats[school],'root')
            move_to_collection(shaft,col)
            for ring_z in (.58,1.32,1.85,2.37):
                ring=self.sphere(school+' iron binding %.2f'%ring_z,(.55,-.32,ring_z),
                                 (.052,.052,.027),self.pal['metal'],'root',segments=14,rings=8)
                move_to_collection(ring,col)
            # The full shaft is a visible school pigment, not an opaque neon emissive tube.
            if school=='fire':
                for dx in (-.13,.10):
                    ob=self.cylinder_between('Scorched iron fork',(.55,-.32,2.47),
                                             (.55+dx,-.31,2.74),.033,self.pal['metal'],'root')
                    move_to_collection(ob,col)
                ob=self.sphere('Furnace ember | material mask',(.55,-.32,2.60),
                               (.083,.081,.09),self.staff_emit[school],'root')
            elif school=='frost':
                ob=self.sphere('Rime crystal crown | material mask',(.55,-.32,2.61),
                               (.085,.07,.17),self.staff_emit[school],'root')
            elif school=='storm':
                for dx in (-.11,.11):
                    ob=self.cylinder_between('Lightning conductive fork',(.55,-.32,2.47),
                                              (.55+dx,-.32,2.75),.026,self.staff_emit[school],'root')
                    move_to_collection(ob,col)
                ob=self.sphere('Conductor core | material mask',(.55,-.32,2.55),
                               (.07,.065,.078),self.staff_emit[school],'root')
            elif school=='arcane':
                ob=self.sphere('Astral cage stone | material mask',(.55,-.32,2.61),
                               (.085,.085,.085),self.staff_emit[school],'root')
                for dx in (-.115,.115):
                    ring=self.cylinder_between('Enclosing astrolabe',(.55+dx,-.32,2.51),
                                               (.55+dx,-.32,2.71),.018,self.pal['metal'],'root')
                    move_to_collection(ring,col)
            elif school=='necromancer':
                ob=self.sphere('Bone reliquary | material mask',(.55,-.32,2.60),
                               (.115,.08,.101),self.staff_emit[school],'root')
                for dx in (-.044,.044):
                    dark=self.sphere('Hollow eye socket',(.55+dx,-.40,2.62),
                                     (.024,.018,.024),self.pal['robe_shadow'],'root',segments=12,rings=8)
                    move_to_collection(dark,col)
            else:
                ob=self.sphere('Bound animal totem | material mask',(.55,-.32,2.58),
                               (.1,.09,.11),self.staff_emit[school],'root')
                for dx in (-.15,.15):
                    horn=self.cylinder_between('Natural totem antler',(.55+dx*.45,-.32,2.65),
                                               (.55+dx,-.31,2.77),.018,self.pal['leather_edge'],'root')
                    move_to_collection(horn,col)
            move_to_collection(ob,col)
            col.hide_render = school!=self.school
            col.hide_viewport = school!=self.school

    def create_staff_grip_control(self):
        """Separate authored prop socket: staff stays upright when the wrist bends.

        Child staff geometry remains skinned to non-moving root rather than
        the rotating wrist bone. One keyframed socket follows the right hand.
        The existing universal renderer still owns all world illumination.
        """
        pivot=bpy.data.objects.new('StaffGripControl',None)
        self.controls.objects.link(pivot)
        pivot.empty_display_type='ARROWS'
        pivot.empty_display_size=.13
        pivot.location=(.55,-.32,1.16)
        bpy.context.view_layer.update()
        for collection in self.staves.children:
            for ob in tuple(collection.objects):
                world=ob.matrix_world.copy()
                ob.parent=pivot
                ob.matrix_world=world
        return pivot

    def create_ik(self):
        targets={}
        for name,base in [
            ('foot.L',(-.185,-.08,.14)),('foot.R',(.185,-.08,.14)),
            ('hand.L',(-.33,-.24,1.03)),('hand.R',(.50,-.29,1.16)),
            ('knee.L',(-.45,-.52,.63)),('knee.R',(.45,-.52,.63)),
            ('elbow.L',(-.68,.18,1.19)),('elbow.R',(.68,.18,1.19)),
        ]:
            e=bpy.data.objects.new('IK '+name,None)
            self.controls.objects.link(e)
            e.empty_display_size=.058
            e.empty_display_type='SPHERE' if 'foot' in name else 'PLAIN_AXES'
            e.location=base
            targets[name]=e
        for side in ('L','R'):
            for limb,tip,pole in [
                ('shin','foot','knee'),('forearm','hand','elbow'),
            ]:
                pb=self.arm.pose.bones[f'{limb}.{side}']
                ik=pb.constraints.new('IK')
                ik.name='World-anchored '+tip+' plant'
                ik.target=targets[f'{tip}.{side}']
                ik.chain_count=2
                ik.pole_target=targets[f'{pole}.{side}']
                ik.pole_angle=0
                if hasattr(ik,'use_stretch'):
                    ik.use_stretch=False
        return targets

    def make_actions(self):
        """One inspectable multi-clip timeline, including grounded 16-frame loop.

        Keeping per-control actions in a single contiguous source timeline avoids
        confusing animation slot/multi-object action issues in Blender 4.5. Export
        consumers receive named frame ranges; authoritative game events unchanged.
        """
        scene=bpy.context.scene
        ranges={'walk':(1,17),'idle':(21,33),'cast':(41,60),
                'hurt':(71,80),'death':(91,114)}
        self.arm.animation_data_create()
        self.arm.animation_data.action=bpy.data.actions.new('Wizard skeleton | source actions')
        self.arm.animation_data.action.use_fake_user=True
        for ob in self.ik_targets.values():
            ob.animation_data_create()
            ob.animation_data.action=bpy.data.actions.new(ob.name+' | source actions')
            ob.animation_data.action.use_fake_user=True
        self.staff_control.animation_data_create()
        self.staff_control.animation_data.action=bpy.data.actions.new('Staff prop socket | source actions')
        self.staff_control.animation_data.action.use_fake_user=True
        # Two complete authoring-only pre-roll loops let cloth settle before
        # exported walk begins at frame 1. Negative keys are NOT gameplay clips.
        # The full source loop remains frames 1..17 with frame 17 == frame 1.
        for frame in range(-31,1):
            local_index=(frame-1) % WALK_FRAMES
            scene.frame_set(frame)
            self.pose_frame('walk',local_index,WALK_FRAMES+1)
            for name in ('pelvis','spine','chest','head','beard.root','beard.tip'):
                bone=self.arm.pose.bones[name]
                bone.keyframe_insert(data_path='location',frame=frame)
                bone.keyframe_insert(data_path='rotation_euler',frame=frame)
            for target in self.ik_targets.values():
                target.keyframe_insert(data_path='location',frame=frame)
            self.staff_control.keyframe_insert(data_path='location',frame=frame)
            self.staff_control.keyframe_insert(data_path='rotation_euler',frame=frame)
        scene['WizardClothWarmupFrames']=32
        for clip,(first,last) in ranges.items():
            length=last-first+1
            for local_index,f in enumerate(range(first,last+1)):
                scene.frame_set(f)
                self.pose_frame(clip,local_index,length)
                for name in ('pelvis','spine','chest','head','beard.root','beard.tip'):
                    pb=self.arm.pose.bones[name]
                    pb.keyframe_insert(data_path='location',frame=f)
                    pb.keyframe_insert(data_path='rotation_euler',frame=f)
                for target in self.ik_targets.values():
                    target.keyframe_insert(data_path='location',frame=f)
                self.staff_control.keyframe_insert(data_path='location',frame=f)
                self.staff_control.keyframe_insert(data_path='rotation_euler',frame=f)
        scene.frame_start=1
        scene.frame_end=114
        scene.frame_set(1)
        scene['WyrmForgeWizardClipRanges'] = json.dumps(ranges)
        scene['SourceFrameDirections'] = json.dumps(['N','NE','E','SE','S','SW','W','NW'])
        scene['SourceSchoolVariants'] = json.dumps(list(SCHOOLS.keys()))
        scene['RigStatus'] = 'BLENDER-NATIVE ART CANDIDATE: gait/cloth/lighting not production accepted'
        scene['RenderAuthority'] = 'PR #332 common lighting; no wizard-specific draw path'
        return ranges

    def pose_frame(self,clip,i,length):
        # Reset authored controls before sampling each pose. One feet-root coordinate
        # convention underlies all directions; never stretch/mirror missing views.
        for name in ('pelvis','spine','chest','head','beard.root','beard.tip'):
            pb=self.arm.pose.bones[name]
            pb.rotation_mode='XYZ'
            pb.location=(0,0,0)
            pb.rotation_euler=(0,0,0)
        t=i/(length-1) if length>1 else 0
        foot_l=(-.185,-.08,.14);foot_r=(.185,-.08,.14)
        grip_r=(.50,-.29,1.16)
        grip_l=(-.33,-.24,1.03)
        if clip=='walk':
            pose=walk_pose(0 if i==length-1 else i/WALK_FRAMES)
            foot_l=(pose.left.x,pose.left.y,pose.left.z)
            foot_r=(pose.right.x,pose.right.y,pose.right.z)
            self.arm.pose.bones['pelvis'].location=(0,pose.pelvis_y,pose.pelvis_z-.97)
            self.arm.pose.bones['pelvis'].rotation_euler=(0,0,pose.pelvis_roll)
            self.arm.pose.bones['chest'].rotation_euler=(0,0,pose.chest_counter_yaw)
            grip_r=(.50,pose.staff_grip_y,pose.staff_grip_z)
            grip_l=(-.33,-.23+.09*math.sin(2*math.pi*pose.phase),
                    1.03+.035*math.sin(2*math.pi*pose.phase+.8))
            self.arm.pose.bones['beard.tip'].rotation_euler=(pose.beard_lag,0,0)
        elif clip=='idle':
            w=math.sin(2*math.pi*t)
            self.arm.pose.bones['chest'].location=(0,0,.012*w)
            self.arm.pose.bones['beard.tip'].rotation_euler=(.008*w,0,0)
        elif clip=='cast':
            brace,elev,_=cast_progress(i)
            self.arm.pose.bones['pelvis'].location=(0,-.055*brace,-.04*brace)
            self.arm.pose.bones['spine'].rotation_euler=(.075*brace,0,0)
            self.arm.pose.bones['chest'].rotation_euler=(-.13*brace,0,-.07*brace)
            grip_r=(.50,-.29-.13*brace,1.16+elev)
            grip_l=(-.39,-.32,1.03+.19*brace)
            foot_l=(-.22,-.18,.14);foot_r=(.18,.16,.14)
            self.arm.pose.bones['beard.tip'].rotation_euler=(.08*brace,0,0)
        elif clip=='hurt':
            recoil=math.sin(math.pi*t)
            self.arm.pose.bones['spine'].rotation_euler=(.11*recoil,0,.07*recoil)
            self.arm.pose.bones['chest'].rotation_euler=(.12*recoil,0,-.14*recoil)
            grip_r=(.50,-.27,1.16+.08*recoil)
        elif clip=='death':
            fall=1-math.exp(-4.4*t)
            self.arm.pose.bones['pelvis'].location=(0,.10*fall,-.61*fall)
            self.arm.pose.bones['pelvis'].rotation_euler=(.70*fall,0,.09*fall)
            self.arm.pose.bones['spine'].rotation_euler=(.36*fall,0,0)
            self.arm.pose.bones['head'].rotation_euler=(.16*fall,0,0)
            grip_r=(.58,-.49*fall-.29,1.16-.42*fall)
            grip_l=(-.45,-.30,.98-.44*fall)
            foot_l=(-.22,-.12,.14);foot_r=(.20,.11,.14)
        for name,position in [('foot.L',foot_l),('foot.R',foot_r),
                               ('hand.L',grip_l),('hand.R',grip_r)]:
            self.ik_targets[name].location=position
        # Keep a weighted, near-vertical staff in the actual grip across all
        # actions. Pose-controlled tilt is restrained to 0.22 rad, never 90°.
        self.staff_control.location=(grip_r[0]+.05,grip_r[1]-.03,grip_r[2])
        charge_brace=math.sin(min(1.0,i/max(1,length-1)) * math.pi) if clip=='cast' else 0.0
        self.staff_control.rotation_euler=(.22*charge_brace,0,0)

    def animate_staff_emission(self):
        """Authoring preview material. The real scene LightEmitter belongs to PR #332.

        Only staff-head/rune materials emit. All normal world albedo remains neutral.
        The material charge starts on cast windup, peaks at release and returns to
        zero through recovery; this is not a working runtime GPU-lighting integration.
        """
        ranges=json.loads(bpy.context.scene['WyrmForgeWizardClipRanges'])
        for school,mat in self.staff_emit.items():
            bsdf=mat.node_tree.nodes.get('Principled BSDF')
            color=rgb(SCHOOLS[school])
            bsdf.inputs['Emission Color'].default_value=(*color,1)
            emission=bsdf.inputs['Emission Strength']
            for clip, (first,last) in ranges.items():
                for index,frame in enumerate(range(first,last+1)):
                    charge=cast_progress(index)[2] if clip=='cast' else 0.0
                    emission.default_value=charge*1.6
                    emission.keyframe_insert(data_path='default_value',frame=frame)
            emission.default_value=0.0

    def make_direction_pivot(self):
        """Rotate body, cloth, props and ALL IK targets as one authored character.

        Rotating the armature alone would leave world-space IK targets behind;
        the neutral pose would look fine and the eight-facing walks would break.
        This root controls views ONLY, not authoritative C# player positions.
        """
        self.directions = {
            'S':0,'SE':45,'E':90,'NE':135,'N':180,'NW':225,'W':270,'SW':315,
        }
        pivot=bpy.data.objects.new('WizardActorDirectionPivot',None)
        self.root.objects.link(pivot)
        pivot.empty_display_type='CIRCLE'
        pivot.empty_display_size=.45
        for collection in (self.body,self.garment,self.staves,self.controls):
            for ob in tuple(collection.objects):
                world=ob.matrix_world.copy()
                ob.parent=pivot
                ob.matrix_world=world
        self.pivot=pivot
        return pivot

    def set_direction(self,direction):
        if direction not in self.directions:
            raise ValueError('Unsupported original 8-direction view: '+direction)
        self.pivot.rotation_euler[2]=math.radians(self.directions[direction])
        bpy.context.view_layer.update()

    def make_preview_scene(self):
        # Reference lighting is strictly for offline material/silhouette reviews.
        # Never bake these light sources into the game's source albedo textures.
        scene=bpy.context.scene
        world=bpy.data.worlds.new('Neutral charcoal authoring studio')
        world.use_nodes=True
        world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.12,.13,.15,1)
        world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.27
        scene.world=world
        cam_data=bpy.data.cameras.new('Shared 2.5D orthographic rig camera')
        cam=bpy.data.objects.new('Same camera / all 8 directions',cam_data)
        self.camera_collection.objects.link(cam)
        cam.location=(3,-6,4.2)
        target=Vector((0,0,1.15))
        cam.rotation_euler=(target-Vector(cam.location)).to_track_quat('-Z','Y').to_euler()
        cam.data.type='ORTHO'
        cam.data.ortho_scale=3.65
        scene.camera=cam
        for name,pos,power,color,size in [
            ('Neutral soft key',(-3,-4,5),165,(1,.93,.86),4),
            ('Cool edge',(2,2,3),110,(.72,.84,1),3),
        ]:
            data=bpy.data.lights.new(name,'AREA')
            ob=bpy.data.objects.new(name,data)
            self.camera_collection.objects.link(ob)
            ob.location=pos
            ob.rotation_euler=(target-Vector(pos)).to_track_quat('-Z','Y').to_euler()
            data.energy=power
            data.color=color
            data.shape='DISK'
            data.size=size
        try:
            scene.render.engine='BLENDER_EEVEE_NEXT'
        except (TypeError, ValueError):
            scene.render.engine='BLENDER_EEVEE'
        scene.render.film_transparent=True
        scene.render.resolution_x=512
        scene.render.resolution_y=512
        scene.render.resolution_percentage=100
        scene.view_settings.view_transform='AgX'
        scene.render.image_settings.file_format='PNG'
        # Colour, emission and normal map export must be done separately from this
        # reference-lit scene using the same camera and one pose source.


def main():
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    parser=argparse.ArgumentParser()
    parser.add_argument('--output',required=True)
    parser.add_argument('--school',choices=list(SCHOOLS),default='fire')
    parser.add_argument('--preview',action='store_true',help='Render one 512px review still; not a game atlas')
    parser.add_argument('--eight-review',action='store_true',help='Render eight direction stills for ART REVIEW ONLY')
    options=parser.parse_args(args)
    builder=WizardBuilder(options.school)
    output=Path(options.output)
    output.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output),compress=True)
    if options.preview:
        bpy.context.scene.frame_set(5)
        bpy.context.scene.render.filepath=str(output.with_name(output.stem+'-preview.png'))
        bpy.ops.render.render(write_still=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(output),compress=True)
    if options.eight_review:
        folder=output.with_name(output.stem+'-eight-direction-review')
        folder.mkdir(exist_ok=True,parents=True)
        bpy.context.scene.frame_set(5)
        for direction in ('N','NE','E','SE','S','SW','W','NW'):
            builder.set_direction(direction)
            bpy.context.scene.render.filepath=str(folder/('wizard-'+options.school+'-'+direction+'.png'))
            bpy.ops.render.render(write_still=True)
        builder.set_direction('S')
        bpy.ops.wm.save_as_mainfile(filepath=str(output),compress=True)
    print(json.dumps({'blend':str(output),'school':options.school,'editable':True,
                      'bones':len(builder.arm.data.bones),
                      'clips':json.loads(bpy.context.scene['WyrmForgeWizardClipRanges']),
                      'quality':'untested Blender source; not accepted production sprite'},indent=2))


if __name__=='__main__':
    main()
