begin;

alter table akbs_crm.fee_transactions
  add column if not exists application_reference text,
  add column if not exists proof_path text,
  add column if not exists proof_sha256 text,
  add column if not exists correlation_id uuid,
  add column if not exists source text not null default 'STAFF';

alter table akbs_crm.fee_transactions
  drop constraint if exists fee_transactions_status_check;

alter table akbs_crm.fee_transactions
  add constraint fee_transactions_status_check
  check (status in ('PENDING','UNDER_REVIEW','PENDING_VERIFICATION','VERIFIED','REJECTED','REFUNDED'));

update akbs_crm.fee_transactions t
set application_reference=l.reference
from akbs_crm.leads l
where t.lead_id=l.id
  and coalesce(t.application_reference,'')='';

create unique index if not exists fee_transactions_customer_correlation_uidx
  on akbs_crm.fee_transactions(correlation_id)
  where correlation_id is not null;

create unique index if not exists fee_transactions_proof_sha256_uidx
  on akbs_crm.fee_transactions(proof_sha256)
  where proof_sha256 is not null and proof_sha256<>'';

create index if not exists fee_transactions_application_reference_idx
  on akbs_crm.fee_transactions(application_reference,created_at desc);

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
    and s.revoked_at is null
    and s.expires_at>now()
  order by s.created_at desc
  limit 1;

  if coalesce(v_email,'')='' then
    return jsonb_build_object('ok',false,'code','SESSION_INVALID','message','Your secure customer session has expired. Please sign in again.','correlationId',p_correlation_id);
  end if;

  select a.crm_user_id into v_actor
  from akbs_crm.portal_custom_accounts a
  where a.kind='customer' and lower(a.email)=lower(v_email)
  limit 1;

  if v_actor is null then
    return jsonb_build_object('ok',false,'code','CUSTOMER_ACCOUNT_NOT_FOUND','message','Your customer account could not be verified.','correlationId',p_correlation_id);
  end if;

  select l.* into v_lead
  from akbs_crm.portal_custom_submissions s
  join akbs_crm.leads l on l.id=s.lead_id
  where s.kind='customer'
    and l.customer_id=v_actor
    and (
      upper(trim(l.reference))=upper(trim(coalesce(p_application_hint,'')))
      or l.id::text=trim(coalesce(p_application_hint,''))
      or s.id::text=trim(coalesce(p_application_hint,''))
    )
  order by s.created_at desc
  limit 1;

  if v_lead.id is null then
    select exists(
      select 1
      from akbs_crm.portal_custom_submissions s
      join akbs_crm.leads l on l.id=s.lead_id
      where s.kind='customer'
        and (
          upper(trim(l.reference))=upper(trim(coalesce(p_application_hint,'')))
          or l.id::text=trim(coalesce(p_application_hint,''))
          or s.id::text=trim(coalesce(p_application_hint,''))
        )
    ) into v_hint_exists;

    insert into akbs_crm.security_events(actor_id,actor_role,action,entity,entity_id,request_id,after_data)
    values(
      v_actor,'CUSTOMER',
      case when v_hint_exists then 'PAYMENT_APPLICATION_UNAUTHORIZED' else 'PAYMENT_APPLICATION_LOOKUP_FAILED' end,
      'lead',null,p_correlation_id::text,
      jsonb_build_object('applicationHint',left(coalesce(p_application_hint,''),120),'endpoint','akbs_customer_payment_submit','lookupResult',case when v_hint_exists then 'UNAUTHORIZED' else 'NOT_FOUND' end)
    );

    if v_hint_exists then
      return jsonb_build_object('ok',false,'code','APPLICATION_NOT_AUTHORIZED','message','You are not authorized to submit payment for this application.','correlationId',p_correlation_id);
    end if;

    return jsonb_build_object('ok',false,'code','APPLICATION_NOT_FOUND','message','Your application could not be linked with our system. Please try again. If the issue continues, contact AKBS Support.','correlationId',p_correlation_id);
  end if;

  -- Use the same canonical payment-reference normalization as the existing
  -- fee transaction guard trigger so duplicate checks cannot disagree.
  v_ref:=upper(regexp_replace(coalesce(p_reference,''),'[^A-Za-z0-9]','','g'));
  if length(v_ref)<6 or length(v_ref)>60 then
    return jsonb_build_object('ok',false,'code','INVALID_PAYMENT_REFERENCE','message','Enter a valid UTR / transaction reference.','correlationId',p_correlation_id);
  end if;

  if coalesce(p_proof_sha256,'')<>'' and p_proof_sha256 !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok',false,'code','INVALID_PROOF_HASH','message','Payment proof validation failed.','correlationId',p_correlation_id);
  end if;

  perform pg_advisory_xact_lock(hashtextextended('payment-ref:'||v_ref,0));

  if exists(select 1 from akbs_crm.payment_reference_claims where reference=v_ref) then
    return jsonb_build_object('ok',false,'code','DUPLICATE_PAYMENT_REFERENCE','message','This payment reference has already been submitted.','correlationId',p_correlation_id);
  end if;

  if coalesce(p_proof_sha256,'')<>'' and exists(select 1 from akbs_crm.fee_transactions where proof_sha256=p_proof_sha256) then
    return jsonb_build_object('ok',false,'code','DUPLICATE_PAYMENT_PROOF','message','This payment proof has already been submitted.','correlationId',p_correlation_id);
  end if;

  if exists(
    select 1 from akbs_crm.fee_transactions
    where lead_id=v_lead.id
      and service_type='Initial Project Assessment & Registration Fee'
      and status in ('PENDING_VERIFICATION','VERIFIED')
  ) then
    return jsonb_build_object('ok',false,'code','PAYMENT_ALREADY_SUBMITTED','message','A payment submission already exists for this application.','correlationId',p_correlation_id);
  end if;

  select * into v_fee from akbs_crm.fee_settings where id=true;
  v_discount:=case when v_fee.offer_active then coalesce(v_fee.discount_percent,0) else 0 end;
  v_amount:=round(coalesce(v_fee.initial_fee,2999)*(1-v_discount/100.0),2);

  if v_amount<=0 or v_amount>1000000000 then
    return jsonb_build_object('ok',false,'code','INVALID_FEE_CONFIGURATION','message','Payment amount could not be validated. Please contact AKBS Support.','correlationId',p_correlation_id);
  end if;

  insert into akbs_crm.fee_transactions(
    lead_id,application_reference,service_type,amount,discount,payable,payment_method,
    transaction_ref,status,note,created_by,proof_path,proof_sha256,correlation_id,source
  ) values(
    v_lead.id,v_lead.reference,'Initial Project Assessment & Registration Fee',
    coalesce(v_fee.initial_fee,2999),round(coalesce(v_fee.initial_fee,2999)-v_amount,2),
    v_amount,'BANK_TRANSFER',v_ref,'PENDING_VERIFICATION','Submitted by verified customer portal',
    v_actor,nullif(p_proof_path,''),nullif(p_proof_sha256,''),p_correlation_id,'CUSTOMER_PORTAL'
  ) returning id into v_tx;

  -- payment_reference_claims is populated atomically by guard_fee_transaction().
  -- Do not insert it again here.

  v_payment:=jsonb_build_object(
    'transactionId',v_tx,'applicationId',v_lead.reference,'amount',v_amount,
    'baseAmount',coalesce(v_fee.initial_fee,2999),'discountPercent',v_discount,
    'feeLabel','Initial Project Assessment & Registration Fee','reference',v_ref,
    'proofPath',nullif(p_proof_path,''),'proofSha256',nullif(p_proof_sha256,''),
    'submittedAt',now(),'verificationStatus','PENDING_VERIFICATION',
    'status','PENDING_VERIFICATION','correlationId',p_correlation_id,
    'customerDeclaredCompanyAccountOnly',true
  );

  update akbs_crm.leads
  set details=jsonb_set(details,'{portal_form,_initialPayment}',v_payment,true),
      updated_at=now(),version=version+1
  where id=v_lead.id;

  insert into akbs_crm.security_events(actor_id,actor_role,action,entity,entity_id,request_id,after_data)
  values(
    v_actor,'CUSTOMER','PAYMENT_SUBMITTED','fee_transaction',v_tx::text,p_correlation_id::text,
    jsonb_build_object('applicationId',v_lead.reference,'leadId',v_lead.id,'transactionId',v_tx,'status','PENDING_VERIFICATION','endpoint','akbs_customer_payment_submit','lookupResult','FOUND')
  );

  return jsonb_build_object('ok',true,'applicationId',v_lead.reference,'leadId',v_lead.id,'transactionId',v_tx,'status','PENDING_VERIFICATION','amount',v_amount,'correlationId',p_correlation_id);

