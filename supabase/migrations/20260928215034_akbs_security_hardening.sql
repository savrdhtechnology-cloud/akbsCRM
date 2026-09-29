begin;


-- Keep direct access closed; custom, narrowly authenticated RPCs remain the application API.
revoke all on all tables in schema akbs_crm from public,anon,authenticated;
revoke all on all sequences in schema akbs_crm from public,anon,authenticated;
revoke all on all functions in schema akbs_crm from public,anon,authenticated;
alter default privileges in schema akbs_crm revoke execute on functions from public,anon,authenticated;
alter table public.soft_quotation_counters enable row level security;
do $$ declare r record; begin
 for r in select c.oid::regclass t from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and (c.relname like 'soft_quotation%' or c.relname in ('akbs_inquiries','akbs_email_settings','akbs_email_templates','akbs_email_assets')) loop
  execute format('revoke all on table %s from public,anon,authenticated',r.t);
 end loop;
 for r in select p.oid::regprocedure f from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in ('akbs_admin_list','akbs_admin_update','akbs_admin_delete','akbs_send_email_test','akbs_submit_inquiry','akbs_crm2_gateway','akbs_crm_workspace_legacy','akbs_crm_workspace_staffbase') loop
  execute format('revoke all on function %s from public,anon,authenticated',r.f);
 end loop;
end $$;
create table if not exists akbs_crm.security_events(
 id uuid primary key default gen_random_uuid(),created_at timestamptz not null default now(),
 actor_id uuid, actor_role text, action text not null, entity text, entity_id text,
 request_id text, ip_hash text,user_agent text, before_data jsonb, after_data jsonb
);
alter table akbs_crm.security_events enable row level security;
revoke all on akbs_crm.security_events from public,anon,authenticated;
create or replace function akbs_crm.security_event(actor uuid,act text,entity text default null,eid text default null,before_data jsonb default null,after_data jsonb default null)
returns void language sql set search_path='' as $$
 insert into akbs_crm.security_events(actor_id,actor_role,action,entity,entity_id,request_id,ip_hash,user_agent,before_data,after_data)
 select actor,(select role from akbs_crm.users where id=actor),act,entity,eid,
 left(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-request-id',''),100),
 encode(extensions.digest(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-forwarded-for',''),'sha256'),'hex'),
 left(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'user-agent',''),300),before_data,after_data;
$$;
create or replace function akbs_crm.assert_keys(data jsonb,keys text[],max_bytes integer default 65536)
returns void language plpgsql set search_path='' as $$ begin
 if data is null or jsonb_typeof(data)<>'object' or octet_length(data::text)>max_bytes then raise exception 'Invalid or oversized input'; end if;
 if exists(select 1 from jsonb_object_keys(data) k where not(k=any(keys))) then raise exception 'Unexpected or protected field'; end if;
end $$;
create or replace function akbs_crm.validate_portal_form(f jsonb)
returns void language plpgsql set search_path='' as $$ declare k text;v jsonb;begin
 perform akbs_crm.assert_keys(f,array['fullName','mobileNumber','whatsAppNumber','email','preferredLanguage','projectObjective','poultryType','shedType','proposedCapacity','hasLand','landOwnership','landAreaAcres','state','district','villageOrCity','googleMapsLink','approxProjectCost','needsLoan','ownContribution','approxLoanAmount','discussedWithBank','experience','supportNeeded','startTimeline','declarationConfirmed','businessName','mobile','city','category','profession','message']);
 for k,v in select * from jsonb_each(f) loop
  if k='supportNeeded' then
   if jsonb_typeof(v)<>'array' or jsonb_array_length(v)>30 or exists(select 1 from jsonb_array_elements(v) x where jsonb_typeof(x)<>'string' or length(x::text)>200) then raise exception 'Invalid support selection';end if;
  elsif k='declarationConfirmed' then
   if jsonb_typeof(v)<>'boolean' then raise exception 'Invalid declaration';end if;
  elsif jsonb_typeof(v) not in ('string','number','null') or length(v::text)>5000 then raise exception 'Invalid field value';end if;
  if v::text ~* '<[[:space:]]*/?[[:space:]]*[a-z!]' then raise exception 'HTML is not permitted';end if;
 end loop;
 if coalesce(f->>'googleMapsLink','')<>'' and f->>'googleMapsLink' !~ '^https://' then raise exception 'Use an HTTPS map link';end if;
 if coalesce(f->>'landAreaAcres','')<>'' and (f->>'landAreaAcres' !~ '^[0-9]+([.][0-9]+)?$' or (f->>'landAreaAcres')::numeric>1000000) then raise exception 'Invalid land area';end if;
end $$;
create or replace function akbs_crm.validate_lead_details(d jsonb) returns void language plpgsql set search_path='' as $$ begin
 perform akbs_crm.assert_keys(d,array['projectObjective','estimatedCost','ownContribution','approxLoanAmount','discussedWithBank','budgetEstimate','whatsApp','language','shedType','landAvailable','landOwnership','landArea','loanRequired','timeline','experience','supportNeeded','state','district','village','googleMapsLink','location','poultry_type','farm_type','project_cost','capacity','loan_required','land_available','land_area','shed_type','whatsapp']);
end $$;
create or replace function akbs_crm.valid_file(b bytea,m text) returns boolean language sql immutable set search_path='' as $$
 select case m when 'application/pdf' then substring(b from 1 for 5)=decode('255044462d','hex')
 when 'image/png' then substring(b from 1 for 8)=decode('89504e470d0a1a0a','hex')
 when 'image/jpeg' then substring(b from 1 for 3)=decode('ffd8ff','hex')
 when 'image/webp' then substring(b from 1 for 4)=decode('52494646','hex') and substring(b from 9 for 4)=decode('57454250','hex') else false end
$$;


CREATE OR REPLACE FUNCTION public.akbs_portal_otp_verify(p_kind text, p_intent text, p_email text, p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'extensions'
AS $function$
declare
  v_email text := lower(btrim(p_email));
  c akbs_crm.portal_otp_challenges;
  v_hash text;
  v_token text;
begin
  if p_kind is null or p_intent is null or p_email is null or p_code is null or length(p_email)>254 or p_kind not in ('customer','partner') or p_intent not in ('login','signup') then
    raise exception 'Invalid portal request.';
  end if;
  if p_code !~ '^[0-9]{6}$' then
    raise exception 'Enter the 6-digit OTP.';
  end if;

  select * into c
  from akbs_crm.portal_otp_challenges
  where kind=p_kind and intent=p_intent and lower(email)=v_email
    and consumed_at is null and expires_at > now()
  order by created_at desc
  limit 1
  for update;

  if c.id is null then
    raise exception 'OTP expired or not found. Request a new OTP.';
  end if;
  if c.attempts >= 5 then
    return jsonb_build_object('error','Too many attempts. Request a new OTP.','status',429);
  end if;

  v_hash := encode(digest(p_code,'sha256'),'hex');
  if v_hash <> c.code_hash then
    update akbs_crm.portal_otp_challenges
    set attempts = attempts + 1
    where id=c.id;
    perform akbs_crm.security_event(null,'OTP_FAILED','portal',p_kind);
    return jsonb_build_object('error','OTP is incorrect or expired.','status',400);
  end if;

  update akbs_crm.portal_otp_challenges set consumed_at=now() where kind=p_kind and lower(email)=v_email and consumed_at is null;

  v_token := encode(gen_random_bytes(32),'hex');
  insert into akbs_crm.portal_custom_sessions(kind,email,token_hash,expires_at)
  values(p_kind,v_email,encode(digest(v_token,'sha256'),'hex'),now()+interval '30 minutes');

  return jsonb_build_object('ok',true,'sessionToken',v_token,'email',v_email,'expiresIn',1800);
end $function$
;

CREATE OR REPLACE FUNCTION public.akbs_portal_otp_send(p_kind text, p_intent text, p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'extensions'
AS $function$
declare
  v_email text := lower(btrim(p_email));
  v_code text;
  v_hash text;
  v_secret text;
  v_bytes bytea;
  v_num bigint;
begin
  if p_kind is null or p_intent is null or p_email is null or length(p_email)>254 or p_kind not in ('customer','partner') or p_intent not in ('login','signup') then
    raise exception 'Invalid portal request.';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    raise exception 'Enter a valid email address.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_email||p_kind,0));
  if not akbs_crm.rate('portal-send:'||v_email,6,3600) then return jsonb_build_object('error','Too many requests. Please try later.','status',429);end if;
  if exists (
    select 1 from akbs_crm.portal_otp_challenges
    where kind=p_kind and lower(email)=v_email
      and created_at > now() - interval '60 seconds'
  ) then
    return jsonb_build_object('error','Please wait 60 seconds before requesting another OTP.','status',429);
  end if;

  if p_intent='login' and not exists (
    select 1 from akbs_crm.portal_custom_accounts
    where kind=p_kind and lower(email)=v_email
  ) then
    return jsonb_build_object('ok',true,'expiresIn',600);
  end if;

  v_bytes := gen_random_bytes(4);
  v_num := (
    (get_byte(v_bytes,0)::bigint << 24) +
    (get_byte(v_bytes,1)::bigint << 16) +
    (get_byte(v_bytes,2)::bigint << 8) +
    get_byte(v_bytes,3)::bigint
  ) % 1000000;
  v_code := lpad(v_num::text, 6, '0');
  v_hash := encode(digest(v_code, 'sha256'), 'hex');

  update akbs_crm.portal_otp_challenges set consumed_at=now() where kind=p_kind and lower(email)=v_email and consumed_at is null;
  insert into akbs_crm.portal_otp_challenges(kind,intent,email,code_hash,expires_at)
  values(p_kind,p_intent,v_email,v_hash,now()+interval '10 minutes');

  select secret_value into v_secret
  from akbs_crm.integration_secrets
  where key_name='AKBS_RESEND_API_KEY';

  if coalesce(v_secret,'')='' then
    raise exception 'AKBS email service is not configured.';
  end if;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization','Bearer '||v_secret,
      'Content-Type','application/json'
    ),
    body := jsonb_build_object(
      'from','AKBS Poultry Farming <noreply@akbspoultry.com>',
      'to',jsonb_build_array(v_email),
      'subject',case when p_kind='partner' then 'Your AKBS Partner Portal OTP' else 'Your AKBS Customer Portal OTP' end,
      'html','<div style="font-family:Arial,sans-serif;background:#f4f7f5;padding:28px"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #dfe9e3;border-radius:18px;overflow:hidden"><div style="background:#0b3824;color:#fff;padding:22px 26px"><div style="font-size:20px;font-weight:800">AKBS Poultry Farming</div><div style="font-size:12px;color:#a7e7c5;margin-top:4px">'||
        case when p_kind='partner' then 'Partner' else 'Customer' end||
        ' Portal Verification</div></div><div style="padding:28px"><p style="color:#51635a">Use this one-time password to continue:</p><div style="font-size:34px;letter-spacing:8px;font-weight:800;color:#0b3824;margin:20px 0">'||
        v_code||
        '</div><p style="color:#687970;font-size:13px;line-height:1.6">This OTP expires in 10 minutes. Do not share it with anyone.</p></div></div></div>',
      'text','Your AKBS portal OTP is '||v_code||'. It expires in 10 minutes.'
    )
  );

  return jsonb_build_object('ok',true,'expiresIn',600);
end $function$
;

CREATE OR REPLACE FUNCTION public.akbs_portal_custom(p_action text, p_kind text, p_session_token text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'extensions'
AS $function$
declare
  v_email text;
  cu akbs_crm.users;
  lid uuid;
  f jsonb;
  consent jsonb;
  result jsonb;
  req uuid;
  mobile text;
  full_name text;
  cap integer:=0;
  digest_text text;
begin
 perform akbs_crm.assert_keys(p_data,case when p_action='submit' then array['request_id','form','consent'] when p_action='enroll' then array['name','consent'] else array[]::text[] end);
  if p_kind not in ('customer','partner') then
    raise exception 'Invalid portal.';
  end if;

  select email into v_email
  from akbs_crm.portal_custom_sessions
  where kind=p_kind
    and token_hash=encode(digest(coalesce(p_session_token,''),'sha256'),'hex')
    and revoked_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if coalesce(v_email,'')='' then
    raise exception 'Your verified portal session has expired. Please verify email OTP again.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_email||p_kind,0));

  select u.* into cu
  from akbs_crm.users u
  join akbs_crm.portal_custom_accounts a on a.crm_user_id=u.id
  where a.kind=p_kind and lower(a.email)=lower(v_email);

  if cu.id is not null and (not cu.active or cu.role<>upper(p_kind)) then
    raise exception 'Portal account unavailable. Contact AKBS support.';
  end if;

  if p_action='enroll' and cu.id is null then
    full_name:=btrim(p_data->>'name');
    if coalesce(length(full_name),0) not between 2 and 200
       or coalesce(p_data->>'consent','false')<>'true' then
      raise exception 'Enter your name and accept account registration.';
    end if;

    insert into akbs_crm.users(login,name,role,must_change_password,profile)
    values(
      'portal-custom-'||substr(md5(v_email||p_kind),1,20),
      full_name,
      upper(p_kind),
      false,
      jsonb_build_object('email',v_email,'portal',p_kind,'accountConsentAt',now(),'authMode','EMAIL_OTP')
    )
    returning * into cu;

    insert into akbs_crm.portal_custom_accounts(kind,email,crm_user_id)
    values(p_kind,v_email,cu.id);

  elsif p_action='submit' then
    if cu.id is null then
      raise exception 'Complete account registration before opening an application.';
    end if;

    f:=p_data->'form';
    perform akbs_crm.validate_portal_form(f);
    consent:=p_data->'consent';
    req:=(p_data->>'request_id')::uuid;

    if req is null or jsonb_typeof(f)<>'object' or f is null then
      raise exception 'Invalid application.';
    end if;
    if coalesce(consent->>'declarationAccepted','false')<>'true'
       or coalesce(consent->>'communicationConsentAccepted','false')<>'true' then
      raise exception 'Please accept the application declaration and contact consent.';
    end if;

    full_name:=btrim(f->>'fullName');
    mobile:=regexp_replace(coalesce(f->>'mobileNumber',f->>'mobile',''),'[^0-9]','','g');

    if coalesce(length(full_name),0) not between 2 and 200
       or length(mobile) not between 10 and 15 then
      raise exception 'Enter a valid full name and mobile number.';
    end if;


    f:=f||jsonb_build_object('email',v_email);

    if p_kind='customer' then
      if coalesce(f->>'proposedCapacity','') !~ '^[0-9,]+$' then
        raise exception 'Enter a valid bird capacity.';
      end if;
      cap:=replace(f->>'proposedCapacity',',','')::integer;
      if cap<1 or cap>10000000
         or coalesce(btrim(f->>'state'),'')=''
         or coalesce(btrim(f->>'district'),'')=''
         or coalesce(f->>'poultryType','')='' then
        raise exception 'Complete project capacity and location details.';
      end if;
    end if;

    digest_text:=md5(f::text);

    select s.lead_id into lid
    from akbs_crm.portal_custom_submissions s
    where lower(s.email)=lower(v_email)
      and s.kind=p_kind
      and (s.request_id=req or s.form_hash=digest_text or p_kind='partner')
    order by s.created_at
    limit 1;

    if lid is null then
      insert into akbs_crm.leads(
        name,phone,email,location,message,source,
        customer_id,partner_id,project_type,capacity,details
      )
      values(
        full_name,
        mobile,
        v_email,
        concat_ws(', ',nullif(coalesce(f->>'villageOrCity',f->>'city'),''),
          nullif(f->>'district',''),nullif(f->>'state','')),
        coalesce(f->>'message','Portal application'),
        upper(p_kind)||'_PORTAL',
        case when p_kind='customer' then cu.id end,
        case when p_kind='partner' then cu.id end,
        coalesce(f->>'poultryType',f->>'category',''),
        cap,
        jsonb_build_object(
          'portal_form',f,
          'consent',consent||jsonb_build_object('acceptedAt',now()),
          'authMode','EMAIL_OTP'
        )
      )
      returning id into lid;

      insert into akbs_crm.portal_custom_submissions(kind,email,request_id,lead_id,form_hash)
      values(p_kind,v_email,req,lid,digest_text);

      if p_kind='partner' then
        insert into akbs_crm.workspace_records(kind,created_by,data)
        values(
          'partner',
          cu.id,
          jsonb_build_object(
            'name',coalesce(nullif(f->>'businessName',''),full_name),
            'contactPerson',full_name,
            'phone',mobile,
            'email',v_email,
            'location',concat_ws(', ',f->>'city',f->>'state'),
            'category',f->>'category',
            'status','Pending',
            'commissionRate',0,
            'rating',0,
            'portalUserId',cu.id,
            'leadId',lid,
            'profession',f->>'profession',
            'experience',f->>'experience',
            'message',f->>'message'
          )
        );
      end if;

      perform akbs_crm.audit(
        cu.id,lid,'Portal application submitted',
        initcap(p_kind)||' application received from verified email OTP portal',true
      );
    end if;

  elsif p_action='logout' then
    update akbs_crm.portal_custom_sessions
    set revoked_at=now()
    where token_hash=encode(digest(coalesce(p_session_token,''),'sha256'),'hex')
      and kind=p_kind;
    return jsonb_build_object('ok',true);

  elsif p_action not in ('snapshot','enroll') then
    raise exception 'Unsupported portal action.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'appId',l.reference,
        'id',l.id,
        'mobileNumber',l.phone,
        'submittedAt',l.created_at,
        'status',l.stage,
        'assignedTo',(select name from akbs_crm.users where id=l.assigned_to),
        'formData',l.details->'portal_form',
        'consent',l.details->'consent'
      )
      order by l.created_at desc
    ),
    '[]'::jsonb
  )
  into result
  from akbs_crm.portal_custom_submissions s
  join akbs_crm.leads l on l.id=s.lead_id
  where lower(s.email)=lower(v_email) and s.kind=p_kind;

  return jsonb_build_object(
    'enrolled',cu.id is not null,
    'profile',jsonb_build_object('name',cu.name,'email',v_email),
    'applications',result,
    'submittedId',(select reference from akbs_crm.leads where id=lid)
  );
end $function$
;

