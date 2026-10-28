"""Apply a library review: retire plain designs, add new keepers with nail marks, write their prices.
Usage: python -I scripts/curate-more-inspirations.py REVIEW_DIR
REVIEW_DIR holds items.json, decisions.json (keep/category per item index) and mark/*.json (nail marks by key).
"""
import json, shutil, sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
review = Path(sys.argv[1])
PRICE = {'Soft & neutral': 15000, 'French': 20000}  # everything else 25000, as in 007_reprice_catalog.sql
CATEGORIES = {'Soft & neutral', 'French', 'Floral', 'Chrome & shimmer', 'Color & details'}
SHAPES = {'Almond', 'Oval', 'Square', 'Coffin'}

items = json.loads((review / 'items.json').read_text())
decisions = {int(k): v for k, v in json.loads((review / 'decisions.json').read_text()).items()}
marks = {m['key']: m for f in sorted((review / 'mark').glob('*.json')) for m in json.loads(f.read_text())}
library = json.loads((root / 'src/inspirations.json').read_text(encoding='utf-8'))
maps = json.loads((root / 'src/nail-maps.json').read_text())
candidates = {'pin-' + c['id']: c for c in json.loads((root / 'docs/expansion2/candidates.json').read_text())}
by_id = {p['id']: p for p in library}

def valid(m):
    n = m.get('nails') or []
    return (m.get('shape') in SHAPES and 1 <= len(n) <= 5 and len(m.get('fingers', [])) == 5
            and all(0 <= i < len(n) for i in m['fingers'])
            and all(0 <= v <= 1 for x in n for v in x['c'] + x['t']) and all(0 < x['w'] < 1 for x in n))

added = retired = mapped = 0
for i, it in enumerate(items):
    d = decisions[i]
    if it['existing']:
        p = by_id[it['key']]
        if d['keep']:
            p.pop('retired', None); p['category'] = d['category']; p['price'] = PRICE.get(d['category'], 25000)
        else:
            p['retired'] = True; retired += 1
    elif d['keep']:
        assert d['category'] in CATEGORIES, d
        c = candidates[it['key']]; image = f"/images/inspirations/{c['id']}.jpg"
        shutil.copyfile(it['file'], root / ('public' + image))
        library.append({'id': it['key'], 'name': f"{d['category'].replace(' & ', ' and ')} inspiration {len(library) + 1}",
                        'category': d['category'], 'image': image, 'source': c['source'], 'color': c['color'],
                        'price': PRICE.get(d['category'], 25000), 'sourceKind': 'board'})
        added += 1
    m = marks.get(it['key'])
    if d['keep'] and m and valid(m):
        maps[it.get('image') or f"/images/inspirations/{candidates[it['key']]['id']}.jpg"] = {
            'shape': m['shape'], 'fingers': m['fingers'],
            'nails': [{'c': [round(v, 3) for v in n['c']], 't': [round(v, 3) for v in n['t']], 'w': round(n['w'], 3)} for n in m['nails']]}
        mapped += 1

assert len({p['id'] for p in library}) == len(library) and len({p['image'] for p in library}) == len(library)
(root / 'src/inspirations.json').write_text(json.dumps(library, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
(root / 'src/nail-maps.json').write_text('{\n' + ',\n'.join(f'"{k}":' + json.dumps(v, separators=(',', ':')) for k, v in maps.items()) + '\n}\n')
rows = ',\n  '.join(f"('{p['id']}',{p['price']})" for p in library if not p.get('retired'))
(root / 'supabase/migrations/009_library_refresh.sql').write_text(
    '-- New and recategorised library designs. Retired designs keep their rows so existing orders still price.\n'
    'begin;\ninsert into public.reference_prices(id,price) values\n  ' + rows + '\non conflict (id) do update set price=excluded.price;\ncommit;\n')
shown = sum(1 for p in library if not p.get('retired'))
print(f'added {added}, retired {retired}, marked {mapped}, shown {shown}, unmarked shown {sum(1 for p in library if not p.get("retired") and p["image"] not in maps)}')
