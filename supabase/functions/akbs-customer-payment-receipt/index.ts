import { headers, readJson } from '../_shared/security.ts';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const enc=new TextEncoder();

async function sha256Hex(v:string){
  const h=await crypto.subtle.digest("SHA-256",enc.encode(v));
  return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

function esc(v:unknown){
  return String(v??"").replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)").replace(/[^\x20-\x7E]/g,"?");
}

function pdf(lines:string[]){
  const stream=["BT","/F1 18 Tf","54 780 Td","("+esc(lines[0])+") Tj","/F1 11 Tf",...lines.slice(1).flatMap(x=>["0 -24 Td","("+esc(x)+") Tj"]),"ET"].join("\n");
  const o=[
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    "<< /Length "+enc.encode(stream).length+" >>\nstream\n"+stream+"\nendstream",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  ];
  let p="%PDF-1.4\n"; const offs=[0];
  for(let i=0;i<o.length;i++){offs.push(enc.encode(p).length);p+=(i+1)+" 0 obj\n"+o[i]+"\nendobj\n";}
  const x=enc.encode(p).length;
  p+="xref\n0 "+(o.length+1)+"\n0000000000 65535 f \n";
  for(let i=1;i<=o.length;i++)p+=String(offs[i]).padStart(10,"0")+" 00000 n \n";
  p+="trailer\n<< /Size "+(o.length+1)+" /Root 1 0 R >>\nstartxref\n"+x+"\n%%EOF\n";
  return enc.encode(p);
}

function b64(bytes:Uint8Array){
  let s="";
  for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,Math.min(i+0x8000,bytes.length)));
  return btoa(s);
}

async function sendEmail(secret:string,to:string,subject:string,html:string,filename:string,bytes:Uint8Array){
  const res=await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{Authorization:"Bearer "+secret,"Content-Type":"application/json"},
    body:JSON.stringify({
      from:"AKBS Poultry Farming <noreply@akbspoultry.com>",
      to:[to],
      subject,
      html,
      attachments:[{filename,content:b64(bytes),content_type:"application/pdf"}]
    })
  });
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error("Receipt email could not be sent.");
  return body;
}

