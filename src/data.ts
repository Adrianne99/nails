import type {Design,Settings} from './types';
export const sampleDesigns:Design[]=[
 ['Blush Hour','A sheer blush base with a delicate milky French tip. Your everyday little luxury.','Everyday',15000,'#e9b9be','french'],
 ['Petal Poetry','Tiny daisies on a soft rose canvas. A little garden at your fingertips.','Floral',20000,'#dc9ba9','flower'],
 ['Pearl Intentions','Creamy pearl tones and delicate golden details for your dressed-up days.','Occasion',25000,'#e8d9bf','pearl'],
 ['Cherry on Top','Playful cherries and a rosy finish. Sweet, with a little personality.','Playful',20000,'#ecc6c3','cherry'],
 ['Berry Yours','A glossy berry shade that makes even the simplest outfit feel considered.','Everyday',15000,'#9b405e','solid'],
 ['Golden Reverie','A warm champagne shimmer, made for catching the light.','Occasion',25000,'#c7a877','shimmer']
].map((a,i)=>({id:`10000000-0000-4000-8000-00000000000${i+1}`,name:a[0] as string,description:a[1] as string,category:a[2] as string,price:a[3] as number,extra:0,color:a[4] as string,pattern:a[5] as string,shapes:['Almond','Oval','Square'],lengths:['Short','Medium'],available:true}));
export const defaultSettings:Settings={paused:false,daily_capacity:10,cancellation_policy:'Request cancellation from your order page. The artist reviews requests before production. Once custom work begins, cancellation is subject to artist approval.',retention_policy:'Saved photos are private and reusable. You can delete unused photos anytime. Photos attached to active orders remain until completion or cancellation. You can request account deletion below.'};
