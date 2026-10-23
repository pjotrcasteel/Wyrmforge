"""Purposeful source controls: planted support, articulated load and follow-through."""
import math

def smooth(x):
    x=max(0,min(1,x));return x*x*(3-2*x)

def walk_controls(phase):
    a=phase*math.tau
    # Four-beat support, pelvis and shoulder counter-rotation, stable gaze.
    return dict(shift=.012*math.sin(a-.35),sink=-.004*(1-math.cos(2*a)),
        pelvisYaw=.055*math.sin(a),spineYaw=-.018*math.sin(a-.3),
        chestYaw=-.048*math.sin(a-.45),neckYaw=-.025*math.sin(a-.7),
        roll=.032*math.sin(a-.2),headYaw=-.015*math.sin(a-.9),
        tailYaw=.18*math.sin(a-.8),breath=.003*math.sin(a-.5))

def stroke(phase):
    t=phase%1
    keys=[(0,.42),(.12,.55),(.62,-.70),(.72,-.65),(1,.42)]
    for (a,x),(b,y) in zip(keys,keys[1:]):
        if t<=b:return x+(y-x)*smooth((t-a)/(b-a))

def breath_control(phase):
    inhale=smooth(phase/.24)*(1-smooth((phase-.26)/.12))
    exhale=smooth((phase-.30)/.08)*(1-smooth((phase-.70)/.15))
    recoil=.025*exhale*math.sin(max(0,phase-.30)*math.tau*3)
    return dict(inhale=inhale,exhale=exhale,recoil=recoil)
