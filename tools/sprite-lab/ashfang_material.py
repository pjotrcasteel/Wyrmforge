"""Original volcanic stone treatment; retain narrow incandescent boundaries."""
import numpy as np
def stone_separation(raw):
    rgb=raw[:,:,:3];near_dark=np.zeros(rgb.shape[:2],bool)
    for axis in (0,1):
        for delta in (-1,1):near_dark|=np.roll(rgb[:,:,0],delta,axis)<.14
    incandescent=(rgb[:,:,0]>.5)&(rgb[:,:,0]>rgb[:,:,1]*1.6)&near_dark
    value=rgb[:,:,0]*.38+rgb[:,:,1]*.44+rgb[:,:,2]*.18
    stone=rgb*.25+value[:,:,None]*np.array([.93,.95,1.0])*.75
    raw[:,:,:3]=np.where(incandescent[:,:,None],rgb,stone)
    return raw
