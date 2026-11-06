"""Re-export the bundle's RGBA, normal-blend Aseprite masters. Requires Pillow.
Run from any directory: python Tools/rebuild_runtime.py
Advanced Aseprite blend modes/indexed color require the editor's exporter instead.
"""
from pathlib import Path
import json
from PIL import Image
from native_reader import read,composite
ROOT=Path(__file__).resolve().parents[1]
ALIASES={'E':'right','SE':'front_right','S':'front','SW':'front_left','W':'left','NW':'back_left','N':'back','NE':'back_right'}
def main():
 index=json.loads((ROOT/'runtime-index.json').read_text())
 for entity in index['entities']:
  doc=read(ROOT/entity['aseprite']);size=doc['size'];images=[composite(doc,f) for f in doc['frames']];tags={t['name']:t for t in doc['tags']}
  for action,definition in entity['actions'].items():
   selected={d:tags[action+'_'+(ALIASES[d] if entity['name']=='Wizard' else d)] for d in index['directions']}
   counts={t['end']-t['start']+1 for t in selected.values()}
   if len(counts)!=1:raise ValueError(f'{entity["name"]}/{action}: direction frame counts must match')
   count=counts.pop();durations={tuple(doc['frames'][i]['duration'] for i in range(t['start'],t['end']+1)) for t in selected.values()}
   if len(durations)!=1:raise ValueError(f'{entity["name"]}/{action}: direction timings must match')
   atlas=Image.new('RGBA',(size[0]*count,size[1]*8))
   for row,(direction,tag) in enumerate(selected.items()):
    for col,fi in enumerate(range(tag['start'],tag['end']+1)):atlas.paste(images[fi],(col*size[0],row*size[1]))
    timing=list(next(iter(durations)));definition['directions'][direction].update(fromFrame=tag['start'],toFrame=tag['end'],durationsMs=timing,durationMs=sum(timing))
    for event in definition['directions'][direction].get('events',[]):
     local=event['localFrame'];assert 0<=local<count;event['timeMs']=sum(timing[:local])
   atlas.save(ROOT/definition['image']);definition['framesPerDirection']=count;definition['durationsMs']=list(durations.pop())
  entity['canvas']=size;(ROOT/'Runtime'/entity['name']/'manifest.json').write_text(json.dumps(entity,indent=2)+'\n')
 (ROOT/'runtime-index.json').write_text(json.dumps(index,indent=2)+'\n');(ROOT/'preview-data.js').write_text('window.ASSETS = '+json.dumps(index)+';\n')
 print('Re-exported',len(index['entities']),'masters. Original source provenance manifests are unchanged.')
if __name__=='__main__':main()
