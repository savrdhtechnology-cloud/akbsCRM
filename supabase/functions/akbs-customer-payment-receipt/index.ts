import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {headers,readJson} from '../_shared/security.ts';
import {receiptPdf,type ReceiptData} from '../_shared/paymentReceipt.ts';
import {emailEscape as esc,pdfBase64,sendCollectionEmail,collectionEmailConfig} from '../_shared/collectionEmail.ts';

Deno.serve(async(req:Request)=>{
 let cors:Record<string,string>;try{cors=headers(req);}catch{return new Response('Forbidden',{status:403});}
 const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:cors});
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const body=await readJson(req,8192);
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  let context:any;let row:any;let staff=false;
  if(body.staffToken&&body.leadId){
   staff=true;
   const out=await sb.rpc('akbs_collection_email_context',{p_token:String(body.staffToken),p_lead_id:String(body.leadId),p_purpose:'receipt'});
   if(out.error)return json({error:'Unable to authorize this receipt.'},400);
   if(out.data?.error)return json({error:out.data.error},out.data.status||400);
   context=out.data;row=context.row;
  }else{
   const limit=await sb.rpc('akbs_security_limit',{p_scope:'receipt',p_token:body.sessionToken,p_kind:'customer'});
   if(limit.error||!limit.data?.ok)return json({error:limit.data?.error||'Please sign in'},limit.data?.status||401);
   const out=await sb.rpc('akbs_customer_payment_context',{p_session_token:String(body.sessionToken||''),p_application_id:String(body.applicationId||'')});
   if(out.error)return json({error:'Unable to load your application.'},400);
   if(out.data?.error)return json({error:out.data.error},out.data.status||400);
   context={...out.data,email:out.data.customerEmail};
   const p=out.data?.details?.portal_form?._initialPayment||{};
   const status=String(p.verificationStatus||p.status||'PENDING_VERIFICATION').toUpperCase();
   if(!Number(p.amount)||(!p.reference&&!p.proofPath)||!['PENDING_VERIFICATION','PROOF_SUBMITTED','UNDER_REVIEW','VERIFIED'].includes(status))return json({error:'Payment acknowledgement details are not available.'},409);
   row={applicationId:out.data.applicationId,customerName:out.data.customerName,phone:out.data.customerPhone,serviceType:p.feeLabel||'Initial Project Assessment & Registration Fee',payable:Number(p.amount),reference:p.reference||'Proof uploaded',transactionId:p.transactionId,paymentMethod:'UPI / Bank Transfer',verifiedAt:p.verifiedAt,submittedAt:p.submittedAt,status};
  }
  if(!context?.email)return json({error:'Customer email is missing.'},400);
  const config=await collectionEmailConfig(sb,Deno.env.get('AKBS_RESEND_API_KEY')||'');
  const verified=row.status==='VERIFIED';
  if(staff&&!verified)return json({error:'Receipt is available only after payment verification.'},409);
  const r:ReceiptData={applicationId:row.applicationId,customerName:row.customerName,phone:row.phone,serviceType:row.serviceType||'Initial Project Assessment & Registration Fee',payable:Number(row.payable??row.amount),transactionRef:row.reference||'—',transactionId:row.transactionId,paymentMethod:row.paymentMethod||'UPI / Bank Transfer',receiptDate:row.verifiedAt||row.submittedAt||row.createdAt,status:row.status};
  const bytes=receiptPdf(r,!verified);
  const amount=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(r.payable);
  const title=verified?'Payment Received and Verified':'Payment Details Received';
  const html='<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#18382d;line-height:1.6"><div style="background:#073b29;color:white;padding:24px"><h2>AKBS Poultry Farming Pvt. Ltd.</h2></div><div style="padding:24px;border:1px solid #dce8e1"><h2>'+title+'</h2><p>Dear '+esc(r.customerName)+',</p><p>Application: <b>'+esc(r.applicationId)+'</b><br>Service: '+esc(r.serviceType)+'<br>Amount: <b>'+esc(amount)+'</b><br>Transaction / UTR: '+esc(r.transactionRef)+'<br>Status: <b>'+esc(r.status.replaceAll('_',' '))+'</b></p><p>'+ (verified?'Your official payment receipt PDF is attached.':'Your payment acknowledgement PDF is attached. Company verification is pending.')+'</p><p>www.akbspoultry.com · support@akbspoultry.com</p></div></div>';
  const requestId=/^[a-f0-9-]{36}$/i.test(String(body.requestId||''))?String(body.requestId):'automatic-'+String(r.transactionId||r.applicationId)+'-'+String(row.verifiedAt||row.status);
  const sent=await sendCollectionEmail(config,{to:context.email,subject:(verified?'AKBS Payment Receipt - ':'AKBS Payment Acknowledgement - ')+r.applicationId,html,attachments:[{filename:'AKBS_'+(verified?'Payment_Receipt_':'Payment_Acknowledgement_')+r.applicationId+'.pdf',content:pdfBase64(bytes),content_type:'application/pdf'}]},'akbs-receipt-'+requestId);
  const audit=await sb.rpc('akbs_collection_receipt_audit',{p_token:String(staff?body.staffToken:body.sessionToken),p_lead_id:context.leadId,p_email_id:sent.id,p_kind:staff?'staff':'customer'});
  if(audit.error||!audit.data?.ok)console.warn(JSON.stringify({event:'RECEIPT_EMAIL_AUDIT_FAILED',emailId:sent.id}));
  return json({ok:true,applicationId:r.applicationId,email:context.email,emailId:sent.id,status:r.status});
 }catch(error){console.warn(JSON.stringify({event:'PAYMENT_RECEIPT_EMAIL_FAILED',message:error instanceof Error?error.message:'Unknown error'}));return json({error:'Unable to email the receipt. Please check AKBS email settings and try again.'},502);}
});
