import { headers, readJson, validateFile } from '../_shared/security.ts';
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const enc=new TextEncoder();
async function sha(v:string){const h=await crypto.subtle.digest("SHA-256",enc.encode(v));return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,"0")).join("");}
function bytes(data:string){const clean=data.includes(",")?data.split(",").pop()!:data;const bin=atob(clean);return Uint8Array.from(bin,c=>c.charCodeAt(0));}
Deno.serve(async(req:Request)=>{
 let cors:Record<string,string>;try{cors=headers(req);}catch{return new Response('Forbidden',{status:403});}
 const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:cors});
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try{
  const input=await readJson(req);if(Object.keys(input).some(k=>!['token','file'].includes(k)))return json({error:'Unexpected field'},400);const {token,file}=input;
  if(!token||!file?.data||!file?.type) return json({error:"Missing QR image."},400);
  const url=Deno.env.get("SUPABASE_URL")!,key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb=createClient(url,key,{auth:{persistSession:false}});
  const {data:limit,error:limitError}=await sb.rpc('akbs_security_limit',{p_scope:'qr',p_token:token});
  if(limitError||!limit?.ok)return json({error:limit?.error||'Access denied'},limit?.status||403);
  const tokenHash=await sha(String(token));
  const {data:session}=await sb.schema("akbs_crm").from("crm2_sessions").select("user_id").eq("token_hash",tokenHash).gt("expires_at",new Date().toISOString()).limit(1).maybeSingle();
  if(!session?.user_id) return json({error:"Admin access required."},403);
  const {data:user}=await sb.schema("akbs_crm").from("users").select("role,active,must_change_password").eq("id",session.user_id).maybeSingle();
  if(!user?.active||user.must_change_password||user.role!=="ADMIN") return json({error:"Admin access required."},403);
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)) return json({error:"Upload PNG, JPG or WEBP only."},400);
  const {bytes:b}=validateFile(file,3*1024*1024,false);
  if(b.byteLength>3*1024*1024) return json({error:"QR image must be 3 MB or smaller."},400);
  const ext=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
  const path=`company-payment/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const {error}=await sb.storage.from("crm-payment-assets").upload(path,b,{contentType:file.type,upsert:false});
  if(error) return json({error:"QR upload failed."},500);
  const {data:pub}=sb.storage.from("crm-payment-assets").getPublicUrl(path);
  return json({ok:true,url:pub.publicUrl,path});
 }catch(e){return json({error:"Unable to process request. Check the details and try again."},400);}
});
