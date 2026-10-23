"""Report actual skyward gaze, launch beats, landing contacts and death cooling."""
import bpy,math,json,sys,argparse
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);rig=bpy.data.objects['Zahmatorah_Skeleton'];scene=bpy.context.scene;report={'clips':{}}
for name in ['roar','takeoff','fly','hover','glide','bank_left','bank_right','air_breath','land','death','death_alt']:
 action=bpy.data.actions['Ashfang|'+name];rig.animation_data.action=action;rig.animation_data.action_slot=action.slots[0];rows=[];end=int(action.frame_range[1])
 for frame in range(1,end+1):
  scene.frame_set(frame);bpy.context.view_layer.update();b=rig.pose.bones;head=(b['UpperHead'].tail-b['UpperHead'].head).normalized();axis=(b['Spine01'].head-b['Spine03'].head).normalized()
  rows.append({'sourceFrame':frame,'displayFrame':(frame+1)/2,'phase':(frame-1)/(end-1),'headPitch':math.degrees(math.asin(max(-1,min(1,head.z)))),'headYaw':math.degrees(math.atan2(head.y,-head.x)),'bodyPitch':math.degrees(math.asin(max(-1,min(1,axis.z)))),'pelvisZ':b['Spine03'].head.z,'hindZ':[b['Feet_'+s].head.z for s in ('l','r')],'foreZ':[b['Arm_'+s].tail.z for s in ('l','r')],'magmaLife':float(rig.get('magmaLife',1))})
 report['clips'][name]={'maxHeadPitch':max(r['headPitch'] for r in rows),'maxAbsHeadYaw':max(abs(r['headYaw']) for r in rows),'pelvisRise':max(r['pelvisZ'] for r in rows)-rows[0]['pelvisZ'],'heatStart':rows[0]['magmaLife'],'heatEnd':rows[-1]['magmaLife'],'heatMonotonic':all(y['magmaLife']<=x['magmaLife']+1e-6 for x,y in zip(rows,rows[1:])),'frames':rows}
 print(name,{k:v for k,v in report['clips'][name].items() if k!='frames'},flush=True)
c=report['clips'];row=lambda name,display:next(x for x in c[name]['frames'] if x['displayFrame']==display)
report['checks']={'skywardRoar':c['roar']['maxHeadPitch']>60,'noRoarHop':c['roar']['pelvisRise']<.001,'noDeathHop':all(c[n]['pelvisRise']<.001 for n in ('death','death_alt')),'forwardAerialGaze':all(c[n]['maxAbsHeadYaw']<1 for n in ('fly','hover','glide','bank_left','bank_right','air_breath')),'takeoffLooksSkywardFrame10':row('takeoff',10)['headPitch']>50,'takeoffUprightFrame13':row('takeoff',13)['bodyPitch']>70,'takeoffLaunchFrame12':row('takeoff',12)['pelvisZ']-row('takeoff',10)['pelvisZ']>5,'landingRearFeetFirst':max(row('land',17)['hindZ'])<.20 and min(row('land',17)['foreZ'])>1,'landingForelimbsSettle':max(row('land',25)['foreZ'])<.28,'deathCoolsToBlack':all(c[n]['heatStart']==1 and c[n]['heatEnd']==0 and c[n]['heatMonotonic'] for n in ('death','death_alt'))}
restores={}
for action in [x for x in bpy.data.actions if x.name.startswith('Ashfang|') and not x.name.startswith('Ashfang|death')]:
 rig.animation_data.action=action;rig.animation_data.action_slot=action.slots[0];scene.frame_set(2);bpy.context.view_layer.update();restores[action.name]=float(rig.get('magmaLife',-1))==1
report['checks']['livingActionsRestoreHeat']=len(restores)==39 and all(restores.values());report['livingActionHeatRestore']=restores;report['pass']=all(report['checks'].values())
Path(a.output).parent.mkdir(parents=True,exist_ok=True);Path(a.output).write_text(json.dumps(report,indent=2))

assert report['pass'],report['checks']
