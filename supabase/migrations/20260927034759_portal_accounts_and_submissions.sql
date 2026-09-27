begin;
create table if not exists akbs_crm.portal_accounts (
 auth_user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('customer','partner')),
 crm_user_id uuid not null unique references akbs_crm.users(id),
 created_at timestamptz not null default now(), primary key(auth_user_id,kind)
);
create table if not exists akbs_crm.portal_submissions (
 auth_user_id uuid not null, kind text not null, request_id uuid not null,
 lead_id uuid not null unique references akbs_crm.leads(id), form_hash text not null,
 created_at timestamptz not null default now(), primary key(auth_user_id,kind,request_id),
 foreign key(auth_user_id,kind) references akbs_crm.portal_accounts(auth_user_id,kind) on delete cascade,
 unique(auth_user_id,kind,form_hash)
);
alter table akbs_crm.portal_accounts enable row level security;
alter table akbs_crm.portal_submissions enable row level security;
revoke all on akbs_crm.portal_accounts,akbs_crm.portal_submissions from public,anon,authenticated;
create or replace function akbs_crm.portal_gateway(p_action text,p_kind text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 aid uuid := auth.uid(); au auth.users; cu akbs_crm.users; lid uuid; f jsonb; consent jsonb;
 result jsonb; req uuid; mobile text; full_name text; cap integer:=0; digest text;
begin
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
  f:=p_data->'form'; consent:=p_data->'consent'; req:=(p_data->>'request_id')::uuid;
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
end $$;
revoke all on function akbs_crm.portal_gateway(text,text,jsonb) from public,anon,authenticated;
create or replace function public.akbs_portal(p_action text,p_kind text,p_data jsonb default '{}'::jsonb)
returns jsonb language sql security definer set search_path='' as $$ select akbs_crm.portal_gateway(p_action,p_kind,p_data) $$;
revoke all on function public.akbs_portal(text,text,jsonb) from public,anon;
grant execute on function public.akbs_portal(text,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
