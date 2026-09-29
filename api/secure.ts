import { randomUUID } from 'node:crypto';
import { checkOrigin, cookie, portalCookie, readBody, SecurityError, send, setCookie, STAFF_COOKIE, upstream } from '../server/security';
const staffServices=new Set(['akbs_crm_workspace','akbs_soft_quotation_workspace','akbs_fee_staff','akbs_fee_events_staff','akbs_fee_transactions_staff','akbs_payment_accounts_staff','akbs_send_approved_soft_quotation_email','akbs-admin-payment-qr-upload','akbs_send_fee_reminder_email','akbs_crm_partner_access','akbs-staff-payment-receipt','akbs-payment-proof-view']);
const portalServices=new Set(['akbs_portal_otp_send','akbs_portal_otp_verify','akbs_portal_custom','akbs_portal_draft_save','akbs_portal_draft_load','akbs_portal_draft_delete','akbs_portal_timeline','akbs-customer-payment-proof','akbs-customer-payment-receipt']);
export default async function handler(req:any,res:any){
 const requestId=randomUUID();res.setHeader('X-Request-ID',requestId);
 try{
  if(req.method!=='POST')throw new SecurityError('Method not allowed.',405);
  checkOrigin(req);const body=await readBody(req,4200000);
  const {service, ...data}=body;
  if(typeof service!=='string'||(!staffServices.has(service)&&!portalServices.has(service)&&service!=='akbs_fee_public_config'))throw new SecurityError('Unsupported operation.');
  // Browser-provided credentials are never trusted; the server supplies session cookies.
  delete data.p_token;delete data.p_session_token;delete data.token;delete data.sessionToken;delete data.staffToken;
  let cookieName='';const edge=service.includes('-');
  if(staffServices.has(service)){
   cookieName=STAFF_COOKIE;const token=cookie(req,cookieName);
   const publicAction=service==='akbs_crm_workspace'&&data.p_action==='login';
   if(!token&&!publicAction)throw new SecurityError('Please sign in.',401);
   if(['akbs-staff-payment-receipt','akbs-payment-proof-view'].includes(service))data.staffToken=token;else if(edge)data.token=token;else data.p_token=token;
  }else if(portalServices.has(service)){
   const kind=edge?'customer':data.p_kind;
   if(!['customer','partner'].includes(kind))throw new SecurityError('Invalid portal.');
   cookieName=portalCookie(kind);const token=cookie(req,cookieName);
   if(!token&&!['akbs_portal_otp_send','akbs_portal_otp_verify'].includes(service))throw new SecurityError('Please verify your email OTP.',401);
   if(edge)data.sessionToken=token;else if(!service.includes('_otp_'))data.p_session_token=token;
  }
  const out=await upstream(service==='akbs-staff-payment-receipt'?'akbs-customer-payment-receipt':service,data,edge);
  const nextToken=out.token||out.sessionToken;
  if(nextToken){if(!/^[a-f0-9]{64}$/.test(nextToken))throw new SecurityError('Invalid session response.',502);setCookie(res,cookieName,nextToken);delete out.token;delete out.sessionToken;out.authenticated=true;}
  delete out.temporary_credential;delete out.password;delete out.password_hash;
  if(data.p_action==='logout')setCookie(res,cookieName,'',0);
  send(res,200,out);
 }catch(e){const err=e instanceof SecurityError?e:new SecurityError('Unable to process this request.',500);send(res,err.status,{error:err.message,status:err.status,requestId});}
}
export const config={api:{bodyParser:{sizeLimit:'4mb'}}};