CREATE OR REPLACE FUNCTION akbs_crm.portal_gateway(p_action text, p_kind text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 aid uuid := auth.uid(); au auth.users; cu akbs_crm.users; lid uuid; f jsonb; consent jsonb;
 result jsonb; req uuid; mobile text; full_name text; cap integer:=0; digest text;
begin
 perform akbs_crm.assert_keys(p_data,case when p_action='submit' then array['request_id','form','consent'] when p_action='enroll' then array['name','consent'] else array[]::text[] end);
 if aid is null or p_kind not in ('customer','partner') or p_kind is null then raise exception 'Sign in to the correct portal first.'; end if;
 select * into au from auth.users where id=aid and not coalesce(is_anonymous,false) and deleted_at is null;
 if au.id is null or au.banned_until>now() or (au.email_confirmed_at is null and au.phone_confirmed_at is null) then raise exception 'Please confirm your account before continuing.'; end if;
 if auth.jwt()->>'session_id' is not null and not exists(select 1 from auth.sessions where id=(auth.jwt()->>'session_id')::uuid and user_id=aid) then raise exception 'Your session has ended. Please sign in again.'; end if;
 if octet_length(p_data::text)>60000 then raise exception 'Application is too large.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(aid::text||p_kind,0));
 select u.* into cu from akbs_crm.users u join akbs_crm.portal_accounts a on a.crm_user_id=u.id where a.auth_user_id=aid and a.kind=p_kind;
 if cu.id is not null and (not cu.active or cu.role<>upper(p_kind)) then raise exception 'Portal account unavailable. Contact AKBS support.'; end if;
 if p_action='enroll' and cu.id is null then
  full_name:=btrim(p_data->>'name');
  if coalesce(length(full_name),0) not between 2 and 200 or coalesce(p_data->>'consent','false')<>'true' then raise exception 'Enter your name and accept account registration.'; end if;
  insert into akbs_crm.users(login,name,role,must_change_password,profile)
   values('portal-'||aid||'-'||p_kind,full_name,upper(p_kind),false,jsonb_build_object('email',au.email,'portal',p_kind,'accountConsentAt',now())) returning * into cu;
  insert into akbs_crm.portal_accounts(auth_user_id,kind,crm_user_id) values(aid,p_kind,cu.id);
 elsif p_action='submit' then
  if cu.id is null then raise exception 'Complete account registration before opening an application.'; end if;
  f:=p_data->'form'; perform akbs_crm.validate_portal_form(f); consent:=p_data->'consent'; req:=(p_data->>'request_id')::uuid;
  if req is null or jsonb_typeof(f)<>'object' or f is null then raise exception 'Invalid application.'; end if;
  if coalesce(consent->>'declarationAccepted','false')<>'true' or coalesce(consent->>'communicationConsentAccepted','false')<>'true' then raise exception 'Please accept the application declaration and contact consent.'; end if;
  full_name:=btrim(f->>'fullName'); mobile:=regexp_replace(coalesce(f->>'mobileNumber',f->>'mobile',''),'[^0-9]','','g');
  if coalesce(length(full_name),0) not between 2 and 200 or length(mobile) not between 10 and 15 then raise exception 'Enter a valid full name and mobile number.'; end if;
  f:=f||jsonb_build_object('email',coalesce(au.email,''));
  if p_kind='customer' then
   if coalesce(f->>'proposedCapacity','') !~ '^[0-9,]+$' then raise exception 'Enter a valid bird capacity.'; end if;
   cap:=replace(f->>'proposedCapacity',',','')::integer;
   if cap<1 or cap>10000000 or coalesce(btrim(f->>'state'),'')='' or coalesce(btrim(f->>'district'),'')='' or coalesce(f->>'poultryType','')='' then raise exception 'Complete project capacity and location details.'; end if;
  end if;
  digest:=md5(f::text);
  select s.lead_id into lid from akbs_crm.portal_submissions s where s.auth_user_id=aid and s.kind=p_kind and (s.request_id=req or s.form_hash=digest or p_kind='partner') order by s.created_at limit 1;
  if lid is null then
   insert into akbs_crm.leads(name,phone,email,location,message,source,customer_id,partner_id,project_type,capacity,details)
    values(full_name,mobile,coalesce(au.email,''),concat_ws(', ',nullif(coalesce(f->>'villageOrCity',f->>'city'),''),nullif(f->>'district',''),nullif(f->>'state','')),
      coalesce(f->>'message','Portal application'),upper(p_kind)||'_PORTAL',case when p_kind='customer' then cu.id end,case when p_kind='partner' then cu.id end,
      coalesce(f->>'poultryType',f->>'category',''),cap,
      jsonb_build_object('portal_form',f,'consent',consent||jsonb_build_object('acceptedAt',now()),'whatsApp',f->>'whatsAppNumber','shedType',f->>'shedType','budgetEstimate',f->>'approxProjectCost','landAvailable',f->>'hasLand','landOwnership',f->>'landOwnership','landArea',f->>'landAreaAcres','loanRequired',f->>'needsLoan','timeline',f->>'startTimeline','supportNeeded',f->'supportNeeded','state',f->>'state','district',f->>'district','village',f->>'villageOrCity','googleMapsLink',f->>'googleMapsLink','language',f->>'preferredLanguage','experience',f->>'experience')) returning id into lid;
   insert into akbs_crm.portal_submissions(auth_user_id,kind,request_id,lead_id,form_hash) values(aid,p_kind,req,lid,digest);
   if p_kind='partner' then
    insert into akbs_crm.workspace_records(kind,created_by,data) values('partner',cu.id,
     jsonb_build_object('name',coalesce(nullif(f->>'businessName',''),full_name),'contactPerson',full_name,'phone',mobile,'email',au.email,'location',concat_ws(', ',f->>'city',f->>'state'),'category',f->>'category','status','Pending','commissionRate',0,'rating',0,'portalUserId',cu.id,'leadId',lid,'profession',f->>'profession','experience',f->>'experience','message',f->>'message'));
   end if;
   perform akbs_crm.audit(cu.id,lid,'Portal application submitted',initcap(p_kind)||' application received from website portal',true);
  end if;
 elsif p_action not in ('snapshot','enroll') then raise exception 'Unsupported portal action.';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('appId',l.reference,'id',l.id,'mobileNumber',l.phone,'submittedAt',l.created_at,'status',l.stage,'assignedTo',(select name from akbs_crm.users where id=l.assigned_to),'formData',l.details->'portal_form','consent',l.details->'consent') order by l.created_at desc),'[]'::jsonb) into result
 from akbs_crm.portal_submissions s join akbs_crm.leads l on l.id=s.lead_id where s.auth_user_id=aid and s.kind=p_kind;
 return jsonb_build_object('enrolled',cu.id is not null,'profile',jsonb_build_object('name',cu.name,'email',au.email),'applications',result,'submittedId',(select reference from akbs_crm.leads where id=lid));
end $function$
;

