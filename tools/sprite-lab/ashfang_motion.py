"""Authored launch/catch timing for the editable Ashfang source, not gameplay."""
import math


def smooth(value):
    value = max(0, min(1, value))
    return value*value*(3-2*value)


def flight_state(phase):
    crouch = smooth(phase/.10)*(1-smooth((phase-.16)/.06))
    launch_time = max(0, min(1, (phase-.22)/.18))
    rise = 2*launch_time-launch_time*launch_time
    descent = smooth((phase-.64)/.17)
    impact = smooth((phase-.81)/.035)*(1-smooth((phase-.86)/.12))
    # Begin the power stroke during the final leg drive, before altitude rises.
    # The prior .265 start left a visible jump-then-hover beat.
    if phase < .16:
        flap = -.85*smooth((phase-.06)/.10)
    elif phase < .205:
        flap = -.85
    elif phase < .305:
        flap = -.85+1.50*smooth((phase-.205)/.10)
    else:
        cruise = .65*math.cos((phase-.305)*math.pi*2/.18)
        flare = smooth((phase-.64)/.12)
        flap = (cruise*(1-flare)-.80*flare)*(1-smooth((phase-.85)/.13))
    # Near-ground downstrokes must not drive the extended membrane through
    # the floor. Leg drive supplies the initial clearance before full amplitude.
    altitude = .34*rise*(1-descent)
    flap = min(flap, .10+1.05*altitude)
    names = [(0, 'settle'), (.03, 'open / crouch'), (.12, 'leg drive'),
             (.16, 'rear preload / leg drive'), (.205, 'first downstroke / leg drive'), (.22, 'hind-leg extension'), (.265, 'departure'), (.40, 'flight'),
             (.64, 'approach / extend paws'), (.76, 'flare'),
             (.81, 'forepaw catch'), (.845, 'hindpaw catch'), (.88, 'recover')]
    label = next(name for start, name in reversed(names) if phase >= start)
    drive = smooth((phase-.16)/.06)*(1-smooth((phase-.26)/.10))
    settle_time = max(0, phase-.845)
    settle = .07*math.sin(settle_time*math.pi*18)*math.exp(-settle_time*20)*smooth(settle_time/.02)*(1-smooth((phase-.97)/.03))
    return dict(
        altitude=altitude,
        bob=-.050*crouch-.022*impact,
        advance=.025*crouch-.24*smooth((phase-.18)/.32),
        pelvisTilt=.18*crouch-.22*drive-.10*impact,
        spineBend=-.25*crouch+.10*drive+.26*impact,
        chestLift=.10*crouch-.32*drive+.18*impact,
        neckBase=-.06*crouch+.10*drive-.12*impact,
        neckTip=.10*crouch+.14*drive-.14*impact+settle*.5,
        headCounter=.12*crouch+.20*drive-.14*impact+settle,
        tailKick=.16*drive-.12*impact,
        pitch=-.12*rise*(1-descent)-.06*impact,
        spread=.08+.92*smooth((phase-.03)/.13)*(1-smooth((phase-.88)/.12)),
        flap=flap,
        foreTuck=smooth((phase-.17)/.10)*(1-smooth((phase-.64)/.14)),
        hindTuck=smooth((phase-.31)/.08)*(1-smooth((phase-.68)/.16)),
        toeRoll=.32*smooth((phase-.19)/.075)*(1-smooth((phase-.28)/.04)),
        kickTrail=smooth((phase-.24)/.045)*(1-smooth((phase-.34)/.10)),
        landingReach=smooth((phase-.64)/.14)*(1-smooth((phase-.88)/.12)),
        label=label,
    )


FLIGHT_EVENTS = [
    dict(phase=.12, name='leg-drive'), dict(phase=.22, name='hind-leg-extension'),
    dict(phase=.205, name='first-downstroke'), dict(phase=.265, name='departure'), dict(phase=.40, name='cruise'),
    dict(phase=.64, name='approach'), dict(phase=.76, name='flare'),
    dict(phase=.81, name='forepaw-catch-target'),
    dict(phase=.845, name='hindpaw-catch-target'), dict(phase=.88, name='recovery'),
]


def cruise_state(phase):
    """Periodic authored airborne beat; no gameplay displacement or immunity."""
    angle=phase*math.pi*2
    state=flight_state(.485)
    state.update(altitude=.34,bob=.010*math.sin(angle),advance=-.24,
        flap=.46*math.cos(angle),spread=1,
        pelvisTilt=.022*math.sin(angle),spineBend=.018*math.sin(angle-.3),
        chestLift=.025*math.sin(angle-.6),neckBase=-.015*math.sin(angle-.8),
        neckTip=-.012*math.sin(angle-1.0),headCounter=-.018*math.sin(angle-.5),
        tailKick=.04*math.sin(angle-.7),foreTuck=1,hindTuck=1,
        toeRoll=0,kickTrail=0,landingReach=0,sourcePhase=.485,
        tailSin=math.sin(angle),tailCos=math.cos(angle),label='sustained flight')
    return state


CONNECTED_FLIGHT_FRAMES=148
CONNECTED_FLIGHT_EVENTS=[
    dict(phase=.205*83/147,name='first-downstroke'),
    dict(phase=.265*83/147,name='departure'),
    dict(phase=34/147,name='enter-flight-blend'),
    dict(phase=46/147,name='sustained-flight'),
    dict(phase=104/147,name='landing-blend'),
    dict(phase=116/147,name='approach-and-flare'),
    dict(phase=(64+.81*83)/147,name='forepaw-catch'),
    dict(phase=(64+.845*83)/147,name='hindpaw-catch'),
    dict(phase=1,name='settled'),
]

