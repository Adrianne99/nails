import {useEffect,useRef,useState} from 'react';
import type {User} from '@supabase/supabase-js';
import {ArrowRight,ArrowUpRight,Check,Flower2,Heart,Menu,ShieldCheck,Sparkles,Truck,UserRound,X,LogOut,ShoppingBag} from 'lucide-react';
import {db,configured,rows,signIn,initializeAuth,authConfigError} from './api';
import {sampleDesigns,defaultSettings} from './data';
import type {Design,Preview} from './types';
import {money} from './types';
import {ShopContext,useShop,type Page,type Shop} from './shop';
import {NailArt} from './art';
import {references} from './references';
import {Hands} from './Hands';
import {Studio} from './Studio';
import {InspirationGallery} from './InspirationGallery';
import {Orders,OrderForm,Admin} from './Orders';
export default function App(){
 const [user,setUser]=useState<User|null>(null),[admin,setAdmin]=useState(false),[page,setPage]=useState<Page>('home'),[selected,select]=useState<Design>(sampleDesigns[0]),[data,setData]=useState({designs:sampleDesigns,media:[],sizes:[],previews:[],orders:[],settings:defaultSettings,events:[],internal:[],deletions:[]} as Pick<Shop,'designs'|'media'|'sizes'|'previews'|'orders'|'settings'|'events'|'internal'|'deletions'>),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(false),[authOpen,setAuthOpen]=useState(false),[orderOpen,setOrderOpen]=useState(false),[detail,setDetail]=useState<Design|null>(null),[menu,setMenu]=useState(false),[editPreview,setEditPreview]=useState<Preview|null>(null),[orderPreview,setOrderPreview]=useState('');
 const [authReady,setAuthReady]=useState(!configured);
 const requestGeneration=useRef(0),authId=useRef<string|null>(null),restoredDesign=useRef<string|undefined>(undefined);
 const refresh=async()=>{
  const generation=++requestGeneration.current;
  if(!db)return;const {data:{user:current},error:authError}=await db.auth.getUser();if(authError&&authError.name!=='AuthSessionMissingError')throw new Error('Your sign-in session could not be verified. Please try signing in again.');
  const [designs,settings]=await Promise.all([rows('designs'),rows('settings')]);
  if(generation!==requestGeneration.current)return;
  if(!current){setData({...data,designs,settings:settings[0]||defaultSettings,media:[],sizes:[],previews:[],orders:[],events:[],internal:[],deletions:[]});return;}
  const {data:isAdmin,error:roleError}=await db.rpc('is_admin');if(roleError)throw roleError;
  const [media,sizes,previews,orders,events,internal,deletions]=await Promise.all(['media','sizes','previews','orders','order_events','order_internal','deletion_requests'].map(rows));
  if(generation!==requestGeneration.current)return;setAdmin(!!isAdmin);
  if(restoredDesign.current){const choice=designs.find(d=>d.id===restoredDesign.current);if(choice)select(choice);restoredDesign.current=undefined;}
  setData({designs,settings:settings[0]||defaultSettings,media,sizes,previews,orders,events,internal,deletions});
 };
 const run=async(fn:()=>Promise<unknown>,success?:string)=>{setBusy(true);try{await fn();if(success){setError(false);setMessage(success)}}catch(e){setError(true);setMessage(e instanceof Error?e.message:'Something went wrong. Please try again.')}finally{setBusy(false)}};
 useEffect(()=>{
  if(!db){if(authConfigError){setError(true);setMessage(authConfigError)}return;}
  let active=true;
  const applyUser=(next:User|null)=>{
   if(!active)return;
   if(next?.app_metadata.provider!=='google')next=null;
   const nextId=next?.id||null;
   if(nextId!==authId.current){
    authId.current=nextId;requestGeneration.current++;setAdmin(false);
    setData(d=>({...d,media:[],sizes:[],previews:[],orders:[],events:[],internal:[],deletions:[]}));
    setEditPreview(null);setOrderPreview('');setOrderOpen(false);
   }
   setUser(next);
   if(next)setAuthOpen(false);
  };
  const {data:{subscription}}=db.auth.onAuthStateChange((_event,session)=>applyUser(session?.user||null));
  initializeAuth().then(({session,context})=>{
   if(!active)return;
   applyUser(session?.user||null);
   if(context){setPage(context.page as Page);restoredDesign.current=context.designId;}
  }).catch(e=>{if(active){setError(true);setMessage(e instanceof Error?e.message:'Sign-in failed. Please try again.');setPage('hands');}})
   .finally(()=>{if(active)setAuthReady(true)});
  return()=>{active=false;subscription.unsubscribe()};
 },[]);
 useEffect(()=>{if(authReady)void run(refresh)},[user?.id,authReady]);
 useEffect(()=>{if(!db||!user||!authReady)return;const reload=()=>{void run(refresh)};window.addEventListener('focus',reload);return()=>window.removeEventListener('focus',reload)},[user?.id,authReady]);
 useEffect(()=>{const handler=()=>{const p=location.hash.slice(1) as Page;if(['home','gallery','hands','studio','orders','admin'].includes(p))setPage(p)};handler();window.addEventListener('hashchange',handler);return()=>window.removeEventListener('hashchange',handler)},[]);
 const go=(p:Page)=>{setPage(p);location.hash=p;setMenu(false);window.scrollTo({top:0,behavior:'smooth'})};
 const login=()=>setAuthOpen(true);
 const orderDesign=(d:Design,referenceId='')=>{sessionStorage.setItem('eurie.order-reference',referenceId);select(d);if(!user){sessionStorage.setItem('eurie.pending-order',d.id);login()}else setOrderOpen(true)};
 useEffect(()=>{if(user&&authReady){const id=sessionStorage.getItem('eurie.pending-order');const design=data.designs.find(d=>d.id===id);if(design){select(design);setOrderOpen(true);sessionStorage.removeItem('eurie.pending-order')}}},[user?.id,authReady,data.designs]);
 const ctx:Shop={...data,user,admin,page,go,selected,select,refresh,run,busy,login,orderDesign,editPreview,setEditPreview,orderPreview,setOrderPreview};
 return <ShopContext.Provider value={ctx}>
 <div className="announcement">A little self-love, right at your fingertips <span>✧</span> Handmade in Mandaluyong</div>
 <header className="header"><button className="wordmark" onClick={()=>go('home')} aria-label="Nails by Eurie home">nails <em>by Eurie</em><span>HANDMADE, JUST FOR YOU</span></button><nav className={menu?'nav open':'nav'} aria-label="Main navigation">{(['gallery','studio','hands','orders'] as Page[]).map((p,i)=><button key={p} className={page===p?'active':''} onClick={()=>go(p)}>{['The collection','Try it on','My hands & sizes','My orders'][i]}</button>)}{admin&&<button className={page==='admin'?'active':''} onClick={()=>go('admin')}>Artist desk</button>}</nav><div className="header-actions">{user?<button className="account" onClick={()=>void run(async()=>{const {error}=await db!.auth.signOut({scope:'local'});if(error)throw error;go('home')})} aria-label="Sign out"><LogOut size={17}/><span>Sign out</span></button>:<button className="account" onClick={login}><UserRound size={17}/><span>Sign in</span></button>}<button className="mobile-menu" aria-label="Toggle navigation" aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button></div></header>
 {!configured&&<div className="setup-note">A first look at Nails by Eurie. Explore the inspiration edit. Sign-in and ordering will open after shop setup.</div>}
 <main>{page==='home'?<Home onDetail={setDetail}/>:page==='gallery'?<Gallery onDetail={setDetail}/>:!authReady?<section className="gate" role="status"><div className="circle-icon"><UserRound/></div><h1>Signing you in…</h1><p>Finishing your secure Google sign-in.</p></section>:!user?<Gate login={login}/>:page==='hands'?<Hands/>:page==='studio'?<Studio/>:page==='orders'?<Orders/>:admin?<Admin/>:<Gate login={login} admin/>}</main>
 <footer><div className="footer-inner"><div className="wordmark">nails <em>by Eurie</em><span>LITTLE DETAILS. ALL YOU.</span></div><p>Handmade press-ons, made personal.<br/>Mandaluyong, Philippines</p><div><span>Delivery & personal handover</span><span>Cash when you receive your set</span></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Nails by Eurie</span><span>Made with care, worn with love. ♡</span></div></footer>
 {message&&<div role={error?'alert':'status'} className={`toast ${error?'error':''}`}><span>{message}</span><button aria-label="Dismiss notification" onClick={()=>setMessage('')}><X size={18}/></button></div>}
 {authOpen&&<Modal title="Your next little obsession." close={()=>setAuthOpen(false)}><p>Sign in to save your hands, make a set your own, and keep all your orders in one place.</p><div className="auth-icon"><Flower2 size={40}/></div><button className="button full" disabled={busy||!configured||!authReady} onClick={()=>void run(()=>signIn({page,designId:selected.id}))}><span className="google-g">G</span> Continue with Google</button>{!configured&&<p className="hint">Google sign-in is not connected yet. You can explore the collection while the shop is being prepared.</p>}<p className="privacy-line"><ShieldCheck size={16}/> Your photos stay private. Only you and the artists can see them.</p></Modal>}
 {detail&&<Modal title={detail.name} close={()=>setDetail(null)} wide><div className="detail-grid"><NailArt design={detail}/><div><span className="eyebrow">{detail.category} · MADE TO ORDER</span><h2>{money(detail.price+detail.extra)}</h2><p>{detail.description}</p>{!detail.photo_path&&references[detail.id]&&<p className="photo-credit">Inspiration reference · {references[detail.id].credit} <a href={references[detail.id].source} target="_blank" rel="noreferrer">View on Pinterest ↗</a></p>}<p className="hint">Available in {detail.shapes.join(', ')} · {detail.lengths.join(' & ')}</p><div className="notice">The displayed nail price is final. Eurie checks your fit before production.</div><button className="button full" onClick={()=>{select(detail);setDetail(null);go('studio')}}>Optional: try it on <Sparkles size={16}/></button><button className="button secondary full" onClick={()=>{orderDesign(detail);setDetail(null)}}>Order this set <ArrowRight size={16}/></button></div></div></Modal>}
 {orderOpen&&<Modal title="Make it yours." close={()=>setOrderOpen(false)} wide><OrderForm close={()=>setOrderOpen(false)}/></Modal>}
 </ShopContext.Provider>;
}
export function Modal({title,close,children,wide=false}:{title:string;close:()=>void;children:React.ReactNode;wide?:boolean}){
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const old=document.body.style.overflow;document.body.style.overflow='hidden';const el=document.querySelector<HTMLElement>('[role="dialog"]');el?.focus();const handle=(e:KeyboardEvent)=>{if(e.key==='Escape')close();if(e.key==='Tab'&&el){const focus=Array.from(el.querySelectorAll<HTMLElement>('button:not(:disabled),a,input,select,textarea,[tabindex="0"]'));const first=focus[0],last=focus[focus.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===el)){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};window.addEventListener('keydown',handle);return()=>{document.body.style.overflow=old;window.removeEventListener('keydown',handle);previous?.focus()}},[]);
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><section className={`modal ${wide?'wide':''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}><button className="modal-close icon-button" aria-label="Close dialog" onClick={close}><X/></button><h2>{title}</h2>{children}</section></div>;
}
function Gate({login,admin=false}:{login:()=>void;admin?:boolean}){return <section className="gate"><div className="circle-icon"><UserRound/></div><span className="eyebrow">A SPACE THAT’S ALL YOURS</span><h1>{admin?'For the artists.':'Your kind of pretty, saved.'}</h1><p>{admin?'This page is available to the two shop administrators.':'Sign in with Google to save your photos, try on designs, and follow your orders.'}</p><button className="button" onClick={login}>Continue with Google <ArrowRight size={17}/></button></section>}
function Home({onDetail}:{onDetail:(d:Design)=>void}){const {go,designs}=useShop();return <>
 <section className="hero"><div className="hero-copy"><span className="eyebrow"><span className="tiny-line"/> YOUR NAILS, YOUR LITTLE MOMENT</span><h1>Made for your<br/>kind of <em>pretty.</em><span className="sparkle">✧</span></h1><p>Custom press-on nails, lovingly made by Eurie.<br/>Pick a design, make it yours, and carry a little<br className="desktop"/> confidence on your fingertips.</p><div className="hero-buttons"><button className="button" onClick={()=>go('gallery')}>Find your set <ArrowUpRight size={18}/></button><button className="text-button" onClick={()=>go('studio')}>Try a design on <Sparkles size={16}/></button></div><div className="hero-footnote"><span className="mini-hearts">♡ ♡ ♡</span> Handmade with love. ₱200–₱350 per set.</div></div><div className="hero-visual"><div className="hero-card"><NailArt design={designs[0]||sampleDesigns[0]} hero/><div className="hero-card-caption"><span>the everyday muse</span><span>THE INSPIRATION EDIT</span></div></div><div className="round-stamp">MADE WITH LOVE<span>✿</span>MADE FOR YOU</div><div className="floating-note"><Sparkles size={18}/><span>Your next<br/><em>little obsession.</em></span></div><span className="vertical-note">A LITTLE DETAIL. A WHOLE MOOD.</span></div></section>
 <div className="benefits"><span><Heart size={17}/> Handmade to order</span><span><Sparkles size={17}/> Preview on your own hands</span><span><ShieldCheck size={17}/> Fitted just for you</span><span><Truck size={17}/> Pay when it arrives</span></div>
 <section className="section collection"><div className="section-heading"><div><span className="eyebrow">THE EURIE EDIT</span><h2>A set for every side of you.</h2></div><button className="text-button" onClick={()=>go('gallery')}>Explore the collection <ArrowRight size={17}/></button></div><div className="design-grid">{designs.slice(0,3).map(d=><DesignCard key={d.id} design={d} onClick={()=>onDetail(d)}/>)}</div><p className="illustration-note">Pinterest inspiration · Photos show reference designs, not sets made by Eurie.</p></section>
 <section className="how section"><div><span className="eyebrow">FROM A LITTLE IDEA TO YOUR FINGERTIPS</span><h2>Personal, from<br/>the very first tip.</h2><p>Your favorite design. Your perfect fit.<br/>A little help from Eurie along the way.</p><button className="text-button" onClick={()=>go('hands')}>Let’s find your fit <ArrowRight size={17}/></button></div><div className="steps">{[['01','Find your favorite','Choose from the collection, or bring an idea of your own.'],['02','Make it yours','Choose Small, Medium or Large. Eurie confirms your fit; photo try-on is optional.'],['03','Let us do the little details','Place your order at the displayed price. We create your set. Pay when it arrives.']].map(([n,t,b])=><div key={n} className="step"><span>{n}</span><div><h3>{t}</h3><p>{b}</p></div></div>)}</div></section>
 <section className="closing"><Flower2 size={28}/><p>Because a little self-love<br/>looks good on you.</p><button className="button" onClick={()=>go('gallery')}>Meet your next set <ArrowUpRight size={17}/></button></section>
 </>}
export function DesignCard({design:d,onClick}:{design:Design;onClick:()=>void}){return <button className="design-card" onClick={onClick}><div className="design-image"><NailArt design={d}/><span className="design-tag">{d.category}</span><span className="card-arrow"><ArrowUpRight size={20}/></span></div><div className="design-caption"><div><h3>{d.name}</h3><span>Handmade · Made to order</span></div><span>{money(d.price+d.extra)}</span></div></button>}
function Gallery({onDetail}:{onDetail:(d:Design)=>void}){const{designs,orderDesign}=useShop();const [filter,setFilter]=useState('All designs');return <section className="section gallery-page"><span className="eyebrow">PICK YOUR NEXT LITTLE OBSESSION</span><h1>The collection.</h1><p>Choose a reference, pick your fit, and order at the displayed price.</p><button className="button secondary" onClick={()=>orderDesign(designs.find(d=>d.available)||sampleDesigns[0],"custom")}>Bring my own reference <ArrowUpRight size={16}/></button><div className="tabs">{['All designs',...new Set(designs.map(d=>d.category))].map(c=><button key={c} className={filter===c?'selected':''} onClick={()=>setFilter(c)}>{filter===c&&<Check size={13}/>} {c}</button>)}</div><div className="design-grid">{designs.filter(d=>d.available&&(filter==='All designs'||d.category===filter)).map(d=><DesignCard key={d.id} design={d} onClick={()=>onDetail(d)}/>)}</div>{designs.length===0&&<div className="empty"><ShoppingBag/><h3>Something pretty is on its way.</h3><p>Eurie is preparing the collection. Check back soon.</p></div>}<p className="illustration-note">Pinterest reference photography · Pick a design and order at its displayed price.</p><InspirationGallery chooseLabel="Order this design" onChoose={photo=>orderDesign(designs.find(d=>d.available)||sampleDesigns[0],photo.id)}/></section>}



