-- One delivery claim per registered recipient/purpose. Survives refresh and concurrent staff clicks.
create table akbs_crm.collection_reminder_deliveries (
 purpose text not null check(purpose in ('payment','registration')),
 email text not null,
 target_key text not null,
 lead_id uuid references akbs_crm.leads(id) on delete set null,
 actor_id uuid references akbs_crm.users(id) on delete set null,
 delivery_id uuid not null default gen_random_uuid(),
 state text not null check(state in ('SENDING','SENT','FAILED')),
 claimed_at timestamptz not null default now(),
 sent_at timestamptz,
 retry_at timestamptz not null,
 email_id text,
 primary key(purpose,email)
);
alter table akbs_crm.collection_reminder_deliveries enable row level security;
revoke all on akbs_crm.collection_reminder_deliveries from public,anon,authenticated;

-- Existing accepted reminders keep their original one-hour waiting period.
insert into akbs_crm.collection_reminder_deliveries(purpose,email,target_key,lead_id,actor_id,state,claimed_at,sent_at,retry_at,email_id)
select distinct on(purpose,email) purpose,email,target_key,lead_id,actor_id,'SENT',sent_at,sent_at,sent_at+interval '60 minutes',email_id
from (
 select case when e.event_type='REMINDER_SENT' then 'payment' else 'registration' end purpose,
 lower(btrim(l.email)) email,'lead:'||l.id::text target_key,l.id lead_id,e.created_by actor_id,e.created_at sent_at,
 substring(e.note from 'Email ID: ([a-f0-9-]+)') email_id
 from akbs_crm.fee_events e join akbs_crm.leads l on l.id=e.lead_id
 where e.event_type in ('REMINDER_SENT','REGISTRATION_REMINDER_SENT') and coalesce(btrim(l.email),'')<>''
 union all
 select 'registration',lower(btrim(s.after_data->>'email')),'draft:customer:'||lower(btrim(s.after_data->>'email'))||':'||s.entity_id,null::uuid,s.actor_id,s.created_at,s.after_data->>'emailId'
 from akbs_crm.security_events s where s.action='REGISTRATION_REMINDER_EMAILED' and s.entity='portal_draft' and coalesce(s.after_data->>'email','')<>''
) history order by purpose,email,sent_at desc;

