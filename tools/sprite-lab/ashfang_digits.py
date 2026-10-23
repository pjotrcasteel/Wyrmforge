"""Shared anatomical digit layout and carried-limb performance controls."""
import numpy as np
def digit_label(limb,side,digit):return 30+(0 if limb=='fore' else 6)+(0 if side=='L' else 3)+digit
def digit_identity(label):
    value=label-30;return ('fore' if value<6 else 'hind'),('L' if value%6<3 else 'R'),value%3
def digit_points(limb,side,digit):
    sign=1 if side=='L' else -1;x=sign*.17+(digit-1)*.023
    base=-.355 if limb=='fore' else .095;length=.075 if digit==1 else .063
    return np.array([(x,base,-.180),(x+(digit-1)*.005,base-length*.55,-.182),(x+(digit-1)*.009,base-length,-.187)])
def carried_limb(flight,lagged,distal,limb):
    tuck=flight[limb+'Tuck'];clearance=max(0,min(1,flight['altitude']/.06));clearance=clearance*clearance*(3-2*clearance)
    amount=tuck*clearance
    recoil=max(-1,min(1,lagged['flap']-flight['flap']))
    tip_recoil=max(-1,min(1,distal['flap']-lagged['flap']))
    return dict(amount=amount,wrist=(.70 if limb=='fore' else .90)*amount+.12*recoil*amount,
                proximal=(.55+.09*recoil)*amount,distal=(.85+.12*tip_recoil)*amount,
                carryY=(.055 if limb=='fore' else -.025)*tuck,
                carryZ=(.105 if limb=='fore' else .095)*tuck+.006*recoil*amount)
