-- Edge Functions can access public RPCs, but not private akbs_crm tables.
-- Reauthorize the exact application before recording an accepted receipt email.
create or replace function public.akbs_collection_receipt_audit(
 p_token text,p_lead_id uuid,p_email_id text,p_kind text default 'staff'
) returns jsonb language plpgsql security definer set search_path to '' as $$
declare context jsonb;payment jsonb;recipient text;payment_status text;paid numeric;actor uuid;actor_name text;v_note text;
begin
 if p_kind not in ('staff','customer') or p_email_id is null or p_email_id !~ '^[A-Za-z0-9-]{8,128}$' then
  return jsonb_build_object('error','Invalid receipt audit request','status',400);
 end if;
 if p_kind='staff' then
  context:=public.akbs_collection_email_context(p_token,p_lead_id,'receipt');
  if context ? 'error' then return context;end if;
  recipient:=context->>'email';payment_status:=context#>>'{row,status}';paid:=(context#>>'{row,payable}')::numeric;
  actor:=(context->>'actorId')::uuid;actor_name:=context->>'actorName';
 else
  context:=public.akbs_customer_payment_context(p_session_token=>p_token,p_application_id=>p_lead_id::text);
  if context ? 'error' then return context;end if;
  if context->>'leadId' is distinct from p_lead_id::text then
   return jsonb_build_object('error','Application access denied','status',403);
  end if;
  payment:=context#>'{details,portal_form,_initialPayment}';
  payment_status:=upper(coalesce(payment->>'verificationStatus',payment->>'status','PENDING_VERIFICATION'));
  paid:=coalesce(nullif(payment->>'amount','')::numeric,0);recipient:=lower(btrim(context->>'customerEmail'));actor_name:='System';
  if paid<=0 or (coalesce(payment->>'reference','')='' and coalesce(payment->>'proofPath','')='')
   or payment_status not in ('PENDING_VERIFICATION','PROOF_SUBMITTED','UNDER_REVIEW','VERIFIED') then
   return jsonb_build_object('error','Payment acknowledgement is unavailable','status',409);
  end if;
 end if;
 if coalesce(recipient,'')='' then return jsonb_build_object('error','Customer email is missing','status',400);end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('receipt-email-audit:'||p_email_id,0));
 v_note:=case when payment_status='VERIFIED' then 'Verified receipt PDF' else 'Payment acknowledgement PDF' end
  ||' accepted for '||recipient||'. Email ID: '||p_email_id;
 if not exists(select 1 from akbs_crm.activities where lead_id=p_lead_id
  and action in ('PAYMENT_RECEIPT_EMAILED','PAYMENT_ACKNOWLEDGEMENT_EMAILED') and activities.note=v_note) then
  insert into akbs_crm.activities(lead_id,actor_name,action,note,shared)
  values(p_lead_id,coalesce(actor_name,'System'),case when payment_status='VERIFIED' then 'PAYMENT_RECEIPT_EMAILED' else 'PAYMENT_ACKNOWLEDGEMENT_EMAILED' end,v_note,false);
 end if;
 if p_kind='staff' and not exists(select 1 from akbs_crm.fee_events where lead_id=p_lead_id and event_type='RECEIPT_EMAILED' and fee_events.note=v_note) then
  insert into akbs_crm.fee_events(lead_id,event_type,amount,note,created_by)
  values(p_lead_id,'RECEIPT_EMAILED',paid,v_note,actor);
 end if;
 return jsonb_build_object('ok',true,'emailId',p_email_id);
end $$;
revoke all on function public.akbs_collection_receipt_audit(text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.akbs_collection_receipt_audit(text,uuid,text,text) to service_role;
notify pgrst,'reload schema';