def connected_flight_state(frame):
    """Continuous controls evaluated BEFORE FK/IK and skin deformation.

    Twelve source-frame overlap windows preserve shoulder/digit history. The
    approved takeoff through frame 34 and landing from source frame 52 remain
    the source motions; no rendered images or mesh snapshots are crossfaded.
    """
    def original(source_frame):
        phase=max(0,source_frame/83)
        state=flight_state(phase)
        state.update(sourcePhase=phase,tailSin=math.sin(phase*math.pi*2),
                     tailCos=math.cos(phase*math.pi*2))
        return state
    def blend(a,b,weight,label):
        state={key:a[key]*(1-weight)+b[key]*weight
               for key in a if isinstance(a[key],(int,float))}
        state['label']=label
        return state
    if frame<=34:return original(frame)
    cruise=cruise_state((frame-40)/16)
    if frame<46:
        return blend(original(frame),cruise,smooth((frame-34)/12),'takeoff into flight')
    if frame<=104:return cruise
    landing=original(frame-64)
    if frame<116:
        return blend(cruise,landing,smooth((frame-104)/12),'flight into landing')
    return landing


ARENA_FLYOVER_FRAMES=279
OFFSCREEN_ALTITUDE=17.0

def high_launch_state(frame):
    state=connected_flight_state(max(0,frame))
    t=max(0,min(1,(frame-18)/28))
    # Increasing exponential speed throughout the visible climb. Do not ease
    # out at the top: any speed change happens after the whole body has left.
    if frame>=18:state['altitude']=OFFSCREEN_ALTITUDE*math.expm1(3*t)/math.expm1(3)
    state['pitch']-=1.18*smooth((frame-17)/15)
    state['tailPitch']=state['pitch']*.72
    state['label']='high push-off' if frame<32 else 'climb out of view'
    return state

def fire_pass_state(frame,reverse=False):
    t=max(0,min(1,frame/55))
    state=cruise_state(frame/16)
    fire=smooth((t-.14)/.12)*(1-smooth((t-.72)/.12))
    aim=smooth(t/.12)*(1-smooth((t-.88)/.12))
    state.update(altitude=OFFSCREEN_ALTITUDE+.035*math.sin(frame*math.pi/8),
        actorX=(7-14*t) if reverse else (-7+14*t),
        actorY=-1.25 if reverse else 1.15,
        actorYaw=-math.pi/2 if reverse else math.pi/2,
        actorBank=.10*math.sin(t*math.pi*2),
        pitch=-.035,neckBase=.18*aim,neckTip=.36*aim,
        headCounter=1.48*aim,jaw=.48*aim,fireStrength=fire,
        label='return fire pass' if reverse else 'first fire pass')
    return state

def arena_flyover_state(frame):
    """Art-source arena path. C# will separately own legality and hazards."""
    frame=max(0,frame)
    if frame<=54:return high_launch_state(frame)
    if frame<79:
        t=(frame-54)/25;state=cruise_state((frame-40)/16)
        state.update(altitude=OFFSCREEN_ALTITUDE,
            actorX=-7*smooth(t/.50),actorY=1.15*smooth(t/.50),
            actorYaw=math.pi/2*smooth(t/.50),label='offscreen / approach')
        return state
    if frame<=134:return fire_pass_state(frame-79)
    if frame<155:
        t=(frame-134)/21;state=cruise_state(frame/16)
        state.update(altitude=OFFSCREEN_ALTITUDE+.3*math.sin(t*math.pi)**2,
            actorX=7+1.2*math.sin(t*math.pi),actorY=1.15-2.4*smooth(t),
            actorYaw=math.pi/2-math.pi*smooth(t),
            label='offscreen bank / return approach')
        return state
    if frame<=210:return fire_pass_state(frame-155,True)
    if frame<235:
        t=(frame-210)/25;state=cruise_state(frame/16)
        state.update(altitude=OFFSCREEN_ALTITUDE,
            actorX=-7*(1-smooth((t-.5)/.5)),
            actorY=-1.25*(1-smooth((t-.5)/.5)),
            actorYaw=-math.pi/2*(1-smooth((t-.5)/.5)),label='climb / return to arena')
        return state
    # Re-enter vertically, decelerate above the arena, then reuse the actual
    # approved flare and contact choreography without scaling the character.
    source_frame=40+(frame-235)
    state=flight_state(min(1,source_frame/83))
    phase=min(1,source_frame/83)
    state.update(sourcePhase=phase,tailSin=math.sin(phase*math.pi*2),
        tailCos=math.cos(phase*math.pi*2))
    state['altitude']+=(OFFSCREEN_ALTITUDE-.34)*(1-smooth((frame-235)/25))
    state['label']='descending into arena' if frame<260 else state['label']
    return state


def hunt_fitted_arena_state(frame):
    state=arena_flyover_state(frame)
    weight=smooth((frame-54)/25)*(1-smooth((frame-210)/25))
    # Retarget the ground track to the unchanged player's portrait-screen row.
    # Camera basis and 94px/unit fit are recorded in current-hunt-fit.json.
    state['actorX']=state.get('actorX',0)+2.152577572356661*weight
    state['actorY']=state.get('actorY',0)+-3.2288663585349915*weight
    return state
