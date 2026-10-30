"""Audit real authored full-body direction switches without inventing pixels.

Compares saved Blender source contact positions for a *fixed body facing* and
unchanged C# world root: forward ↔ lateral travel at identical gait phase.
Self-supported clips are not sufficient; same-foot contact identity and
positions must survive a runtime selection. This source-only audit NEVER
certifies a frame, renderer, gameplay, or phone acceptance.

Usage:
  python tools/animation/audit_source_direction_switch.py forward/source-manifest.json lateral/source-manifest.json [--diagnostic]
  python tools/animation/audit_source_direction_switch.py --self-test
"""
import argparse
import json
import math
from pathlib import Path


def audit_sources(forward, sideways):
    if forward.get('experimentalLateralMotion'):
        raise ValueError('Forward baseline must be an ordinary validated source')
    meta=sideways.get('experimentalLateralMotion')
    if not isinstance(meta,dict) or meta.get('sourceStudyOnly') is not True or meta.get('acceptedForRuntime') is not False:
        raise ValueError('Lateral source must be explicitly experimental and not accepted')
    if not 45<abs(meta.get('headingDegrees',0))<=90:
        raise ValueError('Expected explicit orthogonal direction source')
    if len(forward.get('skeleton',[]))!=len(sideways.get('skeleton',[])) or not forward.get('skeleton'):
        raise ValueError('Source rig topology mismatch')
    for a,b in zip(forward['skeleton'],sideways['skeleton']):
        if (a.get('id'),a.get('parent'))!=(b.get('id'),b.get('parent')):
            raise ValueError('Different skeleton hierarchy')
        if len(a.get('rest',[]))!=16 or len(b.get('rest',[]))!=16:
            raise ValueError('Missing rest matrix')
        delta=max([abs(x-y) for x,y in zip(a['rest'],b['rest'])]+[abs(a['length']-b['length'])])
        if delta>5e-7:
            raise ValueError('Source skeleton rest positions changed')
    native=forward.get('unitsPerPixel')
    if not isinstance(native,(int,float)) or not math.isfinite(native) or native<=0:
        raise ValueError('Missing positive native pixel world unit')
    if abs(native-sideways.get('unitsPerPixel',-1))>1e-9:
        raise ValueError('Source pixel scale changed')
    results=[]
    for name in ('walk','attack-travel'):
        a=forward.get('clips',{}).get(name)
        b=sideways.get('clips',{}).get(name)
        if not a or not b or a.get('frames')!=b.get('frames') or not a.get('samples') or len(a['samples'])!=len(b.get('samples',[])):
            raise ValueError('Both sources need corresponding actual '+name+' frames')
        if a.get('poseGrid')!=b.get('poseGrid'):
            raise ValueError('Action-gait source sampling grids differ')
        phases=a.get('poseGrid',{}).get('phaseFrames',a['frames'])
        if phases not in (8,16) or a['frames']%phases!=0:
            raise ValueError('Only genuine 8- or 16-phase whole-body source grids supported')
        for frame,(source,target) in enumerate(zip(a['samples'],b['samples'])):
            source_contacts={c['id']:c for c in source['contacts']}
            target_contacts={c['id']:c for c in target['contacts']}
            common=source_contacts.keys() & target_contacts.keys()
            if not common:
                # Never claim a safe direction switch without a persistent
                # support foot; the airborne→planted transition is a new epoch.
                results.append({'clip':name,'frame':frame,'phaseIndex':frame%phases,
                    'actionIndex':frame//phases,'sharedSupportFeet':0,
                    'worstNativeContactJump':None,'withinOneNativePixel':False})
                continue
            jump=max(math.dist([source_contacts[k][axis] for axis in ('x','y','z')],
                               [target_contacts[k][axis] for axis in ('x','y','z')])/native for k in common)
            results.append({'clip':name,'frame':frame,'phaseIndex':frame%phases,
                'actionIndex':frame//phases,'sharedSupportFeet':len(common),
                'worstNativeContactJump':jump,'withinOneNativePixel':jump<=1})
    if not results:
        raise ValueError('Nonempty real source switch matrix required')
    # A matched static support pose does not authorize lateral travel during
    # the handoff: this is solely an authored pose switch feasibility mask.
    safe_phases={}
    for clip in ('walk','attack-travel'):
        rows=[r for r in results if r['clip']==clip]
        all_phases=sorted(set(r['phaseIndex'] for r in rows))
        safe_phases[clip]=[phase for phase in all_phases if all(
            row['withinOneNativePixel'] for row in rows if row['phaseIndex']==phase)]
    out={
        'safeStaticSourceSwitchPhaseIndices':safe_phases,
        'measurement':'saved Blender source same-body local sole contact discontinuity when source travel direction changes; not raster, C# or phone proof',
        'lateralHeadingDegrees':meta['headingDegrees'],'nativePixelSourceMetres':native,
        'scenarios':len(results),'runtimeAccepted':False,
        'sourceDirectionSwitchGatePassed':all(row['withinOneNativePixel'] for row in results),
        'worstSourceNativeJump':max((row['worstNativeContactJump'] or 0 for row in results),default=0),
        'failedScenarios':sum(not row['withinOneNativePixel'] for row in results),
        'results':results}
    return out


