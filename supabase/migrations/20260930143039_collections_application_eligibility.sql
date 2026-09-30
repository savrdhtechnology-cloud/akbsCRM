-- Submitted applications, rather than the shared CRM reference sequence, enable fees.
create or replace function akbs_crm.application_ready(l akbs_crm.leads)
returns boolean language sql stable set search_path to '' as $$
 select coalesce(l.reference ~ '^AKBS-[0-9]{4}-[0-9]{6}$',false)
 and (exists(select 1 from akbs_crm.portal_custom_submissions s where s.kind='customer' and s.lead_id=l.id)
   or exists(select 1 from akbs_crm.portal_submissions s where s.kind='customer' and s.lead_id=l.id));
$$;
create or replace function akbs_crm.registration_service(service text)
returns boolean language sql immutable set search_path to '' as $$
 select lower(btrim(coalesce(service,''))) in ('registration fee','initial registration fee','initial project assessment & registration fee');
$$;
revoke all on function akbs_crm.application_ready(akbs_crm.leads),akbs_crm.registration_service(text) from public,anon,authenticated;

create or replace function akbs_crm.lead_view(u akbs_crm.users,l akbs_crm.leads)
returns jsonb language sql stable set search_path to '' as $$
 select (case when u.role='PARTNER' then jsonb_build_object('id',l.id,'reference',l.reference,'name',l.name,'phone',l.phone,'email',l.email,'location',l.location,'stage',l.stage,'source',l.source,'created_at',l.created_at,'project_cost',l.project_cost,'project_type',l.project_type,'capacity',l.capacity,'priority',l.priority,'version',l.version,'details','{}'::jsonb)
 when u.role='FINANCE' then to_jsonb(l)-'message'-'partner_id'
 when u.role='CUSTOMER' then to_jsonb(l)-'message'-'partner_id'-'assigned_to'-'manager_id'-'approval'
 else to_jsonb(l) end) || jsonb_build_object('applicationEligible',akbs_crm.application_ready(l));
$$;

create or replace function akbs_crm.initialize_lead_fee()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
 -- A lead INSERT precedes final portal submission and must not create a fee demand.
 return new;
