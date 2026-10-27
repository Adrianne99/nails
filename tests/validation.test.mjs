import test from 'node:test';
import assert from 'node:assert/strict';
import {philippineMobile,httpsUrl,imageFile,safeReferenceUrl,validateAction} from '../src/validation.ts';

const order=()=>({request_key:crypto.randomUUID(),design_id:crypto.randomUUID(),recipient:'Ana Reyes',phone:'09171234567',location:'Mandaluyong office',preferred_date:'2099-01-01',quantity:1,shape:'Almond',length:'Short',fulfillment:'Handover',notes:'',preset:'',reference_id:'',reference_url:'',reference_media_id:'',sizing_id:'',preview_id:'',tier:'simple',custom_detail:'plain',unit_price:25000});

test('Philippine numbers normalize to +63 and other numbers are rejected',()=>{
 assert.equal(philippineMobile.parse('09171234567'),'+639171234567');
 assert.equal(philippineMobile.parse('+63 917 123 4567'),'+639171234567');
 for(const value of ['0917123456','+638171234567','+14155552671','abc'])assert.equal(philippineMobile.safeParse(value).success,false);
 assert.equal(validateAction('order_submit',order()).phone,'+639171234567');
});

test('references reject executable URLs and credentials',()=>{
 assert.equal(httpsUrl.safeParse('https://www.pinterest.com/pin/123/').success,true);
 for(const value of ['javascript:alert(1)','data:text/html,<script>','http://pinterest.com/pin/123/','https://person:password@pinterest.com/pin/123/']){
  assert.equal(httpsUrl.safeParse(value).success,false);assert.equal(safeReferenceUrl(value),undefined);
 }
});

test('all order fields and uploads are checked before submission',()=>{
 assert.throws(()=>validateAction('order_submit',{...order(),quantity:100}),/quantity/);
 assert.throws(()=>validateAction('order_submit',{...order(),admin:true}),/Unrecognized key/);
 assert.throws(()=>validateAction('order_submit',{...order(),notes:'x'.repeat(2001)}),/notes/);
 assert.equal(imageFile.safeParse({type:'image/svg+xml',size:200}).success,false);
 assert.equal(imageFile.safeParse({type:'image/png',size:13*1024*1024}).success,false);
});

test('markup remains plain text while control characters are rejected',()=>{
 const payload={...order(),notes:'<script>alert(1)</script>',recipient:"O'Brien"};
 assert.equal(validateAction('order_submit',payload).notes,payload.notes);
 assert.throws(()=>validateAction('order_submit',{...order(),recipient:'Ana\u0000'}),/recipient/);
});
