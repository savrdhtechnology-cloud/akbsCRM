import { headers, readJson } from '../_shared/security.ts';
// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  base64ToBytes,
  sha256Hex,
  validatePaymentProof
} from "./validation.ts";
import { validatePaymentRequestEnvelope } from "./requestValidation.ts";

Deno.serve(async(req:Request)=>{
  let cors:Record<string,string>;try{cors=headers(req);}catch{return new Response('Forbidden',{status:403});}
  const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return json({code:"METHOD_NOT_ALLOWED",message:"Method not allowed."},405);

  const correlationId=crypto.randomUUID();
  const endpoint="akbs-customer-payment-proof";

  try{
    const body=await readJson(req);
    if(Object.keys(body).some(k=>!['sessionToken','applicationId','reference','file'].includes(k)))return json({error:'Unexpected field'},400);
    const envelope=validatePaymentRequestEnvelope(body);

    if(!envelope.ok){
      return json({
        code:envelope.code,
        message:envelope.message,
        correlationId
      },envelope.status);
    }

    const {sessionToken,applicationHint,reference,file}=envelope;
    const bytes=base64ToBytes(String(file.data));
    const validation=validatePaymentProof(String(file.name),String(file.type),bytes);

    if(!validation.ok){
      return json({code:validation.code,message:validation.message,correlationId},400);
    }

    const proofSha256=await sha256Hex(bytes);
    const url=Deno.env.get("SUPABASE_URL")!;
    const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb=createClient(url,key,{auth:{persistSession:false}});

    const {data:access,error:accessError}=await sb.rpc('akbs_security_limit',{p_scope:'proof',p_token:sessionToken,p_kind:'customer'});
    if(accessError||!access?.ok)return json({error:access?.error||'Please sign in'},access?.status||401);
    const safeName=String(file.name).replace(/[^A-Za-z0-9._-]/g,"_").slice(-100);
    const proofPath="akbs/customer-payment-proofs/"+correlationId+"-"+safeName;

    const {error:uploadError}=await sb.storage.from("crm-payment-proofs").upload(
      proofPath,
      bytes,
      {contentType:validation.mime,upsert:false}
    );

    if(uploadError){
      console.error(JSON.stringify({correlationId,endpoint,event:"PROOF_UPLOAD_FAILED",applicationHint,error:uploadError.message}));
      return json({code:"PAYMENT_PROOF_UPLOAD_FAILED",message:"Payment proof could not be uploaded. Please try again.",correlationId},500);
    }

    const {data:result,error:rpcError}=await sb.rpc("akbs_customer_payment_submit",{
      p_session_token:sessionToken,
      p_application_hint:applicationHint,
      p_reference:reference,
      p_proof_path:proofPath,
      p_proof_sha256:proofSha256,
      p_correlation_id:correlationId
    });

    if(rpcError || !result?.ok){
      await sb.storage.from("crm-payment-proofs").remove([proofPath]).catch(()=>undefined);
      const code=String(result?.code||"PAYMENT_SUBMISSION_FAILED");
      const message=String(result?.message||"Payment submission could not be completed. Please try again. If the issue continues, contact AKBS Support.");
      const status=
        code==="SESSION_INVALID"?401:
        code==="APPLICATION_NOT_FOUND"?404:
        (code==="CUSTOMER_ACCOUNT_NOT_FOUND"||code==="APPLICATION_NOT_AUTHORIZED")?403:
        code.startsWith("DUPLICATE_")||code==="PAYMENT_ALREADY_SUBMITTED"?409:
        code.startsWith("INVALID_")?400:500;

      console.error(JSON.stringify({
        correlationId,endpoint,event:"PAYMENT_SUBMISSION_REJECTED",
        applicationHint,code,lookupResult:code==="APPLICATION_NOT_FOUND"?"NOT_FOUND":"REJECTED",
        databaseError:rpcError?.code||null
      }));

      return json({code,message,correlationId},status);
    }

    console.log(JSON.stringify({
      correlationId,endpoint,event:"PAYMENT_SUBMITTED",
      applicationHint,resolvedApplicationId:result.applicationId,
      transactionId:result.transactionId,lookupResult:"FOUND"
    }));

    return json({
      ok:true,
      applicationId:result.applicationId,
      transactionId:result.transactionId,
      status:"PENDING_VERIFICATION",
      amount:result.amount,
      correlationId
    });
  }catch(error){
    console.error(JSON.stringify({
      correlationId,endpoint,event:"PAYMENT_SUBMISSION_EXCEPTION",
      error:error instanceof Error?error.message:"Unexpected error"
    }));
    return json({
      code:"PAYMENT_SUBMISSION_FAILED",
      message:"Payment submission could not be completed. Please try again. If the issue continues, contact AKBS Support.",
      correlationId
    },500);
  }
});
