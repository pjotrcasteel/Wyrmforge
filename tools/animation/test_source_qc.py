"""Mutation tests for independent actual-mesh source acceptance.

python tools/animation/test_source_qc.py <valid-source-folder> --blender <executable>
All mutations are temporary clones. A Blender Python exception must return a
nonzero process status; log text alone is not a successful negative test.
"""
import argparse,json,shutil,subprocess,tempfile
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('--blender',required=True);a=p.parse_args()
source=Path(a.source).resolve();validator=Path(__file__).with_name('validate_source.py').resolve();results={}
cases=[('skating','actual mesh sole skating'),('hover','actual mesh sole hover/penetration')]
manifest=json.loads((source/'source-manifest.json').read_text())
transition=next((name for name,c in manifest['clips'].items() if c.get('transitionReference')),None)
if transition:cases.append(('transition','Whole-body entry/exit skin discontinuity'))
for kind,expected in cases:
 with tempfile.TemporaryDirectory(prefix='animation-source-negative-') as temp:
  folder=Path(temp);shutil.copy2(source/'hollow-foundation.blend',folder/'hollow-foundation.blend');shutil.copy2(source/'source-manifest.json',folder/'source-manifest.json')
  file=str(folder/'hollow-foundation.blend')
  expression=f"import bpy; bpy.ops.wm.open_mainfile(filepath={file!r}); actor=bpy.data.objects['Hollow skinned character']; scene=bpy.context.scene; "
  if kind=='skating':
   expression+="scene.frame_set(1); actor.location.x=0; actor.keyframe_insert('location',frame=1); scene.frame_set(3); actor.location.x=.05; actor.keyframe_insert('location',frame=3); "
  elif kind=='hover':expression+="actor.location.z+=.05; "
  else:
   expression+=f"rig=bpy.data.objects['Hollow editable animation rig']; rig.animation_data.action=bpy.data.actions[{'AN1_'+transition+'_supported_v1'!r}]; scene.frame_set(1); bone=rig.pose.bones['cloth.L']; bone.location.x+=.05; bone.keyframe_insert('location',frame=1); "
  expression+=f"bpy.ops.wm.save_as_mainfile(filepath={file!r})"
  mutation=subprocess.run([a.blender,'-b','-t','2','--python-exit-code','1','--python-expr',expression],capture_output=True,text=True)
  if mutation.returncode:raise RuntimeError('Mutation setup failed: '+mutation.stdout+mutation.stderr)
  command=[a.blender,'-b','-t','2','--python-exit-code','1','--python',str(validator),'--',str(folder)]
  check=subprocess.run(command,capture_output=True,text=True);log=check.stdout+check.stderr
  if check.returncode==0 or expected not in log:raise AssertionError(f'{kind}: expected real validator failure with nonzero Blender exit; status={check.returncode}\n{log}')
  results[kind]={'rejected':True,'exitCode':check.returncode,'expectedFailure':expected,'logTail':log[-1800:]}
(source/'negative-source-qc.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results,indent=2))
