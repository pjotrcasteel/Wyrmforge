"""Native original-vs-LOD material proof using one complete runtime pose."""
import argparse,json,math,sys
from pathlib import Path
import bpy
from mathutils import Matrix
p=argparse.ArgumentParser();p.add_argument('pack',type=Path);p.add_argument('study',type=Path);p.add_argument('--out',type=Path,required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);a.out.mkdir(parents=True,exist_ok=True)
surface=json.loads((a.pack/'poses.json').read_text());study=json.loads(a.study.read_text());pose=min([p for p in study['poses'] if p['sequence']=='corner'],key=lambda p:abs(p['timestamp']-1.2666667))
bpy.ops.wm.open_mainfile(filepath=str((a.pack/'source-skin-lod.blend').resolve()));scene=bpy.context.scene;rig=bpy.data.objects['Hollow editable animation rig'];rig.animation_data_clear()
view=bpy.data.objects['AN unanimated view'];view.rotation_euler=(0,0,0)
for i,b in enumerate(surface['bones']):
 values=pose['matrices'][i*16:i*16+16];rig.pose.bones[b['id']].matrix=Matrix([values[j::4] for j in range(4)]);bpy.context.view_layer.update()
original=bpy.data.objects['Hollow skinned character'];lod=bpy.data.objects['AN source skin candidate'];scene.cycles.samples=8;scene.render.resolution_x=scene.render.resolution_y=96;scene.render.resolution_percentage=100
for row,direction in enumerate(['N','NE','E','SE','S','SW','W','NW']):
 view.rotation_euler.z=math.atan2(-3.2,2.2)+math.pi/2+math.pi-row*math.pi/4
 for name,shown,hidden in [('source',original,lod),('lod',lod,original)]:
  shown.hide_render=False;hidden.hide_render=True;scene.render.filepath=str((a.out/(direction+'-'+name+'.png')).resolve());bpy.ops.render.render(write_still=True)
(a.out/'receipt.json').write_text(json.dumps({'poseSequence':pose['sequence'],'timestamp':pose['timestamp'],'sourceBlendSha256':surface['sourceBlendSha256'],'nativePixels':96,'samples':8,'originalWeightsAndTexture':True,'ownerApproved':False},indent=2)+'\n')
