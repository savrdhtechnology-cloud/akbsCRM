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

const allowedMime=new Set(["image/png","image/jpeg","image/webp","application/pdf"]);
const allowedExt=new Set(["png","jpg","jpeg","webp","pdf"]);

function base64ToBytes(data:string){
  const clean=data.includes(",")?data.split(",").pop()!:data;
  const bin=atob(clean);
  return Uint8Array.from(bin,c=>c.charCodeAt(0));
}

function fileExt(name:string){
  const parts=String(name||"").toLowerCase().split(".");
  return parts.length>1?parts.pop()!:"";
}

function matchesSignature(bytes:Uint8Array,mime:string){
  if(mime==="image/png"){
    return bytes.length>=8 &&
      bytes[0]===0x89 && bytes[1]===0x50 && bytes[2]===0x4e && bytes[3]===0x47 &&
      bytes[4]===0x0d && bytes[5]===0x0a && bytes[6]===0x1a && bytes[7]===0x0a;
  }
  if(mime==="image/jpeg"){
    return bytes.length>=3 && bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff;
  }
  if(mime==="image/webp"){
    return bytes.length>=12 &&
      String.fromCharCode(...bytes.slice(0,4))==="RIFF" &&
      String.fromCharCode(...bytes.slice(8,12))==="WEBP";
  }
  if(mime==="application/pdf"){
    return bytes.length>=5 && String.fromCharCode(...bytes.slice(0,5))==="%PDF-";
  }
  return false;
}

async function sha256Hex(bytes:Uint8Array){
  const hash=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return json({code:"METHOD_NOT_ALLOWED",message:"Method not allowed."},405);

  const correlationId=crypto.randomUUID();
  const endpoint="akbs-customer-payment-proof";

  try{
    const body=await req.json().catch(()=>({}));
    const sessionToken=String(body?.sessionToken||"").trim();
    const applicationHint=String(body?.applicationId||"").trim();
    const reference=String(body?.reference||"").trim();
    const file=body?.file||null;

    if(!sessionToken){
      return json({code:"SESSION_REQUIRED",message:"Please sign in again.",correlationId},401);
    }
    if(!applicationHint){
      return json({code:"APPLICATION_ID_REQUIRED",message:"Application number is required.",correlationId},400);
    }
    if(reference.length<6){
      return json({code:"INVALID_PAYMENT_REFERENCE",message:"Enter a valid UTR / transaction reference.",correlationId},400);
    }
    if(!file?.data || !file?.name || !file?.type){
      return json({code:"PAYMENT_PROOF_REQUIRED",message:"Upload payment proof before submitting.",correlationId},400);
    }

    const mime=String(file.type).toLowerCase();
    const ext=fileExt(String(file.name));

    if(!allowedMime.has(mime) || !allowedExt.has(ext)){
      return json({code:"INVALID_FILE_TYPE",message:"Upload PNG, JPG/JPEG, WEBP or PDF only.",correlationId},400);
    }

    const extMatchesMime=
      (mime==="image/png" && ext==="png") ||
      (mime==="image/jpeg" && (ext==="jpg"||ext==="jpeg")) ||
      (mime==="image/webp" && ext==="webp") ||
      (mime==="application/pdf" && ext==="pdf");

    if(!extMatchesMime){
      return json({code:"INVALID_FILE_TYPE",message:"The file extension does not match the uploaded file type.",correlationId},400);
    }

    const bytes=base64ToBytes(String(file.data));
    if(bytes.byteLength===0 || bytes.byteLength>5*1024*1024){
      return json({code:"INVALID_FILE_SIZE",message:"Payment proof must be 5 MB or smaller.",correlationId},400);
    }
    if(!matchesSignature(bytes,mime)){
      return json({code:"INVALID_FILE_SIGNATURE",message:"The uploaded payment proof is not a valid PNG, JPG/JPEG, WEBP or PDF file.",correlationId},400);
    }

    const proofSha256=await sha256Hex(bytes);
    const url=Deno.env.get("SUPABASE_URL")!;
    const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb=createClient(url,key,{auth:{persistSession:false}});

    const safeName=String(file.name).replace(/[^A-Za-z0-9._-]/g,"_").slice(-100);
    const proofPath="akbs/customer-payment-proofs/"+correlationId+"-"+safeName;

    const {error:uploadError}=await sb.storage.from("crm-payment-proofs").upload(
      proofPath,
      bytes,
      {contentType:mime,upsert:false}
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
        code==="CUSTOMER_ACCOUNT_NOT_FOUND"?403:
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
