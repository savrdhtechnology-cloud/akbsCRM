import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {headers,readJson} from '../_shared/security.ts';
import {emailEscape as esc,sendCollectionEmail,collectionEmailConfig} from '../_shared/collectionEmail.ts';

Deno.serve(async(req:Request)=>{
 let cors:Record<string,string>;try{cors=headers(req);}catch{return new Response('Forbidden',{status:403});}
 const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:cors});
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 let claim:any;let sb:any;
 try{
  const body=await readJson(req,32768);
  const token=String(body.token||'');if(!token)return json({error:'Please sign in'},401);
  sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  if(body.action==='status'){
   const out=await sb.rpc('akbs_collection_reminder_state',{p_token:token,p_targets:body.targets});
   if(out.error)return json({error:'Unable to load reminder status.'},400);
   return json(out.data,out.data?.status||200);
  }
  // A send request has exactly one scalar target. Recipient lists and bulk flags are rejected.
  if(Object.keys(body).some(key=>!['token','purpose','leadId','draftKind','draftEmail','draftRequestId','requestId'].includes(key)))return json({error:'Choose exactly one customer for this reminder.'},400);
  const purpose=body.purpose===undefined?'payment':String(body.purpose);
  if(!['payment','registration'].includes(purpose))return json({error:'Invalid reminder purpose'},400);
  if(body.leadId&&typeof body.leadId!=='string')return json({error:'Choose exactly one customer.'},400);
  const config=await collectionEmailConfig(sb,Deno.env.get('AKBS_RESEND_API_KEY')||'');
  const out=await sb.rpc('akbs_collection_reminder_claim',{p_token:token,p_data:{purpose,...(body.leadId?{leadId:body.leadId}:{draftKind:body.draftKind,draftEmail:body.draftEmail,draftRequestId:body.draftRequestId})}});
  if(out.error)return json({error:'Unable to authorize this reminder.'},400);
  if(out.data?.error)return json(out.data,out.data.status||400);
  claim=out.data;
  const portal='https://crm.akbspoultry.com/customer-registration';
  const row=claim.row||{};
  const due=Number(row.payable??row.amount??0);
  const amount=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(due);
  const a=claim.paymentAccount;
  const bank=a?'<div style="background:#f3f8f5;padding:16px;border-radius:10px"><b>Official AKBS Company Payment Account</b>'+[['Account Name',a.accountHolder],['Bank',a.bankName],['Account Number',a.accountNumber],['IFSC',a.ifsc],['UPI',a.upiId]].filter(([,v])=>v).map(([label,value])=>'<div>'+esc(label)+': '+esc(value)+'</div>').join('')+'</div>':'';
  const content=purpose==='registration'
   ? '<p>Thank you for contacting AKBS Poultry Farming Pvt. Ltd. Please complete and submit your customer registration to start your application.</p><p>Your saved registration details will be available after signing in with your registered email.</p><p>कृपया अपना ग्राहक रजिस्ट्रेशन पूरा करके आवेदन जमा करें।</p>'
   : '<p>Your <b>'+esc(row.serviceType)+'</b> is pending for application <b>'+esc(claim.applicationId)+'</b>.</p><p style="font-size:28px;font-weight:bold;color:#075c3e">'+esc(amount)+'</p>'+bank+'<p>After payment, submit the UTR / transaction reference and payment proof in your Customer Portal.</p>';
  const html='<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#18382d;line-height:1.6"><div style="background:#073b29;color:white;padding:24px"><h2>AKBS Poultry Farming Pvt. Ltd.</h2><p>'+ (purpose==='registration'?'Customer Registration Reminder':'Fee Payment Reminder')+'</p></div><div style="padding:24px;border:1px solid #dce8e1"><p>Dear '+esc(claim.customerName)+',</p>'+content+'<p><a href="'+portal+'" style="display:inline-block;background:#075c3e;color:white;text-decoration:none;padding:12px 20px;border-radius:8px">'+(purpose==='registration'?'Complete Registration':'Open Customer Portal')+'</a></p><p>www.akbspoultry.com · support@akbspoultry.com</p></div></div>';
  const sent=await sendCollectionEmail(config,{to:claim.email,subject:purpose==='registration'?'AKBS Customer Registration Reminder':'AKBS Fee Payment Reminder - '+claim.applicationId,html},'akbs-reminder-'+claim.deliveryId);
  const finished=await sb.rpc('akbs_collection_reminder_finish',{p_delivery_id:claim.deliveryId,p_email_id:sent.id});
  if(finished.error)console.warn(JSON.stringify({event:'REMINDER_FINISH_PENDING',emailId:sent.id}));
  return json({ok:true,email:claim.email,emailId:sent.id,applicationId:claim.applicationId||null,amount:purpose==='payment'?due:null,purpose,retryAt:finished.data?.retryAt||new Date(Date.now()+3600000).toISOString(),lastSentAt:finished.data?.lastSentAt||new Date().toISOString()});
 }catch(error:any){
  let retryAt:string|undefined;
  if(claim?.deliveryId&&sb){
   const finished=await sb.rpc('akbs_collection_reminder_finish',{p_delivery_id:claim.deliveryId,p_permanent_failure:Boolean(error.permanent)}).catch(()=>({}));
   retryAt=finished.data?.retryAt;
  }
  console.warn(JSON.stringify({event:'COLLECTION_REMINDER_FAILED',message:error instanceof Error?error.message:'Unknown error'}));
  return json({error:'Unable to send this reminder. Please check AKBS email settings and try again.',...(retryAt?{retryAt}:{})},502);
 }
});