exception
  when unique_violation then
    get stacked diagnostics v_constraint = CONSTRAINT_NAME;

    insert into akbs_crm.security_events(actor_id,actor_role,action,entity,entity_id,request_id,after_data)
    values(
      v_actor,'CUSTOMER','PAYMENT_SUBMISSION_CONFLICT','payment',coalesce(v_lead.id::text,null),p_correlation_id::text,
      jsonb_build_object('applicationHint',left(coalesce(p_application_hint,''),120),'resolvedApplicationId',v_lead.reference,'endpoint','akbs_customer_payment_submit','constraint',v_constraint)
    );

    if v_constraint='payment_reference_claims_pkey' then
      return jsonb_build_object('ok',false,'code','DUPLICATE_PAYMENT_REFERENCE','message','This payment reference has already been submitted.','correlationId',p_correlation_id);
    elsif v_constraint='fee_transactions_proof_sha256_uidx' then
      return jsonb_build_object('ok',false,'code','DUPLICATE_PAYMENT_PROOF','message','This payment proof has already been submitted.','correlationId',p_correlation_id);
    elsif v_constraint='fee_transactions_customer_correlation_uidx' then
      return jsonb_build_object('ok',false,'code','PAYMENT_REQUEST_REPLAYED','message','This payment request has already been processed.','correlationId',p_correlation_id);
    end if;

    return jsonb_build_object('ok',false,'code','PAYMENT_SUBMISSION_FAILED','message','Payment submission could not be completed. Please try again. If the issue continues, contact AKBS Support.','correlationId',p_correlation_id);

  when others then
    insert into akbs_crm.security_events(actor_id,actor_role,action,entity,entity_id,request_id,after_data)
    values(
      v_actor,'CUSTOMER','PAYMENT_SUBMISSION_ERROR','payment',coalesce(v_lead.id::text,null),p_correlation_id::text,
      jsonb_build_object('applicationHint',left(coalesce(p_application_hint,''),120),'resolvedApplicationId',v_lead.reference,'endpoint','akbs_customer_payment_submit','databaseError',sqlstate)
    );

    return jsonb_build_object('ok',false,'code','PAYMENT_SUBMISSION_FAILED','message','Payment submission could not be completed. Please try again. If the issue continues, contact AKBS Support.','correlationId',p_correlation_id);
end
$function$
;

revoke all on function public.akbs_customer_payment_submit(text,text,text,text,text,uuid)
  from public,anon,authenticated;
grant execute on function public.akbs_customer_payment_submit(text,text,text,text,text,uuid)
  to service_role;

notify pgrst,'reload schema';
commit;
