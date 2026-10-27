import {createContext,useContext,useEffect,useState} from 'react';
import type {User} from '@supabase/supabase-js';
import type {Design,Media,Size,Preview,Order,Settings,Event,Deletion} from './types';
import {privateUrl} from './api';
export type Page='home'|'gallery'|'hands'|'studio'|'orders'|'admin';
export type Shop={user:User|null;admin:boolean;designs:Design[];media:Media[];sizes:Size[];previews:Preview[];orders:Order[];settings:Settings;events:Event[];internal:{order_id:string;note:string}[];deletions:Deletion[];selected:Design;select:(d:Design)=>void;page:Page;go:(p:Page)=>void;refresh:()=>Promise<void>;run:(fn:()=>Promise<unknown>,success?:string)=>Promise<void>;busy:boolean;login:()=>void;orderDesign:(d:Design,referenceId?:string)=>void;editPreview:Preview|null;setEditPreview:(p:Preview|null)=>void;orderPreview:string;setOrderPreview:(id:string)=>void};
export const ShopContext=createContext<Shop>(null!);
export const useShop=()=>useContext(ShopContext);
export function usePhoto(path?:string){const[url,setUrl]=useState('');useEffect(()=>{let active=true;setUrl('');const fetchUrl=()=>{if(path)privateUrl(path).then(u=>{if(active)setUrl(u)}).catch(()=>{if(active)setUrl('')})};fetchUrl();const timer=setInterval(fetchUrl,240000);return()=>{active=false;clearInterval(timer)}},[path]);return url;}
export function PrivatePhoto({path,alt,className=''}:{path?:string;alt:string;className?:string}){const url=usePhoto(path);return url?<img src={url} alt={alt} className={className}/>:<div className={`photo-placeholder ${className}`}>Private photo</div>}
