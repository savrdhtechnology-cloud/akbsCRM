// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{...cors,"Content-Type":"application/json"}
});

async function sha256Hex(value:string){
  const bytes=new TextEncoder().encode(value);
  const hash=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return json({error:"Method not allowed."},405);

  const correlationId=crypto.randomUUID();

  try{
    const body=await req.json().catch(()=>({}));
    const staffToken=String(body?.staffToken||"").trim();
    const leadId=String(body?.leadId||"").trim();

    if(!staffToken) return json({error:"Staff session is required.",correlationId},401);
    if(!leadId) return json({error:"Application is required.",correlationId},400);

    const url=Deno.env.get("SUPABASE_URL")!;
    const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb=createClient(url,key,{auth:{persistSession:false}});

    const tokenHash=await sha256Hex(staffToken);
    const {data:session,error:sessionError}=await sb
      .schema("akbs_crm")
      .from("crm2_sessions")
      .select("user_id,expires_at")
      .eq("token_hash",tokenHash)
      .maybeSingle();

    if(sessionError || !session || new Date(session.expires_at).getTime()<=Date.now()){
      return json({error:"Your staff session has expired. Please sign in again.",correlationId},401);
    }

    const {data:user,error:userError}=await sb
      .schema("akbs_crm")
      .from("users")
      .select("id,role,active,must_change_password")
      .eq("id",session.user_id)
      .maybeSingle();

    if(userError || !user || !user.active || user.must_change_password){
      return json({error:"Staff access denied.",correlationId},403);
    }

    if(!["ADMIN","FINANCE"].includes(String(user.role).toUpperCase())){
      return json({error:"Only Admin or Finance can view payment proof.",correlationId},403);
    }

    const {data:lead,error:leadError}=await sb
      .schema("akbs_crm")
      .from("leads")
      .select("id,reference,details")
      .eq("id",leadId)
      .maybeSingle();

    if(leadError || !lead){
      return json({error:"Application could not be found.",correlationId},404);
    }

    const {data:transaction,error:txError}=await sb
      .schema("akbs_crm")
      .from("fee_transactions")
      .select("id,proof_path,transaction_ref,status,created_at")
      .eq("lead_id",leadId)
      .eq("source","CUSTOMER_PORTAL")
      .eq("service_type","Initial Project Assessment & Registration Fee")
      .order("created_at",{ascending:false})
      .limit(1)
      .maybeSingle();

    if(txError){
      console.error(JSON.stringify({correlationId,event:"PAYMENT_PROOF_LOOKUP_ERROR",leadId,error:txError.message}));
      return json({error:"Payment proof could not be loaded.",correlationId},500);
    }

    const legacyPath=String(lead?.details?.portal_form?._initialPayment?.proofPath||"").trim();
    const proofPath=String(transaction?.proof_path||legacyPath||"").trim();

    if(!proofPath){
      return json({error:"No payment proof is available for this application.",correlationId},404);
    }

    const {data:signed,error:signedError}=await sb.storage
      .from("crm-payment-proofs")
      .createSignedUrl(proofPath,180);

    if(signedError || !signed?.signedUrl){
      console.error(JSON.stringify({correlationId,event:"PAYMENT_PROOF_SIGN_ERROR",leadId,error:signedError?.message||"unknown"}));
      return json({error:"Payment proof could not be opened.",correlationId},500);
    }

    await sb.schema("akbs_crm").from("security_events").insert({
      actor_id:user.id,
      actor_role:String(user.role),
      action:"PAYMENT_PROOF_VIEWED",
      entity:"lead",
      entity_id:lead.id,
      request_id:correlationId,
      after_data:{
        applicationId:lead.reference,
        transactionId:transaction?.id||null,
        status:transaction?.status||null
      }
    }).catch(()=>undefined);

    return json({
      ok:true,
      applicationId:lead.reference,
      transactionId:transaction?.id||null,
      paymentReference:transaction?.transaction_ref||null,
      signedUrl:signed.signedUrl,
      expiresIn:180,
      correlationId
    });
  }catch(error){
    console.error(JSON.stringify({
      correlationId,
      event:"PAYMENT_PROOF_VIEW_EXCEPTION",
      error:error instanceof Error?error.message:"Unexpected error"
    }));
    return json({error:"Payment proof could not be opened.",correlationId},500);
  }
});
