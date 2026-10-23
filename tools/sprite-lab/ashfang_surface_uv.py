"""Independent UV indices keep texture seams out of the deforming mesh topology."""
import numpy as np
import torch

def uv_triangles(source, geometry_faces):
    if 'uvFaces' not in source.files:
        return geometry_faces
    faces=geometry_faces.detach().cpu().numpy()
    if np.array_equal(faces,source['faces']):
        indices=source['uvFaces']
    else:
        lookup={tuple(f):i for i,f in enumerate(source['faces'])}
        indices=source['uvFaces'][[lookup[tuple(f)] for f in faces]]
    return torch.tensor(indices,device=geometry_faces.device,dtype=torch.int32).contiguous()
