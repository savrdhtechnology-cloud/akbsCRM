import { randomUUID } from 'node:crypto';
class SecurityError extends Error { status:number; retryAt?:string; constructor(message:string,status=400,retryAt?:string){super(message);this.status=status;this.retryAt=retryAt;} }
const STAFF_COOKIE='akbs_staff';
const portalCookie=(kind:string)=>`akbs_portal_${kind}`;
async function syncWorkforceLead(row:any){
 const url=(process.env.AKBS_WORKFORCE_SYNC_URL||'').trim();
 const token=(process.env.AKBS_WORKFORCE_SYNC_TOKEN||'').trim();
 if(!url||!token||!row?.id)return {ok:false,skipped:true};
 const details=row.details||row.formData||{};
 const portal=details.portal_form||details.formData||{};
 const d={...details,...portal};
 const payload={
  lead_id:String(row.id),
  application_reference:String(row.reference||row.appId||''),
  name:String(row.name||d.fullName||'').trim(),
  email:String(row.email||d.email||'').trim(),
  phone:String(row.phone||row.mobileNumber||d.mobileNumber||'').trim(),
  company:'AKBS Poultry Farming Private Limited',
  city:String(d.villageOrCity||d.village||d.city||row.location||'').trim(),
  state:String(d.state||'').trim(),
  location:String(row.location||'').trim(),
  source:String(row.source||(row.appId?'CUSTOMER_PORTAL':'AKBS CRM')),
  notes:String(row.message||'').trim(),
  email_consent:Boolean(d.communicationConsentAccepted||d.emailConsent||false),
  whatsapp_consent:Boolean(d.communicationConsentAccepted||d.whatsappConsent||false),
  tags:['akbs-crm',String(row.source||'lead').toLowerCase()]
 };
 if(!payload.name||(!payload.email&&!payload.phone))return {ok:false,skipped:true};
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-akbs-sync-token':token},body:JSON.stringify(payload),signal:AbortSignal.timeout(12000),cache:'no-store'});
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(String(body?.error||'Workforce sync failed'));
 return body;
}

