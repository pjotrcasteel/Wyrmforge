"""Independent NumPy reference for declared weighted skin deformation."""
import numpy as np

def quaternion(matrix):
    # Largest-component conversion remains stable at 180 degrees.
    m=matrix[:3,:3];trace=np.trace(m)
    if trace>0:
        s=np.sqrt(trace+1)*2
        q=np.array([(m[2,1]-m[1,2])/s,(m[0,2]-m[2,0])/s,(m[1,0]-m[0,1])/s,s/4])
    else:
        i=int(np.diag(m).argmax());j=(i+1)%3;k=(i+2)%3
        s=np.sqrt(1+m[i,i]-m[j,j]-m[k,k])*2;q=np.zeros(4)
        q[i]=s/4;q[j]=(m[j,i]+m[i,j])/s;q[k]=(m[k,i]+m[i,k])/s;q[3]=(m[k,j]-m[j,k])/s
    return q/np.linalg.norm(q)

def deform(positions,indices,weights,matrices,inverse_rest,mode):
    transforms=matrices@inverse_rest
    if mode=='linear':
        result=np.zeros_like(positions)
        homogeneous=np.column_stack((positions,np.ones(len(positions))))
        for channel in range(weights.shape[1]):
            result+=np.einsum('nij,nj->ni',transforms[indices[:,channel],:3],homogeneous)*weights[:,channel,None]
        return result
    if mode!='dual-quaternion':raise ValueError('Unknown deformation mode')
    real=np.array([quaternion(m) for m in transforms]);translation=transforms[:,:3,3]
    dual=np.column_stack((.5*(translation*real[:,3,None]+np.cross(translation,real[:,:3])),-.5*(translation*real[:,:3]).sum(axis=1)))
    r=real[indices];d=dual[indices]
    reference=r[np.arange(len(r)),np.argmax(weights>0,axis=1)]
    signs=np.where((r*reference[:,None]).sum(axis=2)<0,-1,1)*weights
    r=(r*signs[:,:,None]).sum(axis=1);d=(d*signs[:,:,None]).sum(axis=1)
    lengths=np.linalg.norm(r,axis=1)[:,None];r/=lengths;d/=lengths
    return positions+2*np.cross(r[:,:3],np.cross(r[:,:3],positions)+r[:,3,None]*positions)+2*(r[:,3,None]*d[:,:3]-d[:,3,None]*r[:,:3]+np.cross(r[:,:3],d[:,:3]))