CREATE OR REPLACE FUNCTION public.akbs_portal_draft_save(p_kind text, p_session_token text, p_request_id uuid, p_form jsonb, p_current_stage integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'extensions'
AS $function$
declare
  v_email text;
begin
  select email into v_email
  from akbs_crm.portal_custom_sessions
  where kind=p_kind
    and token_hash=encode(digest(coalesce(p_session_token,''),'sha256'),'hex')
    and revoked_at is null
    and expires_at > now()
  order by created_at desc limit 1;

  if coalesce(v_email,'')='' then
    raise exception 'Your verified portal session has expired.';
  end if;
  if p_request_id is null or jsonb_typeof(coalesce(p_form,'{}'::jsonb)) <> 'object' then
    raise exception 'Invalid draft.';
  end if;

  perform akbs_crm.validate_portal_form(p_form);
  if (select count(*) from akbs_crm.portal_drafts where kind=p_kind and lower(email)=lower(v_email) and request_id<>p_request_id)>=20 then raise exception 'Draft limit reached';end if;
  insert into akbs_crm.portal_drafts(kind,email,request_id,form,current_stage,updated_at)
  values(p_kind,lower(v_email),p_request_id,p_form,greatest(1,least(coalesce(p_current_stage,1),6)),now())
  on conflict(kind,email,request_id)
  do update set form=excluded.form,current_stage=excluded.current_stage,updated_at=now();

  return jsonb_build_object('ok',true,'updatedAt',now());
end $function$
;

CREATE OR REPLACE FUNCTION public.akbs_portal_timeline(p_kind text, p_session_token text, p_lead_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'extensions'
AS $function$
declare
  v_email text;
  v_lead akbs_crm.leads;
  v_assigned text;
  v_events jsonb;
begin
  if p_kind not in ('customer','partner') then
    raise exception 'Invalid portal.';
  end if;

  select email into v_email
  from akbs_crm.portal_custom_sessions
  where kind=p_kind
    and token_hash=encode(digest(coalesce(p_session_token,''),'sha256'),'hex')
    and revoked_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if coalesce(v_email,'')='' then
    raise exception 'Your verified portal session has expired.';
  end if;

  if not exists (
    select 1
    from akbs_crm.portal_custom_submissions s
    where s.kind=p_kind
      and lower(s.email)=lower(v_email)
      and s.lead_id=p_lead_id
  ) then
    raise exception 'Application not found.';
  end if;

  select * into v_lead from akbs_crm.leads where id=p_lead_id;
  if v_lead.id is null then raise exception 'Application not found.'; end if;

  select name into v_assigned from akbs_crm.users where id=v_lead.assigned_to;

  select coalesce(jsonb_agg(x order by x->>'at'),'[]'::jsonb)
  into v_events
  from (
    select jsonb_build_object(
      'type','activity',
      'action',a.action,
      'title',case a.action
        when 'APPLICATION_SUBMITTED' then 'Application submitted'
        when 'STAGE_CHANGED' then 'Application stage updated'
        when 'OWNER_CHANGED' then 'AKBS representative assigned'
        when 'AUTO_ASSIGNED' then 'Application assigned'
        when 'PROPOSAL_CREATED' then 'DPR / proposal started'
        when 'PROPOSAL_UPDATED' then 'DPR / proposal updated'
        when 'FINANCING_CREATED' then 'Loan / financing process started'
        when 'FINANCING_UPDATED' then 'Loan / financing updated'
        when 'VISIT_CREATED' then 'Site visit scheduled'
        when 'VISIT_UPDATED' then 'Site visit updated'
        when 'DOCUMENT_UPLOADED' then 'Document received'
        else initcap(replace(a.action,'_',' '))
      end,
      'detail',case when a.shared then coalesce(a.note,'') else '' end,
      'at',a.created_at,
      'actor',coalesce(a.actor_name,'AKBS Team')
    ) x
    from akbs_crm.activities a
    where a.lead_id=p_lead_id
      and (
        a.shared
        or a.action in ('APPLICATION_SUBMITTED','STAGE_CHANGED','OWNER_CHANGED','AUTO_ASSIGNED',
                        'PROPOSAL_CREATED','PROPOSAL_UPDATED','FINANCING_CREATED','FINANCING_UPDATED',
                        'VISIT_CREATED','VISIT_UPDATED','DOCUMENT_UPLOADED')
      )
    union all
    select jsonb_build_object(
      'type','workflow',
      'action',upper(w.kind)||'_'||upper(w.status),
      'title',case w.kind
        when 'visit' then 'Site visit · '||initcap(replace(w.status,'_',' '))
        when 'proposal' then 'DPR / Proposal · '||initcap(replace(w.status,'_',' '))
        when 'financing' then 'Loan / Financing · '||initcap(replace(w.status,'_',' '))
        when 'followup' then 'Follow-up · '||initcap(replace(w.status,'_',' '))
        else initcap(w.kind)||' · '||initcap(replace(w.status,'_',' '))
      end,
      'detail',case when w.shared then coalesce(nullif(w.notes,''),w.title,'') else '' end,
      'at',coalesce(w.updated_at,w.created_at),
      'actor','AKBS Team'
    ) x
    from akbs_crm.workflows w
    where w.lead_id=p_lead_id and w.shared
  ) q;

  return jsonb_build_object(
    'leadId',v_lead.id,
    'applicationId',v_lead.reference,
    'stage',v_lead.stage,
    'assignedTo',coalesce(v_assigned,'Awaiting assignment'),
    'createdAt',v_lead.created_at,
    'updatedAt',v_lead.updated_at,
    'events',v_events
  );
end $function$
;

CREATE OR REPLACE FUNCTION public.akbs_crm_workspace(p_action text, p_data jsonb DEFAULT '{}'::jsonb, p_token text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor akbs_crm.users;
  target_id uuid;
  manager_row akbs_crm.users;
  l akbs_crm.leads;
begin
  select usr.* into actor
  from akbs_crm.users usr
  join akbs_crm.crm2_sessions s on s.user_id=usr.id
  where s.token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
    and s.expires_at>now()
    and usr.active
  limit 1;

  if actor.must_change_password and p_action not in ('me','password','logout') then return jsonb_build_object('error','Change your temporary password first','status',403);end if;
  if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>3000000 then return jsonb_build_object('error','Invalid or oversized input','status',400);end if;
  if p_action='convert_customer' then
    if actor.id is null then
      return jsonb_build_object('error','Please sign in','status',401);
    end if;
    if actor.role not in ('ADMIN','MANAGER') then
      return jsonb_build_object('error','Only Admin or Manager can convert a lead to customer.','status',403);
    end if;

    select * into l
    from akbs_crm.leads
    where id=nullif(p_data->>'lead_id','')::uuid
    for update;

    if l.id is null or akbs_crm.visible(actor,l) is not true then
      return jsonb_build_object('error','Lead not found or outside your team scope.','status',404);
    end if;

    if l.stage='CONVERTED' then
      return jsonb_build_object('ok',true,'already_converted',true);
    end if;

    update akbs_crm.leads
    set stage='CONVERTED',
        approval='APPROVED',
        version=version+1,
        updated_at=now()
    where id=l.id;

    perform akbs_crm.audit(
      actor.id,
      l.id,
      'LEAD_CONVERTED_TO_CUSTOMER',
      'Final lead converted to registered customer by '||actor.name,
      true
    );

    return jsonb_build_object('ok',true,'lead_id',l.id,'stage','CONVERTED');
  end if;

  if p_action='user_profile_update' then
    if actor.id is null then
      return jsonb_build_object('error','Please sign in','status',401);
    end if;
    if actor.role<>'ADMIN' then
      return jsonb_build_object('error','Admin access required','status',403);
    end if;

    target_id := nullif(p_data->>'id','')::uuid;
    if target_id is null then
      return jsonb_build_object('error','Employee id is required','status',400);
    end if;

    select m.* into manager_row
    from akbs_crm.users e
    left join akbs_crm.users m on m.id=e.manager_id
    where e.id=target_id;

    update akbs_crm.users
    set profile = coalesce(profile,'{}'::jsonb)
      || jsonb_build_object(
        'job_profile',coalesce(p_data->>'job_profile',''),
        'role_title',coalesce(p_data->>'role_title',''),
        'email',lower(trim(coalesce(login,''))),
        'manager_name',coalesce(manager_row.name,''),
        'manager_login',coalesce(manager_row.login,'')
      )
    where id=target_id
      and role in ('EMPLOYEE','MANAGER','FINANCE');

    perform akbs_crm.audit(actor.id,null,'USER_PROFILE_UPDATED',coalesce(p_data->>'role_title',''));
    return jsonb_build_object('ok',true);
  end if;

  return public.akbs_crm_workspace_staffbase(p_action,p_data,p_token);
end $function$
;

CREATE OR REPLACE FUNCTION public.akbs_crm_workspace_legacy(p_action text, p_data jsonb DEFAULT '{}'::jsonb, p_token text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 u akbs_crm.users; target akbs_crm.users; l akbs_crm.leads; w akbs_crm.workflows;
 d akbs_crm.documents; c akbs_crm.commissions; uid uuid; lid uuid; wid uuid;
 result jsonb; token text; rate numeric; next_stage text; login_name text; ids uuid[];
begin
 if p_data ? 'details' then perform akbs_crm.validate_lead_details(p_data->'details');end if;
 if octet_length(p_data::text)>3000000 then raise exception 'Request too large';end if;
 if p_action in ('website_inquiry','register_customer','register_partner','commission_update','settings') then return jsonb_build_object('error','Use the existing portal for this action','status',403); end if;
 if p_action='website_inquiry' then
  if not akbs_crm.rate('contact:'||lower(trim(coalesce(p_data->>'login','unknown'))),8,900) then return jsonb_build_object('error','Too many inquiries. Please try again later.','status',429); end if;
  insert into public.akbs_inquiries(name,email,phone,message,status,note,source)
  values(p_data->>'name',p_data->>'email',p_data->>'phone',p_data->>'message','new','','website') returning id into lid;
  return jsonb_build_object('success',true,'id',lid,'message','Thank you! Your inquiry has been received. We will get back to you shortly.');
 end if;
 if p_action='health' then return jsonb_build_object('ok',true); end if;
 if p_action in ('login','register_customer','register_partner') then
  if not akbs_crm.rate(p_action||':'||lower(trim(coalesce(p_data->>'login','unknown'))),case when p_action='login' then 15 else 8 end,900) then
   return jsonb_build_object('error','Too many attempts. Please try again in 15 minutes.','status',429);
  end if;
 end if;
 if p_action='login' then
  login_name:=lower(trim(p_data->>'login'));
  if not akbs_crm.rate('account:'||login_name,30,900) then return jsonb_build_object('error','Too many attempts. Please try again later.','status',429); end if;
  select * into u from akbs_crm.users where login=login_name and active;
  if u.id is null or u.password_hash is null or nullif(p_data->>'password','') is null or u.password_hash is distinct from extensions.crypt(p_data->>'password',u.password_hash) then
   perform akbs_crm.security_event(null,'LOGIN_FAILED');
   return jsonb_build_object('error','Invalid login or password','status',401);
  end if;
  perform akbs_crm.security_event(u.id,'LOGIN');
  return jsonb_build_object('user',akbs_crm.public_user(u),'token',akbs_crm.workspace_session(u.id));
 end if;
 if p_action in ('register_customer','register_partner') then
  -- Registration creates only a fresh account. Contact details never claim existing records.
  insert into akbs_crm.users(login,name,role,profile,reference)
  values('pending-'||gen_random_uuid(),p_data->>'name',case when p_action='register_customer' then 'CUSTOMER' else 'PARTNER' end,
   p_data-'rate_key',case when p_action='register_partner' then 'AKBS-P-'||lpad(nextval('akbs_crm.partner_seq')::text,6,'0') else null end) returning * into u;
  if u.role='CUSTOMER' then
   insert into akbs_crm.leads(name,phone,email,location,source,customer_id,details,project_type,project_cost,capacity)
   values(u.name,p_data->>'phone',p_data->>'email',p_data#>>'{details,location}','CUSTOMER',u.id,p_data->'details',p_data#>>'{details,farm_type}',(p_data#>>'{details,project_cost}')::numeric,(p_data#>>'{details,capacity}')::integer) returning * into l;
   update akbs_crm.users set reference=l.reference,login=lower(l.reference) where id=u.id returning * into u;
   perform akbs_crm.audit(u.id,l.id,'APPLICATION_SUBMITTED','Our team will review your application and contact you.',true);
  else
   update akbs_crm.users set login=lower(reference) where id=u.id returning * into u;
   perform akbs_crm.audit(u.id,null,'PARTNER_REGISTERED');
  end if;
  return jsonb_build_object('user',akbs_crm.public_user(u),'token',akbs_crm.workspace_session(u.id),'reference',u.reference);
 end if;
 select usr.* into u from akbs_crm.users usr join akbs_crm.crm2_sessions s on s.user_id=usr.id
 where s.token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and s.expires_at>now() and usr.active;
 if u.id is null then return jsonb_build_object('error','Please sign in','status',401); end if;
 if p_action='me' then return jsonb_build_object('user',akbs_crm.public_user(u)); end if;
 if p_action='logout' then
  delete from akbs_crm.crm2_sessions where token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
  perform akbs_crm.audit(u.id,null,'LOGOUT'); return jsonb_build_object('ok',true);
 end if;
 if p_action='password' then
  if not akbs_crm.rate('password:'||u.id,10,900) then return jsonb_build_object('error','Too many attempts. Please try again later.','status',429); end if;
  if (coalesce(length(p_data->>'password'),0)<12 or octet_length(p_data->>'password')>72) then raise exception 'Password must contain 12 to 72 characters'; end if;
  if u.password_hash is not null and u.password_hash<>extensions.crypt(coalesce(p_data->>'current_password',''),u.password_hash) then
   return jsonb_build_object('error','Current password is incorrect','status',400);
  end if;
  update akbs_crm.users set password_hash=extensions.crypt(p_data->>'password',extensions.gen_salt('bf',12)),must_change_password=false where id=u.id returning * into u;
  delete from akbs_crm.crm2_sessions where user_id=u.id;
  perform akbs_crm.audit(u.id,null,'PASSWORD_CHANGED');
  return jsonb_build_object('user',akbs_crm.public_user(u),'token',akbs_crm.workspace_session(u.id));
 end if;
 if u.must_change_password then return jsonb_build_object('error','Please change your temporary password first','status',403); end if;
 if u.role not in ('ADMIN','MANAGER','EMPLOYEE','FINANCE') then return jsonb_build_object('error','Staff account required','status',403); end if;
 if p_action='snapshot' then
  select array_agg(id) into ids from akbs_crm.leads x where akbs_crm.visible(u,x);
  return jsonb_build_object(
   'user',akbs_crm.public_user(u),
   'leads',coalesce((select jsonb_agg(akbs_crm.lead_view(u,x) order by x.created_at desc) from (select * from akbs_crm.leads where id=any(ids) order by created_at desc limit 200 offset greatest(0,coalesce((p_data->>'page')::integer,0))*200) x),'[]'),
   'total',coalesce(cardinality(ids),0),'page',coalesce((p_data->>'page')::integer,0),
   'stats',jsonb_build_object('stages',(select coalesce(jsonb_object_agg(stage,n),'{}') from (select stage,count(*) n from akbs_crm.leads where id=any(ids) group by stage) s),'project_value',(select coalesce(sum(project_cost),0) from akbs_crm.leads where id=any(ids)), 'sources',(select coalesce(jsonb_object_agg(source,n),'{}') from (select source,count(*) n from akbs_crm.leads where id=any(ids) group by source) s)),
   'workflows',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select * from akbs_crm.workflows where lead_id=any(ids) and u.role<>'PARTNER' and (u.role<>'CUSTOMER' or shared) and (u.role<>'FINANCE' or kind='financing') order by created_at desc limit 1000) x),'[]'),
   'activities',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select * from akbs_crm.activities where ((lead_id=any(ids) and (u.role not in ('CUSTOMER','PARTNER') or shared)) or (u.role='ADMIN' and lead_id is null)) and u.role<>'FINANCE' order by created_at desc limit 500) x),'[]'),
   'documents',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select id,lead_id,name,category,mime,size,uploaded_by,shared,created_at from akbs_crm.documents doc where doc.lead_id=any(ids) and u.role<>'PARTNER' and (u.role not in ('CUSTOMER','FINANCE') or doc.shared or doc.uploaded_by=u.id)) x),'[]'),
   'users',coalesce((select jsonb_agg(case when u.role='ADMIN' then akbs_crm.public_user(x) else jsonb_build_object('id',x.id,'name',x.name,'role',x.role,'active',x.active,'manager_id',x.manager_id) end) from akbs_crm.users x where (u.role='ADMIN' or (u.role='MANAGER' and (x.manager_id=u.id or x.id=u.id or (x.role in ('CUSTOMER','PARTNER') and x.id in (select customer_id from akbs_crm.leads where id=any(ids) union select partner_id from akbs_crm.leads where id=any(ids))))) or (u.role='EMPLOYEE' and x.id=u.id))),'[]'),
   'commissions',coalesce((select jsonb_agg(to_jsonb(x)) from akbs_crm.commissions x where u.role in ('ADMIN','FINANCE') or (u.role='MANAGER' and x.lead_id=any(ids)) or (u.role='PARTNER' and x.partner_id=u.id)),'[]'),
   'records',coalesce((select jsonb_agg(to_jsonb(r)) from akbs_crm.workspace_records r where u.role='ADMIN' or r.kind='settings' or r.created_by=u.id or (u.role='MANAGER' and r.created_by in (select id from akbs_crm.users where manager_id=u.id))),'[]'),
   'templates',coalesce((select jsonb_agg(to_jsonb(t) order by title) from akbs_crm.workspace_templates t),'[]'),
   'settings',jsonb_build_object('commission_rate',(select commission_rate from akbs_crm.settings))
  );
 end if;
 if not akbs_crm.rate('write:'||u.id::text,120,60) then return jsonb_build_object('error','Please wait before trying again','status',429); end if;
 if p_action='record_save' then
  if u.role not in ('ADMIN','MANAGER') then return jsonb_build_object('error','Manager access required','status',403); end if;
  if u.role<>'ADMIN' and p_data->'data' ?| array['commissionRate','commission','paymentStatus','verified','fee','discount'] then raise exception 'Protected financial field';end if;
  if nullif(p_data->>'id','') is not null and u.role<>'ADMIN' and not exists(select 1 from akbs_crm.workspace_records where id=(p_data->>'id')::uuid and (created_by=u.id or created_by in (select id from akbs_crm.users where manager_id=u.id))) then raise exception 'Record is outside your team';end if;
  if p_data->>'kind'='settings' and u.role<>'ADMIN' then return jsonb_build_object('error','Admin access required','status',403); end if;
  if coalesce(p_data->>'kind','') not in ('customer','partner','supply_order','settings') or jsonb_typeof(p_data->'data') is distinct from 'object' then raise exception 'Invalid record'; end if;
  if octet_length((p_data->'data')::text)>65536 then raise exception 'Record is too large'; end if;
  if p_data->>'kind'<>'settings' and length(trim(coalesce(p_data#>>'{data,name}',p_data#>>'{data,partnerName}','')))=0 then raise exception 'Name is required'; end if;
  if nullif(p_data->>'id','') is null then
   insert into akbs_crm.workspace_records(kind,data,created_by) values(p_data->>'kind',p_data->'data',u.id) returning id into wid;
  else
   update akbs_crm.workspace_records set data=p_data->'data',version=version+1,updated_at=now()
   where id=(p_data->>'id')::uuid and kind=p_data->>'kind' and version=(p_data->>'version')::integer returning id into wid;
   if wid is null then return jsonb_build_object('error','Record changed. Refresh and try again.','status',409); end if;
  end if;
  perform akbs_crm.audit(u.id,null,'RECORD_SAVED',p_data->>'kind');return jsonb_build_object('ok',true,'id',wid);
 end if;
 if p_action='template_save' then
  if u.role<>'ADMIN' then return jsonb_build_object('error','Only admin can edit templates','status',403); end if;
  if length(trim(coalesce(p_data->>'title','')))=0 or length(trim(coalesce(p_data->>'body','')))=0 then raise exception 'Template title and body are required'; end if;
  insert into akbs_crm.workspace_templates(id,title,channel,subject,body) values(coalesce((p_data->>'id')::uuid,gen_random_uuid()),p_data->>'title',p_data->>'channel',coalesce(p_data->>'subject',''),p_data->>'body') on conflict(id) do update set title=excluded.title,channel=excluded.channel,subject=excluded.subject,body=excluded.body;
  perform akbs_crm.audit(u.id,null,'TEMPLATE_SAVED',p_data->>'title'); return jsonb_build_object('ok',true);
 end if;
 if p_action='auto_assign' then
  if u.role<>'ADMIN' then return jsonb_build_object('error','Only admin can run assignment','status',403); end if;
  perform pg_advisory_xact_lock(hashtext('akbs_workspace_assignment'));
  for l in select * from akbs_crm.leads where assigned_to is null and stage not in ('CONVERTED','LOST') for update loop
   select * into target from akbs_crm.users x where active and role='EMPLOYEE' order by (select count(*) from akbs_crm.leads z where z.assigned_to=x.id and z.stage not in ('CONVERTED','LOST')),x.id limit 1;
   if target.id is null then exit; end if;
   update akbs_crm.leads set assigned_to=target.id,manager_id=target.manager_id,version=version+1,updated_at=now() where id=l.id;
   perform akbs_crm.audit(u.id,l.id,'AUTO_ASSIGNED',target.name);
  end loop;
  return jsonb_build_object('ok',true);
 end if;
 if p_action='user_create' then
  if u.role<>'ADMIN' then return jsonb_build_object('error','Forbidden','status',403); end if;
  if (coalesce(length(p_data->>'password'),0)<12 or octet_length(p_data->>'password')>72) then raise exception 'Invalid password length'; end if;
  if nullif(p_data->>'manager_id','') is not null and not exists(select 1 from akbs_crm.users where id=(p_data->>'manager_id')::uuid and role='MANAGER' and active) then raise exception 'Invalid manager'; end if;
  insert into akbs_crm.users(login,name,role,password_hash,manager_id,must_change_password)
  values(lower(trim(p_data->>'login')),p_data->>'name',p_data->>'role',extensions.crypt(p_data->>'password',extensions.gen_salt('bf',12)),(p_data->>'manager_id')::uuid,true) returning * into target;
  perform akbs_crm.audit(u.id,null,'USER_CREATED',target.name||' · '||target.role);
  return jsonb_build_object('user',akbs_crm.public_user(target));
 end if;
 if p_action='user_update' then
  if u.role<>'ADMIN' then return jsonb_build_object('error','Forbidden','status',403); end if;
  select * into target from akbs_crm.users where id=(p_data->>'id')::uuid for update;
  if target.id is null then return jsonb_build_object('error','Not found','status',404); end if;
  if target.id=u.id then raise exception 'Use your profile to change your own access'; end if;
  if nullif(p_data->>'manager_id','') is not null and not exists(select 1 from akbs_crm.users where id=(p_data->>'manager_id')::uuid and role='MANAGER' and active) then raise exception 'Invalid manager'; end if;
  if p_data ? 'password' and (coalesce(length(p_data->>'password'),0)<12 or octet_length(p_data->>'password')>72) then raise exception 'Invalid password length'; end if;
  update akbs_crm.users set active=coalesce((p_data->>'active')::boolean,active),role=coalesce(p_data->>'role',role),
   manager_id=case when p_data ? 'manager_id' then (p_data->>'manager_id')::uuid else manager_id end,
   password_hash=case when p_data ? 'password' then extensions.crypt(p_data->>'password',extensions.gen_salt('bf',12)) else password_hash end,
   must_change_password=case when p_data ? 'password' then true else must_change_password end where id=target.id;
  delete from akbs_crm.crm2_sessions where user_id=target.id;
  perform akbs_crm.audit(u.id,null,'USER_ACCESS_CHANGED',target.name); return jsonb_build_object('ok',true);
 end if;
 if p_action='settings' then
  if u.role<>'ADMIN' then return jsonb_build_object('error','Forbidden','status',403); end if;
  update akbs_crm.settings set commission_rate=(p_data->>'commission_rate')::numeric;
  perform akbs_crm.audit(u.id,null,'COMMISSION_RULE_CHANGED',p_data->>'commission_rate'); return jsonb_build_object('ok',true);
 end if;
 if p_action='lead_create' then
  if length(trim(coalesce(p_data->>'name','')))=0 or length(trim(coalesce(p_data->>'phone','')))<8 then raise exception 'Name and valid phone are required'; end if;
  if u.role not in ('ADMIN','MANAGER','EMPLOYEE','PARTNER') then return jsonb_build_object('error','Forbidden','status',403); end if;
  insert into akbs_crm.leads(name,phone,email,location,message,source,partner_id,assigned_to,manager_id,project_cost,capacity,project_type,priority)
  values(p_data->>'name',p_data->>'phone',coalesce(p_data->>'email',''),coalesce(p_data->>'location',''),coalesce(p_data->>'message',''),
   case when u.role='PARTNER' then 'PARTNER' else 'STAFF' end,case when u.role='PARTNER' then u.id end,
   case when u.role='EMPLOYEE' then u.id end,case when u.role='MANAGER' then u.id when u.role='EMPLOYEE' then u.manager_id end,
   coalesce((p_data->>'project_cost')::numeric,0),coalesce((p_data->>'capacity')::integer,0),coalesce(p_data->>'project_type',''),coalesce(p_data->>'priority','NORMAL')) returning * into l;
  update akbs_crm.leads set details=coalesce(p_data->'details','{}'::jsonb) where id=l.id returning * into l;
  perform akbs_crm.audit(u.id,l.id,'LEAD_CREATED','',true); return jsonb_build_object('lead',akbs_crm.lead_view(u,l));
 end if;
 if p_action='commission_update' then
  if u.role not in ('ADMIN','FINANCE') then return jsonb_build_object('error','Forbidden','status',403); end if;
  select * into c from akbs_crm.commissions where id=(p_data->>'id')::uuid for update;
  if c.id is null then return jsonb_build_object('error','Not found','status',404); end if;
  if c.version<>(p_data->>'version')::integer then return jsonb_build_object('error','Record changed. Refresh and try again.','status',409); end if;
  if (p_data->>'status'='PAID' and (c.status<>'APPROVED' or length(trim(coalesce(p_data->>'reference','')))=0)) or c.status='PAID' then raise exception 'Approve commission and supply payment reference before marking paid'; end if;
  update akbs_crm.commissions set status=p_data->>'status',reference=coalesce(p_data->>'reference',''),version=version+1 where id=c.id;
  perform akbs_crm.audit(u.id,c.lead_id,'COMMISSION_UPDATED',p_data->>'status',false);return jsonb_build_object('ok',true);
 end if;
 -- All remaining operations resolve an authorized parent lead before reading children.
 lid:=(p_data->>'lead_id')::uuid;
 if p_action='document_download' then select lead_id into lid from akbs_crm.documents where id=(p_data->>'id')::uuid; end if;
 if p_action='workflow_update' then select lead_id into lid from akbs_crm.workflows where id=(p_data->>'id')::uuid; end if;
 select * into l from akbs_crm.leads where id=lid for update;
 if l.id is null or akbs_crm.visible(u,l) is not true then return jsonb_build_object('error','Not found','status',404); end if;
 if p_action='lead_update' then
  if u.role not in ('ADMIN','MANAGER','EMPLOYEE') then return jsonb_build_object('error','Forbidden','status',403); end if;
  if l.version is distinct from (p_data->>'version')::integer then return jsonb_build_object('error','Record changed. Refresh and try again.','status',409); end if;
  if (p_data ? 'assigned_to' or p_data ? 'manager_id' or p_data ? 'approval') and u.role not in ('ADMIN','MANAGER') then return jsonb_build_object('error','Only managers can assign or approve leads','status',403); end if;
  if u.role='MANAGER' and p_data ? 'manager_id' and (p_data->>'manager_id')::uuid is distinct from u.id then raise exception 'Managers cannot assign another manager'; end if;
  if nullif(p_data->>'assigned_to','') is not null and not exists(select 1 from akbs_crm.users where id=(p_data->>'assigned_to')::uuid and role='EMPLOYEE' and active and (u.role='ADMIN' or manager_id=u.id)) then raise exception 'Choose an active employee in your team'; end if;
  if nullif(p_data->>'manager_id','') is not null and not exists(select 1 from akbs_crm.users where id=(p_data->>'manager_id')::uuid and role='MANAGER' and active) then raise exception 'Choose an active manager'; end if;
  if l.stage='CONVERTED' and ((p_data ? 'project_cost' and (p_data->>'project_cost')::numeric is distinct from l.project_cost) or (p_data ? 'capacity' and (p_data->>'capacity')::integer is distinct from l.capacity)) then raise exception 'Reopen this lead before changing the converted project'; end if;
  next_stage:=coalesce(p_data->>'stage',l.stage);
  if next_stage<>l.stage then
   if l.stage in ('CONVERTED','LOST') and u.role<>'ADMIN' then raise exception 'Only an admin can reopen a closed lead'; end if;
   if next_stage='CONVERTED' and (u.role not in ('ADMIN','MANAGER') or l.approval<>'APPROVED' or not exists(select 1 from akbs_crm.workflows where lead_id=l.id and kind='proposal' and status='ACCEPTED')) then raise exception 'Conversion needs manager approval and an accepted proposal'; end if;
   if next_stage='LOST' and length(trim(coalesce(p_data->>'reason','')))=0 then raise exception 'Please record the reason for closing this lead'; end if;
   if next_stage='DPR' and not exists(select 1 from akbs_crm.workflows where lead_id=l.id and kind='proposal') then raise exception 'Create a DPR or proposal first'; end if;
   if next_stage='PROPOSAL' and not exists(select 1 from akbs_crm.workflows where lead_id=l.id and kind='proposal' and status in ('APPROVED','SENT','ACCEPTED')) then raise exception 'An approved proposal is required'; end if;
   if next_stage='LOAN_PROCESSING' and not exists(select 1 from akbs_crm.workflows where lead_id=l.id and kind='financing') then raise exception 'Create a financing record first'; end if;
  end if;
  update akbs_crm.leads set name=coalesce(nullif(trim(p_data->>'name'),''),name),phone=coalesce(p_data->>'phone',phone),email=coalesce(p_data->>'email',email),message=coalesce(p_data->>'message',message),details=details||coalesce(p_data->'details','{}'::jsonb),stage=next_stage,priority=coalesce(p_data->>'priority',priority),approval=coalesce(p_data->>'approval',approval),
   assigned_to=case when p_data ? 'assigned_to' then (p_data->>'assigned_to')::uuid else assigned_to end,
   manager_id=case when u.role='MANAGER' and (p_data ? 'assigned_to' or p_data ? 'approval') then u.id when p_data ? 'assigned_to' and nullif(p_data->>'assigned_to','') is not null then (select x.manager_id from akbs_crm.users x where x.id=(p_data->>'assigned_to')::uuid) when p_data ? 'manager_id' then (p_data->>'manager_id')::uuid else manager_id end,
   project_cost=coalesce((p_data->>'project_cost')::numeric,project_cost),capacity=coalesce((p_data->>'capacity')::integer,capacity),location=coalesce(p_data->>'location',location),project_type=coalesce(p_data->>'project_type',project_type),version=version+1,updated_at=now()
  where id=l.id;
  if next_stage='CONVERTED' and l.partner_id is not null then
   select commission_rate into rate from akbs_crm.settings;
   insert into akbs_crm.commissions(lead_id,partner_id,eligible_cost,rate,amount) values(l.id,l.partner_id,coalesce((p_data->>'project_cost')::numeric,l.project_cost),rate,round(coalesce((p_data->>'project_cost')::numeric,l.project_cost)*rate/100,2)) on conflict(lead_id) do nothing;
  end if;
  if p_data ? 'assigned_to' and (p_data->>'assigned_to')::uuid is distinct from l.assigned_to then perform akbs_crm.audit(u.id,l.id,'OWNER_CHANGED',coalesce((select name from akbs_crm.users where id=l.assigned_to),'Unassigned')||' → '||coalesce((select name from akbs_crm.users where id=(p_data->>'assigned_to')::uuid),'Unassigned')); end if;
  perform akbs_crm.audit(u.id,l.id,case when next_stage<>l.stage then 'STAGE_CHANGED' else 'LEAD_UPDATED' end,case when next_stage<>l.stage then l.stage||' → '||next_stage||' '||coalesce(p_data->>'reason','') else 'Assignment, approval or project details updated' end,next_stage<>l.stage);
  return jsonb_build_object('ok',true);
 end if;
 if p_action='note' then
  if length(trim(coalesce(p_data->>'note','')))=0 or length(p_data->>'note')>20000 then raise exception 'Enter a note between 1 and 20000 characters'; end if;
  if u.role='PARTNER' then return jsonb_build_object('error','Forbidden','status',403); end if;
  perform akbs_crm.audit(u.id,l.id,case when p_data->>'kind'='CALL' then 'CALL_LOGGED' else 'NOTE_ADDED' end,p_data->>'note',u.role='CUSTOMER' or coalesce((p_data->>'shared')::boolean,false));
  return jsonb_build_object('ok',true);
 end if;
 if p_action in ('workflow_create','workflow_update') then
  if length(trim(coalesce(p_data->>'title','')))=0 then raise exception 'Title is required'; end if;
  if u.role not in ('ADMIN','MANAGER','EMPLOYEE','FINANCE') then return jsonb_build_object('error','Forbidden','status',403); end if;
  if p_action='workflow_update' then
   select * into w from akbs_crm.workflows where id=(p_data->>'id')::uuid for update;
   if w.version is distinct from (p_data->>'version')::integer then return jsonb_build_object('error','Record changed. Refresh and try again.','status',409); end if;
   if p_data->>'kind'<>w.kind or (p_data->>'lead_id')::uuid<>w.lead_id then raise exception 'Workflow parent and type cannot change'; end if;
  end if;
  if u.role='FINANCE' and p_data->>'kind'<>'financing' then return jsonb_build_object('error','Forbidden','status',403); end if;
  if p_data->>'kind'='financing' and u.role not in ('ADMIN','FINANCE') then return jsonb_build_object('error','Only Finance or Admin can edit financing records','status',403); end if;
  if p_data->>'kind'='proposal' then
   if p_action='workflow_create' and p_data->>'status'<>'DRAFT' then raise exception 'New proposals must start as draft'; end if;
   if u.role='EMPLOYEE' and (p_data->>'status' not in ('DRAFT','UNDER_REVIEW') or (w.id is not null and w.status not in ('DRAFT','REJECTED'))) then return jsonb_build_object('error','Proposal approval requires a manager','status',403); end if;
   if w.id is not null and w.status<>p_data->>'status' and not ((w.status in ('DRAFT','REJECTED') and p_data->>'status'='UNDER_REVIEW') or (w.status='UNDER_REVIEW' and p_data->>'status' in ('APPROVED','REJECTED')) or (w.status='APPROVED' and p_data->>'status'='SENT') or (w.status='SENT' and p_data->>'status' in ('ACCEPTED','REJECTED'))) then raise exception 'Invalid proposal transition'; end if;
  end if;
  if p_data->>'kind'='financing' and p_action='workflow_create' and p_data->>'status' not in ('NOT_STARTED','DOCUMENTS_PENDING') then raise exception 'Start financing with document collection'; end if;
  if w.kind='financing' and p_data->>'status'<>w.status and not ((w.status='NOT_STARTED' and p_data->>'status'='DOCUMENTS_PENDING') or (w.status='DOCUMENTS_PENDING' and p_data->>'status'='SUBMITTED') or (w.status='SUBMITTED' and p_data->>'status'='UNDER_REVIEW') or (w.status='UNDER_REVIEW' and p_data->>'status' in ('SANCTIONED','REJECTED')) or (w.status='SANCTIONED' and p_data->>'status'='DISBURSED') or (w.status='REJECTED' and p_data->>'status'='DOCUMENTS_PENDING')) then raise exception 'Invalid financing transition'; end if;
  if nullif(p_data->>'assignee_id','') is not null and not exists(select 1 from akbs_crm.users x where x.id=(p_data->>'assignee_id')::uuid and x.active and (u.role='ADMIN' or (u.role='MANAGER' and (x.manager_id=u.id or x.id=u.id)) or x.id=u.id)) then raise exception 'Invalid task assignee'; end if;
  if nullif(p_data->>'document_id','') is not null and not exists(select 1 from akbs_crm.documents where id=(p_data->>'document_id')::uuid and lead_id=l.id) then raise exception 'Document belongs to another application'; end if;
  if p_action='workflow_create' then
   if p_data->>'kind' in ('task','followup','visit') and ((p_data->>'due_at') is null or (p_data->>'due_at')::timestamptz<=now()) then raise exception 'Choose a future due date'; end if;
   insert into akbs_crm.workflows(lead_id,kind,title,status,due_at,notes,amount,bank,location,document_id,assignee_id,shared)
   values(l.id,p_data->>'kind',p_data->>'title',p_data->>'status',(p_data->>'due_at')::timestamptz,coalesce(p_data->>'notes',''),coalesce((p_data->>'amount')::numeric,0),coalesce(p_data->>'bank',''),coalesce(p_data->>'location',''),(p_data->>'document_id')::uuid,coalesce((p_data->>'assignee_id')::uuid,u.id),coalesce((p_data->>'shared')::boolean,false)) returning id into wid;
  else
   update akbs_crm.workflows set title=p_data->>'title',status=p_data->>'status',due_at=(p_data->>'due_at')::timestamptz,notes=coalesce(p_data->>'notes',''),amount=coalesce((p_data->>'amount')::numeric,0),bank=coalesce(p_data->>'bank',''),location=coalesce(p_data->>'location',''),document_id=(p_data->>'document_id')::uuid,assignee_id=coalesce((p_data->>'assignee_id')::uuid,assignee_id),shared=coalesce((p_data->>'shared')::boolean,false),version=version+1,updated_at=now() where id=w.id returning id into wid;
  end if;
  perform akbs_crm.audit(u.id,l.id,upper(p_data->>'kind')||case when p_action='workflow_create' then '_CREATED' else '_UPDATED' end,(p_data->>'title')||' · '||(p_data->>'status'),coalesce((p_data->>'shared')::boolean,false));
  return jsonb_build_object('ok',true,'id',wid);
 end if;
 if p_action='document_upload' then
  if coalesce(p_data->>'name','') ~ '[/\\]' or not akbs_crm.valid_file(decode(p_data->>'content','base64'),p_data->>'mime') then raise exception 'Invalid document signature or filename';end if;
  if octet_length(decode(p_data->>'content','base64')) is distinct from (p_data->>'size')::integer then raise exception 'File size mismatch'; end if;
  if u.role='PARTNER' then return jsonb_build_object('error','Forbidden','status',403); end if;
  if (select count(*) from akbs_crm.documents where lead_id=l.id)>=30 then raise exception 'Document limit reached for this application'; end if;
  insert into akbs_crm.documents(lead_id,name,category,mime,size,content,uploaded_by,shared)
  values(l.id,p_data->>'name',p_data->>'category',p_data->>'mime',(p_data->>'size')::integer,decode(p_data->>'content','base64'),u.id,u.role='CUSTOMER' or coalesce((p_data->>'shared')::boolean,false)) returning id into wid;
  perform akbs_crm.audit(u.id,l.id,'DOCUMENT_UPLOADED',p_data->>'name',u.role='CUSTOMER' or coalesce((p_data->>'shared')::boolean,false)); return jsonb_build_object('ok',true,'id',wid);
 end if;
 if p_action='document_download' then
  select * into d from akbs_crm.documents where id=(p_data->>'id')::uuid;
  if u.role='PARTNER' or (u.role in ('CUSTOMER','FINANCE') and not d.shared and d.uploaded_by<>u.id) then return jsonb_build_object('error','Not found','status',404); end if;
  perform akbs_crm.audit(u.id,l.id,'DOCUMENT_DOWNLOADED',d.name,false);
  return jsonb_build_object('name',d.name,'mime',d.mime,'content',encode(d.content,'base64'));
 end if;
 return jsonb_build_object('error','Unknown action','status',400);
exception when unique_violation then return jsonb_build_object('error','That login or record already exists','status',409);
end $function$
;

CREATE OR REPLACE FUNCTION public.akbs_crm_gateway(p_key text, p_action text, p_data jsonb DEFAULT '{}'::jsonb, p_token text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 u akbs_crm.users; target akbs_crm.users; l akbs_crm.leads; w akbs_crm.workflows;
 d akbs_crm.documents; c akbs_crm.commissions; uid uuid; lid uuid; wid uuid;
 result jsonb; token text; rate numeric; next_stage text; login_name text; ids uuid[];
begin
 if p_data ? 'details' then perform akbs_crm.validate_lead_details(p_data->'details');end if;
 if octet_length(p_data::text)>3000000 then raise exception 'Request too large';end if;
 if not exists(select 1 from akbs_crm.settings where gateway_hash=encode(extensions.digest(p_key,'sha256'),'hex')) then
  return jsonb_build_object('error','Service unavailable','status',503);
 end if;
 if p_action='website_inquiry' then
  if not akbs_crm.rate('contact:'||coalesce(p_data->>'rate_key','unknown'),8,900) then return jsonb_build_object('error','Too many inquiries. Please try again later.','status',429); end if;
  insert into public.akbs_inquiries(name,email,phone,message,status,note,source)
  values(p_data->>'name',p_data->>'email',p_data->>'phone',p_data->>'message','new','','website') returning id into lid;
  return jsonb_build_object('success',true,'id',lid,'message','Thank you! Your inquiry has been received. We will get back to you shortly.');
 end if;
 if p_action='health' then return jsonb_build_object('ok',true); end if;
 if p_action in ('login','register_customer','register_partner') then
  if not akbs_crm.rate(p_action||':'||coalesce(p_data->>'rate_key','unknown'),case when p_action='login' then 15 else 8 end,900) then
   return jsonb_build_object('error','Too many attempts. Please try again in 15 minutes.','status',429);
  end if;
 end if;
 if p_action='login' then
  login_name:=lower(trim(p_data->>'login'));
  if not akbs_crm.rate('account:'||login_name,30,900) then return jsonb_build_object('error','Too many attempts. Please try again later.','status',429); end if;
  select * into u from akbs_crm.users where login=login_name and active;
  if u.id is null or u.password_hash is null or u.password_hash<>extensions.crypt(p_data->>'password',u.password_hash) then
   return jsonb_build_object('error','Invalid login or password','status',401);
  end if;
  return jsonb_build_object('user',akbs_crm.public_user(u),'token',akbs_crm.new_session(u.id));
 end if;
 if p_action in ('register_customer','register_partner') then
  -- Registration creates only a fresh account. Contact details never claim existing records.
  insert into akbs_crm.users(login,name,role,profile,reference)
  values('pending-'||gen_random_uuid(),p_data->>'name',case when p_action='register_customer' then 'CUSTOMER' else 'PARTNER' end,
   p_data-'rate_key',case when p_action='register_partner' then 'AKBS-P-'||lpad(nextval('akbs_crm.partner_seq')::text,6,'0') else null end) returning * into u;
  if u.role='CUSTOMER' then
   insert into akbs_crm.leads(name,phone,email,location,source,customer_id,details,project_type,project_cost,capacity)
   values(u.name,p_data->>'phone',p_data->>'email',p_data#>>'{details,location}','CUSTOMER',u.id,p_data->'details',p_data#>>'{details,farm_type}',(p_data#>>'{details,project_cost}')::numeric,(p_data#>>'{details,capacity}')::integer) returning * into l;
   update akbs_crm.users set reference=l.reference,login=lower(l.reference) where id=u.id returning * into u;
   perform akbs_crm.audit(u.id,l.id,'APPLICATION_SUBMITTED','Our team will review your application and contact you.',true);
  else
   update akbs_crm.users set login=lower(reference) where id=u.id returning * into u;
   perform akbs_crm.audit(u.id,null,'PARTNER_REGISTERED');
  end if;
  return jsonb_build_object('user',akbs_crm.public_user(u),'token',akbs_crm.new_session(u.id),'reference',u.reference);
 end if;
 select usr.* into u from akbs_crm.users usr join akbs_crm.sessions s on s.user_id=usr.id
 where s.token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and s.expires_at>now() and usr.active;
 if u.id is null then return jsonb_build_object('error','Please sign in','status',401); end if;
 if p_action='me' then return jsonb_build_object('user',akbs_crm.public_user(u)); end if;
 if p_action='logout' then
  delete from akbs_crm.sessions where token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
  perform akbs_crm.audit(u.id,null,'LOGOUT'); return jsonb_build_object('ok',true);
 end if;
 if p_action='password' then
  if not akbs_crm.rate('password:'||u.id,10,900) then return jsonb_build_object('error','Too many attempts. Please try again later.','status',429); end if;
  if (length(p_data->>'password')<12 or octet_length(p_data->>'password')>72) then raise exception 'Password must contain 12 to 72 characters'; end if;
  if u.password_hash is not null and u.password_hash<>extensions.crypt(coalesce(p_data->>'current_password',''),u.password_hash) then
   return jsonb_build_object('error','Current password is incorrect','status',400);
  end if;
  update akbs_crm.users set password_hash=extensions.crypt(p_data->>'password',extensions.gen_salt('bf',12)),must_change_password=false where id=u.id returning * into u;
  delete from akbs_crm.sessions where user_id=u.id;
  perform akbs_crm.audit(u.id,null,'PASSWORD_CHANGED');
  return jsonb_build_object('user',akbs_crm.public_user(u),'token',akbs_crm.new_session(u.id));
 end if;
 if u.must_change_password then return jsonb_build_object('error','Please change your temporary password first','status',403); end if;
 if p_action='snapshot' then
  select array_agg(id) into ids from akbs_crm.leads x where akbs_crm.visible(u,x);
  return jsonb_build_object(
   'user',akbs_crm.public_user(u),
   'leads',coalesce((select jsonb_agg(akbs_crm.lead_view(u,x) order by x.created_at desc) from (select * from akbs_crm.leads where id=any(ids) order by created_at desc limit 200 offset greatest(0,coalesce((p_data->>'page')::integer,0))*200) x),'[]'),
   'total',coalesce(cardinality(ids),0),'page',coalesce((p_data->>'page')::integer,0),
   'stats',jsonb_build_object('stages',(select coalesce(jsonb_object_agg(stage,n),'{}') from (select stage,count(*) n from akbs_crm.leads where id=any(ids) group by stage) s),'project_value',(select coalesce(sum(project_cost),0) from akbs_crm.leads where id=any(ids)), 'sources',(select coalesce(jsonb_object_agg(source,n),'{}') from (select source,count(*) n from akbs_crm.leads where id=any(ids) group by source) s)),
   'workflows',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select * from akbs_crm.workflows where lead_id=any(ids) and u.role<>'PARTNER' and (u.role<>'CUSTOMER' or shared) and (u.role<>'FINANCE' or kind='financing') order by created_at desc limit 1000) x),'[]'),
   'activities',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select * from akbs_crm.activities where ((lead_id=any(ids) and (u.role not in ('CUSTOMER','PARTNER') or shared)) or (u.role='ADMIN' and lead_id is null)) and u.role<>'FINANCE' order by created_at desc limit 500) x),'[]'),
   'documents',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select id,lead_id,name,category,mime,size,uploaded_by,shared,created_at from akbs_crm.documents doc where doc.lead_id=any(ids) and u.role<>'PARTNER' and (u.role not in ('CUSTOMER','FINANCE') or doc.shared or doc.uploaded_by=u.id)) x),'[]'),
   'users',coalesce((select jsonb_agg(case when u.role='ADMIN' then akbs_crm.public_user(x) else jsonb_build_object('id',x.id,'name',x.name,'role',x.role,'active',x.active,'manager_id',x.manager_id) end) from akbs_crm.users x where (u.role='ADMIN' or (u.role='MANAGER' and (x.manager_id=u.id or x.id=u.id or (x.role in ('CUSTOMER','PARTNER') and x.id in (select customer_id from akbs_crm.leads where id=any(ids) union select partner_id from akbs_crm.leads where id=any(ids))))) or (u.role='EMPLOYEE' and x.id=u.id))),'[]'),
   'commissions',coalesce((select jsonb_agg(to_jsonb(x)) from akbs_crm.commissions x where u.role in ('ADMIN','FINANCE') or (u.role='MANAGER' and x.lead_id=any(ids)) or (u.role='PARTNER' and x.partner_id=u.id)),'[]'),
   'settings',jsonb_build_object('commission_rate',(select commission_rate from akbs_crm.settings))
  );
 end if;
 if not akbs_crm.rate('write:'||u.id::text,120,60) then return jsonb_build_object('error','Please wait before trying again','status',429); end if;
 if p_action='user_create' then
  if u.role<>'ADMIN' then return jsonb_build_object('error','Forbidden','status',403); end if;
  if (length(p_data->>'password')<12 or octet_length(p_data->>'password')>72) then raise exception 'Invalid password length'; end if;
  if nullif(p_data->>'manager_id','') is not null and not exists(select 1 from akbs_crm.users where id=(p_data->>'manager_id')::uuid and role='MANAGER' and active) then raise exception 'Invalid manager'; end if;
  insert into akbs_crm.users(login,name,role,password_hash,manager_id,must_change_password)
  values(lower(trim(p_data->>'login')),p_data->>'name',p_data->>'role',extensions.crypt(p_data->>'password',extensions.gen_salt('bf',12)),(p_data->>'manager_id')::uuid,true) returning * into target;
  perform akbs_crm.audit(u.id,null,'USER_CREATED',target.name||' · '||target.role);
  return jsonb_build_object('user',akbs_crm.public_user(target));
 end if;
 if p_action='user_update' then
  if u.role<>'ADMIN' then return jsonb_build_object('error','Forbidden','status',403); end if;
  select * into target from akbs_crm.users where id=(p_data->>'id')::uuid for update;
  if target.id is null then return jsonb_build_object('error','Not found','status',404); end if;
  if target.id=u.id then raise exception 'Use your profile to change your own access'; end if;
  if nullif(p_data->>'manager_id','') is not null and not exists(select 1 from akbs_crm.users where id=(p_data->>'manager_id')::uuid and role='MANAGER' and active) then raise exception 'Invalid manager'; end if;
  if p_data ? 'password' and (length(p_data->>'password')<12 or octet_length(p_data->>'password')>72) then raise exception 'Invalid password length'; end if;
  update akbs_crm.users set active=coalesce((p_data->>'active')::boolean,active),role=coalesce(p_data->>'role',role),
   manager_id=case when p_data ? 'assigned_to' and nullif(p_data->>'assigned_to','') is not null then (select x.manager_id from akbs_crm.users x where x.id=(p_data->>'assigned_to')::uuid) when p_data ? 'manager_id' then (p_data->>'manager_id')::uuid else manager_id end,
   password_hash=case when p_data ? 'password' then extensions.crypt(p_data->>'password',extensions.gen_salt('bf',12)) else password_hash end,
   must_change_password=case when p_data ? 'password' then true else must_change_password end where id=target.id;
  delete from akbs_crm.sessions where user_id=target.id;
  perform akbs_crm.audit(u.id,null,'USER_ACCESS_CHANGED',target.name); return jsonb_build_object('ok',true);
 end if;
 if p_action='settings' then
  if u.role<>'ADMIN' then return jsonb_build_object('error','Forbidden','status',403); end if;
  update akbs_crm.settings set commission_rate=(p_data->>'commission_rate')::numeric;
  perform akbs_crm.audit(u.id,null,'COMMISSION_RULE_CHANGED',p_data->>'commission_rate'); return jsonb_build_object('ok',true);
 end if;
 if p_action='lead_create' then
  if u.role not in ('ADMIN','MANAGER','EMPLOYEE','PARTNER') then return jsonb_build_object('error','Forbidden','status',403); end if;
  insert into akbs_crm.leads(name,phone,email,location,message,source,partner_id,assigned_to,manager_id,project_cost,capacity,project_type,priority)
  values(p_data->>'name',p_data->>'phone',coalesce(p_data->>'email',''),coalesce(p_data->>'location',''),coalesce(p_data->>'message',''),
   case when u.role='PARTNER' then 'PARTNER' else 'STAFF' end,case when u.role='PARTNER' then u.id end,
   case when u.role='EMPLOYEE' then u.id end,case when u.role='MANAGER' then u.id when u.role='EMPLOYEE' then u.manager_id end,
   coalesce((p_data->>'project_cost')::numeric,0),coalesce((p_data->>'capacity')::integer,0),coalesce(p_data->>'project_type',''),coalesce(p_data->>'priority','NORMAL')) returning * into l;
  perform akbs_crm.audit(u.id,l.id,'LEAD_CREATED','',true); return jsonb_build_object('lead',akbs_crm.lead_view(u,l));
 end if;
 if p_action='commission_update' then
  if u.role not in ('ADMIN','FINANCE') then return jsonb_build_object('error','Forbidden','status',403); end if;
  select * into c from akbs_crm.commissions where id=(p_data->>'id')::uuid for update;
  if c.id is null then return jsonb_build_object('error','Not found','status',404); end if;
  if c.version<>(p_data->>'version')::integer then return jsonb_build_object('error','Record changed. Refresh and try again.','status',409); end if;
  if (p_data->>'status'='PAID' and (c.status<>'APPROVED' or length(trim(coalesce(p_data->>'reference','')))=0)) or c.status='PAID' then raise exception 'Approve commission and supply payment reference before marking paid'; end if;
  update akbs_crm.commissions set status=p_data->>'status',reference=coalesce(p_data->>'reference',''),version=version+1 where id=c.id;
  perform akbs_crm.audit(u.id,c.lead_id,'COMMISSION_UPDATED',p_data->>'status',false);return jsonb_build_object('ok',true);
 end if;
 -- All remaining operations resolve an authorized parent lead before reading children.
 lid:=(p_data->>'lead_id')::uuid;
 if p_action='document_download' then select lead_id into lid from akbs_crm.documents where id=(p_data->>'id')::uuid; end if;
 if p_action='workflow_update' then select lead_id into lid from akbs_crm.workflows where id=(p_data->>'id')::uuid; end if;
 select * into l from akbs_crm.leads where id=lid for update;
 if l.id is null or akbs_crm.visible(u,l) is not true then return jsonb_build_object('error','Not found','status',404); end if;
 if p_action='lead_update' then
  if u.role not in ('ADMIN','MANAGER','EMPLOYEE') then return jsonb_build_object('error','Forbidden','status',403); end if;
  if l.version<>(p_data->>'version')::integer then return jsonb_build_object('error','Record changed. Refresh and try again.','status',409); end if;
  if (p_data ? 'assigned_to' or p_data ? 'manager_id' or p_data ? 'approval') and u.role not in ('ADMIN','MANAGER') then return jsonb_build_object('error','Only managers can assign or approve leads','status',403); end if;
  if u.role='MANAGER' and p_data ? 'manager_id' and (p_data->>'manager_id')::uuid is distinct from u.id then raise exception 'Managers cannot assign another manager'; end if;
  if nullif(p_data->>'assigned_to','') is not null and not exists(select 1 from akbs_crm.users where id=(p_data->>'assigned_to')::uuid and role='EMPLOYEE' and active and (u.role='ADMIN' or manager_id=u.id)) then raise exception 'Choose an active employee in your team'; end if;
  if nullif(p_data->>'manager_id','') is not null and not exists(select 1 from akbs_crm.users where id=(p_data->>'manager_id')::uuid and role='MANAGER' and active) then raise exception 'Choose an active manager'; end if;
  if l.stage='CONVERTED' and ((p_data ? 'project_cost' and (p_data->>'project_cost')::numeric is distinct from l.project_cost) or (p_data ? 'capacity' and (p_data->>'capacity')::integer is distinct from l.capacity)) then raise exception 'Reopen this lead before changing the converted project'; end if;
  next_stage:=coalesce(p_data->>'stage',l.stage);
  if next_stage<>l.stage then
   if l.stage in ('CONVERTED','LOST') and u.role<>'ADMIN' then raise exception 'Only an admin can reopen a closed lead'; end if;
   if next_stage='CONVERTED' and (u.role not in ('ADMIN','MANAGER') or l.approval<>'APPROVED' or not exists(select 1 from akbs_crm.workflows where lead_id=l.id and kind='proposal' and status='ACCEPTED')) then raise exception 'Conversion needs manager approval and an accepted proposal'; end if;
   if next_stage='LOST' and length(trim(coalesce(p_data->>'reason','')))=0 then raise exception 'Please record the reason for closing this lead'; end if;
   if next_stage='DPR' and not exists(select 1 from akbs_crm.workflows where lead_id=l.id and kind='proposal') then raise exception 'Create a DPR or proposal first'; end if;
   if next_stage='PROPOSAL' and not exists(select 1 from akbs_crm.workflows where lead_id=l.id and kind='proposal' and status in ('APPROVED','SENT','ACCEPTED')) then raise exception 'An approved proposal is required'; end if;
   if next_stage='LOAN_PROCESSING' and not exists(select 1 from akbs_crm.workflows where lead_id=l.id and kind='financing') then raise exception 'Create a financing record first'; end if;
  end if;
  update akbs_crm.leads set stage=next_stage,priority=coalesce(p_data->>'priority',priority),approval=coalesce(p_data->>'approval',approval),
   assigned_to=case when p_data ? 'assigned_to' then (p_data->>'assigned_to')::uuid else assigned_to end,
   manager_id=case when u.role='MANAGER' and (p_data ? 'assigned_to' or p_data ? 'approval') then u.id when p_data ? 'assigned_to' and nullif(p_data->>'assigned_to','') is not null then (select x.manager_id from akbs_crm.users x where x.id=(p_data->>'assigned_to')::uuid) when p_data ? 'manager_id' then (p_data->>'manager_id')::uuid else manager_id end,
   project_cost=coalesce((p_data->>'project_cost')::numeric,project_cost),capacity=coalesce((p_data->>'capacity')::integer,capacity),location=coalesce(p_data->>'location',location),project_type=coalesce(p_data->>'project_type',project_type),version=version+1,updated_at=now()
  where id=l.id;
  if next_stage='CONVERTED' and l.partner_id is not null then
   select commission_rate into rate from akbs_crm.settings;
   insert into akbs_crm.commissions(lead_id,partner_id,eligible_cost,rate,amount) values(l.id,l.partner_id,coalesce((p_data->>'project_cost')::numeric,l.project_cost),rate,round(coalesce((p_data->>'project_cost')::numeric,l.project_cost)*rate/100,2)) on conflict(lead_id) do nothing;
  end if;
  perform akbs_crm.audit(u.id,l.id,case when next_stage<>l.stage then 'STAGE_CHANGED' else 'LEAD_UPDATED' end,case when next_stage<>l.stage then l.stage||' → '||next_stage||' '||coalesce(p_data->>'reason','') else 'Assignment, approval or project details updated' end,next_stage<>l.stage);
  return jsonb_build_object('ok',true);
 end if;
 if p_action='note' then
  if u.role='PARTNER' then return jsonb_build_object('error','Forbidden','status',403); end if;
  perform akbs_crm.audit(u.id,l.id,case when p_data->>'kind'='CALL' then 'CALL_LOGGED' else 'NOTE_ADDED' end,p_data->>'note',u.role='CUSTOMER' or coalesce((p_data->>'shared')::boolean,false));
  return jsonb_build_object('ok',true);
 end if;
 if p_action in ('workflow_create','workflow_update') then
  if u.role not in ('ADMIN','MANAGER','EMPLOYEE','FINANCE') then return jsonb_build_object('error','Forbidden','status',403); end if;
  if p_action='workflow_update' then
   select * into w from akbs_crm.workflows where id=(p_data->>'id')::uuid for update;
   if w.version<>(p_data->>'version')::integer then return jsonb_build_object('error','Record changed. Refresh and try again.','status',409); end if;
   if p_data->>'kind'<>w.kind or (p_data->>'lead_id')::uuid<>w.lead_id then raise exception 'Workflow parent and type cannot change'; end if;
  end if;
  if u.role='FINANCE' and p_data->>'kind'<>'financing' then return jsonb_build_object('error','Forbidden','status',403); end if;
  if p_data->>'kind'='financing' and u.role not in ('ADMIN','FINANCE') then return jsonb_build_object('error','Only Finance or Admin can edit financing records','status',403); end if;
  if p_data->>'kind'='proposal' then
   if p_action='workflow_create' and p_data->>'status'<>'DRAFT' then raise exception 'New proposals must start as draft'; end if;
   if u.role='EMPLOYEE' and (p_data->>'status' not in ('DRAFT','UNDER_REVIEW') or (w.id is not null and w.status not in ('DRAFT','REJECTED'))) then return jsonb_build_object('error','Proposal approval requires a manager','status',403); end if;
   if w.id is not null and w.status<>p_data->>'status' and not ((w.status in ('DRAFT','REJECTED') and p_data->>'status'='UNDER_REVIEW') or (w.status='UNDER_REVIEW' and p_data->>'status' in ('APPROVED','REJECTED')) or (w.status='APPROVED' and p_data->>'status'='SENT') or (w.status='SENT' and p_data->>'status' in ('ACCEPTED','REJECTED'))) then raise exception 'Invalid proposal transition'; end if;
  end if;
  if p_data->>'kind'='financing' and p_action='workflow_create' and p_data->>'status' not in ('NOT_STARTED','DOCUMENTS_PENDING') then raise exception 'Start financing with document collection'; end if;
  if w.kind='financing' and p_data->>'status'<>w.status and not ((w.status='NOT_STARTED' and p_data->>'status'='DOCUMENTS_PENDING') or (w.status='DOCUMENTS_PENDING' and p_data->>'status'='SUBMITTED') or (w.status='SUBMITTED' and p_data->>'status'='UNDER_REVIEW') or (w.status='UNDER_REVIEW' and p_data->>'status' in ('SANCTIONED','REJECTED')) or (w.status='SANCTIONED' and p_data->>'status'='DISBURSED') or (w.status='REJECTED' and p_data->>'status'='DOCUMENTS_PENDING')) then raise exception 'Invalid financing transition'; end if;
  if nullif(p_data->>'assignee_id','') is not null and not exists(select 1 from akbs_crm.users x where x.id=(p_data->>'assignee_id')::uuid and x.active and (u.role='ADMIN' or (u.role='MANAGER' and (x.manager_id=u.id or x.id=u.id)) or x.id=u.id)) then raise exception 'Invalid task assignee'; end if;
  if nullif(p_data->>'document_id','') is not null and not exists(select 1 from akbs_crm.documents where id=(p_data->>'document_id')::uuid and lead_id=l.id) then raise exception 'Document belongs to another application'; end if;
  if p_action='workflow_create' then
   insert into akbs_crm.workflows(lead_id,kind,title,status,due_at,notes,amount,bank,location,document_id,assignee_id,shared)
   values(l.id,p_data->>'kind',p_data->>'title',p_data->>'status',(p_data->>'due_at')::timestamptz,coalesce(p_data->>'notes',''),coalesce((p_data->>'amount')::numeric,0),coalesce(p_data->>'bank',''),coalesce(p_data->>'location',''),(p_data->>'document_id')::uuid,coalesce((p_data->>'assignee_id')::uuid,u.id),coalesce((p_data->>'shared')::boolean,false)) returning id into wid;
  else
   update akbs_crm.workflows set title=p_data->>'title',status=p_data->>'status',due_at=(p_data->>'due_at')::timestamptz,notes=coalesce(p_data->>'notes',''),amount=coalesce((p_data->>'amount')::numeric,0),bank=coalesce(p_data->>'bank',''),location=coalesce(p_data->>'location',''),document_id=(p_data->>'document_id')::uuid,assignee_id=coalesce((p_data->>'assignee_id')::uuid,assignee_id),shared=coalesce((p_data->>'shared')::boolean,false),version=version+1,updated_at=now() where id=w.id returning id into wid;
  end if;
  perform akbs_crm.audit(u.id,l.id,upper(p_data->>'kind')||case when p_action='workflow_create' then '_CREATED' else '_UPDATED' end,(p_data->>'title')||' · '||(p_data->>'status'),coalesce((p_data->>'shared')::boolean,false));
  return jsonb_build_object('ok',true,'id',wid);
 end if;
 if p_action='document_upload' then
  if coalesce(p_data->>'name','') ~ '[/\\]' or not akbs_crm.valid_file(decode(p_data->>'content','base64'),p_data->>'mime') then raise exception 'Invalid document signature or filename';end if;
  if u.role='PARTNER' then return jsonb_build_object('error','Forbidden','status',403); end if;
  if (select count(*) from akbs_crm.documents where lead_id=l.id)>=30 then raise exception 'Document limit reached for this application'; end if;
  insert into akbs_crm.documents(lead_id,name,category,mime,size,content,uploaded_by,shared)
  values(l.id,p_data->>'name',p_data->>'category',p_data->>'mime',(p_data->>'size')::integer,decode(p_data->>'content','base64'),u.id,u.role='CUSTOMER' or coalesce((p_data->>'shared')::boolean,false)) returning id into wid;
  perform akbs_crm.audit(u.id,l.id,'DOCUMENT_UPLOADED',p_data->>'name',u.role='CUSTOMER' or coalesce((p_data->>'shared')::boolean,false)); return jsonb_build_object('ok',true,'id',wid);
 end if;
 if p_action='document_download' then
  select * into d from akbs_crm.documents where id=(p_data->>'id')::uuid;
  if u.role='PARTNER' or (u.role in ('CUSTOMER','FINANCE') and not d.shared and d.uploaded_by<>u.id) then return jsonb_build_object('error','Not found','status',404); end if;
  perform akbs_crm.audit(u.id,l.id,'DOCUMENT_DOWNLOADED',d.name,false);
  return jsonb_build_object('name',d.name,'mime',d.mime,'content',encode(d.content,'base64'));
 end if;
 return jsonb_build_object('error','Unknown action','status',400);
