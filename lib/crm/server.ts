import 'server-only';
import { createHmac } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';
import type { Role, User } from './domain';
export const SESSION_COOKIE = 'akbs_crm_session';
export class ApiError extends Error { constructor(message:string, public status=400){super(message);} }
export async function gateway<T=Record<string,unknown>>(action:string,data:unknown={},token=''):Promise<T>{
 const url=process.env.AKBS_SUPABASE_URL; const key=process.env.AKBS_SUPABASE_PUBLISHABLE_KEY; const gate=process.env.AKBS_CRM_GATEWAY_KEY;
 if(!url||!key||!gate)throw new ApiError('Portal configuration is not ready. Please contact AKBS support.',503);
 const res=await fetch(`${url}/rest/v1/rpc/akbs_crm_gateway`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({p_key:gate,p_action:action,p_data:data,p_token:token}),cache:'no-store',signal:AbortSignal.timeout(20000)});
 const result=await res.json();
 if(!res.ok){if(result.code==='P0001')throw new ApiError('Please check the supplied details.',400); console.error('CRM database request failed',{action,status:res.status,code:result.code});throw new ApiError('Unable to save this request. Please try again.',502);}
 if(result.error)throw new ApiError(result.error,result.status||400);
 return result as T;
}
export async function partnerGateway<T=Record<string,unknown>>(action:string,data:unknown={},token=''):Promise<T>{
 const url=process.env.AKBS_SUPABASE_URL; const key=process.env.AKBS_SUPABASE_PUBLISHABLE_KEY; const gate=process.env.AKBS_CRM_GATEWAY_KEY;
 if(!url||!key||!gate)throw new ApiError('Portal configuration is not ready. Please contact AKBS support.',503);
 const res=await fetch(`${url}/rest/v1/rpc/akbs_crm_partner_admin`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({p_key:gate,p_action:action,p_data:data,p_token:token}),cache:'no-store',signal:AbortSignal.timeout(20000)});
 const result=await res.json();
 if(!res.ok){if(result.code==='P0001')throw new ApiError('Please check the supplied details.',400);console.error('Referral partner request failed',{action,status:res.status,code:result.code});throw new ApiError('Unable to save this partner request. Please try again.',502);}
 if(result.error)throw new ApiError(result.error,result.status||400);
 return result as T;
}
export async function partnerPortalGateway<T=Record<string,unknown>>(action:string,data:unknown={},token=''):Promise<T>{
 const url=process.env.AKBS_SUPABASE_URL; const key=process.env.AKBS_SUPABASE_PUBLISHABLE_KEY; const gate=process.env.AKBS_CRM_GATEWAY_KEY;
 if(!url||!key||!gate)throw new ApiError('Portal configuration is not ready. Please contact AKBS support.',503);
 const res=await fetch(`${url}/rest/v1/rpc/akbs_crm_partner_portal`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({p_key:gate,p_action:action,p_data:data,p_token:token}),cache:'no-store',signal:AbortSignal.timeout(20000)});
 const result=await res.json();
 if(!res.ok){if(result.code==='P0001')throw new ApiError('Please check the supplied details.',400);console.error('Partner portal request failed',{action,status:res.status,code:result.code});throw new ApiError('Unable to load shared partner data. Please try again.',502);}
 if(result.error)throw new ApiError(result.error,result.status||400);
 return result as T;
}
export async function sessionToken(){return (await cookies()).get(SESSION_COOKIE)?.value||'';}
export async function currentUser(){const token=await sessionToken();if(!token)return null;try{return (await gateway<{user:User}>('me',{},token)).user;}catch(e){if(e instanceof ApiError&&e.status===401)return null;throw e;}}
export async function requireRole(role:Role){const user=await currentUser();if(!user)redirect('/portal/login');if(user.role!==role)redirect('/'+user.role.toLowerCase());return user;}
export function checkOrigin(request:NextRequest){
 const origin=request.headers.get('origin');
 const host=request.headers.get('host');
 let source:URL;try{source=new URL(origin||'');}catch{throw new ApiError('Request origin is not allowed',403);}
 const allowed=(process.env.AKBS_ALLOWED_ORIGINS||'https://akbspoultry.com,https://www.akbspoultry.com').split(',').map(s=>s.trim());
 if(process.env.NODE_ENV!=='production')allowed.push('http://localhost:3000','http://127.0.0.1:3000');
 allowed.push('https://crm.akbspoultry.com');
 for(const v of [process.env.VERCEL_URL,process.env.VERCEL_BRANCH_URL])if(v)allowed.push(`https://${v}`);
 if(!host||source.host!==host||!allowed.includes(source.origin))throw new ApiError('Request origin is not allowed',403);
 if(request.headers.get('sec-fetch-site')==='cross-site')throw new ApiError('Request origin is not allowed',403);
}
export function rateKey(request:NextRequest){const ip=request.headers.get('x-vercel-forwarded-for')||request.headers.get('x-forwarded-for')?.split(',')[0]||'local';return createHmac('sha256',process.env.AKBS_CRM_GATEWAY_KEY||'missing').update(ip.trim()).digest('hex');}
export async function readBounded(request:NextRequest,max=65536){
 const reader=request.body?.getReader();if(!reader)throw new ApiError('Request body is required');let size=0;const chunks:Uint8Array[]=[];
 while(true){const{done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new ApiError('Request is too large',413);}chunks.push(value);}
 return Buffer.concat(chunks);
}
export async function readJson(request:NextRequest){if(!request.headers.get('content-type')?.startsWith('application/json'))throw new ApiError('JSON content required',415);try{return JSON.parse((await readBounded(request)).toString('utf8'));}catch(e){if(e instanceof ApiError)throw e;throw new ApiError('Invalid JSON');}}
export function sessionResponse(data:Record<string,unknown>){const {token,...publicData}=data;const res=NextResponse.json(publicData,{headers:{'Cache-Control':'no-store'}});if(typeof token==='string')res.cookies.set(SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:8*60*60});return res;}
