"""One runtime rig/profile projection shared by atlas and source-skin exports."""
import math

def build_runtime_profile(m):
    scale=93/1.55
    def runtime_clip(name):
        c=m['clips'][name];samples=[]
        root_stride=c.get('rootStrideVectorMetres',[0,-c['strideMetres'],0])
        if len(root_stride)!=3 or not all(math.isfinite(v) for v in root_stride) or abs(root_stride[2])>1e-9 or abs(math.hypot(*root_stride)-c['strideMetres'])>1e-6:raise ValueError('Invalid source root stride vector')
        for s in c['samples']:
            angle=s.get('authoredYawRadians',0);cos,sin=math.cos(angle),math.sin(angle)
            contacts=[]
            for q in s['contacts']:
                x=q['x']*cos-q['y']*sin;y=q['x']*sin+q['y']*cos
                contacts.append({'id':q['id'],'x':-y*scale,'y':x*scale})
            cx,cy=s['com'];com=[-(cx*sin+cy*cos)*scale,(cx*cos-cy*sin)*scale]
            samples.append({'contacts':contacts,'balance':s['balance'],'com':com,'supportMarginMetres':s['supportMargin']})
        result={'clip':name,'frames':c['frames'],'fps':c['fps'],'samples':samples}
        if name.startswith('pivot'):result['facingStep']=-round((c['samples'][-1].get('authoredYawRadians',0)-c['samples'][0].get('authoredYawRadians',0))/(math.pi/4))
        if c.get('poseGrid'):result['poseGrid']={**c['poseGrid'],'travel':'facing-projection','stanceVelocity':{'x':root_stride[1]*scale,'y':-root_stride[0]*scale}}
        if m.get('projectionByDirection'):
            pixel_scale=93/96;projected={}
            def ground_point(point,projection):
                x,y,z=point
                return [(projection[0]*x+projection[1]*y+projection[2]*z+projection[3]-48)*pixel_scale,
                        (projection[4]*x+projection[5]*y+projection[6]*z+projection[7]-72)*pixel_scale]
            for direction,projection in m['projectionByDirection'].items():
                views=[]
                for sample in c['samples']:
                    angle=sample.get('authoredYawRadians',0);co,si=math.cos(angle),math.sin(angle)
                    contacts=[]
                    for q in sample['contacts']:
                        xy=ground_point((q['x']*co-q['y']*si,q['x']*si+q['y']*co,q['z']),projection)
                        contacts.append({'id':q['id'],'x':xy[0],'y':xy[1]})
                    cx,cy=sample['com'];com=ground_point((cx*co-cy*si,cx*si+cy*co,-.5),projection)
                    views.append({'contacts':contacts,'com':com,'balance':sample['balance'],'supportMarginMetres':sample['supportMargin']})
                projected[direction]=views
            result['facingSamples']=projected;result['samples']=projected['E'];result['contactSpace']='projected-world-offset'
            stance={d:{'x':-(p[0]*root_stride[0]+p[1]*root_stride[1])*pixel_scale,'y':-(p[4]*root_stride[0]+p[5]*root_stride[1])*pixel_scale} for d,p in m['projectionByDirection'].items()}
            if c['strideMetres']>0:
                result['strideByDirection']={d:math.hypot(v['x'],v['y']) for d,v in stance.items()}
            if name=='walk':
                result['phaseSampling']='nearest'
                result['stanceVelocityByDirection']=stance
            if c.get('poseGrid'):
                result['poseGrid']['stanceVelocityByDirection']=stance
        return result
    profile={'schemaVersion':2,'coordinateSpace':'actor-xy-ground-z-up','unitsPerPixel':93/96,'maxRootOffset':93/96,
     'rig':{'signature':m['skeletonSignature'],'sourceSpace':{'coordinateSpace':'blender-armature-xyz-metres','toActor':[0,-scale,0,0,scale,0,0,0,0,0,scale,.5*scale,0,0,0,1]},'bodyPlan':'biped','bones':m['skeleton'],'semantics':{'root':'root','pelvis':'pelvis','spine':'spine','head':'head'},'absentBones':[],
     'contacts':[{'id':'foot-'+side,'bone':'foot.'+side,'surface':'foot',**({'chain':next(c for c in m['contactChains'] if c['id']=='foot-'+side)} if m.get('contactChains') else {})} for side in ['L','R']],
     'sockets':{'head':{'bone':'head'},'mouth':{'bone':'head'},'wound':{'bone':'chest'}}},
     'facing':{'directions':['E','SE','S','SW','W','NW','N','NE']},
     'locomotion':{**runtime_clip('walk'),'stride':m['clips']['walk']['strideMetres']*scale},
     'actions':{}}
    if 'attack' in m['clips']:
        profile['actions']['attack']={**runtime_clip('attack'),'mode':'fullBody','priority':10,'commitUntil':1,'reducedFrame':8,'visualTimingOnly':True}
    if 'pivot' in m['clips']:profile['pivot']=runtime_clip('pivot')
    if 'pivot-negative' in m['clips']:
        profile['pivot']=runtime_clip('pivot-negative')
        profile['pivots']={'positive':runtime_clip('pivot-negative'),'negative':runtime_clip('pivot')}
    if 'attack-travel' in m['clips']:
        profile['actions']['attack']={**runtime_clip('attack-travel'),'mode':'fullBody','priority':10,'commitUntil':1,'reducedFrame':(m['clips']['attack-travel']['poseGrid']['actionFrames']//2)*m['clips']['attack-travel']['poseGrid']['phaseFrames'],'visualTimingOnly':True}
    profile['facing']['transition']='source-pivot' if profile.get('pivot') or profile.get('pivots') else 'row'
    if profile['facing']['transition']=='row' and profile['locomotion'].get('stanceVelocityByDirection'):
        profile['facing']['selection']='projected-motion'
    return profile
