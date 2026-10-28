"""Independent saved-rig reach probe before expensive regional/color exports.
Source-forward motion only; never arbitrary-direction, raster or Hunt acceptance.
"""
import json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector
folder=Path(sys.argv[sys.argv.index('--')+1]).resolve()
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
     t=tick/hz;travel=rate*t if not reverse or t<=.55 else rate*(1.1-t);phase=(initial+travel)%1
     if t<duration:
      count=grid['phaseFrames'];action=min(grid['actionFrames']-1,math.floor(t/duration*(grid['actionFrames']-1)+.5));index=action*count+math.floor(phase*count+.5)%count;name='attack-travel'
     else:count=m['clips']['walk']['frames'];index=math.floor(phase*count+.5)%count;name='walk'
     sampled=(index%count)/count;error=(phase-sampled+1.5)%1-.5;world=-stride*travel
     for id,c in poses[name][index].items():
      if not c['planted']:anchors.pop(id,None);continue
      if id not in anchors:anchors[id]=[c['point'][0],c['point'][1]+world+stride*error,c['point'][2]]
      target=Vector(anchors[id]);target.y-=world;point=Vector(c['point']);correction=(target-point).length;maximum=max(maximum,correction)
      ankle=Vector(c['end'])+target-point;reach=(ankle-Vector(c['root'])).length;a,b=c['a'],c['b']
      if not abs(a-b)<reach<a+b:failure={'time':t,'contact':id,'reason':'unreachable source chain'};break
      flex=180-math.degrees(math.acos(max(-1,min(1,(a*a+b*b-reach*reach)/(2*a*b)))));minimum_flex=min(minimum_flex,flex)
      if not c['limits'][0]<=flex<=c['limits'][1]:failure={'time':t,'contact':id,'reason':'joint limit','flexDegrees':flex};break
      if correction>limit:failure={'time':t,'contact':id,'reason':'source-pixel correction budget','correctionMetres':correction};break
     if failure:break
    results.append({'hz':hz,'cyclesPerSecond':rate,'initialPhase':initial,'reverse':reverse,'maxCorrectionMetres':maximum,'minimumKneeFlexDegrees':minimum_flex,'failure':failure})
report={'sourceForwardOnly':True,'runtimeAccepted':False,'correctionBudgetMetres':limit,'results':results}
(folder/'motion-envelope-qc.json').write_text(json.dumps(report,indent=2)+'\n')
failed=[r for r in results if r['failure']];print('SOURCE_MOTION_ENVELOPE',len(results)-len(failed),'/',len(results),'passed')
if failed:raise ValueError('Source-forward motion envelope failed: '+json.dumps(failed[:3]))
