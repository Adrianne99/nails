import {createClient} from '@supabase/supabase-js';
import {readAuthConfig,startGoogleSignIn,finishGoogleSignIn,type ReturnContext} from './auth-flow';
import {imageFile,uploadFields,validate,validateAction} from './validation';
const env=import.meta.env as Record<string,string>;
const config=readAuthConfig(env);
export const authConfigError=config.error;
export const configured=Boolean(config.url && config.key);
export const db=configured?createClient(config.url,config.key,{auth:{flowType:'pkce',detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}}):null;
const browserEnvironment=()=>({href:location.href,origin:location.origin,storage:sessionStorage,replaceUrl:(url:string)=>history.replaceState(null,'',url)});
let authInitialization:ReturnType<typeof finishGoogleSignIn>|null=null;
export function initializeAuth(){
 if(!db)return Promise.resolve({session:null,context:null});
 // A callback code is one-use. Share its exchange across React Strict Mode mounts.
 return authInitialization??=finishGoogleSignIn(db,browserEnvironment());
}
export async function mutate(action:string,payload:unknown){if(!db)throw new Error('The shop is being prepared. Google sign-in will be available when it opens.');const checked=validateAction(action,payload);const {data,error}=await db.rpc('mutate',{action,payload:checked});if(error)throw new Error(error.message);return data;}
export async function rows(table:string){if(!db)return [];const {data,error}=await db.from(table).select('*');if(error)throw new Error(error.message);return data||[];}
export async function signIn(context:ReturnContext={page:'hands'}){if(!db)throw new Error(authConfigError||'The shop is being prepared. Google sign-in will be available when it opens.');await startGoogleSignIn(db,context,browserEnvironment());}
export async function privateUrl(path:string){if(!db)return '';const {data,error}=await db.storage.from('private-media').createSignedUrl(path,300);if(error)throw error;return data.signedUrl;}
export const galleryUrl=(path:string)=>db?.storage.from('gallery').getPublicUrl(path).data.publicUrl||'';
export async function prepareImage(file:File|Blob):Promise<Blob>{
 validate(imageFile,{type:file.type,size:file.size});
 const bitmap=await createImageBitmap(file);
 if(bitmap.width*bitmap.height>50000000){bitmap.close();throw new Error('This image is too large. Resize it before uploading.');}
 const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not prepare this image.')),'image/webp',0.85));
 if(blob.size>2*1024*1024)throw new Error('Please choose a smaller image. The prepared upload must be under 2 MB.');return blob;
}
export async function upload(file:File|Blob,kind:string,name:string){
 if(!db)throw new Error('Sign in to upload.');const fields=validate(uploadFields,{kind,name});const {data:{user}}=await db.auth.getUser();if(!user)throw new Error('Sign in to upload.');
 const id=crypto.randomUUID(),path=`${user.id}/${id}.webp`,blob=await prepareImage(file),bucket=fields.kind==='gallery'?'gallery':'private-media';
 const {error}=await db.storage.from(bucket).upload(path,blob,{contentType:'image/webp',upsert:false});if(error)throw error;
 try{if(fields.kind!=='gallery')await mutate('media_add',{id,path,kind:fields.kind,name:fields.name});}catch(e){await db.storage.from(bucket).remove([path]);throw e;}
 return {id,path};
}
export async function deleteMedia(id:string){const result=await mutate('media_delete',{id});const {error}=await db!.storage.from('private-media').remove(result.paths);if(error)throw new Error('Photo records removed, but file cleanup failed. Contact the artist to finish deletion.');}
