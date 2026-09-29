import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/secure.ts';
import {checkOrigin,readBody,cookie,setCookie} from '../server/security.ts';
import {escapeHtml} from '../src/lib/escapeHtml.ts';
import {validateFile,headers,readJson} from '../supabase/functions/_shared/security.ts';
const token='a'.repeat(64);
const req=(body:any,extra:any={})=>({method:'POST',headers:{host:'localhost:3000',origin:'http://localhost:3000','content-type':'application/json',...extra},body});
function response(){return {statusCode:0,headers:{} as Record<string,string>,body:null as any,setHeader(k:string,v:string){this.headers[k]=v},end(s:string){this.body=JSON.parse(s)}};}
test('CSRF rejects cross-origin, forged hosts and absent Origin',()=>{
 for(const h of [{origin:'https://evil.invalid'},{origin:''},{host:'evil.invalid'},{'sec-fetch-site':'cross-site'}])assert.throws(()=>checkOrigin(req({},h)));
 assert.doesNotThrow(()=>checkOrigin(req({})));
});
test('JSON parser rejects oversized bodies, arrays and wrong content type',async()=>{
 await assert.rejects(readBody(req({value:'a'.repeat(100)}),30));await assert.rejects(readBody(req([])));await assert.rejects(readBody(req({},{'content-type':'text/plain'})));
});
test('Cookie parser and attributes protect sessions',()=>{
 assert.equal(cookie(req({}, {cookie:'akbs_staff=forged'}),'akbs_staff'),'');assert.equal(cookie(req({}, {cookie:'akbs_staff='+token}),'akbs_staff'),token);
 const res=response();setCookie(res,'akbs_staff',token);assert.match(res.headers['Set-Cookie'],/HttpOnly; SameSite=Strict; Max-Age=1800/);
});
test('Anonymous callers and arbitrary upstream services are blocked before fetch',async()=>{
 for(const service of ['akbs_crm_workspace','akbs_payment_proof_save','arbitrary']){const res=response();await handler(req({service,p_action:'snapshot',p_token:token}),res);assert.ok([400,401].includes(res.statusCode));}
});
test('Login stores credential only in cookie and strips secrets from JSON',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({token,user:{id:'test'},temporary_credential:'never-return'}));
 try{const res=response();await handler(req({service:'akbs_crm_workspace',p_action:'login',p_data:{login:'test',password:'test'}}),res);assert.equal(res.statusCode,200);assert.equal(res.body.authenticated,true);assert.equal(res.body.token,undefined);assert.equal(res.body.temporary_credential,undefined);assert.ok(res.headers['Set-Cookie'].includes(token));}finally{globalThis.fetch=previous;}
});
test('Staff credentials always come from server cookie; logout clears it',async()=>{
 const previous=globalThis.fetch;let sent:any;globalThis.fetch=async(_u,o)=>{sent=JSON.parse(String(o?.body));return new Response('{}')};
 try{const res=response();await handler(req({service:'akbs_crm_workspace',p_action:'logout',p_token:'forged'},{cookie:'akbs_staff='+token}),res);assert.equal(sent.p_token,token);assert.match(res.headers['Set-Cookie'],/Max-Age=0/);}finally{globalThis.fetch=previous;}
});
test('Portal sessions are isolated between customer and partner',async()=>{
 const res=response();await handler(req({service:'akbs_portal_custom',p_action:'snapshot',p_kind:'partner'},{cookie:'akbs_portal_customer='+token}),res);assert.equal(res.statusCode,401);
});
test('Receipt HTML escapes all user-controlled markup',()=>{assert.equal(escapeHtml('<img src=x onerror="bad">&\''),'&lt;img src=x onerror=&quot;bad&quot;&gt;&amp;&#39;');});
test('Upload validation detects fake MIME, extension mismatch, traversal and excessive size',()=>{
 const data=Buffer.from('89504e470d0a1a0a0000000000000000','hex').toString('base64');const file={name:'proof.png',type:'image/png',data};assert.equal(validateFile(file,100).ext,'png');
 for(const bad of [{...file,type:'application/pdf'},{...file,name:'proof.svg'},{...file,name:'../proof.png'},{...file,data:Buffer.from('<script>bad</script>').toString('base64')}])assert.throws(()=>validateFile(bad,100));assert.throws(()=>validateFile(file,10));
});
test('Edge endpoints restrict browser origins and bounded JSON',async()=>{
 assert.throws(()=>headers(new Request('https://example.invalid',{headers:{origin:'https://evil.invalid'}})));
 await assert.rejects(readJson(new Request('https://example.invalid',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({v:'long'})}),2));
});
