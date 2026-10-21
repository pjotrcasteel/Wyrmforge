"""Authored launch/catch timing for the editable Ashfang source, not gameplay."""
import math


def smooth(value):
    value = max(0, min(1, value))
    return value*value*(3-2*value)


def flight_state(phase):
    crouch = smooth(phase/.10)*(1-smooth((phase-.12)/.10))
    rise = smooth((phase-.22)/.18)
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
    names = [(0, 'settle'), (.03, 'open / crouch'), (.12, 'leg drive'),
             (.16, 'first power stroke'), (.22, 'departure'), (.40, 'flight'),
             (.64, 'approach / extend paws'), (.76, 'flare'),
             (.81, 'forepaw catch'), (.845, 'hindpaw catch'), (.88, 'recover')]
    label = next(name for start, name in reversed(names) if phase >= start)
    return dict(
        altitude=.34*rise*(1-descent),
        bob=-.020*crouch-.018*impact,
        pitch=-.12*rise*(1-descent)-.06*impact,
        spread=.08+.92*smooth((phase-.03)/.13)*(1-smooth((phase-.88)/.12)),
        flap=flap,
        foreTuck=smooth((phase-.22)/.09)*(1-smooth((phase-.64)/.14)),
        hindTuck=smooth((phase-.24)/.09)*(1-smooth((phase-.68)/.16)),
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