exception when unique_violation then return jsonb_build_object('error','That login or record already exists','status',409);
end $function$
;

CREATE OR REPLACE FUNCTION public.akbs_fee_staff(p_action text, p_token text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'extensions'
AS $function$
declare
  v_user akbs_crm.users;
  v_config akbs_crm.fee_settings;
  v_rows jsonb;
  v_total_expected numeric := 0;
  v_total_received numeric := 0;
  v_pending integer := 0;
  v_submitted integer := 0;
  v_verified integer := 0;
  v_rejected integer := 0;
  v_lead uuid;
  v_status text;
begin
  select u.* into v_user
  from akbs_crm.crm2_sessions s
  join akbs_crm.users u on u.id=s.user_id
  where s.token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex')
    and s.expires_at > now()
    and u.active=true
  limit 1;

  if v_user.id is null then raise exception 'Unauthorized'; end if;
  if v_user.must_change_password or v_user.role not in ('ADMIN','MANAGER','EMPLOYEE','FINANCE') then raise exception 'Staff access denied';end if;

  if p_action='update_config' then
    if v_user.role <> 'ADMIN' then raise exception 'Admin access required'; end if;
    update akbs_crm.fee_settings
    set initial_fee=greatest(0,coalesce((p_data->>'initialFee')::numeric,initial_fee)),
        discount_percent=least(100,greatest(0,coalesce((p_data->>'discountPercent')::numeric,discount_percent))),
        offer_label=left(coalesce(p_data->>'offerLabel',''),120),
        offer_active=coalesce((p_data->>'offerActive')::boolean,false),
        updated_at=now(),
        updated_by=v_user.id
    where id=true;
  elsif p_action='verify' then
    if v_user.role not in ('ADMIN','FINANCE') then raise exception 'Admin/Finance access required'; end if;
    v_lead=(p_data->>'leadId')::uuid;
    v_status=upper(coalesce(p_data->>'status',''));
    if v_status not in ('VERIFIED','REJECTED') then raise exception 'Invalid status'; end if;
    if not exists(select 1 from akbs_crm.leads where id=v_lead and details#>>'{portal_form,_initialPayment,reference}' is not null or id=v_lead and details#>>'{portal_form,_initialPayment,proofPath}' is not null) then raise exception 'Payment proof is required';end if;
    if exists(select 1 from akbs_crm.leads where id=v_lead and details#>>'{portal_form,_initialPayment,verificationStatus}'='VERIFIED') then raise exception 'Verified payments are immutable; use the refund workflow';end if;
    perform akbs_crm.security_event(v_user.id,'PAYMENT_'||v_status,'lead',v_lead::text);
    update akbs_crm.leads
    set details=jsonb_set(details,'{portal_form,_initialPayment,verificationStatus}',to_jsonb(v_status),true),
        updated_at=now(),
        version=version+1
    where id=v_lead;
  elsif p_action not in ('snapshot','update_config','verify') then
    raise exception 'Unsupported action';
  end if;

  select * into v_config from akbs_crm.fee_settings where id=true;

  with x as (
    select l.id,l.reference,l.name,l.phone,l.email,l.assigned_to,u.name assigned_name,l.created_at,
           l.details->'portal_form'->'_initialPayment' as p,
           round(v_config.initial_fee*(1-(case when v_config.offer_active then v_config.discount_percent else 0 end)/100.0),2) expected
    from akbs_crm.leads l
    left join akbs_crm.users u on u.id=l.assigned_to
    where l.source='CUSTOMER_PORTAL'
      and (v_user.role='ADMIN' or akbs_crm.visible(v_user,l))
  ), y as (
    select *,
      case
        when p is null then 'PENDING'
        when upper(coalesce(p->>'verificationStatus',''))='VERIFIED' then 'VERIFIED'
        when upper(coalesce(p->>'verificationStatus',''))='REJECTED' then 'REJECTED'
        else 'PROOF_SUBMITTED'
      end fee_status,
      coalesce((p->>'amount')::numeric,expected) amount,
      p->>'reference' reference_no,
      p->>'proofPath' proof_path,
      p->>'submittedAt' submitted_at
    from x
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'leadId',id,'applicationId',reference,'customerName',name,'phone',phone,'email',email,
      'assignedTo',assigned_name,'createdAt',created_at,'status',fee_status,'amount',amount,
      'reference',reference_no,'proofPath',proof_path,'submittedAt',submitted_at
    ) order by created_at desc),'[]'::jsonb),
    coalesce(sum(expected),0),
    coalesce(sum(case when fee_status='VERIFIED' then amount else 0 end),0),
    count(*) filter (where fee_status='PENDING'),
    count(*) filter (where fee_status='PROOF_SUBMITTED'),
    count(*) filter (where fee_status='VERIFIED'),
    count(*) filter (where fee_status='REJECTED')
  into v_rows,v_total_expected,v_total_received,v_pending,v_submitted,v_verified,v_rejected
  from y;

  return jsonb_build_object(
    'config',jsonb_build_object(
      'baseFee',v_config.initial_fee,
      'discountPercent',case when v_config.offer_active then v_config.discount_percent else 0 end,
      'offerLabel',case when v_config.offer_active then v_config.offer_label else '' end,
      'offerActive',v_config.offer_active,
      'payableFee',round(v_config.initial_fee*(1-(case when v_config.offer_active then v_config.discount_percent else 0 end)/100.0),2)
    ),
    'rows',v_rows,
    'summary',jsonb_build_object(
      'totalLeads',jsonb_array_length(v_rows),'totalExpected',v_total_expected,'totalReceived',v_total_received,
      'pending',v_pending,'proofSubmitted',v_submitted,'verified',v_verified,'rejected',v_rejected
    )
  );
end $function$
;

CREATE OR REPLACE FUNCTION public.akbs_fee_transactions_staff(p_action text, p_token text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'extensions'
AS $function$
declare
  v_user akbs_crm.users;
  v_id uuid;
  v_lead uuid;
  v_amount numeric;
  v_discount numeric;
  v_rows jsonb;
begin
  select u.* into v_user
  from akbs_crm.crm2_sessions s
  join akbs_crm.users u on u.id=s.user_id
  where s.token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex')
    and s.expires_at > now()
    and u.active=true
  limit 1;

  if v_user.id is null then raise exception 'Unauthorized'; end if;
  if v_user.must_change_password or v_user.role not in ('ADMIN','MANAGER','EMPLOYEE','FINANCE') then raise exception 'Staff access denied';end if;

  if p_action='create' then
    if v_user.role not in ('ADMIN','MANAGER','FINANCE') then raise exception 'Access denied'; end if;
    if v_user.role='MANAGER' and coalesce((p_data->>'discount')::numeric,0)<>0 then raise exception 'Only Admin/Finance can set discounts';end if;
    if coalesce((p_data->>'amount')::numeric,0)<=0 or (p_data->>'amount')::numeric>1000000000 or coalesce((p_data->>'discount')::numeric,0)<0 or coalesce((p_data->>'discount')::numeric,0)>(p_data->>'amount')::numeric then raise exception 'Invalid payment amount';end if;
    v_lead=nullif(p_data->>'leadId','')::uuid;
    if v_lead is not null and not exists(select 1 from akbs_crm.leads l where l.id=v_lead and (v_user.role='ADMIN' or akbs_crm.visible(v_user,l))) then
      raise exception 'Lead not found';
    end if;
    v_amount:=greatest(0,coalesce((p_data->>'amount')::numeric,0));
    v_discount:=least(v_amount,greatest(0,coalesce((p_data->>'discount')::numeric,0)));
    insert into akbs_crm.fee_transactions(
      lead_id,service_type,amount,discount,payable,payment_method,transaction_ref,status,note,created_by
    ) values(
      v_lead,
      left(coalesce(nullif(btrim(p_data->>'serviceType'),''),'Other Fee'),100),
      v_amount,
      v_discount,
      v_amount-v_discount,
      left(coalesce(nullif(btrim(p_data->>'paymentMethod'),''),'Other'),50),
      left(coalesce(btrim(p_data->>'transactionRef'),''),120),
      case when coalesce(p_data->>'transactionRef','')<>'' then 'UNDER_REVIEW' else 'PENDING' end,
      left(coalesce(p_data->>'note',''),500),
      v_user.id
    ) returning id into v_id;
  elsif p_action='status' then
    if v_user.role not in ('ADMIN','FINANCE') then raise exception 'Admin/Finance access required'; end if;
    v_id=(p_data->>'id')::uuid;
    perform 1 from akbs_crm.fee_transactions where id=v_id for update;
    if not exists(select 1 from akbs_crm.fee_transactions where id=v_id and ((status in ('PENDING','UNDER_REVIEW') and upper(p_data->>'status') in ('VERIFIED','REJECTED') and (upper(p_data->>'status')<>'VERIFIED' or transaction_ref<>'')) or (status='VERIFIED' and upper(p_data->>'status')='REFUNDED'))) then raise exception 'Invalid payment state transition';end if;
    perform akbs_crm.security_event(v_user.id,'PAYMENT_'||upper(p_data->>'status'),'fee_transaction',v_id::text);
    update akbs_crm.fee_transactions
    set status=upper(coalesce(p_data->>'status',status)),
        verified_by=case when upper(coalesce(p_data->>'status',''))='VERIFIED' then v_user.id else verified_by end,
        updated_at=now()
    where id=v_id;
  elsif p_action<>'snapshot' then
    raise exception 'Unsupported action';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',t.id,
    'leadId',t.lead_id,
    'applicationId',l.reference,
    'customerName',coalesce(l.name,'Manual / General'),
    'phone',coalesce(l.phone,''),
    'serviceType',t.service_type,
    'amount',t.amount,
    'discount',t.discount,
    'payable',t.payable,
    'paymentMethod',t.payment_method,
    'transactionRef',t.transaction_ref,
    'status',t.status,
    'note',t.note,
    'createdAt',t.created_at,
    'createdBy',cu.name,
    'verifiedBy',vu.name
  ) order by t.created_at desc),'[]'::jsonb)
  into v_rows
  from akbs_crm.fee_transactions t
  left join akbs_crm.leads l on l.id=t.lead_id
  join akbs_crm.users cu on cu.id=t.created_by
  left join akbs_crm.users vu on vu.id=t.verified_by
  where v_user.role='ADMIN'
     or v_user.role='FINANCE'
     or (l.id is not null and akbs_crm.visible(v_user,l));

  return jsonb_build_object('rows',v_rows);
