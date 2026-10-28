import {useMemo, useState} from 'react';
import {ArrowUpRight, Search, Shuffle, X} from 'lucide-react';
import {money} from './types';
import collection from './inspirations.json';

export type Inspiration = typeof collection[number];
// Retired designs stay listed so past orders and saved try-ons can still find them; the gallery shows only `shown`.
export const inspirations: (Inspiration & {retired?: boolean})[] = collection;
export const shown = inspirations.filter(photo => !photo.retired);

const categories = ['All', 'Soft & neutral', 'French', 'Floral', 'Chrome & shimmer', 'Color & details'];
const categoryCovers = new Map(categories.slice(1).map(category => [category, shown.find(photo => photo.category === category)?.image]));

function hash(value: string) {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
}

function mixPhotos(photos: Inspiration[], seed: number, selectedCategory: string) {
  const sortBucket = (bucket: Inspiration[]) => bucket.sort((a, b) => hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`));
  if (selectedCategory !== 'All') return sortBucket([...photos]);
  const buckets = categories.slice(1).map(category => sortBucket(photos.filter(photo => photo.category === category)));
  const mixed: Inspiration[] = [];
  while (buckets.some(bucket => bucket.length)) {
    for (const bucket of buckets) {
      const photo = bucket.shift();
      if (photo) mixed.push(photo);
    }
  }
  return mixed;
}

export function InspirationGallery({onChoose, compact = false, chooseLabel = 'Try this photo'}: {
  onChoose: (photo: Inspiration) => void;
  compact?: boolean;
  chooseLabel?: string;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [limit, setLimit] = useState(32);
  const [seed, setSeed] = useState(0);
  const [detail, setDetail] = useState<Inspiration | null>(null);
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return mixPhotos(shown.filter(photo =>
      (category === 'All' || photo.category === category) &&
      `${photo.name} ${photo.category}`.toLocaleLowerCase().includes(search)
    ), seed, category);
  }, [query, category, seed]);

  return <div className={`inspiration-library ${compact ? 'compact-library' : ''}`}>
    <div className="inspiration-intro">
      <div><span className="eyebrow">THE INSPIRATION LIBRARY · {shown.length} REAL PHOTOS</span><h2>Find your next set.</h2><p>Browse a style, then make it yours with Eurie.</p></div>
      <button className="inspiration-shuffle" onClick={() => {setSeed(value => value + 1); setLimit(32)}} aria-label="Show a different mix of designs"><Shuffle size={16}/> Surprise me</button>
    </div>
    <label className="inspiration-search"><Search size={19}/><input aria-label="Search inspiration photos" placeholder="Search colors, French tips, florals…" value={query} onChange={event => {setQuery(event.target.value); setLimit(32)}}/>{query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><X size={16}/></button>}</label>
    <div className="inspiration-topics" aria-label="Browse nail styles">{categories.map(item => <button key={item} className={`inspiration-topic ${category === item ? 'selected' : ''}`} aria-pressed={category === item} onClick={() => {setCategory(item); setLimit(32)}}>{item === 'All' ? <span className="inspiration-topic-all">✦</span> : <img src={categoryCovers.get(item)} alt="" loading="lazy"/>}<span>{item === 'All' ? 'All ideas' : item}</span></button>)}</div>
    <div className="inspiration-count"><span>{filtered.length} ideas to explore</span><span>Reference photography · Eurie makes your set</span></div>
    <div className="inspiration-masonry">{filtered.slice(0, limit).map(photo => <article className="inspiration-card" key={photo.id}><button className="inspiration-image" onClick={() => setDetail(photo)} aria-label={`View ${photo.name}, ${money(photo.price)} per set`}><img src={photo.image} alt={`${photo.name} nail reference`} loading="lazy" decoding="async"/><span className="inspiration-image-arrow"><ArrowUpRight size={17}/></span></button><div className="inspiration-caption"><h3>{photo.name}</h3><strong>{money(photo.price)}</strong></div></article>)}</div>
    {filtered.length === 0 && <p className="empty">No matches. Try another color or style.</p>}
    {limit < filtered.length && <button className="button secondary load-inspiration" onClick={() => setLimit(value => value + 32)}>See more ideas <span>({filtered.length - limit} left)</span></button>}
    {detail && <div className="modal-backdrop" onClick={event => {if (event.target === event.currentTarget) setDetail(null)}}><section className="modal inspiration-detail" role="dialog" aria-modal="true" aria-label={detail.name}><button className="modal-close icon-button" aria-label="Close inspiration" onClick={() => setDetail(null)}><X/></button><img src={detail.image} alt={`${detail.name} nail reference`}/><div className="inspiration-detail-copy"><span className="eyebrow">{detail.category}</span><h2>{detail.name}</h2><p>{money(detail.price)} per set · final nail price</p><a href={detail.source} target="_blank" rel="noreferrer">View original Pinterest {detail.sourceKind === 'board' ? 'board' : 'pin'} ↗</a><button className="button full" onClick={() => {onChoose(detail); setDetail(null)}}>{chooseLabel} <ArrowUpRight size={16}/></button></div></section></div>}
  </div>;
}
