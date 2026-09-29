import { randomUUID } from 'node:crypto';
export class SecurityError extends Error { constructor(message:string, public status=400){ super(message); } }
export const STAFF_COOKIE='akbs_staff';
export const portalCookie=(kind:string)=>`akbs_portal_${kind}`;
export function checkOrigin(req:any){
 const origin=req.headers.origin; const host=req.headers.host;
 let value:URL;try{value=new URL(origin);}catch{throw new SecurityError('Request origin is not allowed.',403);}
 const production=process.env.NODE_ENV==='production';
 const allowed=(process.env.AKBS_ALLOWED_ORIGINS||'https://crm.akbspoultry.com').split(',').map(s=>s.trim());
 if(!production)allowed.push('http://localhost:3000','http://127.0.0.1:3000');
 if(!allowed.includes(value.origin)||value.host!==host||req.headers['sec-fetch-site']==='cross-site')throw new SecurityError('Request origin is not allowed.',403);
}
export async function readBody(req:any,max=65536){
 if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new SecurityError('JSON content required.',415);
 let data=req.body;
 if(data===undefined){let n=0;const chunks:Buffer[]=[];for await(const chunk of req){const b=Buffer.from(chunk);n+=b.length;if(n>max)throw new SecurityError('Request too large.',413);chunks.push(b);}data=Buffer.concat(chunks).toString('utf8');}
 const raw=typeof data==='string'?data:JSON.stringify(data);
 if(Buffer.byteLength(raw||'')>max)throw new SecurityError('Request too large.',413);
 try{const parsed=typeof data==='string'?JSON.parse(data):data;if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')throw Error();return parsed;}catch{throw new SecurityError('Invalid JSON.');}
}
export function cookie(req:any,name:string){const value=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1)||'';return /^[a-f0-9]{64}$/.test(value)?value:'';}
export function setCookie(res:any,name:string,token:string,maxAge=1800){res.setHeader('Set-Cookie',`${name}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.NODE_ENV==='production'?'; Secure':''}`);}
export function send(res:any,status:number,data:any){res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(data));}
export async function upstream(fn:string,body:any,edge=false){
 const url=process.env.AKBS_SUPABASE_URL||process.env.VITE_SUPABASE_URL||'https://ldffgetuzoeupuhoaubn.supabase.co';
 const key=process.env.AKBS_SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_ANON_KEY||'sb_publishable_KzdI4K0qLXgi3MhA5GXPhg_6f5vB8By';
 const response=await fetch(`${url}/${edge?'functions/v1':'rest/v1/rpc'}/${fn}`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json','x-request-id':randomUUID()},body:JSON.stringify(body),signal:AbortSignal.timeout(25000),cache:'no-store'});
 const out=await response.json().catch(()=>({error:'Unable to process request.'}));
 if(!response.ok){const msg=String(out.message||out.error||'');if(/unauthorized|session.*expired|sign in/i.test(msg))throw new SecurityError('Your session has expired. Please sign in.',401);if(/access|forbidden|permission/i.test(msg))throw new SecurityError('You do not have permission for this action.',403);throw new SecurityError('Unable to process this request. Check your input and try again.',response.status===429?429:400);}
 if(out?.error)throw new SecurityError(String(out.error).slice(0,200),Number(out.status)||400);
 return out;
}
export async function staff(req:any){const token=cookie(req,STAFF_COOKIE);if(!token)throw new SecurityError('Please sign in.',401);const data=await upstream('akbs_crm_workspace',{p_action:'me',p_data:{},p_token:token});if(!data.user||data.user.must_change_password)throw new SecurityError('Complete your password change first.',403);return {token,user:data.user};}
