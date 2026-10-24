"""Build an unambiguous IK *diagnostic*, not character art or gameplay footage."""
from math import hypot,sqrt
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from wizard_motion import WALK_FRAMES,walk_pose

DIR=Path(__file__).resolve().parent

def knee(foot_y,foot_z):
    hip=(0,.94)
    a=(foot_y-hip[0],foot_z-hip[1])
    dist=max(.01,hypot(*a))
    L1=L2=.45
    d=min(dist,L1+L2-.001)
    u=(a[0]/dist,a[1]/dist)
    foot_near=(hip[0]+u[0]*d,hip[1]+u[1]*d)
    aa=(L1*L1-L2*L2+d*d)/(2*d)
    height=sqrt(max(0,L1*L1-aa*aa))
    # forward bent knee faces toward negative world Y
    per=(u[1],-u[0])
    return (hip[0]+aa*u[0]+height*per[0], hip[1]+aa*u[1]+height*per[1])

def one(index):
    pose=walk_pose(index/16)
    image=Image.new('RGB',(430,490),(17,17,22))
    d=ImageDraw.Draw(image)
    center_x=208; ground_y=403;scale=260
    project=lambda yz:(round(center_x+yz[0]*scale),round(ground_y-yz[1]*scale))
    d.line((30,ground_y,400,ground_y),fill=(95,91,89),width=2)
    d.text((22,14),'WyrmForge | Wizard 16-frame gait IK test',fill=(212,200,177))
    d.text((22,38),f'FRAME {index:02d}/15 — skeleton diagnostic, NOT wizard art',fill=(158,147,134))
    pelvis=(0,pose.pelvis_z);chest=(.01,1.48);head=(0,1.84)
    d.line((project(pelvis),project(chest)),fill=(144,141,148),width=12)
    d.ellipse((project(head)[0]-17,project(head)[1]-22,project(head)[0]+17,project(head)[1]+22),fill=(173,166,159))
    for foot,col in ((pose.left,(111,169,225)),(pose.right,(220,150,97))):
        toe=(foot.y-.16,foot.z-.115)
        k=knee(foot.y,foot.z)
        d.line([project(pelvis),project(k),project((foot.y,foot.z)),project(toe)],fill=col,width=9,joint='curve')
        for pos in (k,(foot.y,foot.z)):
            px,py=project(pos)
            d.ellipse((px-5,py-5,px+5,py+5),fill=(230,216,197))
        d.text((22,427 if foot.side=='L' else 449),f'{foot.side}: '+('PLANTED' if foot.planted else 'SWING')+f' | ankle y={foot.y:+.2f}, z={foot.z:.2f}',fill=col)
    return image

frames=[one(i) for i in range(WALK_FRAMES)]
frames[0].save(DIR/'wizard-ik-walk-16-frame.gif',save_all=True,append_images=frames[1:],duration=80,loop=0,optimize=False)
board=Image.new('RGB',(430*4,490*4),(17,17,22))
for i,fr in enumerate(frames):board.paste(fr,((i%4)*430,(i//4)*490))
board.save(DIR/'wizard-gait-ik-contact.png')
print('Created annotated diagnostics: 16 phases, alternating stance and knee bend')
