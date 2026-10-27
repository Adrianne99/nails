import json,math
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
items=json.loads(Path('docs/expansion/candidates.json').read_text())
for start in range(0,len(items),50):
    sheet=Image.new('RGB',(1200,1100),'white');draw=ImageDraw.Draw(sheet)
    for j,p in enumerate(items[start:start+50]):
        try:
            im=Image.open('public'+p['image']).convert('RGB');im.thumbnail((116,190))
            x=(j%10)*120;y=(j//10)*220
            sheet.paste(im,(x+(116-im.width)//2,y));draw.text((x+3,y+192),str(start+j),fill='black')
        except Exception as e:print(start+j,e)
    sheet.save(f'docs/expansion/sheet-{start}.jpg',quality=90)
print(len(items))
