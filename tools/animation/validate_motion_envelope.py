"""Independent saved-rig reach probe before expensive regional/color exports.
Default checks source-forward motion. Optional heading probes expose unsupported
lateral motion; none of these results imply raster or Hunt acceptance.
"""
import argparse,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('folder',type=Path)
parser.add_argument('--heading-degrees',type=float,default=0,
 help='Root-motion angle away from source forward; nonzero probes are diagnostic, not new source support.')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
if not math.isfinite(args.heading_degrees):parser.error('heading must be finite')
folder=args.folder.resolve()
heading=math.radians(args.heading_degrees)
m=json.loads((folder/'source-manifest.json').read_text());bpy.ops.wm.open_mainfile(filepath=str(folder/'hollow-foundation.blend'))
rig=bpy.data.objects['Hollow editable animation rig'];scene=bpy.context.scene
poses={}
for name in ['walk','attack-travel']:
 poses[name]=[];rig.animation_data.action=bpy.data.actions['AN1_'+name+'_supported_v1']
 for i,sample in enumerate(m['clips'][name]['samples']):
  scene.frame_set(i+1);bpy.context.view_layer.update();chains={}
  for c in m['contactChains']:
   upper=rig.pose.bones[c['upper']];end=rig.pose.bones[c['end']];rest=rig.data.bones[c['end']]
   point=end.matrix @ rest.matrix_local.inverted() @ Vector(c['restContactPoint'])
   chains[c['id']]={'root':list(upper.head),'end':list(end.head),'point':list(point),'planted':any(p['id']==c['id'] for p in sample['contacts']),'a':rig.data.bones[c['upper']].length,'b':rig.data.bones[c['middle']].length,'limits':c['limits']}
  poses[name].append(chains)
grid=m['clips']['attack-travel']['poseGrid'];duration=grid['actionFrames']/m['clips']['attack-travel']['fps'];stride=m['clips']['walk']['strideMetres'];limit=m['unitsPerPixel'];results=[]
for hz in [15,30,60,120]:
 for rate in [1,2,4.3]:
  for initial in [0,.17,.35,.61]:
   for reverse in [False,True]:
    anchors={};maximum=0;minimum_flex=180;failure=None
    for tick in range(math.ceil((duration+.4)*hz)+1):
     t=tick/hz;travel=rate*t if not reverse or t<=.55 else rate*(1.1-t)
     phase=(initial+travel*math.cos(heading))%1
     if t<duration:
      count=grid['phaseFrames'];action=min(grid['actionFrames']-1,math.floor(t/duration*(grid['actionFrames']-1)+.5));index=action*count+math.floor(phase*count+.5)%count;name='attack-travel'
     else:count=m['clips']['walk']['frames'];index=math.floor(phase*count+.5)%count;name='walk'
     sampled=(index%count)/count;error=(phase-sampled+1.5)%1-.5
     world=Vector((stride*travel*math.sin(heading),-stride*travel*math.cos(heading),0))
     for id,c in poses[name][index].items():
      if not c['planted']:anchors.pop(id,None);continue
      if id not in anchors:anchors[id]=list(Vector(c['point'])+world+Vector((0,stride*error,0)))
      target=Vector(anchors[id])-world;point=Vector(c['point']);correction=(target-point).length;maximum=max(maximum,correction)
      ankle=Vector(c['end'])+target-point;reach=(ankle-Vector(c['root'])).length;a,b=c['a'],c['b']
      if not abs(a-b)<reach<a+b:failure={'time':t,'contact':id,'reason':'unreachable source chain'};break
      flex=180-math.degrees(math.acos(max(-1,min(1,(a*a+b*b-reach*reach)/(2*a*b)))));minimum_flex=min(minimum_flex,flex)
      if not c['limits'][0]<=flex<=c['limits'][1]:failure={'time':t,'contact':id,'reason':'joint limit','flexDegrees':flex};break
      if correction>limit:failure={'time':t,'contact':id,'reason':'source-pixel correction budget','correctionMetres':correction};break
     if failure:break
    results.append({'hz':hz,'cyclesPerSecond':rate,'initialPhase':initial,'reverse':reverse,'maxCorrectionMetres':maximum,'minimumKneeFlexDegrees':minimum_flex,'failure':failure})
report={'sourceForwardOnly':args.heading_degrees==0,'rootHeadingDegrees':args.heading_degrees,'runtimeAccepted':False,'correctionBudgetMetres':limit,'results':results}
filename='motion-envelope-qc.json' if args.heading_degrees==0 else f'motion-envelope-heading-{args.heading_degrees:g}-qc.json'
(folder/filename).write_text(json.dumps(report,indent=2)+'\n')
failed=[r for r in results if r['failure']];print('SOURCE_MOTION_ENVELOPE',len(results)-len(failed),'/',len(results),'passed; root heading',args.heading_degrees)
if failed:raise ValueError('Source motion envelope failed: '+json.dumps(failed[:3]))
