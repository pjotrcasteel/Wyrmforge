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
    if phase < .16:
        flap = -.85*smooth((phase-.06)/.10)
    elif phase < .29:
        flap = -.85+1.50*smooth((phase-.16)/.13)
    else:
        cruise = .65*math.cos((phase-.29)*math.pi*2/.18)
        flare = smooth((phase-.64)/.12)
        flap = (cruise*(1-flare)-.80*flare)*(1-smooth((phase-.85)/.13))
    # Near-ground downstrokes must not drive the extended membrane through
    # the floor. Leg drive supplies the initial clearance before full amplitude.
    altitude = .34*rise*(1-descent)
    flap = min(flap, .12+1.5*altitude)
    names = [(0, 'settle'), (.03, 'open / crouch'), (.12, 'leg drive'),
             (.16, 'first power stroke'), (.22, 'departure'), (.40, 'flight'),
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
        toeRoll=.42*smooth((phase-.19)/.075)*(1-smooth((phase-.28)/.04)),
        kickTrail=smooth((phase-.24)/.045)*(1-smooth((phase-.34)/.10)),
        landingReach=smooth((phase-.64)/.14)*(1-smooth((phase-.88)/.12)),
        label=label,
    )


FLIGHT_EVENTS = [
    dict(phase=.12, name='leg-drive'), dict(phase=.16, name='first-downstroke'),
    dict(phase=.22, name='departure'), dict(phase=.40, name='cruise'),
    dict(phase=.64, name='approach'), dict(phase=.76, name='flare'),
    dict(phase=.81, name='forepaw-catch-target'),
    dict(phase=.845, name='hindpaw-catch-target'), dict(phase=.88, name='recovery'),
]
