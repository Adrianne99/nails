"""Curate real Pinterest board photographs reviewed in contact sheets."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
old = json.loads((root / 'src/inspirations.json').read_text(encoding='utf-8'))
candidates = json.loads((root / 'docs/expansion/candidates.json').read_text(encoding='utf-8'))
# Product adverts, collages, nail tools, faces, toes, screenshots, and duplicate frames.
excluded = set([3, 7, 12, 16, 19, 31, 77, 97, 118, 127, 131, 132, 134,
                142, 147, 149, 151, 155, 156, 157, 158, 163, 169,
                183, 185, 186, 229, 241, 242, 244, 245, 277, 284,
                304, 306, 317, 321, 322, 325, 338, 342, 343,
                355, 356, 360, 362, 370, 375, 377, 391, 394,
                400, 413, 414, 420, 422, 433, 443, 449,
                465, 468, 490, 492, 496, 500, 501, 503, 504, 507, 520, 521])
excluded.update(range(192, 208))
excluded.update(range(246, 252))

def dhash(path):
    im = Image.open(path).convert('L').resize((9, 8))
    vals = list(im.getdata())
    return sum((vals[y*9+x] > vals[y*9+x+1]) << (y*8+x) for y in range(8) for x in range(8))

def price_and_category(item, index):
    category = item['category']
    if index in range(301, 348) or index in range(463, 485):
        if category == 'Soft & neutral':
            category = 'Color & details'
    if index in [308, 311, 319, 327, 328, 341, 347, 353, 357, 361, 365, 445, 470, 471, 473, 477, 478, 480, 481]:
        category = 'Chrome & shimmer'
    if index in [303, 309, 323, 329, 332, 333, 334, 339, 358, 364, 366, 368, 369]:
        category = 'Floral'
    if index in [348, 349, 354, 363, 441, 442, 444, 446, 448, 450, 452, 453, 454, 455, 456, 457, 458, 460, 461, 462]:
        category = 'Soft & neutral'
    price = {'Soft & neutral': 20000, 'French': 25000, 'Floral': 30000,
             'Chrome & shimmer': 30000, 'Color & details': 30000}[category]
    if index in [301, 302, 305, 310, 318, 320, 323, 324, 326, 327, 328,
                 329, 330, 331, 332, 333, 334, 336, 337, 340, 344, 345,
                 346, 463, 464, 466, 473, 474, 475, 476, 477, 478, 479, 480, 481]:
        price = 35000
    return category, price

kept = []
seen = set()
for i, item in enumerate(candidates):
    if i in excluded:
        continue
    image = root / ('public' + item['image'])
    try:
        signature = dhash(image)
    except (FileNotFoundError, OSError):
        continue
    if signature in seen:
        excluded.add(i)
        continue
    seen.add(signature)
    category, price = price_and_category(item, i)
    name = category.replace(' & ', ' and ') + ' inspiration ' + str(i+101)
    kept.append({'id': 'pin-' + item['id'], 'name': name, 'category': category,
                 'image': item['image'], 'source': item['source'], 'sourceKind': item['sourceKind'],
                 'color': item['color'], 'price': price})

collection = [{**item, 'sourceKind': 'pin'} for item in old] + kept
assert len(collection) >= 500, f'Only {len(collection)} usable photographs'
assert len({item['id'] for item in collection}) == len(collection)
assert len({item['image'] for item in collection}) == len(collection)
(root / 'src/inspirations.json').write_text(json.dumps(collection, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
rows = [f"('{item['id']}',{item['price']})" for item in kept]
sql = 'begin;\ninsert into public.reference_prices(id,price) values\n  ' + ',\n  '.join(rows) + '\non conflict (id) do update set price=excluded.price;\ncommit;\n'
(root / 'supabase/migrations/005_more_references.sql').write_text(sql, encoding='utf-8')
(root / 'docs/expansion/curation.json').write_text(json.dumps({'added': len(kept), 'total': len(collection), 'excluded_indices': sorted(excluded)}, indent=2), encoding='utf-8')
print('Added', len(kept), 'for', len(collection), 'total references; excluded', len(excluded))
