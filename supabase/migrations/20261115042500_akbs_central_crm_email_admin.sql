-- AKBS only: central CRM staff-session authorization for existing website email settings.
CREATE OR REPLACE FUNCTION public.akbs_crm_email_admin_delete_template(p_token text, p_kind text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (select 1 from akbs_crm.crm2_sessions s join akbs_crm.users u on u.id=s.user_id where p_token ~ '^[0-9a-f]{64}$' and s.token_hash=pg_catalog.encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') and s.expires_at>pg_catalog.now() and u.active and u.role='ADMIN' and not u.must_change_password) then raise exception 'Unauthorized' using errcode='42501'; end if;
  if p_kind not in ('customer','admin') then raise exception 'Invalid template kind'; end if;

  update public.akbs_email_templates set html='', updated_at=now() where name=p_kind;
  if p_kind='customer' then
    update public.akbs_email_settings set customer_auto_reply_enabled=false, updated_at=now() where id=1;
  else
    update public.akbs_email_settings set admin_notification_enabled=false, updated_at=now() where id=1;
  end if;

  return jsonb_build_object('success',true,'kind',p_kind);
end;
$function$;
revoke all on function public.akbs_crm_email_admin_delete_template(text, text) from public;
grant execute on function public.akbs_crm_email_admin_delete_template(text, text) to anon, authenticated;
CREATE OR REPLACE FUNCTION public.akbs_crm_email_admin_get(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s jsonb;
  c text;
  a text;
begin
  if not exists (select 1 from akbs_crm.crm2_sessions s join akbs_crm.users u on u.id=s.user_id where p_token ~ '^[0-9a-f]{64}$' and s.token_hash=pg_catalog.encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') and s.expires_at>pg_catalog.now() and u.active and u.role='ADMIN' and not u.must_change_password) then raise exception 'Unauthorized' using errcode='42501'; end if;
  select to_jsonb(x) into s from public.akbs_email_settings x where id=1;
  select html into c from public.akbs_email_templates where name='customer';
  select html into a from public.akbs_email_templates where name='admin';
  return jsonb_build_object('settings',s,'templates',jsonb_build_object('customer',coalesce(c,''),'admin',coalesce(a,'')));
end;
$function$;
revoke all on function public.akbs_crm_email_admin_get(text) from public;
grant execute on function public.akbs_crm_email_admin_get(text) to anon, authenticated;
CREATE OR REPLACE FUNCTION public.akbs_crm_email_admin_save(p_token text, p_settings jsonb, p_customer_html text, p_admin_html text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  cse text := lower(trim(coalesce(p_settings->>'customer_sender_email','')));
  ase text := lower(trim(coalesce(p_settings->>'admin_sender_email','')));
  creply text := lower(trim(coalesce(p_settings->>'customer_reply_to','')));
  arecip text := lower(trim(coalesce(p_settings->>'admin_recipient_email','')));
  areply text := lower(trim(coalesce(p_settings->>'admin_reply_to_email','')));
  trecip text := lower(trim(coalesce(p_settings->>'test_recipient_email','')));
begin
  if not exists (select 1 from akbs_crm.crm2_sessions s join akbs_crm.users u on u.id=s.user_id where p_token ~ '^[0-9a-f]{64}$' and s.token_hash=pg_catalog.encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') and s.expires_at>pg_catalog.now() and u.active and u.role='ADMIN' and not u.must_change_password) then raise exception 'Unauthorized' using errcode='42501'; end if;
 if jsonb_typeof(p_settings) is distinct from 'object' or length(coalesce(p_customer_html,''))>25000 or length(coalesce(p_admin_html,''))>25000 then raise exception 'Invalid settings or template size'; end if;
  if cse !~* '^[A-Z0-9._%+-]+@akbspoultry[.]com$' or ase !~* '^[A-Z0-9._%+-]+@akbspoultry[.]com$' then raise exception 'Sender email must use @akbspoultry.com'; end if;
  if creply !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$' or arecip !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$' or areply !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$' or trecip !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$' then raise exception 'One or more email addresses are invalid'; end if;
  if coalesce(p_settings->>'admin_reply_to_mode','') not in ('customer','fixed') then raise exception 'Invalid reply-to mode'; end if;
  if trim(coalesce(p_customer_html,'')) <> '' and position('<html' in lower(coalesce(p_customer_html,'')))=0 then raise exception 'Customer template must be a complete HTML document'; end if;
  if trim(coalesce(p_admin_html,'')) <> '' and position('<html' in lower(coalesce(p_admin_html,'')))=0 then raise exception 'Admin template must be a complete HTML document'; end if;

  update public.akbs_email_settings set
    customer_sender_name=left(coalesce(p_settings->>'customer_sender_name','AKBS Poultry Farming'),120),
    customer_sender_email=left(cse,200), customer_reply_to=left(creply,200),
    customer_subject=left(coalesce(p_settings->>'customer_subject','We received your inquiry - AKBS Poultry Farming'),250),
    customer_auto_reply_enabled=coalesce((p_settings->>'customer_auto_reply_enabled')::boolean,true) and trim(coalesce(p_customer_html,'')) <> '',
    admin_sender_name=left(coalesce(p_settings->>'admin_sender_name','AKBS Website Inquiry'),120),
    admin_sender_email=left(ase,200), admin_recipient_email=left(arecip,200),
    admin_reply_to_mode=p_settings->>'admin_reply_to_mode', admin_reply_to_email=left(areply,200),
    admin_subject_pattern=left(coalesce(p_settings->>'admin_subject_pattern','New AKBS Website Inquiry - {{name}}'),250),
    admin_notification_enabled=coalesce((p_settings->>'admin_notification_enabled')::boolean,true) and trim(coalesce(p_admin_html,'')) <> '',
    test_recipient_email=left(trecip,200), updated_at=now()
  where id=1;
  update public.akbs_email_templates set html=coalesce(p_customer_html,''),updated_at=now() where name='customer';
  update public.akbs_email_templates set html=coalesce(p_admin_html,''),updated_at=now() where name='admin';
  return jsonb_build_object('success',true);
end;
$function$;
revoke all on function public.akbs_crm_email_admin_save(text, jsonb, text, text) from public;
grant execute on function public.akbs_crm_email_admin_save(text, jsonb, text, text) to anon, authenticated;
CREATE OR REPLACE FUNCTION public.akbs_crm_email_admin_test(p_token text, p_kind text, p_to text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  resend_key text;
  cfg public.akbs_email_settings%rowtype;
  html_body text;
  req bigint;
  subject_line text;
  from_line text;
  reply_line text;
  dest text := lower(trim(coalesce(p_to,'')));
begin
  if not exists (select 1 from akbs_crm.crm2_sessions s join akbs_crm.users u on u.id=s.user_id where p_token ~ '^[0-9a-f]{64}$' and s.token_hash=pg_catalog.encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') and s.expires_at>pg_catalog.now() and u.active and u.role='ADMIN' and not u.must_change_password) then raise exception 'Unauthorized' using errcode='42501'; end if;
  if p_kind not in ('customer','admin') then raise exception 'Invalid template kind'; end if;
  if dest !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$' then raise exception 'Invalid test recipient'; end if;
  select * into cfg from public.akbs_email_settings where id=1;
  select decrypted_secret into resend_key from vault.decrypted_secrets where name='akbs_resend_api_key' order by created_at desc limit 1;
  if coalesce(resend_key,'')='' then raise exception 'Email service is not configured'; end if;
  select html into html_body from public.akbs_email_templates where name=p_kind;
  if trim(coalesce(html_body,''))='' then raise exception 'Template is deleted or empty. Add HTML and save it first.'; end if;
  html_body := replace(html_body,'{{name}}','Rohit Sharma');
  html_body := replace(html_body,'{{email}}',dest);
  html_body := replace(html_body,'{{phone}}','9876543210');
  html_body := replace(html_body,'{{message}}','This is a test email from AKBS Admin Email & Template Settings.');
  html_body := replace(html_body,'{{company_phone}}','+91 9893345906');
  html_body := replace(html_body,'{{company_email}}','info@akbspoultry.com');
  html_body := replace(html_body,'{{website_url}}','https://www.akbspoultry.com');
  html_body := replace(html_body,'{{source}}','Admin Test');
  html_body := replace(html_body,'{{datetime}}',to_char(now() at time zone 'Asia/Kolkata','DD Mon YYYY, HH12:MI AM'));
  html_body := replace(html_body,'{{crm_url}}','https://crm.akbspoultry.com/');
  if p_kind='customer' then subject_line := '[TEST] '||cfg.customer_subject; from_line := cfg.customer_sender_name||' <'||cfg.customer_sender_email||'>'; reply_line := cfg.customer_reply_to;
  else subject_line := '[TEST] '||replace(cfg.admin_subject_pattern,'{{name}}','Rohit Sharma'); from_line := cfg.admin_sender_name||' <'||cfg.admin_sender_email||'>'; reply_line := cfg.admin_reply_to_email; end if;
  select net.http_post(url:='https://api.resend.com/emails',headers:=jsonb_build_object('Authorization','Bearer '||resend_key,'Content-Type','application/json'),body:=jsonb_build_object('from',from_line,'to',jsonb_build_array(dest),'subject',subject_line,'html',html_body,'text','AKBS email template test','reply_to',reply_line)) into req;
  return jsonb_build_object('success',true,'request_id',req);
end;
$function$;
revoke all on function public.akbs_crm_email_admin_test(text, text, text) from public;
grant execute on function public.akbs_crm_email_admin_test(text, text, text) to anon, authenticated;