Deno.serve(async(req:Request)=>{
  let cors:Record<string,string>;try{cors=headers(req);}catch{return new Response('Forbidden',{status:403});}
  const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);

  try{
    const body=await readJson(req,8192);
    const url=Deno.env.get("SUPABASE_URL")!;
    const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb=createClient(url,key,{auth:{persistSession:false}});
const resendKey = Deno.env.get("AKBS_RESEND_API_KEY") || "";

if (!resendKey) {
  return json(
    { error: "AKBS email service is not configured." },
    503
  );
}

    if(body?.staffToken && body?.leadId){
      const feeRes=await fetch(url+"/rest/v1/rpc/akbs_fee_staff",{
        method:"POST",
        headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"},
        body:JSON.stringify({p_action:"snapshot",p_token:String(body.staffToken),p_data:{}})
      });
      const fee=await feeRes.json().catch(()=>({}));
      if(!feeRes.ok)return json({error:fee?.message||"Unauthorized"},feeRes.status);

      const row=Array.isArray(fee?.rows)?fee.rows.find((x:any)=>String(x?.leadId)===String(body.leadId)):null;
      if(!row)return json({error:"Lead not found."},404);
      if(String(row.status||"").toUpperCase()!=="VERIFIED")return json({error:"Receipt can be sent only after payment verification."},409);
      if(!row.email)return json({error:"Customer email is missing."},400);

      const {data:lead}=await sb.schema("akbs_crm").from("leads").select("reference,name,email,phone,created_at,details").eq("id",String(body.leadId)).maybeSingle();
      if(!lead)return json({error:"Lead not found."},404);

      const payment=lead.details?.portal_form?._initialPayment||{};
      const amount=Number(row.amount||fee?.config?.payableFee||2999);
      const amountLabel=new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(amount);
      const when=new Date(row.submittedAt||lead.created_at||Date.now()).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"});
      const ref=String(row.reference||payment.reference||"N/A");
      const receiptNo="RCP-"+String(row.applicationId||lead.reference||"").replace(/^AKBS-/,"");

      const bytes=pdf([
        "AKBS Poultry Farming Pvt. Ltd.",
        "PAYMENT RECEIPT",
        "Receipt No: "+receiptNo,
        "Application No: "+String(row.applicationId||lead.reference||"-"),
        "Customer: "+String(row.customerName||lead.name||"-"),
        "Mobile: "+String(row.phone||lead.phone||"-"),
        "Service: Initial Project Assessment & Registration Fee",
        "Amount Paid: "+amountLabel,
        "Payment Date: "+when,
        "Payment Method: UPI / Bank Transfer",
        "Transaction ID / UTR: "+ref,
        "Payment Status: VERIFIED",
        "Received By: AKBS Poultry Farming Pvt. Ltd.",
        "Payments are accepted only through official AKBS company payment channels.",
        "System-generated receipt - no physical signature required."
      ]);

      const html='<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#1f2937;line-height:1.55">'
        +'<div style="background:#073b27;color:#fff;padding:24px"><div style="font-size:24px;font-weight:800">AKBS Poultry Farming Pvt. Ltd.</div><div style="font-size:12px;margin-top:4px">Healthy Birds | Prosperous Farmers | Stronger Tomorrow</div></div>'
        +'<div style="border:1px solid #e5e7eb;border-top:0;padding:24px"><h2 style="color:#073b27">Payment Received Successfully</h2>'
        +'<p>Dear '+String(row.customerName||lead.name||"Customer").replace(/[<>]/g,"")+',</p>'
        +'<p>Your payment has been received and verified successfully.</p>'
        +'<div style="background:#f5fbf7;border:1px solid #cfe8d9;border-radius:12px;padding:16px;margin:18px 0">'
        +'<div><b>Application No.:</b> '+String(row.applicationId||lead.reference||"-")+'</div>'
        +'<div><b>Payment For:</b> Initial Project Assessment & Registration Fee</div>'
        +'<div><b>Amount Received:</b> '+amountLabel+'</div>'
        +'<div><b>Payment Date:</b> '+when+'</div>'
        +'<div><b>Transaction Reference:</b> '+ref.replace(/[<>]/g,"")+'</div>'
        +'<div><b>Status:</b> <span style="color:#087849;font-weight:700">VERIFIED</span></div></div>'
        +'<p>Please find your official payment receipt attached in PDF format.</p>'
        +'<p>Thank you for choosing AKBS Poultry Farming Pvt. Ltd.</p>'
        +'<p>Warm regards,<br><b>Team AKBS Poultry Farming Pvt. Ltd.</b></p>'
        +'<div style="margin-top:20px;border-top:1px solid #e5e7eb;padding-top:14px;font-size:12px;color:#6b7280">Support: support@akbspoultry.com | www.akbspoultry.com</div></div></div>';

      const sent=await sendEmail(
        resendKey,
        row.email,
        "Payment Receipt - "+String(row.applicationId||lead.reference||"AKBS Application"),
        html,
        "AKBS_Payment_Receipt_"+String(row.applicationId||lead.reference||receiptNo)+".pdf",
        bytes
      );

      await sb.schema("akbs_crm").from("activities").insert({
        lead_id:String(body.leadId),
        actor_name:"System",
        action:"PAYMENT_RECEIPT_EMAILED",
        note:"Verified payment receipt emailed to "+row.email,
        shared:false
      });

      return json({ok:true,applicationId:row.applicationId||lead.reference,email:row.email,emailId:sent?.id||null});
    }

    const sessionToken=body?.sessionToken;
    const applicationId=body?.applicationId;
    const {data:access,error:accessError}=await sb.rpc('akbs_security_limit',{p_scope:'receipt',p_token:sessionToken,p_kind:'customer'});
    if(accessError||!access?.ok)return json({error:access?.error||'Please sign in'},access?.status||401);
    const tokenHash=await sha256Hex(String(sessionToken||""));
    const {data:session}=await sb.schema("akbs_crm").from("portal_custom_sessions").select("email").eq("kind","customer").eq("token_hash",tokenHash).is("revoked_at",null).gt("expires_at",new Date().toISOString()).limit(1).maybeSingle();
    if(!session?.email)return json({error:"Verified customer session is required."},401);

    const {data:lead}=await sb.schema("akbs_crm").from("leads").select("reference,name,email,phone,created_at,details").eq("reference",String(applicationId)).eq("customer_id",access.userId).eq("source","CUSTOMER_PORTAL").maybeSingle();
    if(!lead)return json({error:"Application not found."},404);

    const payment=lead.details?.portal_form?._initialPayment||{};
    const amount=Number(payment.amount||0);
    if(!amount||(!payment.reference&&!payment.proofPath))return json({error:"Payment acknowledgement details are not available."},409);

    const amountLabel=new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(amount);
    const when=new Date(lead.created_at||Date.now()).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"});
    const bytes=pdf([
      "AKBS Poultry Farming Pvt. Ltd.",
      "PAYMENT ACKNOWLEDGEMENT / PROVISIONAL RECEIPT",
      "Application No: "+lead.reference,
      "Customer: "+lead.name,
      "Email: "+lead.email,
      "Mobile: "+(lead.phone||"-"),
      "Service: Initial Project Assessment & Registration Fee",
      "Amount: "+amountLabel,
      "Payment Reference / UTR: "+(payment.reference||"Proof uploaded"),
      "Application Date: "+when,
      "Payment Status: Pending company-side verification",
      "Payments are valid only through official AKBS company payment channels."
    ]);

    const html='<div style="font-family:Arial,sans-serif"><h2>AKBS Poultry Farming Pvt. Ltd.</h2><p>Dear '+String(lead.name||"Customer").replace(/[<>]/g,"")+',</p><p>Your payment details for application <b>'+lead.reference+'</b> have been received.</p><p><b>Amount:</b> '+amountLabel+'<br><b>Status:</b> Pending company-side verification</p><p>Your PDF acknowledgement is attached.</p><p style="color:#9a3412"><b>Important:</b> Payments are accepted only through official AKBS Poultry Farming Pvt. Ltd. company payment channels.</p></div>';

    const sent=await sendEmail(
      resendKey,
      lead.email,
      "AKBS Payment Acknowledgement - "+lead.reference,
      html,
      "AKBS-"+lead.reference+"-Payment-Acknowledgement.pdf",
      bytes
    );

    return json({ok:true,applicationId:lead.reference,email:lead.email,emailId:sent?.id||null});
  }catch(e){
    return json({error:"Unable to send receipt. Please check your session and try again."},500);
  }
});