function checkOrigin(req:any){const origin=req.headers.origin;const host=req.headers.host;let value:URL;try{value=new URL(origin);}catch{throw new SecurityError('Request origin is not allowed.',403);}const production=process.env.NODE_ENV==='production';const allowed=(process.env.AKBS_ALLOWED_ORIGINS||'https://crm.akbspoultry.com').split(',').map((s:string)=>s.trim());if(!production)allowed.push('http://localhost:3000','http://127.0.0.1:3000');if(!allowed.includes(value.origin)||value.host!==host||req.headers['sec-fetch-site']==='cross-site')throw new SecurityError('Request origin is not allowed.',403);}
async function readBody(req:any,max=65536){if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new SecurityError('JSON content required.',415);let data=req.body;if(data===undefined){let n=0;const chunks:Buffer[]=[];for await(const chunk of req){const b=Buffer.from(chunk);n+=b.length;if(n>max)throw new SecurityError('Request too large.',413);chunks.push(b);}data=Buffer.concat(chunks).toString('utf8');}const raw=typeof data==='string'?data:JSON.stringify(data);if(Buffer.byteLength(raw||'')>max)throw new SecurityError('Request too large.',413);try{const parsed=typeof data==='string'?JSON.parse(data):data;if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')throw Error();return parsed;}catch{throw new SecurityError('Invalid JSON.');}}
function cookie(req:any,name:string){const value=String(req.headers.cookie||'').split(';').map((s:string)=>s.trim()).find((s:string)=>s.startsWith(name+'='))?.slice(name.length+1)||'';return /^[a-f0-9]{64}$/.test(value)?value:'';}
function setCookie(res:any,name:string,token:string,maxAge=1800){res.setHeader('Set-Cookie',`${name}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.NODE_ENV==='production'?'; Secure':''}`);}
function send(res:any,status:number,data:any){res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(data));}
async function upstream(fn:string,body:any,edge=false){const url=process.env.AKBS_SUPABASE_URL||process.env.VITE_SUPABASE_URL||'https://ldffgetuzoeupuhoaubn.supabase.co';const key=process.env.AKBS_SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_PUBLISHABLE_KEY||process.env.VITE_SUPABASE_ANON_KEY||'sb_publishable_KzdI4K0qLXgi3MhA5GXPhg_6f5vB8By';const response=await fetch(`${url}/${edge?'functions/v1':'rest/v1/rpc'}/${fn}`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json','x-request-id':randomUUID()},body:JSON.stringify(body),signal:AbortSignal.timeout(25000),cache:'no-store'});const out=await response.json().catch(()=>({error:'Unable to process request.'}));if(!response.ok){const msg=String(out.message||out.error||'');if(/unauthorized|session.*expired|sign in/i.test(msg))throw new SecurityError('Your session has expired. Please sign in.',401);if(/access|forbidden|permission/i.test(msg))throw new SecurityError('You do not have permission for this action.',403);if(edge&&typeof out.error==='string')throw new SecurityError(out.error.slice(0,200),[400,404,409,422,429,502,503].includes(response.status)?response.status:400,out.retryAt);throw new SecurityError('Unable to process this request. Check your input and try again.',response.status===429?429:400);}if(out?.error)throw new SecurityError(String(out.error).slice(0,200),Number(out.status)||400,out.retryAt);return out;}
const staffServices=new Set(['akbs_crm_workspace','akbs_soft_quotation_workspace','akbs_fee_staff','akbs_fee_events_staff','akbs_fee_transactions_staff','akbs_payment_accounts_staff','akbs_send_approved_soft_quotation_email','akbs-admin-payment-qr-upload','akbs-fee-reminder-email','akbs_crm_partner_access','akbs_crm_partner_remove','akbs_incomplete_applications','akbs-staff-payment-receipt','akbs-payment-proof-view']);
const portalServices=new Set(['akbs_portal_otp_send','akbs_portal_otp_verify','akbs_portal_custom','akbs_portal_draft_save','akbs_portal_draft_load','akbs_portal_draft_delete','akbs_portal_timeline','akbs-customer-payment-proof','akbs-customer-payment-receipt']);
export default async function handler(req:any,res:any){const requestId=randomUUID();res.setHeader('X-Request-ID',requestId);try{if(req.method!=='POST')throw new SecurityError('Method not allowed.',405);checkOrigin(req);const body=await readBody(req,4200000);const {service,...data}=body;if(typeof service!=='string'||(!staffServices.has(service)&&!portalServices.has(service)&&service!=='akbs_fee_public_config'))throw new SecurityError('Unsupported operation.');delete data.p_token;delete data.p_session_token;delete data.token;delete data.sessionToken;delete data.staffToken;let cookieName='';const edge=service.includes('-');if(staffServices.has(service)){cookieName=STAFF_COOKIE;const token=cookie(req,cookieName);const publicAction=service==='akbs_crm_workspace'&&data.p_action==='login';if(!token&&!publicAction)throw new SecurityError('Please sign in.',401);if(['akbs-staff-payment-receipt','akbs-payment-proof-view'].includes(service))data.staffToken=token;else if(edge)data.token=token;else data.p_token=token;}else if(portalServices.has(service)){const kind=edge?'customer':data.p_kind;if(!['customer','partner'].includes(kind))throw new SecurityError('Invalid portal.');cookieName=portalCookie(kind);const token=cookie(req,cookieName);if(!token&&!['akbs_portal_otp_send','akbs_portal_otp_verify'].includes(service))throw new SecurityError('Please verify your email OTP.',401);if(edge)data.sessionToken=token;else if(!service.includes('_otp_'))data.p_session_token=token;}const out=await upstream(service==='akbs-staff-payment-receipt'?'akbs-customer-payment-receipt':service,data,edge);
if(service==='akbs_crm_workspace'&&data.p_action==='lead_create'&&out?.lead){
  try{await syncWorkforceLead(out.lead);}catch(e){console.error('AKBS workforce lead-create sync failed',e instanceof Error?e.message:'unknown');}
}
if(service==='akbs_crm_workspace'&&data.p_action==='snapshot'&&data.p_data?.workforce_sync===true&&Array.isArray(out?.leads)){
  const results=await Promise.allSettled(out.leads.map((lead:any)=>syncWorkforceLead(lead)));
  out.workforce_sync={attempted:out.leads.length,failed:results.filter((x:any)=>x.status==='rejected').length};
}
if(service==='akbs_portal_custom'&&data.p_action==='submit'&&out?.submittedId&&Array.isArray(out?.applications)){
  const submitted=out.applications.find((x:any)=>String(x.appId||x.reference||x.id||'')===String(out.submittedId));
  if(submitted){try{await syncWorkforceLead(submitted);}catch(e){console.error('AKBS workforce customer-submit sync failed',e instanceof Error?e.message:'unknown');}}
}
const nextToken=out.token||out.sessionToken;if(nextToken){if(!/^[a-f0-9]{64}$/.test(nextToken))throw new SecurityError('Invalid session response.',502);setCookie(res,cookieName,nextToken);delete out.token;delete out.sessionToken;out.authenticated=true;}delete out.temporary_credential;delete out.password;delete out.password_hash;if(data.p_action==='logout')setCookie(res,cookieName,'',0);send(res,200,out);}catch(e){const err=e instanceof SecurityError?e:new SecurityError('Unable to process this request.',500);send(res,err.status,{error:err.message,status:err.status,requestId,...(err.retryAt?{retryAt:err.retryAt}:{})});}}
export const config={api:{bodyParser:{sizeLimit:'4mb'}}};
