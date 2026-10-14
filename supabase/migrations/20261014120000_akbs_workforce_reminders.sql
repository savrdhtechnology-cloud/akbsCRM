-- =============================================================================
-- AI Workforce reminders through AKBS CRM (14 Oct 2026)
--
-- Lets the SAVRDH AI Workforce send an AKBS reminder email the same way the
-- "Email Registration Reminder" / fee reminder buttons do: AKBS email settings,
-- AKBS template, AKBS 60-minute cooldown, and a REGISTRATION/FEE_REMINDER_EMAILED
-- entry on the lead timeline (actor "AI Workforce · <agent>").
-- Service-role only; called by the akbs-workforce-reminder edge function, which
-- checks a shared workforce token. Every send is approved by a person in the
-- Workforce admin before it reaches this function.
-- =============================================================================

create or replace function public.akbs_workforce_reminder_claim(p_email text, p_purpose text)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare
  recipient text:=lower(btrim(coalesce(p_email,'')));
  n int; l akbs_crm.leads; d akbs_crm.collection_reminder_deliveries; delivery uuid;
  f akbs_crm.fee_settings; expected numeric; tx record; p jsonb; st text; payable numeric; a akbs_crm.payment_accounts; row jsonb;
begin
  if p_purpose not in ('payment','registration') then return jsonb_build_object('error','Invalid reminder purpose','status',400); end if;
  if recipient='' then return jsonb_build_object('error','Customer email is missing','status',400); end if;

  select count(*) into n from akbs_crm.leads where lower(btrim(email))=recipient;
  if n=0 then return jsonb_build_object('error','No AKBS CRM lead uses this email','status',404); end if;
  if n>1 then return jsonb_build_object('error','More than one AKBS CRM lead uses this email; send from AKBS CRM by hand','status',409); end if;
  select * into l from akbs_crm.leads where lower(btrim(email))=recipient;

  if p_purpose='registration' then
    if akbs_crm.application_ready(l) then return jsonb_build_object('error','Application already submitted. Use its payment actions.','status',409); end if;
  else
    if not akbs_crm.application_ready(l) then return jsonb_build_object('error','Registration must be submitted before a fee reminder.','status',409); end if;
    select * into f from akbs_crm.fee_settings where id=true;
    expected:=round(f.initial_fee*(1-(case when f.offer_active then f.discount_percent else 0 end)/100.0),2);
    select ft.* into tx from akbs_crm.fee_transactions ft where ft.lead_id=l.id and akbs_crm.registration_service(ft.service_type)
      order by (coalesce(ft.transaction_ref,'')<>'' or nullif(ft.proof_path,'') is not null) desc,ft.created_at desc,ft.id desc limit 1;
    p:=l.details#>'{portal_form,_initialPayment}';
    st:=case
      when tx.status in ('VERIFIED','REJECTED','REFUNDED','UNDER_REVIEW','PENDING_VERIFICATION') then tx.status
      when upper(coalesce(p->>'verificationStatus',p->>'status','')) in ('VERIFIED','REJECTED','REFUNDED','PENDING_VERIFICATION') then upper(coalesce(p->>'verificationStatus',p->>'status'))
      when coalesce(p->>'reference','')<>'' or coalesce(p->>'proofPath','')<>'' then 'PROOF_SUBMITTED'
      else 'PENDING' end;
    if st<>'PENDING' then return jsonb_build_object('error','A payment reminder is available only for pending unpaid applications (now '||st||').','status',409); end if;
    payable:=case when tx.id is not null then tx.payable else coalesce(nullif(p->>'amount','')::numeric,expected) end;
    row:=jsonb_build_object('serviceType','Initial Project Assessment & Registration Fee','payable',payable,'amount',payable);
  end if;

  perform pg_advisory_xact_lock(hashtextextended('collection-reminder:'||p_purpose||':'||recipient,0));
  select * into d from akbs_crm.collection_reminder_deliveries r where r.purpose=p_purpose and r.email=recipient for update;
  if d.retry_at>now() then
    return jsonb_build_object('error',case when d.state='SENDING' then 'A reminder is already being sent to this customer.' else 'A reminder was sent in the last 60 minutes.' end,'status',429,'retryAt',d.retry_at,'lastSentAt',d.sent_at);
  end if;
  delivery:=case when d.state='SENDING' then d.delivery_id else gen_random_uuid() end;
  insert into akbs_crm.collection_reminder_deliveries as r(purpose,email,target_key,lead_id,actor_id,delivery_id,state,claimed_at,retry_at)
  values(p_purpose,recipient,'lead:'||l.id,l.id,null,delivery,'SENDING',now(),now()+interval '2 minutes')
  on conflict(purpose,email) do update set target_key=excluded.target_key,lead_id=excluded.lead_id,actor_id=null,delivery_id=excluded.delivery_id,state='SENDING',claimed_at=now(),retry_at=excluded.retry_at;

  select * into a from akbs_crm.payment_accounts where active and is_default limit 1;
  return jsonb_build_object('ok',true,'purpose',p_purpose,'deliveryId',delivery,'leadId',l.id,'email',recipient,'customerName',l.name,
    'applicationId',case when akbs_crm.application_ready(l) then l.reference else null end,'row',row,
    'paymentAccount',case when a.id is null then null else jsonb_build_object('accountHolder',a.account_holder,'bankName',a.bank_name,'accountNumber',a.account_number,'ifsc',a.ifsc,'branch',a.branch,'upiId',a.upi_id) end);
