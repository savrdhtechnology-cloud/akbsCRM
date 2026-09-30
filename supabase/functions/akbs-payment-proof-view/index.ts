import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {headers,readJson} from '../_shared/security.ts';
Deno.serve(async(req:Request)=>{
 let cors:Record<string,string>;try{cors=headers(req);}catch{return new Response('Forbidden',{status:403});}
 const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const correlationId=crypto.randomUUID();
 try{
  const body=await readJson(req,8192);
  if(!body.staffToken)return json({error:'Please sign in',correlationId},401);
  if(!body.leadId)return json({error:'Application is required',correlationId},400);
  const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  const out=await sb.rpc('akbs_fee_staff',{p_action:'snapshot',p_token:String(body.staffToken),p_data:{}});
  if(out.error)return json({error:'Staff session could not be authorized.',correlationId},401);
  if(!['ADMIN','FINANCE'].includes(out.data?.viewerRole))return json({error:'Admin/Finance access required',correlationId},403);
  let row=(out.data?.rows||[]).find((r:any)=>r.leadId===String(body.leadId)&&(!body.transactionId||r.transactionId===String(body.transactionId)));
  if(!row&&body.transactionId){
   const manual=await sb.rpc('akbs_fee_transactions_staff',{p_action:'snapshot',p_token:String(body.staffToken),p_data:{}});
   if(manual.error)return json({error:'Payment could not be authorized.',correlationId},403);
   row=(manual.data?.rows||[]).find((r:any)=>r.id===String(body.transactionId)&&r.leadId===String(body.leadId));
  }
  if(!row)return json({error:'This payment is not in your authorized collection view.',correlationId},403);
  if(!row.proofPath)return json({error:'No payment proof is available for this payment.',correlationId},404);
  const signed=await sb.storage.from('crm-payment-proofs').createSignedUrl(String(row.proofPath),300);
  if(signed.error||!signed.data?.signedUrl)return json({error:'Payment proof could not be opened.',correlationId},500);
  return json({ok:true,applicationId:row.applicationId,transactionId:row.transactionId||row.id,paymentReference:row.reference||row.transactionRef,contentType:String(row.proofPath).toLowerCase().endsWith('.pdf')?'application/pdf':'image/*',signedUrl:signed.data.signedUrl,expiresIn:300,correlationId});
 }catch{console.warn(JSON.stringify({event:'PAYMENT_PROOF_VIEW_FAILED',correlationId}));return json({error:'Payment proof could not be opened.',correlationId},500);}
});
