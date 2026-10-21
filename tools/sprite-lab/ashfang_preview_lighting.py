"""Consistent world-space stone lighting for the native source review."""
import torch
import torch.nn.functional as functional
import nvdiffrast.torch as dr

LIGHTING = dict(method='world-space vertex normals', keyDirection=[-.4, -.6, 1],
                stoneHighlight=.05, preserveMoltenAlbedo=True)


def palette_for(image):
    palette = image.quantize(colors=48)
    stone = [10,9,11, 16,14,16, 23,20,21, 32,27,27,
             42,35,32, 54,44,39, 68,55,47, 84,68,56]
    fire = [82,15,12, 145,30,10, 214,55,9, 255,100,12,
            255,153,25, 255,204,58, 255,237,130, 255,251,211]
    palette.putpalette(palette.getpalette()[:144]+stone+fire)
    return palette


def shade(rgb, vertices, faces, raster):
    triangles = vertices[faces.long()]
    normals = torch.cross(triangles[:, 1]-triangles[:, 0],
                          triangles[:, 2]-triangles[:, 0], dim=1)
    accumulated = torch.zeros_like(vertices)
    for corner in range(3):
        accumulated.index_add_(0, faces[:, corner].long(), normals)
    vertex_normals = functional.normalize(accumulated, dim=1)
    pixels = dr.interpolate(vertex_normals[None], raster, faces)[0][0]
    light = functional.normalize(vertices.new_tensor(LIGHTING['keyDirection']), dim=0)
    diffuse = (functional.normalize(pixels, dim=2)*light).sum(2).clamp(0, 1)
    molten = (rgb[:, :, 0] > rgb[:, :, 1]*1.8) & (rgb[:, :, 0] > .26)
    stone = rgb*(.9+.22*diffuse[:, :, None])
    stone += .05*diffuse[:, :, None]*vertices.new_tensor([1, .9, .8])
    return torch.where(molten[:, :, None], rgb, stone).clamp(0, 1)