end $$;

create or replace function public.akbs_workforce_reminder_finish(p_delivery_id uuid, p_email_id text default null, p_agent text default null, p_permanent_failure boolean default false)
returns jsonb language plpgsql security definer set search_path to ''
as $$
declare d akbs_crm.collection_reminder_deliveries; note text; who text:='AI Workforce'||coalesce(' · '||nullif(btrim(left(coalesce(p_agent,''),60)),''),'');
begin
  select * into d from akbs_crm.collection_reminder_deliveries where delivery_id=p_delivery_id for update;
  if d.delivery_id is null then return jsonb_build_object('error','Reminder delivery not found','status',404); end if;
  if d.state<>'SENDING' then return jsonb_build_object('ok',true,'retryAt',d.retry_at,'lastSentAt',d.sent_at); end if;
  if coalesce(p_email_id,'')='' then
    if p_permanent_failure then update akbs_crm.collection_reminder_deliveries set state='FAILED',retry_at=now() where delivery_id=p_delivery_id; end if;
    return jsonb_build_object('ok',true,'retryAt',case when p_permanent_failure then now() else d.retry_at end);
  end if;
  update akbs_crm.collection_reminder_deliveries set state='SENT',sent_at=now(),retry_at=now()+interval '60 minutes',email_id=p_email_id
  where delivery_id=p_delivery_id returning * into d;
  note:='Email accepted for '||d.email||'. Email ID: '||p_email_id||'. Sent by '||who||' after admin approval.';
  if d.lead_id is not null then
    insert into akbs_crm.activities(lead_id,actor_name,action,note,shared)
    values(d.lead_id,who,case when d.purpose='payment' then 'FEE_REMINDER_EMAILED' else 'REGISTRATION_REMINDER_EMAILED' end,note,false);
  end if;
  return jsonb_build_object('ok',true,'retryAt',d.retry_at,'lastSentAt',d.sent_at,'emailId',p_email_id);
end $$;

revoke all on function public.akbs_workforce_reminder_claim(text,text) from public, anon, authenticated;
revoke all on function public.akbs_workforce_reminder_finish(uuid,text,text,boolean) from public, anon, authenticated;
grant execute on function public.akbs_workforce_reminder_claim(text,text) to service_role;
grant execute on function public.akbs_workforce_reminder_finish(uuid,text,text,boolean) to service_role;
