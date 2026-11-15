import { NextResponse } from 'next/server';
import {currentUser,sessionToken,checkOrigin,readJson,ApiError} from '@/lib/crm/server';
import {z} from 'zod';

const email=z.string().email().max(254);
const settingsSchema=z.object({
 customer_sender_name:z.string().max(150),customer_sender_email:email,customer_reply_to:email,
 customer_subject:z.string().max(250),customer_auto_reply_enabled:z.boolean(),
 admin_sender_name:z.string().max(150),admin_sender_email:email,admin_recipient_email:email,
 admin_reply_to_mode:z.enum(['customer','fixed']),admin_reply_to_email:z.union([email,z.literal('')]),
 admin_subject_pattern:z.string().max(250),admin_notification_enabled:z.boolean(),test_recipient_email:z.union([email,z.literal('')])
}).partial().strict();
const saveSchema=z.object({settings:settingsSchema,templates:z.object({customer:z.string().max(25000),admin:z.string().max(25000)}).strict()}).strict();
async function authorize(request){
 const user=await currentUser();
 if(!user)throw new ApiError('Please sign in',401);
 if(user.role!=='ADMIN'||user.must_change_password)throw new ApiError('Admin access required',403);
 if(request.method!=='GET')checkOrigin(request);
 return sessionToken();
}

async function rpc(name, body) {
  const res = await fetch(`${process.env.AKBS_SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: process.env.AKBS_SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    const msg = /unauthorized/i.test(data?.message||'')?'Unauthorized':'Unable to update email settings';
    const error = new Error(msg);
    error.status = /unauthorized/i.test(msg) ? 401 : 400;
    throw error;
  }
  return data;
}

export async function GET(request) {
  try {
    const data = await rpc('akbs_email_admin_get', { p_token: await authorize(request) });
    return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
  } catch (e) {
    return NextResponse.json({ error: e instanceof ApiError ? e.message : 'Unable to load email settings' }, { status: e instanceof z.ZodError ? 400 : e.status || 500 });
  }
}

export async function PUT(request) {
  try {
    const token = await authorize(request);
    const body = saveSchema.parse(await readJson(request));
    const data = await rpc('akbs_email_admin_save', {
      p_token: token,
      p_settings: body?.settings || {},
      p_customer_html: String(body?.templates?.customer || ''),
      p_admin_html: String(body?.templates?.admin || ''),
    });
    return NextResponse.json(data || { success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof ApiError ? e.message : 'Unable to save email settings' }, { status: e instanceof z.ZodError ? 400 : e.status || 500 });
  }
}

export async function POST(request) {
  try {
    const token = await authorize(request);
    const body = await readJson(request);
    const data = await rpc('akbs_email_admin_test', {
      p_token: token,
      p_kind: body?.kind === 'admin' ? 'admin' : 'customer',
      p_to: z.string().email().max(200).parse(body?.to),
    });
    return NextResponse.json(data || { success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof ApiError ? e.message : 'Unable to send test email' }, { status: e instanceof z.ZodError ? 400 : e.status || 500 });
  }
}

export async function DELETE(request) {
  try {
    const token = await authorize(request);
    const body = await readJson(request);
    const kind = body?.kind === 'admin' ? 'admin' : 'customer';
    const data = await rpc('akbs_email_admin_delete_template', {
      p_token: token,
      p_kind: kind,
    });
    return NextResponse.json(data || { success: true, kind });
  } catch (e) {
    return NextResponse.json({ error: e instanceof ApiError ? e.message : 'Unable to delete template' }, { status: e instanceof z.ZodError ? 400 : e.status || 500 });
  }
}
