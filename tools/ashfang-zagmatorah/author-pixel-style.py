"""Native low-resolution Ashfang export look: fixed color ramps and binary coverage."""
import bpy,sys,argparse,json,hashlib
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);out=Path(a.output).resolve();assert not out.exists();out.mkdir(parents=True);scene=bpy.context.scene
scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=0;scene.view_settings.gamma=1;scene.render.dither_intensity=0;scene.render.filter_size=.01
for material in bpy.data.materials:
 if not material.use_nodes:continue
 for n in material.node_tree.nodes:
  if n.type=='BSDF_PRINCIPLED':
   n.inputs['Roughness'].default_value=1;n.inputs['Metallic'].default_value=0;n.inputs['Specular IOR Level'].default_value=.05
scene.use_nodes=True;tree=scene.node_tree;tree.nodes.clear();nodes=tree.nodes;links=tree.links
src=nodes.new('CompositorNodeRLayers');sep=nodes.new('CompositorNodeSeparateColor');sep.mode='RGB';links.new(src.outputs['Image'],sep.inputs['Image'])
def math(op,a,b=None):
 n=nodes.new('CompositorNodeMath');n.operation=op
 for i,v in enumerate((a,b)):
  if v is None:continue
  if isinstance(v,(int,float)):n.inputs[i].default_value=v
  else:links.new(v,n.inputs[i])
 return n.outputs[0]
r,g,b=[math('POWER',sep.outputs[k],1/2.2) for k in ('Red','Green','Blue')];value=math('ADD',math('ADD',math('MULTIPLY',r,.60),math('MULTIPLY',g,.30)),math('MULTIPLY',b,.10));warm=math('GREATER_THAN',r,math('MULTIPLY',g,1.22))
cool=['10131b','1a1e29','272c39','363e4c','4b5562','65717b','87949b','aeb8b8','d1cec0','e6dbc2'];hot=['160f15','24151d','381d26','542a2d','743734','9b4937','be603c','de803f','efa74e','f3ce78','f7e4ac']
def linear(v):v=v/255;return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def ramp(colors,thresholds):
 n=nodes.new('CompositorNodeValToRGB');n.color_ramp.interpolation='CONSTANT'
 while len(n.color_ramp.elements)>2:n.color_ramp.elements.remove(n.color_ramp.elements[-1])
 for i,(col,pos) in enumerate(zip(colors,thresholds)):
  e=n.color_ramp.elements[i] if i<2 else n.color_ramp.elements.new(pos);e.position=pos;e.color=tuple(linear(int(col[j:j+2],16)) for j in (0,2,4))+(1,)
 links.new(value,n.inputs[0]);return n.outputs[0]
c=ramp(cool,[0,.055,.10,.16,.23,.32,.44,.58,.74,.90]);h=ramp(hot,[0,.045,.08,.13,.20,.29,.40,.53,.67,.81,.94]);mix=nodes.new('CompositorNodeMixRGB');mix.blend_type='MIX';links.new(warm,mix.inputs[0]);links.new(c,mix.inputs[1]);links.new(h,mix.inputs[2]);alpha=nodes.new('CompositorNodeSetAlpha');alpha.mode='REPLACE_ALPHA';links.new(mix.outputs[0],alpha.inputs['Image']);links.new(math('GREATER_THAN',src.outputs['Alpha'],.5),alpha.inputs['Alpha']);dest=nodes.new('CompositorNodeComposite');links.new(alpha.outputs[0],dest.inputs[0])
for im in bpy.data.images:
 if im.source!='FILE':continue
 name=Path(im.filepath.replace('\\','/')).name
 if im.packed_file:im.unpack(method='REMOVE')
 im.filepath='//../M0-001/original/download/textures/'+name
bpy.ops.wm.save_as_mainfile(filepath=str(out/'ashfang-pixel-style.blend'),compress=True,relative_remap=False)
(out/'style.json').write_text(json.dumps({'status':'style-proof-not-approved','source':'../motion-library-018/ashfang-animations.blend','nativeCell':128,'worldCell':256,'pixelsPerWorldPixel':2,'cameraElevation':35.26438968,'orthoSpan':22,'palette':cool+hot,'palettePolicy':'Two fixed constant color ramps across all frames/facings; no per-frame palette or dithering.','coverage':'Binary alpha at native render resolution.','sha256':hashlib.sha256((out/'ashfang-pixel-style.blend').read_bytes()).hexdigest()},indent=2),encoding='utf-8')
