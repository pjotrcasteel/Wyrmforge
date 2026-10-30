"""Package editable PNG source layers as OpenRaster; no pose/image edits."""
import pathlib
import json
import zipfile
import xml.etree.ElementTree as ET
from PIL import Image

root = pathlib.Path(__file__).resolve().parents[3]
source = root / 'art/source/characters/grey-wizard/gothic-south-v003'
project = json.loads((source / 'project.json').read_text())
w, h = project['sourceCell']
image = ET.Element('image', {'w': str(w), 'h': str(h), 'name': project['id'], 'version': '0.0.3'})
stack = ET.SubElement(image, 'stack')
entries = []
for index, layer in enumerate(reversed(project['layers'])):
    name = f'data/layer-{index:02}.png'
    ET.SubElement(stack, 'layer', {'name': layer['name'], 'src': name, 'x': '0', 'y': '0',
                                 'opacity': '1.0', 'visibility': 'visible', 'composite-op': 'svg:src-over'})
    data = (source / layer['file']).read_bytes()
    assert Image.open(source / layer['file']).size == (w, h)
    entries.append((name, data))
with zipfile.ZipFile(source / 'grey-wizard-fire-south.ora', 'w') as archive:
    def put(name, data, compression=zipfile.ZIP_DEFLATED):
        info = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
        info.compress_type = compression
        archive.writestr(info, data)
    put('mimetype', b'image/openraster', zipfile.ZIP_STORED)
    put('stack.xml', ET.tostring(image, encoding='utf-8', xml_declaration=True))
    put('mergedimage.png', (source / 'source-master.png').read_bytes())
    for name, data in entries:
        put(name, data)
print(source / 'grey-wizard-fire-south.ora')
