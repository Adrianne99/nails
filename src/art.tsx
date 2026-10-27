import type {Design} from './types';
import {galleryUrl} from './api';
import {references} from './references';
export function NailArt({design,hero=false}:{design:Design;hero?:boolean}){
 const ref=references[design.id],src=design.photo_path?galleryUrl(design.photo_path):ref?.image;
 return src?<img className={`nail-art design-photo ${hero?'hero-art':''}`} src={src} alt={`${design.name} ${design.photo_path?'nail set':'nail inspiration photograph'}`} style={{objectPosition:ref?.position||'center'}} loading={hero?'eager':'lazy'} decoding="async"/>:<div className="design-photo photo-placeholder">Product photo coming soon</div>;
}
