import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {headers,readJson} from '../_shared/security.ts';
import {emailEscape as esc,sendCollectionEmail} from '../_shared/collectionEmail.ts';

Deno.serve(async(req:Request)=>{
 let cors:Record<string,string>;try{cors=headers(req);}catch{return new Response('Forbidden',{status:403});}
 const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:cors});
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const body=await readJson(req,8192);
  const token=String(body.token||'');if(!token)return json({error:'Please sign in'},401);
  const purpose=body.purpose===undefined?'payment':String(body.purpose);
  if(!['payment','registration'].includes(purpose))return json({error:'Invalid reminder purpose'},400);
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  let context:any;
  if(body.leadId){
   const out=await sb.rpc('akbs_collection_email_context',{p_token:token,p_lead_id:String(body.leadId),p_purpose:purpose});
   if(out.error)return json({error:'Unable to authorize this reminder.'},400);
   context=out.data;
   if(context?.error)return json({error:context.error},context.status||400);
  }else{
   if(purpose!=='registration'||body.draftKind!=='customer')return json({error:'Application is required'},400);
   const out=await sb.rpc('akbs_incomplete_applications',{p_token:token,p_kind:'customer',p_action:'get',p_data:{email:body.draftEmail,requestId:body.draftRequestId}});
   if(out.error)return json({error:'Unable to load this saved application.'},400);
   if(out.data?.error)return json({error:out.data.error},out.data.status||400);
   if(out.data?.completed)return json({error:'This application is already submitted. Use its payment actions.'},409);
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
   const hash=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
   const session=await sb.schema('akbs_crm').from('crm2_sessions').select('user_id').eq('token_hash',hash).gt('expires_at',new Date().toISOString()).maybeSingle();
   context={email:out.data?.email,customerName:out.data?.form?.fullName||'Customer',actorId:session.data?.user_id,actorName:'AKBS Administrator',draftId:out.data?.requestId};
  }
  if(!context?.email||!context?.actorId)return json({error:'The registered customer email or staff session is unavailable.'},400);
  let secret=Deno.env.get('AKBS_RESEND_API_KEY')||'';
  if(!secret){const out=await sb.schema('akbs_crm').from('integration_secrets').select('secret_value').eq('key_name','AKBS_RESEND_API_KEY').maybeSingle();secret=out.data?.secret_value||'';}
  if(!secret)return json({error:'AKBS email service is not configured.'},503);
  const portal='https://crm.akbspoultry.com/customer-registration';
  const row=context.row||{};
  const due=Number(row.payable??row.amount??0);
  const amount=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(due);
  const a=context.paymentAccount;
  const bank=a?'<div style="background:#f3f8f5;padding:16px;border-radius:10px"><b>Official AKBS Company Payment Account</b>'+[['Account Name',a.accountHolder],['Bank',a.bankName],['Account Number',a.accountNumber],['IFSC',a.ifsc],['UPI',a.upiId]].filter(([,v])=>v).map(([label,value])=>'<div>'+esc(label)+': '+esc(value)+'</div>').join('')+'</div>':'';
  const content=purpose==='registration'
   ? '<p>Thank you for contacting AKBS Poultry Farming Pvt. Ltd. Please complete and submit your customer registration to start your application.</p><p>Your saved registration details will be available after signing in with your registered email.</p><p>कृपया अपना ग्राहक रजिस्ट्रेशन पूरा करके आवेदन जमा करें।</p>'
   : '<p>Your <b>'+esc(row.serviceType)+'</b> is pending for application <b>'+esc(context.applicationId)+'</b>.</p><p style="font-size:28px;font-weight:bold;color:#075c3e">'+esc(amount)+'</p>'+bank+'<p>After payment, submit the UTR / transaction reference and payment proof in your Customer Portal.</p>';
  const html='<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#18382d;line-height:1.6"><div style="background:#073b29;color:white;padding:24px"><h2>AKBS Poultry Farming Pvt. Ltd.</h2><p>'+ (purpose==='registration'?'Customer Registration Reminder':'Fee Payment Reminder')+'</p></div><div style="padding:24px;border:1px solid #dce8e1"><p>Dear '+esc(context.customerName)+',</p>'+content+'<p><a href="'+portal+'" style="display:inline-block;background:#075c3e;color:white;text-decoration:none;padding:12px 20px;border-radius:8px">'+(purpose==='registration'?'Complete Registration':'Open Customer Portal')+'</a></p><p>www.akbspoultry.com · support@akbspoultry.com</p></div></div>';
  const requestId=/^[a-f0-9-]{36}$/i.test(String(body.requestId||''))?body.requestId:crypto.randomUUID();
  const sent=await sendCollectionEmail(secret,{to:context.email,subject:purpose==='registration'?'AKBS Customer Registration Reminder':'AKBS Fee Payment Reminder - '+context.applicationId,html},'akbs-'+purpose+'-'+(context.leadId||context.draftId)+'-'+requestId);
  const note='Email accepted for '+context.email+'. Email ID: '+sent.id;
  if(context.leadId){
   const audit=await sb.schema('akbs_crm').from('fee_events').insert({lead_id:context.leadId,event_type:purpose==='payment'?'REMINDER_SENT':'REGISTRATION_REMINDER_SENT',amount:purpose==='payment'?due:0,note,created_by:context.actorId});
   if(audit.error)console.warn(JSON.stringify({event:'COLLECTION_EMAIL_AUDIT_FAILED',emailId:sent.id}));
   await sb.schema('akbs_crm').from('activities').insert({lead_id:context.leadId,actor_name:context.actorName,action:purpose==='payment'?'FEE_REMINDER_EMAILED':'REGISTRATION_REMINDER_EMAILED',note,shared:false});
  }else{
   await sb.schema('akbs_crm').from('security_events').insert({actor_id:context.actorId,actor_role:'ADMIN',action:'REGISTRATION_REMINDER_EMAILED',entity:'portal_draft',entity_id:context.draftId,request_id:String(requestId),after_data:{emailId:sent.id,email:context.email}});
  }
  return json({ok:true,email:context.email,emailId:sent.id,applicationId:context.applicationId||null,amount:purpose==='payment'?due:null,purpose});
 }catch(error){console.warn(JSON.stringify({event:'COLLECTION_REMINDER_FAILED',message:error instanceof Error?error.message:'Unknown error'}));return json({error:'Unable to send this reminder. Please check AKBS email settings and try again.'},502);}
});
