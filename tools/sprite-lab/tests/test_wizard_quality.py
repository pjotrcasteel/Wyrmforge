"""Source-only geometry/lighting invariants; artistic approval requires real gameplay."""
from pathlib import Path
import importlib.util
import sys

root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('wizard_source',root/'build-wizard-source.py')
source=importlib.util.module_from_spec(spec)
sys.modules['wizard_source']=source
spec.loader.exec_module(source)

def verify():
    for school in source.SCHOOLS:
        mesh=source.create_pose(school,'walk',4)
        parts={part.part for part in mesh.faces}
        assert {'mantle-front','outer-gore','beard-lock','hat-stitching','cross-strap','lapel'}<=parts
        for t in mesh.faces:
            for v in (t.a,t.b,t.c):
                assert all(abs(float(n))<100 for n in v)
        maps=source.render(mesh,'S',passes=('albedo','normal','emission'),clip='walk',frame=4)
        assert maps['albedo'].getbbox()
        alpha=maps['albedo'].getchannel('A').tobytes()
        assert maps['normal'].getchannel('A').tobytes()==alpha
        assert maps['emission'].getchannel('A').tobytes()==alpha
        assert maps['emission'].getchannel('R').getbbox() is None
    cast=source.render(source.create_pose('fire','cast',8),'S',passes=('albedo','normal','emission'),clip='cast',frame=8)
    assert cast['emission'].getchannel('R').getbbox()
    print('PASS: six wizard schools, geometry bounds, frame material sync and cast-only emission')

if __name__=='__main__':verify()