def self_test():
    def clip(frames):
        return {'frames':len(frames),'samples':[{'contacts':contacts} for contacts in frames]}
    skeleton=[{'id':'root','parent':None,'length':1,'rest':[1 if i in (0,5,10,15) else 0 for i in range(16)]}]
    def sample(x):
        return [{'id':'L','x':x,'y':0,'z':-.5}]
    def pack(x,lateral=False):
        walk=clip([sample(x) for _ in range(16)])
        action=clip([sample(x) for _ in range(32)])
        action['poseGrid']={'phaseFrames':16,'actionFrames':2}
        # Distinct fixtures must not alias the same mutable rig dictionary.
        d={'skeleton':[dict(b,rest=list(b['rest'])) for b in skeleton],'unitsPerPixel':.02,
           'clips':{'walk':walk,'attack-travel':action}}
        if lateral:d['experimentalLateralMotion']={'sourceStudyOnly':True,'acceptedForRuntime':False,'headingDegrees':90}
        return d
    assert audit_sources(pack(0),pack(0,lateral=True))['sourceDirectionSwitchGatePassed']
    result=audit_sources(pack(0),pack(.1,lateral=True))
    assert not result['sourceDirectionSwitchGatePassed'] and result['worstSourceNativeJump']>=5
    # A smaller true authored phase lattice must remain independent of the
    # 16-pose study, including every action stage.
    compact=pack(0);compact_lateral=pack(0,lateral=True)
    for candidate in (compact,compact_lateral):
        candidate['clips']['walk']['frames']=8
        candidate['clips']['walk']['samples']=candidate['clips']['walk']['samples'][:8]
        candidate['clips']['attack-travel']['frames']=16
        candidate['clips']['attack-travel']['samples']=candidate['clips']['attack-travel']['samples'][:16]
        candidate['clips']['attack-travel']['poseGrid']['phaseFrames']=8
    compact_report=audit_sources(compact,compact_lateral)
    assert compact_report['scenarios']==24
    assert compact_report['safeStaticSourceSwitchPhaseIndices']=={
        'walk':list(range(8)),'attack-travel':list(range(8))}
    no_support=pack(0,lateral=True)
    no_support['clips']['walk']['samples'][2]['contacts']=[]
    assert not audit_sources(pack(0),no_support)['sourceDirectionSwitchGatePassed']
    changed=pack(0,lateral=True);changed['skeleton'][0]['parent']='other'
    try:audit_sources(pack(0),changed)
    except ValueError:pass
    else:raise AssertionError('Rig mutation must fail')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('forward',nargs='?',type=Path)
    parser.add_argument('lateral',nargs='?',type=Path)
    parser.add_argument('--self-test',action='store_true')
    parser.add_argument('--diagnostic',action='store_true')
    parser.add_argument('--out',type=Path)
    args=parser.parse_args()
    if args.self_test:
        self_test()
        print('Source direction-switch auditing self-tests passed')
    else:
        if not args.forward or not args.lateral:
            parser.error('Actual forward and lateral source manifests required')
        report=audit_sources(json.loads(args.forward.read_text()),json.loads(args.lateral.read_text()))
        raw=json.dumps(report,indent=2)+'\n'
        if args.out:
            args.out.write_text(raw)
        print(json.dumps({k:v for k,v in report.items() if k!='results'},indent=2))
        if not report['sourceDirectionSwitchGatePassed'] and not args.diagnostic:
            raise SystemExit(1)
