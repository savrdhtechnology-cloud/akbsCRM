import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { gateway,partnerGateway,partnerPortalGateway,sessionToken,sessionResponse,checkOrigin,readJson,readBounded,rateKey,ApiError,SESSION_COOKIE } from '@/lib/crm/server';
import { customerSchema,partnerSchema,loginSchema,leadSchema,leadPatchSchema,workflowSchema,userSchema,passwordSchema,ROLES } from '@/lib/crm/domain';
import { detectDocument,safeFilename,MAX_DOCUMENT_SIZE } from '@/lib/crm/uploads';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const uuid=z.string().uuid();
async function handler(request:NextRequest,{params}:{params:Promise<{path?:string[]}>}){
 const path=(await params).path||[];const route=path.join('/');const method=request.method;
 try{
  if(method!=='GET')checkOrigin(request);
  const token=await sessionToken();
  if(method==='POST'&&['login','register/customer','register/partner'].includes(route)){
   const schema=route==='login'?loginSchema:route==='register/customer'?customerSchema:partnerSchema;
   const body=schema.parse(await readJson(request));
   return sessionResponse(await gateway(route==='login'?'login':route==='register/customer'?'register_customer':'register_partner',{...body,rate_key:rateKey(request)}));
  }
  if(method==='GET'&&route==='me')return NextResponse.json(await gateway('me',{},token));
  if(method==='POST'&&route==='logout'){await gateway('logout',{},token);const res=NextResponse.json({ok:true});res.cookies.delete(SESSION_COOKIE);return res;}
  if(method==='POST'&&route==='password'){const body=z.object({password:passwordSchema,current_password:z.string().max(72).optional()}).strict().parse(await readJson(request));return sessionResponse(await gateway('password',body,token));}
  if(method==='GET'&&route==='snapshot'){const page=z.coerce.number().int().min(0).max(100000).parse(request.nextUrl.searchParams.get('page')||0);return NextResponse.json(await gateway('snapshot',{page},token),{headers:{'Cache-Control':'private, no-store'}});}
  if(method==='GET'&&route==='partner/shared')return NextResponse.json(await partnerPortalGateway('shared',{},token),{headers:{'Cache-Control':'private, no-store'}});
  if(method==='GET'&&path[0]==='partner'&&path[1]==='documents'&&path.length===3){const file=await partnerPortalGateway<{name:string;mime:string;content:string}>('document_download',{id:uuid.parse(path[2])},token);return new NextResponse(Buffer.from(file.content,'base64'),{headers:{'Content-Type':file.mime,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(safeFilename(file.name))}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'"}});}
  if(method==='POST'&&route==='leads')return NextResponse.json(await gateway('lead_create',leadSchema.parse(await readJson(request)),token),{status:201});
  if(method==='PATCH'&&path[0]==='leads'&&path.length===2)return NextResponse.json(await gateway('lead_update',{...leadPatchSchema.parse(await readJson(request)),lead_id:uuid.parse(path[1])},token));
  if(method==='POST'&&route==='notes'){const body=z.object({lead_id:uuid,note:z.string().trim().min(1).max(4000),shared:z.boolean().default(false),kind:z.enum(['NOTE','CALL']).default('NOTE')}).strict().parse(await readJson(request));return NextResponse.json(await gateway('note',body,token));}
  if(method==='POST'&&route==='workflows')return NextResponse.json(await gateway('workflow_create',workflowSchema.parse(await readJson(request)),token),{status:201});
  if(method==='PATCH'&&path[0]==='workflows'&&path.length===2){const raw=await readJson(request);const version=z.number().int().min(1).parse(raw.version);delete raw.version;return NextResponse.json(await gateway('workflow_update',{...workflowSchema.parse(raw),version,id:uuid.parse(path[1])},token));}
  if(method==='POST'&&route==='users')return NextResponse.json(await gateway('user_create',userSchema.parse(await readJson(request)),token),{status:201});
  if(method==='POST'&&route==='partners'){
   const body=z.object({name:z.string().trim().min(1).max(200),phone:z.string().trim().min(10).max(30),email:z.string().trim().email().max(200).or(z.literal('')),whatsapp:z.string().trim().max(30),business_name:z.string().trim().max(200),state:z.string().trim().min(1).max(100),district:z.string().trim().min(1).max(100),city:z.string().trim().min(1).max(100),profession:z.string().trim().min(1).max(100),experience:z.string().trim().max(300),network:z.string().trim().max(1000),expected_referrals:z.number().int().min(0).max(10000),login:z.string().trim().max(200),password:passwordSchema,status:z.enum(['PENDING','ACTIVE'])}).strict().parse(await readJson(request));
   return NextResponse.json(await partnerGateway('partner_create',body,token),{status:201});
  }
  if(method==='PATCH'&&path[0]==='partners'&&path.length===2){
   const body=z.object({name:z.string().trim().min(1).max(200),phone:z.string().trim().min(10).max(30),email:z.string().trim().email().max(200).or(z.literal('')),whatsapp:z.string().trim().max(30),business_name:z.string().trim().max(200),state:z.string().trim().min(1).max(100),district:z.string().trim().min(1).max(100),city:z.string().trim().min(1).max(100),profession:z.string().trim().min(1).max(100),experience:z.string().trim().max(300),network:z.string().trim().max(1000),expected_referrals:z.number().int().min(0).max(10000),login:z.string().trim().min(1).max(200),status:z.enum(['PENDING','ACTIVE','INACTIVE','REJECTED']),password:passwordSchema.optional()}).strict().parse(await readJson(request));
   return NextResponse.json(await partnerGateway('partner_update',{...body,id:uuid.parse(path[1])},token));
  }
  if(method==='PATCH'&&path[0]==='users'&&path.length===2){const body=z.object({active:z.boolean().optional(),role:z.enum(ROLES).optional(),password:passwordSchema.optional(),manager_id:uuid.nullable().optional()}).strict().parse(await readJson(request));return NextResponse.json(await gateway('user_update',{...body,id:uuid.parse(path[1])},token));}
  if(method==='PUT'&&route==='settings'){const body=z.object({commission_rate:z.number().min(0).max(10)}).strict().parse(await readJson(request));return NextResponse.json(await gateway('settings',body,token));}
  if(method==='PATCH'&&path[0]==='commissions'&&path.length===2){const body=z.object({status:z.enum(['PENDING','APPROVED','PAID','REJECTED']),reference:z.string().trim().max(200),version:z.number().int().min(1)}).strict().parse(await readJson(request));return NextResponse.json(await gateway('commission_update',{...body,id:uuid.parse(path[1])},token));}
  if(method==='POST'&&route==='documents'){
   await gateway('me',{},token);
   if(!request.headers.get('content-type')?.startsWith('multipart/form-data;'))throw new ApiError('File upload required',415);
   const bytes=await readBounded(request,MAX_DOCUMENT_SIZE+65536);
   const form=await new Response(bytes,{headers:{'Content-Type':request.headers.get('content-type')!}}).formData();
   const file=form.get('file');if(!(file instanceof File)||file.size<1||file.size>MAX_DOCUMENT_SIZE)throw new ApiError('Choose a PDF, JPG or PNG up to 2 MB');
   const content=Buffer.from(await file.arrayBuffer());const mime=detectDocument(content);if(!mime||mime==='image/webp'||mime!==file.type)throw new ApiError('Only valid PDF, JPG or PNG files are allowed');
   const body={lead_id:uuid.parse(form.get('lead_id')),name:safeFilename(file.name),mime,size:file.size,content:content.toString('base64'),category:z.enum(['Identity','Address','Land','Bank','ITR','GST','Business','Farm photos','Site photos','DPR','Proposal','Other']).parse(form.get('category')),shared:form.get('shared')==='true'};
   return NextResponse.json(await gateway('document_upload',body,token),{status:201});
  }
  if(method==='GET'&&path[0]==='documents'&&path.length===2){const file=await gateway<{name:string;mime:string;content:string}>('document_download',{id:uuid.parse(path[1])},token);return new NextResponse(Buffer.from(file.content,'base64'),{headers:{'Content-Type':file.mime,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(safeFilename(file.name))}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'"}});}
  return NextResponse.json({error:'Not found'},{status:404});
 }catch(e){if(e instanceof z.ZodError)return NextResponse.json({error:e.issues.map(x=>`${x.path.join('.')}: ${x.message}`).join('; ')},{status:400});if(e instanceof ApiError)return NextResponse.json({error:e.message},{status:e.status});console.error('CRM request failed',{route,error:e instanceof Error?e.name:'Unknown'});return NextResponse.json({error:'Something went wrong. Please try again.'},{status:500});}
}
export {handler as GET,handler as POST,handler as PATCH,handler as PUT};
