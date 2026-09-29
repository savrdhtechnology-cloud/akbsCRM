begin;
alter table akbs_crm.portal_drafts add column if not exists created_at timestamptz not null default now();
-- Called only by trusted database code after successful OTP or enrollment.
create or replace function akbs_crm.ensure_portal_draft(k text,e text,n text default '') returns void language plpgsql set search_path='' as $$ begin
 perform pg_advisory_xact_lock(hashtextextended(lower(e)||k,0));
 if not exists(select 1 from akbs_crm.portal_drafts d where d.kind=k and lower(d.email)=lower(e)) and not exists(select 1 from akbs_crm.portal_custom_submissions s where s.kind=k and lower(s.email)=lower(e)) then
  insert into akbs_crm.portal_drafts(kind,email,request_id,form,current_stage) values(k,lower(e),gen_random_uuid(),jsonb_build_object('fullName',coalesce(n,''),'email',lower(e)),1);
 elsif coalesce(n,'')<>'' then
  update akbs_crm.portal_drafts set form=form||jsonb_build_object('fullName',n) where kind=k and lower(email)=lower(e) and coalesce(form->>'fullName','')='';
 end if;
end $$;
revoke all on function akbs_crm.ensure_portal_draft(text,text,text) from public,anon,authenticated;

create or replace function public.akbs_incomplete_applications(p_action text,p_kind text,p_data jsonb default '{}',p_token text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare actor akbs_crm.users; d akbs_crm.portal_drafts; r jsonb; lid uuid; session_secret text; result jsonb; f jsonb; record_ref text; req uuid; e text; required_key text;
begin
 select u.* into actor from akbs_crm.users u join akbs_crm.crm2_sessions s on s.user_id=u.id where s.token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') and s.expires_at>now() and u.active;
 if actor.id is null then return jsonb_build_object('error','Please sign in','status',401);end if;
 if actor.role<>'ADMIN' or actor.must_change_password then return jsonb_build_object('error','Admin access required','status',403);end if;
 if p_kind is null or p_kind not in ('customer','partner') then raise exception 'Invalid portal';end if;
 perform akbs_crm.assert_keys(p_data,array['email','requestId','form','expectedUpdatedAt','consentConfirmed','offset','search']);
 if p_action='list' then
  select coalesce(jsonb_agg(x),'[]'::jsonb) into r from (
   select draft.request_id as "requestId", draft.email, coalesce(nullif(draft.form->>'fullName',''),u.name,'') as name,
    coalesce(draft.form->>'mobileNumber',draft.form->>'mobile','') as mobile, draft.form,draft.current_stage as "currentStage",coalesce(a.created_at,draft.created_at) as "signupAt", draft.updated_at as "updatedAt"
   from akbs_crm.portal_drafts draft left join akbs_crm.portal_custom_accounts a on a.kind=draft.kind and lower(a.email)=lower(draft.email) left join akbs_crm.users u on u.id=a.crm_user_id
   where draft.kind=p_kind and not exists(select 1 from akbs_crm.portal_custom_submissions s where s.kind=draft.kind and lower(s.email)=lower(draft.email) and (s.request_id=draft.request_id or draft.kind='partner'))
   and (coalesce(p_data->>'search','')='' or (draft.email||' '||coalesce(draft.form->>'fullName',u.name,'')||' '||coalesce(draft.form->>'mobileNumber',draft.form->>'mobile','')) ilike '%'||left(p_data->>'search',150)||'%')
   order by draft.updated_at desc,draft.request_id limit 50 offset greatest(0,least(coalesce((p_data->>'offset')::integer,0),1000000))
  ) x;
  return jsonb_build_object('rows',r);
 end if;
 e:=lower(p_data->>'email');req:=(p_data->>'requestId')::uuid;
 perform pg_advisory_xact_lock(hashtextextended(e||p_kind,0));
 select s.lead_id into lid from akbs_crm.portal_custom_submissions s where s.kind=p_kind and lower(s.email)=e and (s.request_id=req or p_kind='partner') limit 1;
 if lid is not null then return jsonb_build_object('completed',true,'leadId',lid,'reference',(select reference from akbs_crm.leads where id=lid));end if;
 select * into d from akbs_crm.portal_drafts where kind=p_kind and lower(email)=e and request_id=req for update;
 if d.request_id is null then return jsonb_build_object('error','Draft not found','status',404);end if;
 if p_action='get' then return jsonb_build_object('requestId',d.request_id,'email',d.email,'form',d.form,'updatedAt',d.updated_at);end if;
 if p_action not in ('save','complete') then raise exception 'Unsupported action';end if;
 if nullif(p_data->>'expectedUpdatedAt','')::timestamptz is distinct from d.updated_at then return jsonb_build_object('error','This draft changed. Reopen it before saving.','status',409);end if;
 f:=p_data->'form';perform akbs_crm.validate_portal_form(f);f:=f||jsonb_build_object('email',e);
 if p_action='save' then
  update akbs_crm.portal_drafts set form=f,updated_at=clock_timestamp() where kind=p_kind and email=d.email and request_id=req returning * into d;
  perform akbs_crm.security_event(actor.id,'INCOMPLETE_APPLICATION_EDITED',p_kind,req::text,null,null);
  return jsonb_build_object('ok',true,'updatedAt',d.updated_at);
 end if;
 if coalesce(p_data->>'consentConfirmed','false')<>'true' then return jsonb_build_object('error','Confirm applicant authorization before completing.','status',400);end if;
 foreach required_key in array case when p_kind='customer' then array['fullName','mobileNumber','preferredLanguage','projectObjective','poultryType','shedType','proposedCapacity','hasLand','landOwnership','landAreaAcres','state','district','villageOrCity','approxProjectCost','needsLoan','ownContribution','discussedWithBank','experience','startTimeline'] else array['fullName','mobile','city','state','category'] end loop
  if coalesce(btrim(f->>required_key),'')='' then return jsonb_build_object('error','Complete required field: '||required_key,'status',400);end if;
 end loop;
 if p_kind='customer' and (coalesce(jsonb_array_length(f->'supportNeeded'),0)=0 or (f->>'needsLoan'='Yes' and coalesce(f->>'approxLoanAmount','')='')) then return jsonb_build_object('error','Complete support and loan details.','status',400);end if;
 -- A transaction-local credential reuses the canonical validated submission workflow.
 -- It is never returned, committed or made available to the administrator/browser.
 session_secret:=encode(extensions.gen_random_bytes(32),'hex');
 insert into akbs_crm.portal_custom_sessions(kind,email,token_hash,expires_at) values(p_kind,e,encode(extensions.digest(session_secret,'sha256'),'hex'),now()+interval '1 minute');
 perform public.akbs_portal_custom('enroll',p_kind,session_secret,jsonb_build_object('name',f->>'fullName','consent',true));
 result:=public.akbs_portal_custom('submit',p_kind,session_secret,jsonb_build_object('request_id',req,'form',f||jsonb_build_object('declarationConfirmed',true),'consent',jsonb_build_object('version','AKBS-ADMIN-ASSISTED-2026-V1','declarationAccepted',true,'communicationConsentAccepted',true,'recordedByAdmin',actor.id,'onBehalfOfApplicant',true)));
 delete from akbs_crm.portal_custom_sessions where token_hash=encode(extensions.digest(session_secret,'sha256'),'hex');
 select lead_id into lid from akbs_crm.portal_custom_submissions where kind=p_kind and lower(email)=e and request_id=req;
 if lid is null then raise exception 'Application submission did not complete';end if;
 perform akbs_crm.security_event(actor.id,'INCOMPLETE_APPLICATION_COMPLETED',p_kind,lid::text,null,jsonb_build_object('requestId',req,'onBehalfOfApplicant',true));
 return jsonb_build_object('completed',true,'leadId',lid,'reference',result->>'submittedId');
end $$;
revoke all on function public.akbs_incomplete_applications(text,text,jsonb,text) from public;
grant execute on function public.akbs_incomplete_applications(text,text,jsonb,text) to anon,authenticated;

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

  perform akbs_crm.ensure_portal_draft(p_kind,v_email);
  return jsonb_build_object('ok',true,'sessionToken',v_token,'email',v_email,'expiresIn',1800);
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

    perform akbs_crm.ensure_portal_draft(p_kind,v_email,full_name);
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

    delete from akbs_crm.portal_drafts where kind=p_kind and lower(email)=lower(v_email) and (request_id=req or p_kind='partner');
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

  perform pg_advisory_xact_lock(hashtextextended(lower(v_email)||p_kind,0));
  if exists(select 1 from akbs_crm.portal_custom_submissions where kind=p_kind and lower(email)=lower(v_email) and (request_id=p_request_id or p_kind='partner')) then return jsonb_build_object('ok',true,'completed',true);end if;
  perform akbs_crm.validate_portal_form(p_form);
  if (select count(*) from akbs_crm.portal_drafts where kind=p_kind and lower(email)=lower(v_email) and request_id<>p_request_id)>=20 then raise exception 'Draft limit reached';end if;
  insert into akbs_crm.portal_drafts(kind,email,request_id,form,current_stage,updated_at)
  values(p_kind,lower(v_email),p_request_id,p_form||jsonb_build_object('email',v_email),greatest(1,least(coalesce(p_current_stage,1),6)),now())
  on conflict(kind,email,request_id)
  do update set form=excluded.form,current_stage=excluded.current_stage,updated_at=clock_timestamp();

  return jsonb_build_object('ok',true,'updatedAt',now());
end $function$

;

-- Backfill only accounts which have not submitted; no normal lead is created.
do $$ declare item record;begin
 for item in select a.kind,a.email,u.name from akbs_crm.portal_custom_accounts a join akbs_crm.users u on u.id=a.crm_user_id where not exists(select 1 from akbs_crm.portal_custom_submissions s where s.kind=a.kind and lower(s.email)=lower(a.email)) loop
  perform akbs_crm.ensure_portal_draft(item.kind,item.email,item.name);
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
