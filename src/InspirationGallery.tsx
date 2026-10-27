import {money} from './types';
import {useMemo,useState} from 'react';
import {ArrowUpRight,Check,Search,X} from 'lucide-react';
import collection from './inspirations.json';
export type Inspiration=typeof collection[number];
export const inspirations:Inspiration[]=collection;
export function InspirationGallery({onChoose,compact=false,chooseLabel='Try this photo'}:{onChoose:(photo:Inspiration)=>void;compact?:boolean;chooseLabel?:string}){
 const [query,setQuery]=useState(''),[category,setCategory]=useState('All'),[limit,setLimit]=useState(24),[detail,setDetail]=useState<Inspiration|null>(null);
 const filtered=useMemo(()=>inspirations.filter(p=>(category==='All'||p.category===category)&&`${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase())),[query,category]);
 return <div className={`inspiration-library ${compact?'compact-library':''}`}>
 <div className="section-heading"><div><span className="eyebrow">THE INSPIRATION LIBRARY · {inspirations.length} PHOTOS</span><h2>Find your next set.</h2><p>Photo references to make your own with Eurie.</p></div><label className="inspiration-search"><Search size={17}/><input aria-label="Search inspiration photos" placeholder="Try French, floral, chrome…" value={query} onChange={e=>{setQuery(e.target.value);setLimit(24)}}/></label></div>
 <div className="tabs">{['All','Soft & neutral','French','Floral','Chrome & shimmer','Color & details'].map(c=><button key={c} className={category===c?'selected':''} onClick={()=>{setCategory(c);setLimit(24)}}>{category===c&&<Check size={12}/>} {c}</button>)}</div>
 <p className="hint">{filtered.length} inspirations · Reference photography, not Eurie’s portfolio.</p>
 <div className="inspiration-masonry">{filtered.slice(0,limit).map(p=><article className="inspiration-card" key={p.id}><button className="inspiration-image" onClick={()=>setDetail(p)} aria-label={`View ${p.name}`}><img src={p.image} alt={`${p.name} nail reference`} loading="lazy" decoding="async"/></button><div><span>{p.category}</span><h3>{p.name}</h3><strong>{money(p.price)} / set</strong><div className="inspiration-actions"><button onClick={()=>onChoose(p)}>{chooseLabel} <ArrowUpRight size={14}/></button><a href={p.source} target="_blank" rel="noreferrer">Pinterest ↗</a></div></div></article>)}</div>
 {filtered.length===0&&<p className="empty">No matches. Try a color or another style.</p>}
 {limit<filtered.length&&<button className="button secondary load-inspiration" onClick={()=>setLimit(n=>n+24)}>Show more inspiration ({filtered.length-limit} more)</button>}
 {detail&&<div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setDetail(null)}}><section className="modal inspiration-detail" role="dialog" aria-modal="true" aria-label={detail.name}><button className="modal-close icon-button" aria-label="Close inspiration" onClick={()=>setDetail(null)}><X/></button><img src={detail.image} alt={detail.name}/><h2>{detail.name}</h2><p>{money(detail.price)} per set · final nail price</p><a href={detail.source} target="_blank" rel="noreferrer">View original Pinterest {detail.sourceKind==='board'?'board':'pin'} ↗</a><button className="button full" onClick={()=>{onChoose(detail);setDetail(null)}}>{chooseLabel} <ArrowUpRight size={16}/></button></section></div>}
 </div>;
}