create or replace function public.akbs_reminder_target_context(p_token text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare c jsonb;d jsonb;u akbs_crm.users;purpose text:=coalesce(p_data->>'purpose','payment');
begin
 if purpose not in ('payment','registration') then return jsonb_build_object('error','Invalid reminder purpose','status',400);end if;
 if nullif(p_data->>'leadId','') is not null then
  if p_data ? 'draftEmail' or p_data ? 'draftRequestId' then return jsonb_build_object('error','Choose exactly one customer','status',400);end if;
  c:=public.akbs_collection_email_context(p_token,(p_data->>'leadId')::uuid,purpose);
  if c ? 'error' then return c;end if;
  return c||jsonb_build_object('purpose',purpose,'targetKey','lead:'||(p_data->>'leadId'));
 end if;
 if purpose<>'registration' or p_data->>'draftKind'<>'customer' or coalesce(p_data->>'draftEmail','')='' or coalesce(p_data->>'draftRequestId','')='' then
  return jsonb_build_object('error','Choose one customer application','status',400);
 end if;
 d:=public.akbs_incomplete_applications(p_token,'customer','get',jsonb_build_object('email',p_data->>'draftEmail','requestId',p_data->>'draftRequestId'));
 if d ? 'error' then return d;end if;
 if coalesce((d->>'completed')::boolean,false) then return jsonb_build_object('error','Application already submitted. Use its payment actions.','status',409);end if;
 select usr.* into u from akbs_crm.users usr join akbs_crm.crm2_sessions s on s.user_id=usr.id
 where s.token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') and s.expires_at>now() and usr.active limit 1;
 if u.id is null then return jsonb_build_object('error','Please sign in','status',401);end if;
 return jsonb_build_object('ok',true,'purpose',purpose,'email',lower(btrim(d->>'email')),'customerName',coalesce(nullif(d#>>'{form,fullName}',''),'Customer'),'actorId',u.id,'actorName',u.name,'draftId',d->>'requestId','targetKey','draft:customer:'||lower(btrim(d->>'email'))||':'||(d->>'requestId'));
exception when invalid_text_representation then return jsonb_build_object('error','Invalid customer application','status',400);
end $$;

create or replace function public.akbs_collection_reminder_claim(p_token text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare c jsonb;d akbs_crm.collection_reminder_deliveries;recipient text;v_purpose text;delivery uuid;
begin
 c:=public.akbs_reminder_target_context(p_token,p_data);
 if c ? 'error' then return c;end if;
 recipient:=lower(btrim(c->>'email'));v_purpose:=c->>'purpose';
 if coalesce(recipient,'')='' then return jsonb_build_object('error','Registered customer email is missing','status',400);end if;
 perform pg_advisory_xact_lock(hashtextextended('collection-reminder:'||v_purpose||':'||recipient,0));
 select * into d from akbs_crm.collection_reminder_deliveries r where r.purpose=v_purpose and r.email=recipient for update;
 if d.retry_at>now() then
  return jsonb_build_object('error',case when d.state='SENDING' then 'A reminder is already being sent to this customer. Please wait.' else 'Reminder already sent. You can resend after the 60-minute waiting period.' end,'status',429,'retryAt',d.retry_at,'lastSentAt',d.sent_at,'targetKey',c->>'targetKey');
 end if;
 -- Reuse the same provider idempotency key after an uncertain delivery timeout.
 delivery:=case when d.state='SENDING' then d.delivery_id else gen_random_uuid() end;
 insert into akbs_crm.collection_reminder_deliveries as r(purpose,email,target_key,lead_id,actor_id,delivery_id,state,claimed_at,retry_at)
 values(v_purpose,recipient,c->>'targetKey',nullif(c->>'leadId','')::uuid,(c->>'actorId')::uuid,delivery,'SENDING',now(),now()+interval '2 minutes')
 on conflict(purpose,email) do update set target_key=excluded.target_key,lead_id=excluded.lead_id,actor_id=excluded.actor_id,delivery_id=excluded.delivery_id,state='SENDING',claimed_at=now(),retry_at=excluded.retry_at;
 return c||jsonb_build_object('deliveryId',delivery);
end $$;

create or replace function public.akbs_collection_reminder_finish(p_delivery_id uuid,p_email_id text default null,p_permanent_failure boolean default false)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare d akbs_crm.collection_reminder_deliveries;actor text;note text;
begin
 select * into d from akbs_crm.collection_reminder_deliveries where delivery_id=p_delivery_id for update;
 if d.delivery_id is null then return jsonb_build_object('error','Reminder delivery not found','status',404);end if;
 if d.state<>'SENDING' then return jsonb_build_object('ok',true,'retryAt',d.retry_at,'lastSentAt',d.sent_at);end if;
 if coalesce(p_email_id,'')='' then
  if p_permanent_failure then update akbs_crm.collection_reminder_deliveries set state='FAILED',retry_at=now() where delivery_id=p_delivery_id;end if;
  return jsonb_build_object('ok',true,'retryAt',case when p_permanent_failure then now() else d.retry_at end);
 end if;
 update akbs_crm.collection_reminder_deliveries set state='SENT',sent_at=now(),retry_at=now()+interval '60 minutes',email_id=p_email_id where delivery_id=p_delivery_id returning * into d;
 select name into actor from akbs_crm.users where id=d.actor_id;
 note:='Email accepted for '||d.email||'. Email ID: '||p_email_id;
 if d.lead_id is not null then
  insert into akbs_crm.fee_events(lead_id,event_type,amount,note,created_by)
  values(d.lead_id,case when d.purpose='payment' then 'REMINDER_SENT' else 'REGISTRATION_REMINDER_SENT' end,0,note,d.actor_id);
  insert into akbs_crm.activities(lead_id,actor_name,action,note,shared)
  values(d.lead_id,actor,case when d.purpose='payment' then 'FEE_REMINDER_EMAILED' else 'REGISTRATION_REMINDER_EMAILED' end,note,false);
 else
  insert into akbs_crm.security_events(actor_id,actor_role,action,entity,entity_id,request_id,after_data)
  values(d.actor_id,'ADMIN','REGISTRATION_REMINDER_EMAILED','portal_draft',d.target_key,d.delivery_id::text,jsonb_build_object('email',d.email,'emailId',p_email_id,'retryAt',d.retry_at));
 end if;
 return jsonb_build_object('ok',true,'retryAt',d.retry_at,'lastSentAt',d.sent_at,'emailId',p_email_id);
end $$;

create or replace function public.akbs_collection_reminder_state(p_token text,p_targets jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare target jsonb;c jsonb;d akbs_crm.collection_reminder_deliveries;states jsonb:='{}'::jsonb;
begin
 if jsonb_typeof(p_targets)<>'array' or jsonb_array_length(p_targets)>100 then return jsonb_build_object('error','Invalid reminder targets','status',400);end if;
 for target in select value from jsonb_array_elements(p_targets) loop
  c:=public.akbs_reminder_target_context(p_token,target);
  if c ? 'error' then continue;end if;
  select * into d from akbs_crm.collection_reminder_deliveries r where r.email=lower(btrim(c->>'email')) and r.purpose=c->>'purpose';
  states:=states||jsonb_build_object((c->>'targetKey')||':'||(c->>'purpose'),jsonb_build_object('retryAt',d.retry_at,'lastSentAt',d.sent_at,'state',d.state));
 end loop;
 return jsonb_build_object('ok',true,'states',states);
end $$;

create or replace function public.akbs_collection_delivery_config()
returns jsonb language plpgsql security definer set search_path to '' as $$
declare key text;settings public.akbs_email_settings;
begin
 select secret_value into key from akbs_crm.integration_secrets where key_name='AKBS_RESEND_API_KEY' limit 1;
 if coalesce(key,'')='' then select decrypted_secret into key from vault.decrypted_secrets where name='akbs_resend_api_key' order by created_at desc limit 1;end if;
 select * into settings from public.akbs_email_settings where id=1;
 return jsonb_build_object('apiKey',key,'from',coalesce(nullif(settings.customer_sender_name,''),'AKBS Poultry Farming')||' <'||coalesce(nullif(settings.customer_sender_email,''),'website@akbspoultry.com')||'>','replyTo',coalesce(nullif(settings.customer_reply_to,''),'support@akbspoultry.com'));
end $$;

revoke all on function public.akbs_reminder_target_context(text,jsonb),public.akbs_collection_reminder_claim(text,jsonb),public.akbs_collection_reminder_finish(uuid,text,boolean),public.akbs_collection_reminder_state(text,jsonb),public.akbs_collection_delivery_config() from public,anon,authenticated;
grant execute on function public.akbs_reminder_target_context(text,jsonb),public.akbs_collection_reminder_claim(text,jsonb),public.akbs_collection_reminder_finish(uuid,text,boolean),public.akbs_collection_reminder_state(text,jsonb),public.akbs_collection_delivery_config() to service_role;

-- Preserve the legacy queued entry point; actual delivery goes through the same atomic guard.
create or replace function public.akbs_send_fee_reminder_email(p_lead_id uuid,p_token text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare c jsonb;queued bigint;
begin
 c:=public.akbs_collection_email_context(p_token,p_lead_id,'payment');
 if c ? 'error' then return c;end if;
 queued:=net.http_post(url:='https://ldffgetuzoeupuhoaubn.supabase.co/functions/v1/akbs-fee-reminder-email',headers:=jsonb_build_object('Content-Type','application/json','apikey','sb_publishable_KzdI4K0qLXgi3MhA5GXPhg_6f5vB8By'),body:=jsonb_build_object('token',p_token,'leadId',p_lead_id,'purpose','payment','requestId',gen_random_uuid()));
 return jsonb_build_object('ok',true,'queued',true,'requestId',queued,'email',c->>'email','applicationId',c->>'applicationId');
end $$;
notify pgrst,'reload schema';
