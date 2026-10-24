"""WyrmForge wizard-only visual geometry refinement, no lighting or gameplay logic."""
import math

def refine_wizard(m,xyz,pigments,color,phase,clip,frame):
    def shade(key,factor=1):
        return tuple(max(0,min(255,round(v*factor))) for v in pigments[key])
    gait=math.sin(phase) if clip=='walk' else 0
    cape=-.026*gait if clip=='walk' else 0
    # Weighted mantle mass and lower hanging collar: not another cylinder.
    m.quad(xyz(-.37,-.055,1.56),xyz(.13,-.065,1.58),
           xyz(.22,-.26,1.35),xyz(-.43,-.26,1.30),
           shade('charcoal',1.04),'cloth','mantle-front')
    m.quad(xyz(-.43,-.26,1.30),xyz(-.27,-.265,1.31),
           xyz(-.39,-.20,1.21),xyz(-.51,-.10,1.30),
           shade('robe2',.93),'cloth','mantle-edge')
    m.quad(xyz(-.42,.09,1.50),xyz(.16,.12,1.50),
           xyz(.36,.39+cape,.65),xyz(-.53,.38+cape,.48),
           shade('robe_shade',.80),'cloth','mantle-back')
    # Broad outer robe gores. Keep the front slit open for two moving boots.
    for idx,(x0,x1,depth) in enumerate(((-.34,-.18,-.345),(.04,.23,-.343))):
        top=1.39 if idx==0 else 1.31
        bottom=.17+(idx%2)*.052
        left=x0-(.06 if idx==0 else .01)
        right=x1+(.035 if idx==1 else 0)
        hem=.02*gait*(1 if idx%2 else -1) if clip=='walk' else 0
        m.quad(xyz(x0,depth,top),xyz(x1,depth-.005,top-.055),
               xyz(right+hem,depth-.04,bottom),xyz(left+hem,depth-.03,bottom),
               shade('robe' if idx==0 else 'robe2',[.82,.92][idx]),
               'cloth','outer-gore')
        m.tube([xyz(x0,depth-.012,top),xyz(x0-.015,depth-.045,.77),
                xyz(left+hem,depth-.046,bottom)],.014,
               shade('robe_fade',.80 if idx==0 else .87),
               'thread','gore-seam',5)
    # Two distinct lapels and turned cuffs; neutral weathered fabric.
    for sign in (-1,1):
        x=.115*sign
        m.quad(xyz(x,-.235,1.55),xyz(x+.08*sign,-.22,1.48),
               xyz(x+.10*sign,-.36,.98),xyz(x+.025*sign,-.355,1.1),
               shade('robe_fade',.95 if sign==-1 else .77),'cloth','lapel')
        m.tube([xyz(x+.02*sign,-.246,1.49),xyz(x+.055*sign,-.353,1.1)],
               .013,shade('linen',.65),'thread','lapel-piping',5)
        cuff=(.51,-.28,1.16) if sign==1 else (-.20,-.13,.99)
        m.taper(xyz(cuff[0],cuff[1],cuff[2]+.06),
                xyz(cuff[0],cuff[1],cuff[2]+.088),
                .10,.096,shade('robe_fade',.75),9,'cloth','cuff-detail')
    m.tube([xyz(-.22,-.276,1.52),xyz(-.10,-.32,1.33),xyz(.11,-.30,1.04)],
           .023,shade('belt',1.22),'leather','cross-strap',6)
    m.quad(xyz(-.342,-.218,1.115),xyz(-.12,-.23,1.115),
           xyz(-.14,-.237,.998),xyz(-.32,-.22,.99),
           shade('belt',1.17),'leather','satchel-flap')
    m.taper(xyz(-.205,-.249,1.037),xyz(-.205,-.253,1.067),
            .030,.030,shade('metal',.85),7,'metal','satchel-buckle')
    # Uneven brim, stitched edge and folded crown.
    m.quad(xyz(-.455,-.04,1.955),xyz(-.22,-.301,1.956),
           xyz(-.167,-.238,1.969),xyz(-.44,.005,1.969),
           shade('edge',1.18),'felt','brim-underside')
    m.tube([xyz(-.34,-.20,1.973),xyz(-.21,-.26,1.977),
            xyz(.01,-.289,1.981),xyz(.23,-.267,1.975)],
           .013,shade('robe_fade',.70),'thread','hat-stitching',5)
    m.quad(xyz(-.145,-.19,2.082),xyz(-.04,-.22,2.082),
           xyz(-.02,-.17,2.205),xyz(-.12,-.15,2.17),
           shade('robe_shade',.77),'felt','crown-fold')
    # A furrowed brow, face planes and separate beard locks.
    m.sphere(xyz(0,-.228,1.722),(.107,.041,.068),
             shade('skin',.8),9,5,'skin','eye-socket')
    m.sphere(xyz(0,-.260,1.665),(.068,.031,.052),
             shade('skin',1.05),9,5,'skin','nose-bridge')
    for sign in (-1,1):
        m.taper(xyz(sign*.095,-.231,1.790),xyz(sign*.025,-.23,1.81),
                .026,.022,shade('hair_dark',.70),7,'hair','brow')
        for j in range(3):
            x=sign*(.052+j*.046)
            z=1.18+.044*j+.011*gait*sign
            m.taper(xyz(x,-.21,1.58),xyz(x+sign*.023,-.223,z),
                    .044 if j==0 else .037,.005,
                    shade('hair',(.90,1.015,.79)[j]),7,'hair','beard-lock')
    m.taper(xyz(.51,-.28,1.21),xyz(.51,-.28,1.225),.087,.088,
            tuple(round(v*.73) for v in color),9,'thread','school-cuff')