end $function$
;

CREATE OR REPLACE FUNCTION public.akbs_fee_events_staff(p_action text, p_token text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'extensions'
AS $function$
declare
  v_user akbs_crm.users;
  v_lead akbs_crm.leads;
  v_amount numeric;
  v_note text;
  v_events jsonb;
begin
  select u.* into v_user
  from akbs_crm.crm2_sessions s
  join akbs_crm.users u on u.id=s.user_id
  where s.token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex')
    and s.expires_at > now()
    and u.active=true
  limit 1;

  if v_user.id is null then raise exception 'Unauthorized'; end if;
  if v_user.must_change_password or v_user.role not in ('ADMIN','MANAGER','EMPLOYEE','FINANCE') then raise exception 'Staff access denied';end if;

  if p_action in ('refund','adjustment') then
    if v_user.role <> 'ADMIN' then raise exception 'Admin access required'; end if;
    select * into v_lead from akbs_crm.leads where id=(p_data->>'leadId')::uuid for update;
    if v_lead.id is null then raise exception 'Lead not found'; end if;

    v_amount:=greatest(0,coalesce((p_data->>'amount')::numeric,0));
    v_note:=left(coalesce(p_data->>'note',''),500);

    if v_amount<=0 then raise exception 'Amount must be positive';end if;
    if p_action='refund' and (v_lead.details#>>'{portal_form,_initialPayment,verificationStatus}' is distinct from 'VERIFIED' or v_amount+coalesce((v_lead.details#>>'{portal_form,_initialPayment,refundedAmount}')::numeric,0)>coalesce((v_lead.details#>>'{portal_form,_initialPayment,amount}')::numeric,0)) then raise exception 'Refund exceeds verified payment';end if;
    perform akbs_crm.security_event(v_user.id,upper(p_action),'lead',v_lead.id::text,null,jsonb_build_object('amount',v_amount,'note',v_note));
    if p_action='refund' then
      insert into akbs_crm.fee_events(lead_id,event_type,amount,note,created_by)
      values(v_lead.id,'REFUND',v_amount,v_note,v_user.id);

      update akbs_crm.leads
      set details=jsonb_set(
        jsonb_set(
          details,
          '{portal_form,_initialPayment,refundedAmount}',
          to_jsonb(coalesce((details->'portal_form'->'_initialPayment'->>'refundedAmount')::numeric,0)+v_amount),
          true
        ),
        '{portal_form,_initialPayment,refundUpdatedAt}',
        to_jsonb(now()),
        true
      ),
      updated_at=now(),
      version=version+1
      where id=v_lead.id;
    else
      insert into akbs_crm.fee_events(lead_id,event_type,amount,note,created_by)
      values(v_lead.id,'ADJUSTMENT',v_amount,v_note,v_user.id);
    end if;
  elsif p_action<>'snapshot' then
    raise exception 'Unsupported action';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',e.id,
    'leadId',e.lead_id,
    'eventType',e.event_type,
    'amount',e.amount,
    'note',e.note,
    'createdAt',e.created_at,
    'createdBy',u.name
  ) order by e.created_at desc),'[]'::jsonb)
  into v_events
  from akbs_crm.fee_events e
  join akbs_crm.users u on u.id=e.created_by
  join akbs_crm.leads l on l.id=e.lead_id
  where v_user.role='ADMIN' or akbs_crm.visible(v_user,l);

  return jsonb_build_object('events',v_events);
