-- AKBS workspace extension. Requires the existing akbs_crm schema baseline.
-- No customer rows, passwords, gateway keys or sessions are embedded here.
begin;
create table if not exists akbs_crm.workspace_templates(id uuid primary key default gen_random_uuid(), title text not null, channel text not null check(channel in ('email','whatsapp')), subject text not null default '', body text not null);
alter table akbs_crm.workspace_templates enable row level security;
revoke all on akbs_crm.workspace_templates from public, anon, authenticated;
CREATE OR REPLACE FUNCTION akbs_crm.workspace_auto_assign()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare chosen akbs_crm.users;
begin
 if new.assigned_to is null then
  perform pg_advisory_xact_lock(hashtext('akbs_workspace_assignment'));
  select * into chosen from akbs_crm.users u where u.active and u.role='EMPLOYEE' and (new.manager_id is null or u.manager_id=new.manager_id)
   order by (select count(*) from akbs_crm.leads l where l.assigned_to=u.id and l.stage not in ('CONVERTED','LOST')),u.id limit 1;
  new.assigned_to:=chosen.id; new.manager_id:=coalesce(new.manager_id,chosen.manager_id);
 end if;
 return new;
end $function$
;
CREATE OR REPLACE FUNCTION akbs_crm.workspace_session(uid uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare token text:=encode(extensions.gen_random_bytes(32),'hex');
begin insert into akbs_crm.crm2_sessions(token_hash,user_id,expires_at) values(encode(extensions.digest(token,'sha256'),'hex'),uid,now()+interval '8 hours'); return token; end $function$
;
revoke all on function akbs_crm.workspace_session(uuid), akbs_crm.workspace_auto_assign() from public, anon, authenticated;
drop trigger if exists akbs_workspace_auto_assign on akbs_crm.leads;
create trigger akbs_workspace_auto_assign before insert on akbs_crm.leads for each row execute function akbs_crm.workspace_auto_assign();
insert into akbs_crm.workspace_templates(id,title,channel,subject,body) values('bf03fba1-8744-40eb-897d-22ad030139f0','Welcome & requirements','whatsapp','','Namaste {{name}}, thank you for contacting AKBS Poultry Farming. Please share your farm location, land availability, proposed bird capacity and preferred start date. Your advisor: {{employee}}.') on conflict(id) do nothing;
insert into akbs_crm.workspace_templates(id,title,channel,subject,body) values('ed1a1972-526b-4611-83ef-07ed2e7d3bcd','Site visit confirmation','whatsapp','','Namaste {{name}}, please confirm a suitable site visit date for your {{capacity}} birds project at {{location}} and share a location pin.') on conflict(id) do nothing;
insert into akbs_crm.workspace_templates(id,title,channel,subject,body) values('06c5117f-c7b7-440b-b275-da3ed4da5e94','Document request','email','Documents for your poultry project','Dear {{name}}, please share land ownership/lease records, site photographs, layout and quotations as applicable through the agreed secure channel. Your advisor will confirm bank-specific requirements. Regards, {{employee}}, AKBS Poultry Farming.') on conflict(id) do nothing;
insert into akbs_crm.workspace_templates(id,title,channel,subject,body) values('d1f978c1-ffb8-428d-a63b-e3fe854f2535','Quotation follow-up','whatsapp','','Namaste {{name}}, have you reviewed the preliminary quotation for your poultry project? Please let us know a convenient time to discuss its scope and assumptions.') on conflict(id) do nothing;
insert into akbs_crm.workspace_templates(id,title,channel,subject,body) values('f753c909-1562-4b50-91dd-693d4b29fde1','Loan assistance','email','Poultry project financing discussion','Dear {{name}}, please confirm your project cost, promoter contribution and preferred bank. Financing and scheme benefits are subject to lender appraisal and eligibility; they are not guaranteed. Regards, {{employee}}.') on conflict(id) do nothing;
insert into akbs_crm.workspace_templates(id,title,channel,subject,body) values('45af788a-7f18-4a13-8080-1eb4b83ee0dd','Welcome — Hindi','whatsapp','','नमस्ते {{name}} जी, AKBS Poultry Farming में आपकी रुचि के लिए धन्यवाद। कृपया फार्म की लोकेशन, उपलब्ध भूमि, पक्षियों की प्रस्तावित क्षमता और काम शुरू करने का समय बताएं। आपके सलाहकार: {{employee}}।') on conflict(id) do nothing;
CREATE OR REPLACE FUNCTION public.akbs_crm_workspace(p_action text, p_data jsonb DEFAULT '{}'::jsonb, p_token text DEFAULT ''::text)
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
   return jsonb_build_object('error','Invalid login or password','status',401);
  end if;
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
   'templates',coalesce((select jsonb_agg(to_jsonb(t) order by title) from akbs_crm.workspace_templates t),'[]'),
   'settings',jsonb_build_object('commission_rate',(select commission_rate from akbs_crm.settings))
  );
 end if;
 if not akbs_crm.rate('write:'||u.id::text,120,60) then return jsonb_build_object('error','Please wait before trying again','status',429); end if;
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
revoke all on function public.akbs_crm_workspace(text,jsonb,text) from public;
grant execute on function public.akbs_crm_workspace(text,jsonb,text) to anon,authenticated,service_role;
commit;