end $$;
create or replace function akbs_crm.initialize_submitted_application_fee()
returns trigger language plpgsql security definer set search_path to '' as $$
declare l akbs_crm.leads; f akbs_crm.fee_settings; actor uuid; due numeric;
begin
 if new.kind<>'customer' then return new;end if;
 select * into l from akbs_crm.leads where id=new.lead_id;
 if not akbs_crm.application_ready(l) then return new;end if;
 perform pg_advisory_xact_lock(hashtextextended('registration-fee:'||l.id::text,0));
 select * into f from akbs_crm.fee_settings where id=true;
 due:=round(coalesce(f.initial_fee,2999)*(1-(case when f.offer_active then coalesce(f.discount_percent,0) else 0 end)/100.0),2);
 select id into actor from akbs_crm.users where role='ADMIN' and active order by created_at limit 1;
 if actor is not null and not exists(select 1 from akbs_crm.fee_transactions t where t.lead_id=l.id and akbs_crm.registration_service(t.service_type))
 and coalesce(l.details#>>'{portal_form,_initialPayment,reference}','')='' then
  insert into akbs_crm.fee_transactions(lead_id,application_reference,service_type,amount,discount,payable,payment_method,transaction_ref,status,note,created_by,source)
  values(l.id,l.reference,'Initial Project Assessment & Registration Fee',coalesce(f.initial_fee,2999),coalesce(f.initial_fee,2999)-due,due,'Other','','PENDING','Created after successful customer application submission.',actor,'SYSTEM');
 end if;
 if not exists(select 1 from akbs_crm.workflows where lead_id=l.id and kind='followup' and title='Initial service fee follow-up') then
  insert into akbs_crm.workflows(lead_id,kind,title,status,due_at,notes,assignee_id,shared)
  values(l.id,'followup','Initial service fee follow-up','SCHEDULED',now()+interval '1 day','Application submitted. Follow up for registration fee payment.',l.assigned_to,true);
 end if;
 return new;
end $$;
revoke all on function akbs_crm.initialize_submitted_application_fee() from public,anon,authenticated;
drop trigger if exists akbs_initialize_submitted_application_fee on akbs_crm.portal_custom_submissions;
create trigger akbs_initialize_submitted_application_fee after insert on akbs_crm.portal_custom_submissions for each row execute function akbs_crm.initialize_submitted_application_fee();
drop trigger if exists akbs_initialize_auth_application_fee on akbs_crm.portal_submissions;
create trigger akbs_initialize_auth_application_fee after insert on akbs_crm.portal_submissions for each row execute function akbs_crm.initialize_submitted_application_fee();

create or replace function public.akbs_customer_payment_followup_trigger()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
 -- The confirmed-submission trigger now creates the fee follow-up.
 return new;
end $$;

create or replace function public.akbs_fee_staff(p_action text,p_token text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog','extensions' as $$
declare
 u akbs_crm.users; f akbs_crm.fee_settings; l akbs_crm.leads; t akbs_crm.fee_transactions;
 result jsonb; rows jsonb; payment jsonb; next_status text; expected numeric;
begin
 select usr.* into u from akbs_crm.users usr join akbs_crm.crm2_sessions s on s.user_id=usr.id
 where s.token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') and s.expires_at>now() and usr.active limit 1;
 if u.id is null then raise exception 'Unauthorized';end if;
 if u.must_change_password or u.role not in ('ADMIN','MANAGER','EMPLOYEE','FINANCE') then raise exception 'Staff access denied';end if;
 if p_action='update_config' then
  if u.role<>'ADMIN' then raise exception 'Admin access required';end if;
  if coalesce((p_data->>'initialFee')::numeric,0)<0 or coalesce((p_data->>'discountPercent')::numeric,0) not between 0 and 100 then raise exception 'Invalid fee configuration';end if;
  update akbs_crm.fee_settings set initial_fee=coalesce((p_data->>'initialFee')::numeric,initial_fee),discount_percent=coalesce((p_data->>'discountPercent')::numeric,discount_percent),offer_label=left(coalesce(p_data->>'offerLabel',''),120),offer_active=coalesce((p_data->>'offerActive')::boolean,false),updated_at=now(),updated_by=u.id where id=true;
 elsif p_action='verify' then
  if u.role not in ('ADMIN','FINANCE') then raise exception 'Admin/Finance access required';end if;
  next_status:=upper(coalesce(p_data->>'status',''));
  if next_status not in ('VERIFIED','REJECTED') then raise exception 'Invalid status';end if;
  select * into l from akbs_crm.leads where id=(p_data->>'leadId')::uuid for update;
  if l.id is null or not akbs_crm.application_ready(l) then raise exception 'Submit the customer application before fee processing';end if;
  perform pg_advisory_xact_lock(hashtextextended('registration-fee:'||l.id::text,0));
  select tx.* into t from akbs_crm.fee_transactions tx where tx.lead_id=l.id and akbs_crm.registration_service(tx.service_type)
  order by (coalesce(tx.transaction_ref,'')<>'' or nullif(tx.proof_path,'') is not null) desc,tx.created_at desc,tx.id desc limit 1 for update;
  payment:=coalesce(l.details#>'{portal_form,_initialPayment}','{}'::jsonb);
  if coalesce(t.status,payment->>'verificationStatus') in ('VERIFIED','REFUNDED') then raise exception 'Verified payments are immutable; use the refund workflow';end if;
  if t.id is not null then
   if t.status not in ('UNDER_REVIEW','PENDING_VERIFICATION') or (coalesce(t.transaction_ref,'')='' and coalesce(t.proof_path,'')='') then raise exception 'Payment details or proof must be submitted before verification';end if;
   update akbs_crm.fee_transactions set status=next_status,verified_by=case when next_status='VERIFIED' then u.id else null end,updated_at=now() where id=t.id;
   payment:=payment||jsonb_build_object('transactionId',t.id,'applicationId',l.reference,'amount',t.payable,'baseAmount',t.amount,'reference',t.transaction_ref,'proofPath',t.proof_path,'submittedAt',coalesce(payment->>'submittedAt',t.created_at::text),'feeLabel','Initial Project Assessment & Registration Fee');
  elsif coalesce(payment->>'reference','')='' and coalesce(payment->>'proofPath','')='' then
   raise exception 'Payment details or proof must be submitted before verification';
  end if;
  payment:=payment||jsonb_build_object('verificationStatus',next_status,'status',next_status,'verifiedAt',case when next_status='VERIFIED' then now()::text else null end,'verifiedBy',case when next_status='VERIFIED' then u.id::text else null end);
  update akbs_crm.leads set details=jsonb_set(details,'{portal_form}',coalesce(details->'portal_form','{}'::jsonb)||jsonb_build_object('_initialPayment',payment),true),updated_at=now(),version=version+1 where id=l.id;
  insert into akbs_crm.fee_events(lead_id,event_type,amount,note,created_by) values(l.id,case when next_status='VERIFIED' then 'VERIFY' else 'REJECT' end,coalesce(t.payable,(payment->>'amount')::numeric,0),'Registration payment '||lower(next_status)||'.',u.id);
  perform akbs_crm.security_event(u.id,'PAYMENT_'||next_status,case when t.id is null then 'lead' else 'fee_transaction' end,coalesce(t.id::text,l.id::text));
 elsif p_action<>'snapshot' then raise exception 'Unsupported action';end if;
 select * into f from akbs_crm.fee_settings where id=true;
 expected:=round(f.initial_fee*(1-(case when f.offer_active then f.discount_percent else 0 end)/100.0),2);
 with x as (
  select ld.*,ld.details#>'{portal_form,_initialPayment}' as p,owner.name as assigned_name,
   tx.id as transaction_id,tx.status as transaction_status,tx.transaction_ref,tx.proof_path,tx.amount as base_amount,tx.discount as paid_discount,tx.payable as paid_amount,tx.payment_method,tx.created_at as payment_created_at,tx.updated_at as payment_updated_at
  from akbs_crm.leads ld left join akbs_crm.users owner on owner.id=ld.assigned_to
  left join lateral(select ft.* from akbs_crm.fee_transactions ft where ft.lead_id=ld.id and akbs_crm.registration_service(ft.service_type)
   order by (coalesce(ft.transaction_ref,'')<>'' or nullif(ft.proof_path,'') is not null) desc,ft.created_at desc,ft.id desc limit 1) tx on true
  where akbs_crm.application_ready(ld) and (u.role in ('ADMIN','FINANCE') or akbs_crm.visible(u,ld))
 ), y as (
  select *,case
   when transaction_status in ('VERIFIED','REJECTED','REFUNDED','UNDER_REVIEW','PENDING_VERIFICATION') then transaction_status
   when upper(coalesce(p->>'verificationStatus',p->>'status','')) in ('VERIFIED','REJECTED','REFUNDED','PENDING_VERIFICATION') then upper(coalesce(p->>'verificationStatus',p->>'status'))
   when coalesce(p->>'reference','')<>'' or coalesce(p->>'proofPath','')<>'' then 'PROOF_SUBMITTED'
   else 'PENDING' end as fee_status,
   case when transaction_id is not null then paid_amount else coalesce(nullif(p->>'amount','')::numeric,expected) end as payable_amount,
   case when transaction_id is not null then base_amount else coalesce(nullif(p->>'baseAmount','')::numeric,f.initial_fee) end as fee_amount
  from x
 )
 select coalesce(jsonb_agg(jsonb_build_object('leadId',id,'applicationId',reference,'applicationEligible',true,'customerName',name,'phone',phone,'email',email,'assignedTo',assigned_name,'createdAt',created_at,'transactionId',transaction_id,'status',fee_status,'serviceType','Initial Project Assessment & Registration Fee','baseAmount',fee_amount,'discount',greatest(0,fee_amount-payable_amount),'amount',payable_amount,'payable',payable_amount,'paymentMethod',case when coalesce(transaction_ref,'')='' then '—' else coalesce(payment_method,'UPI / Bank Transfer') end,'reference',coalesce(nullif(transaction_ref,''),p->>'reference'),'proofPath',coalesce(nullif(proof_path,''),p->>'proofPath'),'submittedAt',coalesce(p->>'submittedAt',payment_created_at::text),'verifiedAt',case when fee_status in ('VERIFIED','REFUNDED') then coalesce(p->>'verifiedAt',payment_updated_at::text,p->>'submittedAt') end) order by created_at desc),'[]'::jsonb) into rows from y;
 return jsonb_build_object('viewerRole',u.role,'config',jsonb_build_object('baseFee',f.initial_fee,'discountPercent',case when f.offer_active then f.discount_percent else 0 end,'offerLabel',case when f.offer_active then f.offer_label else '' end,'offerActive',f.offer_active,'payableFee',expected),'rows',rows,'summary',jsonb_build_object(
  'totalLeads',jsonb_array_length(rows),'totalExpected',(select coalesce(sum((r->>'payable')::numeric),0) from jsonb_array_elements(rows) r),
  'totalReceived',(select coalesce(sum((r->>'payable')::numeric),0) from jsonb_array_elements(rows) r where r->>'status'='VERIFIED'),
  'pending',(select count(*) from jsonb_array_elements(rows) r where r->>'status'='PENDING'),
  'proofSubmitted',(select count(*) from jsonb_array_elements(rows) r where r->>'status' in ('UNDER_REVIEW','PENDING_VERIFICATION','PROOF_SUBMITTED')),
  'verified',(select count(*) from jsonb_array_elements(rows) r where r->>'status'='VERIFIED'),
  'rejected',(select count(*) from jsonb_array_elements(rows) r where r->>'status'='REJECTED')));
end $$;

-- Keep genuine payments immutable; remove only erroneous empty SYSTEM demands.
insert into akbs_crm.security_events(actor_role,action,entity,entity_id,before_data,after_data)
select 'SYSTEM','INELIGIBLE_FEE_DEMAND_REMOVED','fee_transaction',t.id::text,to_jsonb(t),jsonb_build_object('reason','Website inquiry or unsubmitted application; no payment was submitted')
from akbs_crm.fee_transactions t join akbs_crm.leads l on l.id=t.lead_id
where t.source='SYSTEM' and t.status='PENDING' and coalesce(t.transaction_ref,'')='' and coalesce(t.proof_path,'')='' and not akbs_crm.application_ready(l);
delete from akbs_crm.fee_transactions t using akbs_crm.leads l
where l.id=t.lead_id and t.source='SYSTEM' and t.status='PENDING' and coalesce(t.transaction_ref,'')='' and coalesce(t.proof_path,'')='' and not akbs_crm.application_ready(l);

alter table akbs_crm.fee_events drop constraint fee_events_event_type_check;
alter table akbs_crm.fee_events add constraint fee_events_event_type_check check(event_type in ('VERIFY','REJECT','REFUND','ADJUSTMENT','REMINDER_SENT','REGISTRATION_REMINDER_SENT','RECEIPT_EMAILED'));

create or replace function public.akbs_fee_transactions_staff(p_action text,p_token text,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path to 'pg_catalog','extensions' as $$
declare u akbs_crm.users; l akbs_crm.leads; t akbs_crm.fee_transactions; v_id uuid; lead uuid; base numeric; off numeric; service text; ref text; rows jsonb;
begin
 select usr.* into u from akbs_crm.users usr join akbs_crm.crm2_sessions s on s.user_id=usr.id where s.token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex') and s.expires_at>now() and usr.active limit 1;
 if u.id is null then raise exception 'Unauthorized';end if;
 if u.must_change_password or u.role not in ('ADMIN','MANAGER','EMPLOYEE','FINANCE') then raise exception 'Staff access denied';end if;
 if p_action='create' then
  if u.role not in ('ADMIN','MANAGER','FINANCE') then raise exception 'Access denied';end if;
  base:=coalesce((p_data->>'amount')::numeric,0);off:=coalesce((p_data->>'discount')::numeric,0);
  if base<=0 or base>1000000000 or off<0 or off>base then raise exception 'Invalid payment amount';end if;
  if u.role='MANAGER' and off<>0 then raise exception 'Only Admin/Finance can set discounts';end if;
  lead:=nullif(p_data->>'leadId','')::uuid;service:=left(coalesce(nullif(btrim(p_data->>'serviceType'),''),'Other Fee'),100);
  ref:=upper(regexp_replace(coalesce(p_data->>'transactionRef',''),'[^A-Za-z0-9]','','g'));
  if lead is not null then
   select * into l from akbs_crm.leads where leads.id=lead for update;
   if l.id is null or (u.role not in ('ADMIN','FINANCE') and not akbs_crm.visible(u,l)) then raise exception 'Lead not found';end if;
  end if;
  if akbs_crm.registration_service(service) then
   if l.id is null or not akbs_crm.application_ready(l) then raise exception 'A submitted application ID is required for registration fees';end if;
   perform pg_advisory_xact_lock(hashtextextended('registration-fee:'||l.id::text,0));
   service:='Initial Project Assessment & Registration Fee';
   select ft.* into t from akbs_crm.fee_transactions ft where ft.lead_id=l.id and akbs_crm.registration_service(ft.service_type) order by ft.created_at desc limit 1 for update;
   if t.id is not null and t.status not in ('PENDING','REJECTED') then raise exception 'Registration payment already submitted; use the existing transaction';end if;
   if t.id is not null and t.status='PENDING' and coalesce(t.transaction_ref,'')='' then v_id:=t.id;end if;
  end if;
  if v_id is null then
   insert into akbs_crm.fee_transactions(lead_id,application_reference,service_type,amount,discount,payable,payment_method,transaction_ref,status,note,created_by,source)
   values(lead,l.reference,service,base,off,base-off,left(coalesce(nullif(btrim(p_data->>'paymentMethod'),''),'Other'),50),ref,case when ref<>'' then 'UNDER_REVIEW' else 'PENDING' end,left(coalesce(p_data->>'note',''),500),u.id,'MANUAL') returning fee_transactions.id into v_id;
  else
   update akbs_crm.fee_transactions set amount=base,discount=off,payable=base-off,payment_method=left(coalesce(nullif(btrim(p_data->>'paymentMethod'),''),'Other'),50),transaction_ref=ref,status=case when ref<>'' then 'UNDER_REVIEW' else 'PENDING' end,note=left(coalesce(p_data->>'note',''),500),created_by=u.id,source='MANUAL',updated_at=now() where fee_transactions.id=v_id;
  end if;
  perform akbs_crm.security_event(u.id,'FEE_TRANSACTION_CREATED','fee_transaction',v_id::text);
 elsif p_action='status' then
  if u.role not in ('ADMIN','FINANCE') then raise exception 'Admin/Finance access required';end if;
  v_id:=(p_data->>'id')::uuid;
  select * into t from akbs_crm.fee_transactions where fee_transactions.id=v_id;
  if t.id is null then raise exception 'Payment not found';end if;
  if akbs_crm.registration_service(t.service_type) then
   perform 1 from akbs_crm.leads where leads.id=t.lead_id for update;
   perform pg_advisory_xact_lock(hashtextextended('registration-fee:'||t.lead_id::text,0));
  end if;
  select * into t from akbs_crm.fee_transactions where fee_transactions.id=v_id for update;
  if akbs_crm.registration_service(t.service_type) and upper(coalesce(p_data->>'status','')) in ('VERIFIED','REJECTED') then
   perform public.akbs_fee_staff('verify',p_token,jsonb_build_object('leadId',t.lead_id,'status',upper(p_data->>'status')));
  else
   if not ((t.status in ('PENDING','UNDER_REVIEW','PENDING_VERIFICATION') and upper(p_data->>'status') in ('VERIFIED','REJECTED') and (upper(p_data->>'status')<>'VERIFIED' or t.transaction_ref<>'' or t.proof_path is not null)) or (t.status='VERIFIED' and upper(p_data->>'status')='REFUNDED')) then raise exception 'Invalid payment state transition';end if;
   update akbs_crm.fee_transactions set status=upper(p_data->>'status'),verified_by=case when upper(p_data->>'status')='VERIFIED' then u.id else verified_by end,updated_at=now() where fee_transactions.id=v_id;
   perform akbs_crm.security_event(u.id,'PAYMENT_'||upper(p_data->>'status'),'fee_transaction',v_id::text);
   if akbs_crm.registration_service(t.service_type) and upper(p_data->>'status')='REFUNDED' then
    update akbs_crm.leads set details=jsonb_set(details,'{portal_form}',coalesce(details->'portal_form','{}'::jsonb)||jsonb_build_object('_initialPayment',coalesce(details#>'{portal_form,_initialPayment}','{}'::jsonb)||jsonb_build_object('verificationStatus','REFUNDED','status','REFUNDED')),true),updated_at=now(),version=version+1 where leads.id=t.lead_id;
   end if;
  end if;
 elsif p_action<>'snapshot' then raise exception 'Unsupported action';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',ft.id,'leadId',ft.lead_id,'applicationId',ld.reference,'applicationEligible',case when ld.id is null then false else akbs_crm.application_ready(ld) end,'customerName',coalesce(ld.name,'Manual / General'),'phone',coalesce(ld.phone,''),'email',coalesce(ld.email,''),'serviceType',ft.service_type,'amount',ft.amount,'discount',ft.discount,'payable',ft.payable,'paymentMethod',ft.payment_method,'transactionRef',ft.transaction_ref,'status',ft.status,'proofPath',ft.proof_path,'source',ft.source,'note',ft.note,'createdAt',ft.created_at,'updatedAt',ft.updated_at,'verifiedAt',case when ft.status in ('VERIFIED','REFUNDED') then ft.updated_at end,'createdBy',cu.name,'verifiedBy',vu.name) order by ft.created_at desc),'[]'::jsonb) into rows
 from akbs_crm.fee_transactions ft left join akbs_crm.leads ld on ld.id=ft.lead_id join akbs_crm.users cu on cu.id=ft.created_by left join akbs_crm.users vu on vu.id=ft.verified_by
 where not akbs_crm.registration_service(ft.service_type) and (u.role in ('ADMIN','FINANCE') or (ld.id is not null and akbs_crm.visible(u,ld)));
 return jsonb_build_object('rows',rows,'transactionId',v_id);
end $$;

create or replace function public.akbs_collection_email_context(p_token text,p_lead_id uuid,p_purpose text default 'payment')
returns jsonb language plpgsql security definer set search_path to '' as $$
declare u akbs_crm.users;l akbs_crm.leads;snapshot jsonb;row jsonb;a akbs_crm.payment_accounts;
begin
 select usr.* into u from akbs_crm.users usr join akbs_crm.crm2_sessions s on s.user_id=usr.id where s.token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') and s.expires_at>now() and usr.active limit 1;
 if u.id is null then return jsonb_build_object('error','Please sign in','status',401);end if;
 if u.must_change_password or u.role not in ('ADMIN','FINANCE','MANAGER','EMPLOYEE') then return jsonb_build_object('error','Staff access required','status',403);end if;
 if p_purpose not in ('payment','registration','receipt') then return jsonb_build_object('error','Invalid email purpose','status',400);end if;
 if p_purpose='receipt' and u.role not in ('ADMIN','FINANCE') then return jsonb_build_object('error','Admin/Finance access required','status',403);end if;
 select * into l from akbs_crm.leads where id=p_lead_id;
 if l.id is null or (u.role not in ('ADMIN','FINANCE') and not akbs_crm.visible(u,l)) then return jsonb_build_object('error','Lead not found or outside your team scope','status',404);end if;
 if coalesce(btrim(l.email),'')='' then return jsonb_build_object('error','Customer email is missing. Update the application contact first.','status',400);end if;
 if p_purpose='registration' then
  if akbs_crm.application_ready(l) then return jsonb_build_object('error','Application already submitted. Use its payment actions.','status',409);end if;
 else
  if not akbs_crm.application_ready(l) then return jsonb_build_object('error','Registration must be submitted before a fee reminder or receipt is available.','status',409);end if;
  snapshot:=public.akbs_fee_staff('snapshot',p_token,'{}'::jsonb);
  select r into row from jsonb_array_elements(snapshot->'rows') r where r->>'leadId'=l.id::text limit 1;
  if p_purpose='payment' and coalesce(row->>'status','')<>'PENDING' then return jsonb_build_object('error','A payment reminder is available only for pending unpaid applications.','status',409);end if;
  if p_purpose='receipt' and coalesce(row->>'status','')<>'VERIFIED' then return jsonb_build_object('error','Receipt is available only after payment verification.','status',409);end if;
 end if;
 select * into a from akbs_crm.payment_accounts where active and is_default limit 1;
 return jsonb_build_object('ok',true,'actorId',u.id,'actorName',u.name,'leadId',l.id,'applicationId',case when akbs_crm.application_ready(l) then l.reference else null end,'customerName',l.name,'email',lower(btrim(l.email)),'phone',l.phone,'row',row,
  'paymentAccount',case when a.id is null then null else jsonb_build_object('accountHolder',a.account_holder,'bankName',a.bank_name,'accountNumber',a.account_number,'ifsc',a.ifsc,'branch',a.branch,'upiId',a.upi_id) end);
end $$;
revoke all on function public.akbs_collection_email_context(text,uuid,text) from public,anon,authenticated;
grant execute on function public.akbs_collection_email_context(text,uuid,text) to service_role;

create or replace function public.akbs_payment_receipt_context(p_token text,p_lead_id uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare context jsonb;r jsonb;
begin
 context:=public.akbs_collection_email_context(p_token,p_lead_id,'receipt');
 if context ? 'error' then return context;end if;
 r:=context->'row';
 return context||jsonb_build_object('customerEmail',context->>'email','customerPhone',context->>'phone','amount',(r->>'payable')::numeric,'transactionRef',r->>'reference','paymentMethod',r->>'paymentMethod','paymentDate',r->>'verifiedAt','serviceType',r->>'serviceType');
end $$;
CREATE OR REPLACE FUNCTION akbs_crm.guard_fee_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ declare ref text; begin
 if akbs_crm.registration_service(new.service_type)
 and not exists(select 1 from akbs_crm.leads l where l.id=new.lead_id and akbs_crm.application_ready(l))
 then raise exception 'A submitted application ID is required for registration fees';end if;
 if new.amount<=0 or new.discount<0 or new.discount>new.amount or new.payable<>new.amount-new.discount then raise exception 'Invalid payment amount';end if;
 if tg_op='UPDATE' and old.status in ('VERIFIED','REFUNDED') and (new.amount,new.discount,new.payable,new.transaction_ref,new.lead_id,new.service_type) is distinct from (old.amount,old.discount,old.payable,old.transaction_ref,old.lead_id,old.service_type) then raise exception 'Verified payments are immutable';end if;
 ref:=upper(regexp_replace(coalesce(new.transaction_ref,''),'[^A-Za-z0-9]','','g'));
 if ref<>'' and (tg_op='INSERT' or new.transaction_ref is distinct from old.transaction_ref) then
  if exists(select 1 from akbs_crm.fee_transactions where upper(regexp_replace(transaction_ref,'[^A-Za-z0-9]','','g'))=ref and id<>new.id) or exists(select 1 from akbs_crm.leads where upper(regexp_replace(details#>>'{portal_form,_initialPayment,reference}','[^A-Za-z0-9]','','g'))=ref) then raise exception 'Transaction reference already submitted';end if;
  insert into akbs_crm.payment_reference_claims(reference,lead_id,transaction_id) values(ref,new.lead_id,new.id);
 end if;
 return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.akbs_customer_payment_submit(p_session_token text, p_application_hint text, p_reference text, p_proof_path text DEFAULT NULL::text, p_proof_sha256 text DEFAULT NULL::text, p_correlation_id uuid DEFAULT gen_random_uuid())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'extensions'
AS $function$
declare
  v_email text;
  v_actor uuid;
  v_lead akbs_crm.leads;
  v_fee akbs_crm.fee_settings;
  v_ref text;
  v_amount numeric;
  v_discount numeric;
  v_tx uuid;
  v_payment jsonb;
  v_hint_exists boolean:=false;
  v_constraint text;
begin
  select s.email into v_email
  from akbs_crm.portal_custom_sessions s
  where s.kind='customer'
    and s.token_hash=encode(digest(coalesce(p_session_token,''),'sha256'),'hex')
    and s.revoked_at is null and s.expires_at>now()
  order by s.created_at desc limit 1;
  if coalesce(v_email,'')='' then return jsonb_build_object('ok',false,'code','SESSION_INVALID','message','Your secure customer session has expired. Please sign in again.','correlationId',p_correlation_id); end if;

  select a.crm_user_id into v_actor from akbs_crm.portal_custom_accounts a where a.kind='customer' and lower(a.email)=lower(v_email) limit 1;
  if v_actor is null then return jsonb_build_object('ok',false,'code','CUSTOMER_ACCOUNT_NOT_FOUND','message','Your customer account could not be verified.','correlationId',p_correlation_id); end if;

  select l.* into v_lead
  from akbs_crm.portal_custom_submissions s join akbs_crm.leads l on l.id=s.lead_id
  where s.kind='customer' and l.customer_id=v_actor and (upper(trim(l.reference))=upper(trim(coalesce(p_application_hint,''))) or l.id::text=trim(coalesce(p_application_hint,'')) or s.id::text=trim(coalesce(p_application_hint,'')))
  order by s.created_at desc limit 1;

  if v_lead.id is null then
    select exists(select 1 from akbs_crm.leads l where upper(trim(l.reference))=upper(trim(coalesce(p_application_hint,''))) or l.id::text=trim(coalesce(p_application_hint,''))) into v_hint_exists;
    insert into akbs_crm.security_events(actor_id,actor_role,action,entity,entity_id,request_id,after_data)
    values(v_actor,'CUSTOMER',case when v_hint_exists then 'PAYMENT_APPLICATION_UNAUTHORIZED' else 'PAYMENT_APPLICATION_LOOKUP_FAILED' end,'lead',null,p_correlation_id::text,jsonb_build_object('applicationHint',left(coalesce(p_application_hint,''),120),'endpoint','akbs_customer_payment_submit','lookupResult',case when v_hint_exists then 'UNAUTHORIZED' else 'NOT_FOUND' end));
    if v_hint_exists then return jsonb_build_object('ok',false,'code','APPLICATION_NOT_AUTHORIZED','message','You are not authorized to submit payment for this application.','correlationId',p_correlation_id); end if;
    return jsonb_build_object('ok',false,'code','APPLICATION_NOT_FOUND','message','Your application could not be linked with our system. Please try again. If the issue continues, contact AKBS Support.','correlationId',p_correlation_id);
  end if;

  if not akbs_crm.application_ready(v_lead) then
    return jsonb_build_object('ok',false,'code','APPLICATION_NOT_SUBMITTED','message','Complete and submit your customer registration before making the registration fee payment.','correlationId',p_correlation_id);
  end if;
  perform 1 from akbs_crm.leads where id=v_lead.id for update;
  perform pg_advisory_xact_lock(hashtextextended('registration-fee:'||v_lead.id::text,0));
  v_ref:=upper(regexp_replace(coalesce(p_reference,''),'[^A-Za-z0-9]','','g'));
  if length(v_ref)<6 or length(v_ref)>60 then return jsonb_build_object('ok',false,'code','INVALID_PAYMENT_REFERENCE','message','Enter a valid UTR / transaction reference.','correlationId',p_correlation_id); end if;
  if coalesce(p_proof_sha256,'')<>'' and p_proof_sha256 !~ '^[0-9a-f]{64}$' then return jsonb_build_object('ok',false,'code','INVALID_PROOF_HASH','message','Payment proof validation failed.','correlationId',p_correlation_id); end if;
  perform pg_advisory_xact_lock(hashtextextended('payment-ref:'||v_ref,0));
  if exists(select 1 from akbs_crm.payment_reference_claims where reference=v_ref) then return jsonb_build_object('ok',false,'code','DUPLICATE_PAYMENT_REFERENCE','message','This payment reference has already been submitted.','correlationId',p_correlation_id); end if;
  if coalesce(p_proof_sha256,'')<>'' and exists(select 1 from akbs_crm.fee_transactions where proof_sha256=p_proof_sha256) then return jsonb_build_object('ok',false,'code','DUPLICATE_PAYMENT_PROOF','message','This payment proof has already been submitted.','correlationId',p_correlation_id); end if;
  if exists(select 1 from akbs_crm.fee_transactions where lead_id=v_lead.id and akbs_crm.registration_service(service_type) and status in ('PENDING_VERIFICATION','UNDER_REVIEW','VERIFIED','REFUNDED')) then return jsonb_build_object('ok',false,'code','PAYMENT_ALREADY_SUBMITTED','message','A payment submission already exists for this application.','correlationId',p_correlation_id); end if;

  select * into v_fee from akbs_crm.fee_settings where id=true;
  v_discount:=case when v_fee.offer_active then coalesce(v_fee.discount_percent,0) else 0 end;
  v_amount:=round(coalesce(v_fee.initial_fee,2999)*(1-v_discount/100.0),2);
  if v_amount<=0 or v_amount>1000000000 then return jsonb_build_object('ok',false,'code','INVALID_FEE_CONFIGURATION','message','Payment amount could not be validated. Please contact AKBS Support.','correlationId',p_correlation_id); end if;

  select id into v_tx from akbs_crm.fee_transactions
  where lead_id=v_lead.id and akbs_crm.registration_service(service_type) and status='PENDING' and coalesce(transaction_ref,'')=''
  order by created_at desc limit 1 for update;
  if v_tx is null then
    insert into akbs_crm.fee_transactions(lead_id,application_reference,service_type,amount,discount,payable,payment_method,transaction_ref,status,note,created_by,proof_path,proof_sha256,correlation_id,source)
    values(v_lead.id,v_lead.reference,'Initial Project Assessment & Registration Fee',coalesce(v_fee.initial_fee,2999),round(coalesce(v_fee.initial_fee,2999)-v_amount,2),v_amount,'BANK_TRANSFER',v_ref,'PENDING_VERIFICATION','Submitted by verified customer portal',v_actor,nullif(p_proof_path,''),nullif(p_proof_sha256,''),p_correlation_id,'CUSTOMER_PORTAL') returning id into v_tx;
  else
    update akbs_crm.fee_transactions set application_reference=v_lead.reference,service_type='Initial Project Assessment & Registration Fee',amount=coalesce(v_fee.initial_fee,2999),discount=round(coalesce(v_fee.initial_fee,2999)-v_amount,2),payable=v_amount,payment_method='BANK_TRANSFER',transaction_ref=v_ref,status='PENDING_VERIFICATION',note='Submitted by verified customer portal',created_by=v_actor,proof_path=nullif(p_proof_path,''),proof_sha256=nullif(p_proof_sha256,''),correlation_id=p_correlation_id,source='CUSTOMER_PORTAL',updated_at=now() where id=v_tx;
  end if;

  v_payment:=jsonb_build_object('transactionId',v_tx,'applicationId',v_lead.reference,'amount',v_amount,'baseAmount',coalesce(v_fee.initial_fee,2999),'discountPercent',v_discount,'feeLabel','Initial Project Assessment & Registration Fee','reference',v_ref,'proofPath',nullif(p_proof_path,''),'proofSha256',nullif(p_proof_sha256,''),'submittedAt',now(),'verificationStatus','PENDING_VERIFICATION','status','PENDING_VERIFICATION','correlationId',p_correlation_id,'customerDeclaredCompanyAccountOnly',true);
  update akbs_crm.leads set details=jsonb_set(details,'{portal_form}',coalesce(details->'portal_form','{}'::jsonb)||jsonb_build_object('_initialPayment',v_payment),true),updated_at=now(),version=version+1 where id=v_lead.id;
  insert into akbs_crm.security_events(actor_id,actor_role,action,entity,entity_id,request_id,after_data) values(v_actor,'CUSTOMER','PAYMENT_SUBMITTED','fee_transaction',v_tx::text,p_correlation_id::text,jsonb_build_object('applicationId',v_lead.reference,'leadId',v_lead.id,'transactionId',v_tx,'status','PENDING_VERIFICATION','endpoint','akbs_customer_payment_submit','lookupResult','FOUND'));
  return jsonb_build_object('ok',true,'applicationId',v_lead.reference,'leadId',v_lead.id,'transactionId',v_tx,'status','PENDING_VERIFICATION','amount',v_amount,'correlationId',p_correlation_id);
exception
  when unique_violation then
    get stacked diagnostics v_constraint = CONSTRAINT_NAME;
    if v_constraint='payment_reference_claims_pkey' then return jsonb_build_object('ok',false,'code','DUPLICATE_PAYMENT_REFERENCE','message','This payment reference has already been submitted.','correlationId',p_correlation_id);
    elsif v_constraint='fee_transactions_proof_sha256_uidx' then return jsonb_build_object('ok',false,'code','DUPLICATE_PAYMENT_PROOF','message','This payment proof has already been submitted.','correlationId',p_correlation_id);
    elsif v_constraint='fee_transactions_customer_correlation_uidx' then return jsonb_build_object('ok',false,'code','PAYMENT_REQUEST_REPLAYED','message','This payment request has already been processed.','correlationId',p_correlation_id); end if;
    return jsonb_build_object('ok',false,'code','PAYMENT_SUBMISSION_FAILED','message','Payment submission could not be completed. Please try again. If the issue continues, contact AKBS Support.','correlationId',p_correlation_id);
  when others then
    return jsonb_build_object('ok',false,'code','PAYMENT_SUBMISSION_FAILED','message','Payment submission could not be completed. Please try again. If the issue continues, contact AKBS Support.','correlationId',p_correlation_id);
end
$function$
;
CREATE OR REPLACE FUNCTION public.akbs_send_fee_reminder_email(p_lead_id uuid, p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'extensions'
AS $function$
declare
  u akbs_crm.users;
  l akbs_crm.leads;
  f akbs_crm.fee_settings;
  a akbs_crm.payment_accounts;
  ec public.akbs_email_settings%rowtype;
  k text;
  amt numeric;
  html text;
  context jsonb;
  queued_request bigint;
begin
  context:=public.akbs_collection_email_context(p_token,p_lead_id,'payment');
  if context ? 'error' then return context;end if;
  select usr.* into u
  from akbs_crm.users usr
  join akbs_crm.crm2_sessions s on s.user_id=usr.id
  where s.token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex')
    and s.expires_at>now() and usr.active
  limit 1;

  if u.id is null then return jsonb_build_object('error','Please sign in','status',401); end if;
  if u.must_change_password then return jsonb_build_object('error','Change password first','status',403); end if;
  if u.role not in ('ADMIN','MANAGER','EMPLOYEE','FINANCE') then return jsonb_build_object('error','Staff access required','status',403); end if;

  select * into l from akbs_crm.leads where id=p_lead_id limit 1;
  if l.id is null then return jsonb_build_object('error','Lead not found','status',404); end if;
  if coalesce(trim(l.email),'')='' then return jsonb_build_object('error','Customer email missing','status',400); end if;
  if upper(coalesce(l.details#>>'{portal_form,_initialPayment,verificationStatus}',''))='VERIFIED'
    then return jsonb_build_object('error','Fee already verified','status',409); end if;

  select * into f from akbs_crm.fee_settings where id=true limit 1;
  select * into a from akbs_crm.payment_accounts where active=true and is_default=true limit 1;
  select * into ec from public.akbs_email_settings where id=1;

  select decrypted_secret into k from vault.decrypted_secrets
  where name='akbs_resend_api_key' order by created_at desc limit 1;

  if coalesce(k,'')='' then return jsonb_build_object('error','Email service not configured','status',500); end if;

  amt:=round(coalesce(f.initial_fee,2999)*(1-(case when coalesce(f.offer_active,false) then coalesce(f.discount_percent,0) else 0 end)/100.0),2);

  html:=
    '<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#173b2c">'
    ||'<h2>AKBS Poultry Farming Pvt. Ltd.</h2>'
    ||'<p>Dear '||replace(replace(coalesce(l.name,'Customer'),'&','&amp;'),'<','&lt;')||',</p>'
    ||'<p>Your Initial Project Assessment & Registration Fee is pending.</p>'
    ||'<h1>₹'||to_char(amt,'FM99,99,99,99,990')||'</h1>'
    ||'<p><b>Application No.:</b> '||coalesce(l.reference,'-')||'</p>'
    ||case when a.id is not null then
      '<div style="padding:14px;background:#f3f8f5;border-radius:10px">'
      ||'<b>Official Company Payment Account</b><br>'
      ||'Account Name: '||coalesce(a.account_holder,'AKBS Poultry Farming Pvt. Ltd.')||'<br>'
      ||case when coalesce(a.bank_name,'')<>'' then 'Bank: '||a.bank_name||'<br>' else '' end
      ||case when coalesce(a.account_number,'')<>'' then 'Account No.: '||a.account_number||'<br>' else '' end
      ||case when coalesce(a.ifsc,'')<>'' then 'IFSC: '||a.ifsc||'<br>' else '' end
      ||case when coalesce(a.upi_id,'')<>'' then 'UPI ID: '||a.upi_id||'<br>' else '' end
      ||'</div>' else '' end
    ||'<p>After payment, submit UTR or payment proof in the Customer Portal.</p>'
    ||'<p><a href="https://crm.akbspoultry.com/customer-registration">Open Customer Portal</a></p>'
    ||'<p style="font-size:12px;color:#9a3412">Payment is accepted only through official AKBS Poultry Farming Pvt. Ltd. payment channels.</p>'
    ||'</div>';

  select net.http_post(
    url:='https://api.resend.com/emails',
    headers:=jsonb_build_object('Authorization','Bearer '||k,'Content-Type','application/json'),
    body:=jsonb_build_object(
      'from',coalesce(ec.customer_sender_name,'AKBS Poultry Farming')||' <'||coalesce(ec.customer_sender_email,'website@akbspoultry.com')||'>',
      'to',jsonb_build_array(lower(trim(l.email))),
      'subject','AKBS Fee Payment Reminder - '||coalesce(l.reference,'Your Application'),
      'html',html,
      'reply_to',coalesce(ec.customer_reply_to,'info@akbspoultry.com')
    )
  ) into queued_request;

  return jsonb_build_object('ok',true,'queued',true,'requestId',queued_request,'email',lower(trim(l.email)),'applicationId',l.reference,'amount',amt);
end $function$
;

notify pgrst,'reload schema';