end $function$
;

CREATE OR REPLACE FUNCTION public.akbs_payment_accounts_staff(p_action text, p_token text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'extensions'
AS $function$
declare
  v_user akbs_crm.users;
  v_id uuid;
  v_rows jsonb;
begin
  select u.* into v_user
  from akbs_crm.crm2_sessions s
  join akbs_crm.users u on u.id=s.user_id
  where s.token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex')
    and s.expires_at > now()
    and u.active=true
  limit 1;

  if v_user.id is null then raise exception 'Unauthorized'; end if;
  if v_user.must_change_password or v_user.role not in ('ADMIN','MANAGER','EMPLOYEE','FINANCE') then raise exception 'Staff access denied';end if;
  if v_user.role <> 'ADMIN' then raise exception 'Admin access required'; end if;

  if p_action<>'snapshot' then perform akbs_crm.security_event(v_user.id,'PAYMENT_ACCOUNT_'||upper(p_action),'payment_account',p_data->>'id');end if;
  if p_action='save' and coalesce(p_data->>'qrImageUrl','')<>'' and p_data->>'qrImageUrl' !~ '^https://ldffgetuzoeupuhoaubn[.]supabase[.]co/storage/v1/object/public/crm-payment-assets/' then raise exception 'Use an uploaded AKBS QR image';end if;
  if p_action='save' then
    if nullif(p_data->>'id','') is null then
      insert into akbs_crm.payment_accounts(
        label,account_holder,bank_name,account_number,ifsc,branch,upi_id,qr_image_url,is_default,active,updated_by
      ) values(
        left(coalesce(nullif(btrim(p_data->>'label'),''),'AKBS Company Account'),100),
        left(coalesce(nullif(btrim(p_data->>'accountHolder'),''),'AKBS Poultry Farming Pvt. Ltd.'),140),
        left(coalesce(btrim(p_data->>'bankName'),''),120),
        left(coalesce(btrim(p_data->>'accountNumber'),''),64),
        upper(left(coalesce(btrim(p_data->>'ifsc'),''),32)),
        left(coalesce(btrim(p_data->>'branch'),''),120),
        left(coalesce(btrim(p_data->>'upiId'),''),120),
        left(coalesce(btrim(p_data->>'qrImageUrl'),''),500),
        false,
        coalesce((p_data->>'active')::boolean,true),
        v_user.id
      ) returning id into v_id;
    else
      v_id=(p_data->>'id')::uuid;
      update akbs_crm.payment_accounts
      set label=left(coalesce(nullif(btrim(p_data->>'label'),''),label),100),
          account_holder=left(coalesce(nullif(btrim(p_data->>'accountHolder'),''),account_holder),140),
          bank_name=left(coalesce(btrim(p_data->>'bankName'),bank_name),120),
          account_number=left(coalesce(btrim(p_data->>'accountNumber'),account_number),64),
          ifsc=upper(left(coalesce(btrim(p_data->>'ifsc'),ifsc),32)),
          branch=left(coalesce(btrim(p_data->>'branch'),branch),120),
          upi_id=left(coalesce(btrim(p_data->>'upiId'),upi_id),120),
          qr_image_url=left(coalesce(btrim(p_data->>'qrImageUrl'),qr_image_url),500),
          active=coalesce((p_data->>'active')::boolean,active),
          updated_at=now(),
          updated_by=v_user.id
      where id=v_id;
    end if;
  elsif p_action='set_default' then
    v_id=(p_data->>'id')::uuid;
    if not exists(select 1 from akbs_crm.payment_accounts where id=v_id and active) then raise exception 'Account not found';end if;
    update akbs_crm.payment_accounts set is_default=false,updated_at=now(),updated_by=v_user.id where is_default=true;
    update akbs_crm.payment_accounts set is_default=true,active=true,updated_at=now(),updated_by=v_user.id where id=v_id;
  elsif p_action='delete' then
    v_id=(p_data->>'id')::uuid;
    update akbs_crm.payment_accounts set active=false,is_default=false,updated_at=now(),updated_by=v_user.id where id=v_id;
  elsif p_action<>'snapshot' then
    raise exception 'Unsupported action';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'label',label,'accountHolder',account_holder,'bankName',bank_name,'accountNumber',account_number,
    'ifsc',ifsc,'branch',branch,'upiId',upi_id,'qrImageUrl',qr_image_url,'isDefault',is_default,'active',active,'updatedAt',updated_at
  ) order by is_default desc,created_at desc),'[]'::jsonb)
  into v_rows
  from akbs_crm.payment_accounts
  where active=true;

  return jsonb_build_object('accounts',v_rows);
end $function$
;

