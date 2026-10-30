"""AN6: measure REAL 3-heading native-rendered alpha atlas layout and source switches.

All three independently saved Blender rigs must have identical 22-bone source
geometry and independently verified full-body sole contacts. This is an
UNAPPROVED COLOR-ONLY study: normal+emissive bytes are budgeted but those
maps do not exist yet; G4/G5 and the C# moving-claw gate remain separate.
"""
import argparse
import json
from pathlib import Path
from PIL import Image
from audit_source_direction_switch import audit_sources

LIMIT=64*1024*1024
# Two genuine 8-frame pivots with a 68x63 native source crop as measured in
# the unified four-clip pack. Never treat this historic reservation as proof
# the currently merged pivot atlas was actually installed.
REFERENCE_PIVOT_PAIR_THREE_MAP_BYTES=2*(68*63*8*8*4*3)


def load_candidate(folder):
    sources=list(folder.rglob('source-manifest.json'))
    atlases=list(folder.rglob('manifest.json'))
    evidence=list(folder.rglob('feasibility.json'))
    if len(sources)!=1 or len(atlases)!=1 or len(evidence)!=1:
        raise ValueError(f'Expected one source, native atlas and feasibility receipt in {folder}')
    source=json.loads(sources[0].read_text())
    atlas=json.loads(atlases[0].read_text())
    receipt=json.loads(evidence[0].read_text())
    heading=source['clips']['walk']['travelHeadingDegrees']
    if heading not in (0,90,-90) or receipt['headingDegrees']!=heading:
        raise ValueError('Unexpected or mismatched source travel heading')
    if not receipt['sourceRigValidated'] or not receipt['sourceEnvelopeValidated']:
        raise ValueError('Independently validated real Blender source required')
    if not source['candidateNotApproved'] or source['runtimeIntegrated']:
        raise ValueError('Experimental whole-body source was promoted')
    if not atlas['optimizedNativeColumnsOnly'] or atlas['productionReady'] or atlas['runtimeIntegrated']:
        raise ValueError('A real unapproved optimally packed color atlas is required')
    if len(atlas['directions'])!=8 or set(atlas['clips'])!={'walk','attack-travel'}:
        raise ValueError('Missing eight native camera views and both complete clips')
    if source['clips']['walk']['frames']!=8 or source['clips']['attack-travel']['frames']!=40:
        raise ValueError('Expected the saved 8-phase/5-action genuine source')
    clips={}
    for name,expected_frames,expected_columns in [('walk',8,8),('attack-travel',40,20)]:
        spec=atlas['clips'][name]
        if spec['frames']!=expected_frames or spec['columns']!=expected_columns:
            raise ValueError('Source raster layout does not match actual animation frames')
        if not spec['optimizedNativePacking'] or spec['cell']!=96:
            raise ValueError('Native source pixels must be preserved')
        crop=spec['crop']
        if len(crop)!=4 or not all(isinstance(v,int) for v in crop):
            raise ValueError('Invalid actual native source crop')
        width,height=crop[2]-crop[0],crop[3]-crop[1]
        if width<=0 or height<=0 or any(v<0 or v>96 for v in crop):
            raise ValueError('Source crop outside source frame')
        rows=(expected_frames+expected_columns-1)//expected_columns
        expected_pixels=(expected_columns*width,rows*len(atlas['directions'])*height)
        with Image.open(atlases[0].parent/spec['image']) as raster:
            if raster.mode!='RGBA' or raster.size!=expected_pixels:
                raise ValueError('Real color atlas dimensions differ from measured source spec')
        clips[name]={'frames':expected_frames,'columns':expected_columns,
                     'crop':crop,'realColorDimensions':expected_pixels,
                     'whatIfDecodedThreeMapBytes':expected_pixels[0]*expected_pixels[1]*4*3}
    return heading,source,clips


def measure(root):
    containers=sorted(p for p in root.iterdir() if p.is_dir())
    if len(containers)!=3:
        raise ValueError('Exactly three independent direction-source artifact folders required')
    data={}
    for container in containers:
        heading,source,clips=load_candidate(container)
        if heading in data:raise ValueError('A directional source is duplicated')
        data[heading]=(source,clips)
    if set(data)!={0,90,-90}:
        raise ValueError('Missing forward or left/right source rig')
    forward=data[0][0]
    switches={}
    for heading in (-90,90):
        report=audit_sources(forward,data[heading][0])
        switches[str(heading)]={key:report[key] for key in (
            'scenarios','failedScenarios','worstSourceNativeJump',
            'safeStaticSourceSwitchPhaseIndices','sourceDirectionSwitchGatePassed')}
    action_budget=sum(item[1]['attack-travel']['whatIfDecodedThreeMapBytes'] for item in data.values())
    walk_budget=data[0][1]['walk']['whatIfDecodedThreeMapBytes']
    subtotal=action_budget+walk_budget
    total=subtotal+REFERENCE_PIVOT_PAIR_THREE_MAP_BYTES
    result={
        'schemaVersion':1,
        'measurement':'actual independently rendered native COLOR atlas dimensions for three direction claws; normal and emissive maps are future three-map residency projection',
        'sourceOnly':True,'runtimeAccepted':False,'visualApproved':False,
        'sourceRigModes':['forward','plus-90','minus-90'],
        'scenariosTotal':sum(r['scenarios'] for r in switches.values()),
        'byDirection':{str(k):v[1] for k,v in data.items()},
        'sourceSwitchByDirection':switches,
        'actualColorOnly':True,'normalMapsGenerated':False,'emissiveMapsGenerated':False,
        'referencePivotPairReservationBytes':REFERENCE_PIVOT_PAIR_THREE_MAP_BYTES,
        'referencePivotSource':'unified four-clip pack; two native 8-frame/68x63 pivot atlases, not included in these artifacts',
        'whatIfActionThreeMapBytes':action_budget,
        'whatIfWalkThreeMapBytes':walk_budget,
        'whatIfTotalWithHistoricalPivotReservationBytes':total,
        'whatIfRemainingForTransitionsAndOtherAtlasesBytes':LIMIT-total,
        'decodedBudgetBytes':LIMIT,
        'whatIfMemoryBoundPassed':total<=LIMIT,
        'fullMotionAcceptancePassed':False
    }
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('artifact_root',type=Path)
    parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args()
    report=measure(args.artifact_root)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({key:report[key] for key in (
        'scenariosTotal','sourceSwitchByDirection','whatIfTotalWithHistoricalPivotReservationBytes',
        'whatIfRemainingForTransitionsAndOtherAtlasesBytes','whatIfMemoryBoundPassed',
        'fullMotionAcceptancePassed')},indent=2))
    # A budget failure is real. A source transition failure is retained in
    # evidence; it is NOT a passed gameplay transition or a reason to relax 1px.
    if not report['whatIfMemoryBoundPassed']:
        raise SystemExit('Source three-map resident projection exceeds 64MiB')
