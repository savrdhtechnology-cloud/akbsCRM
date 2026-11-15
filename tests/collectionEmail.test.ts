import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sendCollectionEmail,pdfBase64} from '../supabase/functions/_shared/collectionEmail.ts';
const config={apiKey:'fixture-only',from:'Existing Sender <sender@example.invalid>',replyTo:'support@example.invalid'};
test('collection email uses exactly one recipient and attaches actual PDF bytes',async()=>{
 const previous=globalThis.fetch;let payload:any;let headers:any;
 globalThis.fetch=async(_url,options)=>{payload=JSON.parse(String(options?.body));headers=options?.headers;return new Response('{"id":"provider-id"}');};
 try{
  const bytes=new TextEncoder().encode('%PDF-1.4\nfixture');
  const result=await sendCollectionEmail(config,{to:'one@example.invalid',subject:'Test receipt',html:'Test',attachments:[{filename:'receipt.pdf',content:pdfBase64(bytes),content_type:'application/pdf'}]},'one-delivery');
  assert.equal(result.id,'provider-id');assert.deepEqual(payload.to,['one@example.invalid']);
  assert.equal(payload.from,config.from);assert.equal(payload.reply_to,config.replyTo);assert.equal(payload.cc,undefined);assert.equal(payload.bcc,undefined);
  assert.equal(headers['Idempotency-Key'],'one-delivery');assert.equal(Buffer.from(payload.attachments[0].content,'base64').toString(),'%PDF-1.4\nfixture');
 }finally{globalThis.fetch=previous;}
});
test('recipient lists are rejected before any provider call',async()=>{
 const previous=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return new Response('{}');};
 try{for(const to of ['one@example.invalid,two@example.invalid','one@example.invalid;two@example.invalid','one@example.invalid\nother@example.invalid'])await assert.rejects(sendCollectionEmail(config,{to,subject:'Test',html:'Test'},'invalid'),/one valid/);assert.equal(calls,0);}finally{globalThis.fetch=previous;}
});
test('transient provider retry keeps one idempotency key',async()=>{
 const previous=globalThis.fetch;const keys:string[]=[];globalThis.fetch=async(_url,options)=>{keys.push((options?.headers as any)['Idempotency-Key']);return keys.length===1?new Response('{}',{status:503}):new Response('{"id":"accepted"}');};
 try{const result=await sendCollectionEmail(config,{to:'one@example.invalid',subject:'Test',html:'Test'},'same-claim');assert.equal(result.id,'accepted');assert.deepEqual(keys,['same-claim','same-claim']);}finally{globalThis.fetch=previous;}
});