CREATE OR REPLACE FUNCTION public.akbs_soft_quotation_workspace(p_action text, p_data jsonb DEFAULT '{}'::jsonb, p_token text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  u akbs_crm.users;
  q public.soft_quotations;
  qid uuid;
  lead_uuid uuid;
  quote jsonb;
  next_status text;
  actor_role text;
  visible_ok boolean;
  t public.soft_quotation_templates;
begin
  select usr.* into u
  from akbs_crm.users usr
  join akbs_crm.crm2_sessions s on s.user_id=usr.id
  where s.token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
    and s.expires_at>now()
    and usr.active
  limit 1;

  if u.id is null then
    return jsonb_build_object('error','Please sign in','status',401);
  end if;

  if u.must_change_password or u.role not in ('ADMIN','MANAGER','EMPLOYEE') then return jsonb_build_object('error','Staff access denied','status',403);end if;
  actor_role := case
    when u.role='ADMIN' then 'admin'
    when u.role='MANAGER' then 'manager'
    else 'employee'
  end;

  if p_action='list' then
    return jsonb_build_object(
      'quotes',
      coalesce((
        select jsonb_agg(
          coalesce(sq.akbs_payload,'{}'::jsonb)
          || jsonb_build_object(
            'id',sq.id,
            'quotationNo',sq.quotation_no,
            'status',sq.status,
            'version',sq.current_version,
            'acceptanceToken',sq.acceptance_token,
            'createdBy',sq.created_by,
            'createdByRole',sq.created_by_role,
            'createdAt',sq.created_at,
            'modifiedBy',sq.modified_by,
            'modifiedAt',sq.updated_at,
            'approvedBy',sq.approved_by,
            'approvedAt',sq.approved_at,
            'rejectedBy',sq.rejected_by,
            'rejectedAt',sq.rejected_at,
            'rejectionReason',sq.rejection_reason,
            'sentAt',sq.sent_at,
            'viewedAt',sq.viewed_at,
            'acceptedAt',sq.accepted_at
          )
          order by sq.updated_at desc
        )
        from public.soft_quotations sq
        where
          case
            when u.role='ADMIN' then true
            when u.role='MANAGER' then exists(
              select 1 from akbs_crm.leads l
              where l.id=nullif(sq.akbs_payload->>'akbsLeadId','')::uuid
                and l.manager_id=u.id
            )
            when u.role='EMPLOYEE' then exists(
              select 1 from akbs_crm.leads l
              where l.id=nullif(sq.akbs_payload->>'akbsLeadId','')::uuid
                and l.assigned_to=u.id
            )
            else false
          end
      ),'[]'::jsonb)
    );
  end if;

  if p_action in ('save_draft','submit_review') then
    quote := coalesce(p_data->'quote','{}'::jsonb);
    if jsonb_typeof(quote)<>'object' or octet_length(quote::text)>120000 then raise exception 'Invalid quotation';end if;
    quote := quote - array['approvedBy','approvedAt','rejectedBy','rejectedAt','sentAt','viewedAt','acceptedAt','acceptanceToken','createdBy','createdByRole','requestedByUserId','reportingManagerId'];
    begin
      lead_uuid := nullif(quote#>>'{customer,leadId}','')::uuid;
    exception when others then
      lead_uuid := null;
    end;

    if lead_uuid is null then
      return jsonb_build_object('error','Select an existing assigned lead before creating a quotation.','status',400);
    end if;

    select akbs_crm.visible(u,l) into visible_ok
    from akbs_crm.leads l where l.id=lead_uuid;

    if coalesce(visible_ok,false) is not true then
      return jsonb_build_object('error','This lead is not available in your assigned scope.','status',403);
    end if;

    if u.role='EMPLOYEE' then
      select * into t
      from public.soft_quotation_templates
      where active=true and approved=true
        and template_code='AKBS-EC-BROILER-20000'
      order by updated_at desc
      limit 1;

      quote := quote
        || jsonb_build_object(
          'projectName',coalesce(t.template_name,'20,000 Birds Environment Controlled Broiler Farm'),
          'projectType',coalesce(t.project_type,'Environment Controlled Broiler Farm'),
          'projectCapacity',coalesce(t.capacity,20000),
          'projectUnit',coalesce(t.capacity_unit,'Birds'),
          'shedSize',coalesce(t.project_data->>'shedSize','300 ft × 40 ft'),
          'coveredArea',coalesce(t.project_data->>'coveredArea','12,000 Sq.ft.'),
          'technology',coalesce(t.project_data->>'technology','Environment Controlled / Tunnel Ventilation'),
          'technicalSpecifications',coalesce(t.technical_specifications,quote->'technicalSpecifications'),
          'scopeOfWork',coalesce(t.scope_of_work,quote->'scopeOfWork'),
          'costBreakup',coalesce(t.cost_breakup,quote->'costBreakup'),
          'exclusions',coalesce(t.exclusions,quote->'exclusions'),
          'executionTimeline',coalesce(t.execution_timeline,quote->'executionTimeline'),
          'commercialTerms',coalesce(t.commercial_terms,quote->'commercialTerms'),
          'templateLocked',true,
          'employeeRequestOnly',true
        );

      next_status := case when p_action='submit_review' then 'REVIEW' else 'DRAFT' end;
    else
      next_status := case when p_action='submit_review' then 'REVIEW' else 'DRAFT' end;
    end if;

    begin
      qid := nullif(quote->>'id','')::uuid;
    exception when others then
      qid := null;
    end;

    if qid is null or not exists(select 1 from public.soft_quotations where id=qid) then
      insert into public.soft_quotations(
        id,quotation_no,lead_id,customer_snapshot,project_name,project_type,project_location,
        project_capacity,project_unit,shed_size,covered_area,technology,estimated_project_cost,
        quotation_validity_days,valid_until,expected_completion_timeline,project_overview,
        technical_specifications,scope_of_work,cost_breakup,exclusions,commercial_terms,
        project_economics,execution_timeline,subtotal,tax_amount,other_charges,discount,grand_total,
        status,current_version,acceptance_token,created_by,created_by_role,modified_by,modified_by_role,
        customer_acceptance_required,akbs_payload
      ) values (
        coalesce(qid,gen_random_uuid()),
        coalesce(nullif(quote->>'quotationNo',''),public.next_soft_quotation_number()),
        null,
        coalesce(quote->'customer','{}'::jsonb),
        coalesce(quote->>'projectName',''),
        coalesce(quote->>'projectType',''),
        coalesce(quote->>'projectLocation',''),
        coalesce((quote->>'projectCapacity')::numeric,0),
        coalesce(quote->>'projectUnit','Birds'),
        coalesce(quote->>'shedSize',''),
        coalesce(quote->>'coveredArea',''),
        coalesce(quote->>'technology',''),
        coalesce((quote->>'estimatedProjectCost')::numeric,0),
        greatest(coalesce((quote->>'quotationValidity')::integer,30),1),
        nullif(quote->>'validUntil','')::date,
        coalesce(quote->>'expectedCompletionTimeline','Requires Confirmation'),
        coalesce(quote->>'projectOverview',''),
        coalesce(quote->'technicalSpecifications','{}'::jsonb),
        coalesce(quote->'scopeOfWork','[]'::jsonb),
        coalesce(quote->'costBreakup','[]'::jsonb),
        coalesce(quote->'exclusions','[]'::jsonb),
        coalesce(quote->'commercialTerms','{}'::jsonb),
        coalesce(quote->'projectEconomics','{}'::jsonb),
        coalesce(quote->'executionTimeline','[]'::jsonb),
        coalesce((quote->>'subtotal')::numeric,0),
        coalesce((quote->>'taxAmount')::numeric,0),
        coalesce((quote->>'otherCharges')::numeric,0),
        coalesce((quote->>'discount')::numeric,0),
        coalesce((quote->>'grandTotal')::numeric,0),
        next_status,
        1,
        gen_random_uuid(),
        u.name,
        actor_role,
        u.name,
        actor_role,
        true,
        quote || jsonb_build_object(
          'akbsLeadId',lead_uuid,
          'requestedByUserId',u.id,
          'requestedByName',u.name,
          'reportingManagerId',u.manager_id
        )
      )
      returning * into q;
    else
      select * into q from public.soft_quotations where id=qid for update;
      if not exists(select 1 from akbs_crm.leads l where l.id=nullif(q.akbs_payload->>'akbsLeadId','')::uuid and akbs_crm.visible(u,l)) or nullif(q.akbs_payload->>'akbsLeadId','')::uuid is distinct from lead_uuid then return jsonb_build_object('error','Quotation is outside your assigned scope','status',403);end if;
      if q.status not in ('DRAFT','REJECTED') and not(u.role in ('ADMIN','MANAGER') and q.status='REVIEW') then return jsonb_build_object('error','Only draft, rejected or manager-review quotations can be edited','status',409);end if;

      if u.role='EMPLOYEE' and coalesce(q.akbs_payload->>'requestedByUserId','')<>u.id::text then
        return jsonb_build_object('error','You can only edit your own quotation request.','status',403);
      end if;
      if q.status not in ('DRAFT','REJECTED') and u.role='EMPLOYEE' then
        return jsonb_build_object('error','This request is already under manager review.','status',409);
      end if;

      update public.soft_quotations
      set customer_snapshot=coalesce(quote->'customer',customer_snapshot),
          project_name=coalesce(quote->>'projectName',project_name),
          project_type=coalesce(quote->>'projectType',project_type),
          project_location=coalesce(quote->>'projectLocation',project_location),
          project_capacity=coalesce((quote->>'projectCapacity')::numeric,project_capacity),
          project_unit=coalesce(quote->>'projectUnit',project_unit),
          shed_size=coalesce(quote->>'shedSize',shed_size),
          covered_area=coalesce(quote->>'coveredArea',covered_area),
          technology=coalesce(quote->>'technology',technology),
          estimated_project_cost=coalesce((quote->>'estimatedProjectCost')::numeric,estimated_project_cost),
          quotation_validity_days=greatest(coalesce((quote->>'quotationValidity')::integer,quotation_validity_days),1),
          valid_until=coalesce(nullif(quote->>'validUntil','')::date,valid_until),
          expected_completion_timeline=coalesce(quote->>'expectedCompletionTimeline',expected_completion_timeline),
          project_overview=coalesce(quote->>'projectOverview',project_overview),
          technical_specifications=coalesce(quote->'technicalSpecifications',technical_specifications),
          scope_of_work=coalesce(quote->'scopeOfWork',scope_of_work),
          cost_breakup=coalesce(quote->'costBreakup',cost_breakup),
          exclusions=coalesce(quote->'exclusions',exclusions),
          commercial_terms=coalesce(quote->'commercialTerms',commercial_terms),
          project_economics=coalesce(quote->'projectEconomics',project_economics),
          execution_timeline=coalesce(quote->'executionTimeline',execution_timeline),
          subtotal=coalesce((quote->>'subtotal')::numeric,subtotal),
          tax_amount=coalesce((quote->>'taxAmount')::numeric,tax_amount),
          other_charges=coalesce((quote->>'otherCharges')::numeric,other_charges),
          discount=coalesce((quote->>'discount')::numeric,discount),
          grand_total=coalesce((quote->>'grandTotal')::numeric,grand_total),
          status=next_status,
          modified_by=u.name,
          modified_by_role=actor_role,
          akbs_payload=quote || jsonb_build_object(
            'akbsLeadId',lead_uuid,
            'requestedByUserId',coalesce(q.akbs_payload->>'requestedByUserId',u.id::text),
            'requestedByName',coalesce(q.akbs_payload->>'requestedByName',u.name),
            'reportingManagerId',coalesce(q.akbs_payload->>'reportingManagerId',u.manager_id::text)
          )
      where id=qid
      returning * into q;
    end if;

    perform akbs_crm.audit(
      u.id,lead_uuid,
      case when next_status='REVIEW' then 'SOFT_QUOTATION_REVIEW_REQUESTED' else 'SOFT_QUOTATION_DRAFT_SAVED' end,
      q.quotation_no||' · '||next_status,false
    );

    return jsonb_build_object('ok',true,'id',q.id,'quotation_no',q.quotation_no,'status',q.status,'version',q.current_version);
  end if;

  qid := nullif(p_data->>'id','')::uuid;
  select * into q from public.soft_quotations where id=qid for update;
  if q.id is null then return jsonb_build_object('error','Quotation not found','status',404); end if;

  begin
    lead_uuid := nullif(q.akbs_payload->>'akbsLeadId','')::uuid;
  exception when others then
    lead_uuid := null;
  end;

  if u.role='MANAGER' and not exists(
    select 1 from akbs_crm.leads l where l.id=lead_uuid and l.manager_id=u.id
  ) then
    return jsonb_build_object('error','This quotation is outside your team.','status',403);
  end if;
  if u.role='EMPLOYEE' then
    return jsonb_build_object('error','Manager approval is required.','status',403);
  end if;

  if p_action='approve' then
    if q.status<>'REVIEW' then return jsonb_build_object('error','Only quotations under review can be approved.','status',409); end if;
    update public.soft_quotations
      set status='APPROVED',approved_by=u.name,approved_at=now(),modified_by=u.name,modified_by_role=actor_role
      where id=q.id returning * into q;
    perform akbs_crm.audit(u.id,lead_uuid,'SOFT_QUOTATION_APPROVED',q.quotation_no,false);
    return jsonb_build_object('ok',true,'status',q.status);
  elsif p_action='reject' then
    if q.status<>'REVIEW' then return jsonb_build_object('error','Only quotations under review can be rejected.','status',409); end if;
    update public.soft_quotations
      set status='REJECTED',rejected_by=u.name,rejected_at=now(),
          rejection_reason=coalesce(p_data->>'reason','Revision requested by manager'),
          modified_by=u.name,modified_by_role=actor_role
      where id=q.id returning * into q;
    perform akbs_crm.audit(u.id,lead_uuid,'SOFT_QUOTATION_REJECTED',q.quotation_no||' · '||q.rejection_reason,false);
    return jsonb_build_object('ok',true,'status',q.status);
  elsif p_action='mark_sent' then
    if q.status<>'APPROVED' then return jsonb_build_object('error','Manager approval is required before sending.','status',409); end if;
    update public.soft_quotations
      set status='SENT',sent_at=now(),modified_by=u.name,modified_by_role=actor_role
      where id=q.id returning * into q;
    perform akbs_crm.audit(u.id,lead_uuid,'SOFT_QUOTATION_SENT',q.quotation_no,true);
    return jsonb_build_object('ok',true,'status',q.status);
  end if;

  return jsonb_build_object('error','Unknown quotation action','status',400);
end $function$
;

CREATE OR REPLACE FUNCTION public.akbs_send_approved_soft_quotation_email(p_quotation_id uuid, p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  u akbs_crm.users;
  q public.soft_quotations;
  resend_key text;
  cfg public.akbs_email_settings%rowtype;
  recipient text;
  customer_name text;
  html text;
begin
  select usr.* into u
  from akbs_crm.users usr
  join akbs_crm.crm2_sessions s on s.user_id=usr.id
  where s.token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
    and s.expires_at>now()
    and usr.active
  limit 1;

  if u.id is null then return jsonb_build_object('error','Please sign in','status',401); end if;
  if u.must_change_password then return jsonb_build_object('error','Change your temporary password first','status',403);end if;
  if u.role not in ('ADMIN','MANAGER') then
    return jsonb_build_object('error','Manager approval is required before customer dispatch.','status',403);
  end if;

  select * into q from public.soft_quotations where id=p_quotation_id for update;
  if q.id is null then return jsonb_build_object('error','Quotation not found','status',404); end if;
  if not exists(select 1 from akbs_crm.leads l where l.id=nullif(q.akbs_payload->>'akbsLeadId','')::uuid and akbs_crm.visible(u,l)) then return jsonb_build_object('error','Quotation not found','status',404);end if;
  if not akbs_crm.rate('quote-email:'||u.id,10,3600) then return jsonb_build_object('error','Please try later','status',429);end if;
  if q.status not in ('APPROVED','SENT','VIEWED') then
    return jsonb_build_object('error','Approve the quotation before sending it to the customer.','status',409);
  end if;

  recipient := lower(trim(coalesce(q.customer_snapshot->>'email','')));
  customer_name := coalesce(nullif(q.customer_snapshot->>'customerName',''),'Customer');
  if recipient !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    return jsonb_build_object('error','Customer email is missing or invalid.','status',400);
  end if;

  select * into cfg from public.akbs_email_settings where id=1;
  select decrypted_secret into resend_key
  from vault.decrypted_secrets
  where name='akbs_resend_api_key'
  order by created_at desc limit 1;

  if coalesce(resend_key,'')='' then
    return jsonb_build_object('error','Email service is not configured.','status',500);
  end if;

  html :=
    '<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;border:1px solid #dce8e1;border-radius:16px;overflow:hidden">'
    ||'<div style="background:#0b3824;color:white;padding:24px"><h2 style="margin:0">AKBS Poultry Farming – Soft Quotation</h2></div>'
    ||'<div style="padding:28px;color:#173b2c">'
    ||'<p>Dear '||replace(replace(customer_name,'&','&amp;'),'<','&lt;')||',</p>'
    ||'<p>Your approved preliminary soft quotation is ready for review.</p>'
    ||'<div style="background:#f3f8f5;border:1px solid #dce8e1;border-radius:12px;padding:16px;margin:18px 0">'
    ||'<p style="margin:5px 0"><strong>Quotation:</strong> '||q.quotation_no||'</p>'
    ||'<p style="margin:5px 0"><strong>Project:</strong> '||replace(replace(q.project_name,'&','&amp;'),'<','&lt;')||'</p>'
    ||'<p style="margin:5px 0"><strong>Estimated Project Cost:</strong> ₹'||to_char(q.grand_total,'FM99,99,99,99,990')||'</p>'
    ||'</div>'
    ||'<p><a href="https://crm.akbspoultry.com/soft-quotations/accept/'||q.acceptance_token::text||'" style="display:inline-block;background:#0b3824;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold">Review / Accept Quotation</a></p>'
    ||'<p style="font-size:12px;color:#66736c">This is a preliminary project estimate and remains subject to final site survey, engineering review, scope confirmation and applicable commercial terms.</p>'
    ||'</div></div>';

  perform net.http_post(
    url:='https://api.resend.com/emails',
    headers:=jsonb_build_object(
      'Authorization','Bearer '||resend_key,
      'Content-Type','application/json'
    ),
    body:=jsonb_build_object(
      'from',coalesce(cfg.customer_sender_name,'AKBS Poultry Farming')||' <'||coalesce(cfg.customer_sender_email,'website@akbspoultry.com')||'>',
      'to',jsonb_build_array(recipient),
      'subject','AKBS Soft Quotation - '||q.quotation_no,
      'html',html,
      'reply_to',coalesce(cfg.customer_reply_to,'info@akbspoultry.com')
    )
  );

  if q.status='APPROVED' then
    update public.soft_quotations
    set status='SENT',sent_at=now(),modified_by=u.name,
        modified_by_role=case when u.role='ADMIN' then 'admin' else 'manager' end
    where id=q.id;
  end if;

  return jsonb_build_object('ok',true,'sent_to',recipient);
end $function$
;

CREATE OR REPLACE FUNCTION public.get_soft_quotation_for_acceptance(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  q public.soft_quotations%rowtype;
begin
  select * into q
  from public.soft_quotations
  where acceptance_token=p_token
    and status in ('APPROVED','SENT','VIEWED')
    and archived_at is null and (valid_until is null or valid_until>=current_date)
  limit 1;

  if q.id is null then
    return jsonb_build_object('error','Quotation link is invalid or no longer available.');
  end if;

  if q.status='SENT' then
    update public.soft_quotations
    set status='VIEWED', viewed_at=coalesce(viewed_at,now())
    where id=q.id;
    q.status := 'VIEWED';
  end if;

  return jsonb_build_object(
    'id',q.id,
    'quotation_no',q.quotation_no,
    'version',q.current_version,
    'status',q.status,
    'customer',q.customer_snapshot,
    'project_name',q.project_name,
    'project_type',q.project_type,
    'capacity',q.project_capacity,
    'project_unit',q.project_unit,
    'estimated_project_cost',q.estimated_project_cost,
    'grand_total',q.grand_total,
    'valid_until',q.valid_until
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.accept_soft_quotation(p_token uuid, p_customer_name text, p_customer_email text DEFAULT NULL::text, p_customer_mobile text DEFAULT NULL::text, p_typed_signature text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  q public.soft_quotations%rowtype;
  v_headers jsonb;
  v_ip inet;
  v_ua text;
begin
 if length(coalesce(p_customer_name,''))>200 or length(coalesce(p_customer_email,''))>254 or length(coalesce(p_customer_mobile,''))>40 or length(coalesce(p_typed_signature,''))>200 then return jsonb_build_object('error','Input too long');end if;
  if length(trim(coalesce(p_customer_name,''))) < 2 then
    return jsonb_build_object('error','Customer name is required.');
  end if;
  if length(trim(coalesce(p_typed_signature,''))) < 2 then
    return jsonb_build_object('error','Typed signature is required.');
  end if;

  select * into q
  from public.soft_quotations
  where acceptance_token=p_token
    and status in ('APPROVED','SENT','VIEWED')
    and archived_at is null
  for update;

  if q.id is null then
    return jsonb_build_object('error','Quotation link is invalid or no longer available.');
  end if;

  if q.valid_until is not null and q.valid_until < current_date then
    update public.soft_quotations set status='EXPIRED' where id=q.id;
    return jsonb_build_object('error','This quotation has expired.');
  end if;

  begin
    v_headers := current_setting('request.headers',true)::jsonb;
    v_ua := v_headers->>'user-agent';
    if coalesce(v_headers->>'x-forwarded-for','') <> '' then
      v_ip := split_part(v_headers->>'x-forwarded-for',',',1)::inet;
    end if;
  exception when others then
    v_ip := null;
    v_ua := null;
  end;

  insert into public.soft_quotation_acceptance(
    quotation_id,version,customer_name,customer_email,customer_mobile,typed_signature,ip_address,user_agent
  )
  values(q.id,q.current_version,trim(p_customer_name),nullif(trim(coalesce(p_customer_email,'')),''),nullif(trim(coalesce(p_customer_mobile,'')),''),trim(p_typed_signature),v_ip,v_ua)
  on conflict(quotation_id,version) do nothing;

  update public.soft_quotations
  set status='ACCEPTED', accepted_at=now()
  where id=q.id;

  perform public.st_crm_write_audit(
    coalesce(p_customer_email,p_customer_mobile,p_customer_name),
    'customer',
    'SOFT_QUOTATION_ACCEPTED',
    'soft_quotation',
    q.id::text,
    null,
    jsonb_build_object('version',q.current_version,'customer_name',p_customer_name),
    null,
    v_ip
  );

  return jsonb_build_object('ok',true,'quotation_no',q.quotation_no,'version',q.current_version);
end;
$function$
;


create table if not exists akbs_crm.payment_reference_claims(reference text primary key,lead_id uuid,transaction_id uuid,created_at timestamptz default now());
alter table akbs_crm.payment_reference_claims enable row level security;
revoke all on akbs_crm.payment_reference_claims from public,anon,authenticated;
create or replace function akbs_crm.guard_fee_transaction() returns trigger language plpgsql security definer set search_path='' as $$ declare ref text; begin
 if new.amount<=0 or new.discount<0 or new.discount>new.amount or new.payable<>new.amount-new.discount then raise exception 'Invalid payment amount';end if;
 if tg_op='UPDATE' and old.status in ('VERIFIED','REFUNDED') and (new.amount,new.discount,new.payable,new.transaction_ref,new.lead_id,new.service_type) is distinct from (old.amount,old.discount,old.payable,old.transaction_ref,old.lead_id,old.service_type) then raise exception 'Verified payments are immutable';end if;
 ref:=upper(regexp_replace(coalesce(new.transaction_ref,''),'[^A-Za-z0-9]','','g'));
 if ref<>'' and (tg_op='INSERT' or new.transaction_ref is distinct from old.transaction_ref) then
  if exists(select 1 from akbs_crm.fee_transactions where upper(regexp_replace(transaction_ref,'[^A-Za-z0-9]','','g'))=ref and id<>new.id) or exists(select 1 from akbs_crm.leads where upper(regexp_replace(details#>>'{portal_form,_initialPayment,reference}','[^A-Za-z0-9]','','g'))=ref) then raise exception 'Transaction reference already submitted';end if;
  insert into akbs_crm.payment_reference_claims(reference,lead_id,transaction_id) values(ref,new.lead_id,new.id);
 end if;
 return new;
end $$;
drop trigger if exists security_fee_transaction on akbs_crm.fee_transactions;
create trigger security_fee_transaction before insert or update on akbs_crm.fee_transactions for each row execute function akbs_crm.guard_fee_transaction();
revoke all on all functions in schema akbs_crm from public,anon,authenticated;
notify pgrst,'reload schema';


create or replace function public.akbs_security_limit(p_scope text,p_token text,p_kind text default 'customer') returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid; email text; max_hits integer;begin
 if p_scope in ('ai','qr') then
  select u.id into uid from akbs_crm.users u join akbs_crm.crm2_sessions s on s.user_id=u.id where s.token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') and s.expires_at>now() and u.active and not u.must_change_password and u.role in ('ADMIN','MANAGER');
  if uid is null then return jsonb_build_object('error','Access denied','status',403);end if;
  max_hits:=20;
 elsif p_scope in ('proof','receipt') and p_kind='customer' then
  select a.crm_user_id,s.email into uid,email from akbs_crm.portal_custom_sessions s join akbs_crm.portal_custom_accounts a on a.kind=s.kind and lower(a.email)=lower(s.email) join akbs_crm.users u on u.id=a.crm_user_id
   where s.kind=p_kind and s.token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') and s.revoked_at is null and s.expires_at>now() and u.active and u.role='CUSTOMER';
  if uid is null then return jsonb_build_object('error','Please sign in','status',401);end if;
  max_hits:=case when p_scope='receipt' then 5 else 12 end;
 else return jsonb_build_object('error','Unsupported operation','status',400);end if;
 if not akbs_crm.rate('secure:'||p_scope||':'||uid,max_hits,3600) then return jsonb_build_object('error','Too many requests. Please try later.','status',429);end if;
 return jsonb_build_object('ok',true,'userId',uid,'email',email);
end $$;
revoke all on function public.akbs_security_limit(text,text,text) from public;
grant execute on function public.akbs_security_limit(text,text,text) to anon,authenticated,service_role;

create or replace function public.akbs_payment_proof_save(p_token text,p_application text,p_reference text,p_path text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid;l akbs_crm.leads;cfg akbs_crm.fee_settings;ref text;payment jsonb;old_payment jsonb;amount numeric;begin
 select a.crm_user_id into uid from akbs_crm.portal_custom_sessions s join akbs_crm.portal_custom_accounts a on a.kind=s.kind and lower(a.email)=lower(s.email) join akbs_crm.users u on u.id=a.crm_user_id
 where s.kind='customer' and s.token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') and s.revoked_at is null and s.expires_at>now() and u.active and u.role='CUSTOMER';
 if uid is null then raise exception 'Unauthorized';end if;
 select * into l from akbs_crm.leads where reference=p_application and customer_id=uid for update;
 if l.id is null then raise exception 'Application not found';end if;
 old_payment:=l.details#>'{portal_form,_initialPayment}';
 if old_payment->>'verificationStatus'='VERIFIED' then raise exception 'Verified payments cannot be replaced';end if;
 if p_path is not null and p_path !~ ('^akbs/customer/'||l.id||'/[a-f0-9-]+[.](png|jpg|webp|pdf)$') then raise exception 'Invalid proof path';end if;
 ref:=upper(regexp_replace(coalesce(p_reference,''),'[^A-Za-z0-9]','','g'));
 if ref='' and p_path is null then raise exception 'Reference or proof required';end if;
 if ref<>'' then
  if length(ref) not between 6 and 60 then raise exception 'Invalid transaction reference';end if;
  perform pg_advisory_xact_lock(hashtextextended(ref,0));
  if exists(select 1 from akbs_crm.payment_reference_claims where reference=ref and (lead_id is distinct from l.id or transaction_id is not null)) or exists(select 1 from akbs_crm.leads where id<>l.id and upper(regexp_replace(details#>>'{portal_form,_initialPayment,reference}','[^A-Za-z0-9]','','g'))=ref) or exists(select 1 from akbs_crm.fee_transactions where upper(regexp_replace(transaction_ref,'[^A-Za-z0-9]','','g'))=ref) then raise exception 'Transaction reference already submitted';end if;
  insert into akbs_crm.payment_reference_claims(reference,lead_id) values(ref,l.id) on conflict do nothing;
 end if;
 select * into cfg from akbs_crm.fee_settings where id=true;
 if cfg.id is null then raise exception 'Fee configuration unavailable';end if;
 amount:=round(cfg.initial_fee*(1-(case when cfg.offer_active then cfg.discount_percent else 0 end)/100),2);
 payment:=jsonb_build_object('amount',amount,'baseAmount',cfg.initial_fee,'discountPercent',case when cfg.offer_active then cfg.discount_percent else 0 end,'feeLabel','Initial Project Assessment & Registration Fee','reference',nullif(ref,''),'proofPath',p_path,'submittedAt',now(),'verificationStatus','PENDING','status','CUSTOMER_SUBMITTED_PENDING_VERIFICATION','customerDeclaredCompanyAccountOnly',true);
 update akbs_crm.leads set details=jsonb_set(details,'{portal_form}',coalesce(details->'portal_form','{}')||jsonb_build_object('_initialPayment',payment)),version=version+1,updated_at=now() where id=l.id;
 perform akbs_crm.security_event(uid,'PAYMENT_PROOF_SUBMITTED','lead',l.id::text,old_payment,payment);
 return jsonb_build_object('ok',true,'applicationId',l.reference,'payment',payment);
end $$;
revoke all on function public.akbs_payment_proof_save(text,text,text,text) from public,anon,authenticated;
grant execute on function public.akbs_payment_proof_save(text,text,text,text) to service_role;

CREATE OR REPLACE FUNCTION public.akbs_crm_workspace_staffbase(p_action text, p_data jsonb DEFAULT '{}'::jsonb, p_token text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  payload jsonb := p_data;
  result jsonb;
  generated_secret text;
  cfg public.akbs_email_settings%rowtype;
  resend_key text;
  recipient text;
  staff_name text;
  html text;
  new_uid uuid;
begin
  if p_action='user_create' then
    if coalesce(payload->>'password','')='' then
      generated_secret :=
        substr(encode(extensions.gen_random_bytes(24),'base64'),1,16)
        || 'A9!';
      payload := payload || jsonb_build_object('password',generated_secret);
    else
      generated_secret := payload->>'password';
    end if;

    result := public.akbs_crm_workspace_legacy(p_action,payload,p_token);

    if coalesce(result->>'error','')='' and result->'user'->>'id' is not null then
      new_uid := (result->'user'->>'id')::uuid;

      update akbs_crm.users
      set profile = coalesce(profile,'{}'::jsonb) || jsonb_build_object(
        'email', lower(trim(coalesce(payload->>'login',''))),
        'job_profile', coalesce(payload->>'job_profile',''),
        'role_title', coalesce(payload->>'role_title','')
      )
      where id=new_uid;

      recipient := lower(trim(coalesce(payload->>'login','')));
      staff_name := trim(coalesce(payload->>'name','AKBS Team Member'));

      select * into cfg from public.akbs_email_settings where id=1;
      select decrypted_secret into resend_key
      from vault.decrypted_secrets
      where name='akbs_resend_api_key'
      order by created_at desc
      limit 1;

      if recipient ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
         and coalesce(resend_key,'')<>'' then
        html :=
          '<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;border:1px solid #dce8e1;border-radius:16px;overflow:hidden">'
          ||'<div style="background:#0b3824;color:white;padding:24px"><h2 style="margin:0">AKBS CRM Staff Login</h2></div>'
          ||'<div style="padding:28px;color:#173b2c">'
          ||'<p>Dear '||replace(replace(staff_name,'&','&amp;'),'<','&lt;')||',</p>'
          ||'<p>Your AKBS CRM staff account has been created.</p>'
          ||'<div style="background:#f3f8f5;border:1px solid #dce8e1;border-radius:12px;padding:16px;margin:18px 0">'
          ||'<p style="margin:5px 0"><strong>Login ID:</strong> '||recipient||'</p>'
          ||'<p style="margin:5px 0"><strong>Temporary Password:</strong> <span style="font-family:monospace;font-size:16px">'||replace(replace(generated_secret,'&','&amp;'),'<','&lt;')||'</span></p>'
          ||'<p style="margin:5px 0"><strong>Role:</strong> '||coalesce(payload->>'role_title',payload->>'role','EMPLOYEE')||'</p>'
          ||'</div>'
          ||'<p><strong>First login requirement:</strong> Change this temporary password before using the CRM workspace.</p>'
          ||'<p><a href="https://crm.akbspoultry.com">Open AKBS CRM</a></p>'
          ||'<p style="font-size:12px;color:#66736c">Keep these login details private.</p>'
          ||'</div></div>';

        perform net.http_post(
          url:='https://api.resend.com/emails',
          headers:=jsonb_build_object(
            'Authorization','Bearer '||resend_key,
            'Content-Type','application/json'
          ),
          body:=jsonb_build_object(
            'from',coalesce(cfg.customer_sender_name,'AKBS Poultry Farming')||' <'||coalesce(cfg.customer_sender_email,'website@akbspoultry.com')||'>',
            'to',jsonb_build_array(recipient),
            'subject','Your AKBS CRM staff login details',
            'html',html,
            'reply_to',coalesce(cfg.customer_reply_to,'info@akbspoultry.com')
          )
        );
      end if;

      result := result || jsonb_build_object(
        
        'must_change_on_first_login',true,
        'email_sent',recipient ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' and coalesce(resend_key,'')<>''
      );
    end if;

    return result;
  end if;

  return public.akbs_crm_workspace_legacy(p_action,payload,p_token);
end $function$
;
CREATE OR REPLACE FUNCTION public.akbs_portal_draft_save(p_kind text, p_session_token text, p_request_id uuid, p_form jsonb, p_current_stage integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'extensions'
AS $function$
declare
  v_email text;
begin
  select email into v_email
  from akbs_crm.portal_custom_sessions
  where kind=p_kind
    and token_hash=encode(digest(coalesce(p_session_token,''),'sha256'),'hex')
    and revoked_at is null
    and expires_at > now()
  order by created_at desc limit 1;

  if not exists(select 1 from akbs_crm.portal_custom_accounts a join akbs_crm.users u on u.id=a.crm_user_id where a.kind=p_kind and lower(a.email)=lower(v_email) and u.active and u.role=upper(p_kind)) then raise exception 'Your verified portal session has expired.';end if;
  if coalesce(v_email,'')='' then
    raise exception 'Your verified portal session has expired.';
  end if;
  if p_request_id is null or jsonb_typeof(coalesce(p_form,'{}'::jsonb)) <> 'object' then
    raise exception 'Invalid draft.';
  end if;

  perform akbs_crm.validate_portal_form(p_form);
  if (select count(*) from akbs_crm.portal_drafts where kind=p_kind and lower(email)=lower(v_email) and request_id<>p_request_id)>=20 then raise exception 'Draft limit reached';end if;
  insert into akbs_crm.portal_drafts(kind,email,request_id,form,current_stage,updated_at)
  values(p_kind,lower(v_email),p_request_id,p_form,greatest(1,least(coalesce(p_current_stage,1),6)),now())
  on conflict(kind,email,request_id)
  do update set form=excluded.form,current_stage=excluded.current_stage,updated_at=now();

  return jsonb_build_object('ok',true,'updatedAt',now());
end $function$;
CREATE OR REPLACE FUNCTION public.akbs_portal_draft_load(p_kind text, p_session_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'extensions'
AS $function$
declare
  v_email text;
  d akbs_crm.portal_drafts;
begin
  select email into v_email
  from akbs_crm.portal_custom_sessions
  where kind=p_kind
    and token_hash=encode(digest(coalesce(p_session_token,''),'sha256'),'hex')
    and revoked_at is null
    and expires_at > now()
  order by created_at desc limit 1;

  if not exists(select 1 from akbs_crm.portal_custom_accounts a join akbs_crm.users u on u.id=a.crm_user_id where a.kind=p_kind and lower(a.email)=lower(v_email) and u.active and u.role=upper(p_kind)) then raise exception 'Your verified portal session has expired.';end if;
  if coalesce(v_email,'')='' then
    raise exception 'Your verified portal session has expired.';
  end if;

  select * into d
  from akbs_crm.portal_drafts
  where kind=p_kind and lower(email)=lower(v_email)
  order by updated_at desc
  limit 1;

  if d.request_id is null then return '{}'::jsonb; end if;

  return jsonb_build_object(
    'requestId',d.request_id,
    'form',d.form,
    'currentStage',d.current_stage,
    'updatedAt',d.updated_at
  );
end $function$
;
CREATE OR REPLACE FUNCTION public.akbs_portal_draft_delete(p_kind text, p_session_token text, p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'extensions'
AS $function$
declare
  v_email text;
begin
  select email into v_email
  from akbs_crm.portal_custom_sessions
  where kind=p_kind
    and token_hash=encode(digest(coalesce(p_session_token,''),'sha256'),'hex')
    and revoked_at is null
    and expires_at > now()
  order by created_at desc limit 1;

  if not exists(select 1 from akbs_crm.portal_custom_accounts a join akbs_crm.users u on u.id=a.crm_user_id where a.kind=p_kind and lower(a.email)=lower(v_email) and u.active and u.role=upper(p_kind)) then raise exception 'Your verified portal session has expired.';end if;
  if coalesce(v_email,'')='' then raise exception 'Your verified portal session has expired.'; end if;

  delete from akbs_crm.portal_drafts
  where kind=p_kind and lower(email)=lower(v_email) and request_id=p_request_id;

  return jsonb_build_object('ok',true);
end $function$
;
CREATE OR REPLACE FUNCTION public.akbs_portal_timeline(p_kind text, p_session_token text, p_lead_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'extensions'
AS $function$
declare
  v_email text;
  v_lead akbs_crm.leads;
  v_assigned text;
  v_events jsonb;
begin
  if p_kind not in ('customer','partner') then
    raise exception 'Invalid portal.';
  end if;

  select email into v_email
  from akbs_crm.portal_custom_sessions
  where kind=p_kind
    and token_hash=encode(digest(coalesce(p_session_token,''),'sha256'),'hex')
    and revoked_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if not exists(select 1 from akbs_crm.portal_custom_accounts a join akbs_crm.users u on u.id=a.crm_user_id where a.kind=p_kind and lower(a.email)=lower(v_email) and u.active and u.role=upper(p_kind)) then raise exception 'Your verified portal session has expired.';end if;
  if coalesce(v_email,'')='' then
    raise exception 'Your verified portal session has expired.';
  end if;

  if not exists (
    select 1
    from akbs_crm.portal_custom_submissions s
    where s.kind=p_kind
      and lower(s.email)=lower(v_email)
      and s.lead_id=p_lead_id
  ) then
    raise exception 'Application not found.';
  end if;

  select * into v_lead from akbs_crm.leads where id=p_lead_id;
  if v_lead.id is null then raise exception 'Application not found.'; end if;

  select name into v_assigned from akbs_crm.users where id=v_lead.assigned_to;

  select coalesce(jsonb_agg(x order by x->>'at'),'[]'::jsonb)
  into v_events
  from (
    select jsonb_build_object(
      'type','activity',
      'action',a.action,
      'title',case a.action
        when 'APPLICATION_SUBMITTED' then 'Application submitted'
        when 'STAGE_CHANGED' then 'Application stage updated'
        when 'OWNER_CHANGED' then 'AKBS representative assigned'
        when 'AUTO_ASSIGNED' then 'Application assigned'
        when 'PROPOSAL_CREATED' then 'DPR / proposal started'
        when 'PROPOSAL_UPDATED' then 'DPR / proposal updated'
        when 'FINANCING_CREATED' then 'Loan / financing process started'
        when 'FINANCING_UPDATED' then 'Loan / financing updated'
        when 'VISIT_CREATED' then 'Site visit scheduled'
        when 'VISIT_UPDATED' then 'Site visit updated'
        when 'DOCUMENT_UPLOADED' then 'Document received'
        else initcap(replace(a.action,'_',' '))
      end,
      'detail',case when a.shared then coalesce(a.note,'') else '' end,
      'at',a.created_at,
      'actor',coalesce(a.actor_name,'AKBS Team')
    ) x
    from akbs_crm.activities a
    where a.lead_id=p_lead_id
      and (
        a.shared
        or a.action in ('APPLICATION_SUBMITTED','STAGE_CHANGED','OWNER_CHANGED','AUTO_ASSIGNED',
                        'PROPOSAL_CREATED','PROPOSAL_UPDATED','FINANCING_CREATED','FINANCING_UPDATED',
                        'VISIT_CREATED','VISIT_UPDATED','DOCUMENT_UPLOADED')
      )
    union all
    select jsonb_build_object(
      'type','workflow',
      'action',upper(w.kind)||'_'||upper(w.status),
      'title',case w.kind
        when 'visit' then 'Site visit · '||initcap(replace(w.status,'_',' '))
        when 'proposal' then 'DPR / Proposal · '||initcap(replace(w.status,'_',' '))
        when 'financing' then 'Loan / Financing · '||initcap(replace(w.status,'_',' '))
        when 'followup' then 'Follow-up · '||initcap(replace(w.status,'_',' '))
        else initcap(w.kind)||' · '||initcap(replace(w.status,'_',' '))
      end,
      'detail',case when w.shared then coalesce(nullif(w.notes,''),w.title,'') else '' end,
      'at',coalesce(w.updated_at,w.created_at),
      'actor','AKBS Team'
    ) x
    from akbs_crm.workflows w
    where w.lead_id=p_lead_id and w.shared
  ) q;

  return jsonb_build_object(
    'leadId',v_lead.id,
    'applicationId',v_lead.reference,
    'stage',v_lead.stage,
    'assignedTo',coalesce(v_assigned,'Awaiting assignment'),
    'createdAt',v_lead.created_at,
    'updatedAt',v_lead.updated_at,
    'events',v_events
  );
end $function$;
commit;
