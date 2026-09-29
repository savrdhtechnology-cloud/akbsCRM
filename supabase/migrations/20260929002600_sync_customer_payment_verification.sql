create or replace function public.akbs_fee_staff(
  p_action text,
  p_token text,
  p_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,extensions
as $$
declare
  v_user akbs_crm.users;
  v_config akbs_crm.fee_settings;
  v_rows jsonb;
  v_total_expected numeric:=0;
  v_total_received numeric:=0;
  v_pending integer:=0;
  v_submitted integer:=0;
  v_verified integer:=0;
  v_rejected integer:=0;
  v_lead uuid;
  v_status text;
  v_tx uuid;
begin
  select u.* into v_user
  from akbs_crm.crm2_sessions s
  join akbs_crm.users u on u.id=s.user_id
  where s.token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex')
    and s.expires_at>now()
    and u.active=true
  limit 1;

  if v_user.id is null then raise exception 'Unauthorized'; end if;
  if v_user.must_change_password or v_user.role not in ('ADMIN','MANAGER','EMPLOYEE','FINANCE') then
    raise exception 'Staff access denied';
  end if;

  if p_action='update_config' then
    if v_user.role<>'ADMIN' then raise exception 'Admin access required'; end if;

    update akbs_crm.fee_settings
    set initial_fee=greatest(0,coalesce((p_data->>'initialFee')::numeric,initial_fee)),
        discount_percent=least(100,greatest(0,coalesce((p_data->>'discountPercent')::numeric,discount_percent))),
        offer_label=left(coalesce(p_data->>'offerLabel',''),120),
        offer_active=coalesce((p_data->>'offerActive')::boolean,false),
        updated_at=now(),
        updated_by=v_user.id
    where id=true;

  elsif p_action='verify' then
    if v_user.role not in ('ADMIN','FINANCE') then
      raise exception 'Admin/Finance access required';
    end if;

    v_lead=(p_data->>'leadId')::uuid;
    v_status=upper(coalesce(p_data->>'status',''));

    if v_status not in ('VERIFIED','REJECTED') then
      raise exception 'Invalid status';
    end if;

    select t.id into v_tx
    from akbs_crm.fee_transactions t
    where t.lead_id=v_lead
      and t.source='CUSTOMER_PORTAL'
      and t.service_type='Initial Project Assessment & Registration Fee'
    order by t.created_at desc
    limit 1
    for update;

    if v_tx is null then
      if not exists(
        select 1 from akbs_crm.leads
        where id=v_lead
          and (
            details#>>'{portal_form,_initialPayment,reference}' is not null
            or details#>>'{portal_form,_initialPayment,proofPath}' is not null
          )
      ) then
        raise exception 'Payment proof is required';
      end if;
    else
      if exists(
        select 1 from akbs_crm.fee_transactions
        where id=v_tx and status='VERIFIED'
      ) then
        raise exception 'Verified payments are immutable; use the refund workflow';
      end if;

      update akbs_crm.fee_transactions
      set status=v_status,
          verified_by=case when v_status='VERIFIED' then v_user.id else null end,
          updated_at=now()
      where id=v_tx;
    end if;

    if exists(
      select 1 from akbs_crm.leads
      where id=v_lead
        and details#>>'{portal_form,_initialPayment,verificationStatus}'='VERIFIED'
    ) then
      raise exception 'Verified payments are immutable; use the refund workflow';
    end if;

    perform akbs_crm.security_event(
      v_user.id,
      'PAYMENT_'||v_status,
      case when v_tx is null then 'lead' else 'fee_transaction' end,
      coalesce(v_tx::text,v_lead::text)
    );

    update akbs_crm.leads
    set details=jsonb_set(
          jsonb_set(
            details,
            '{portal_form,_initialPayment,verificationStatus}',
            to_jsonb(v_status),
            true
          ),
          '{portal_form,_initialPayment,status}',
          to_jsonb(v_status),
          true
        ),
        updated_at=now(),
        version=version+1
    where id=v_lead;

  elsif p_action not in ('snapshot','update_config','verify') then
    raise exception 'Unsupported action';
  end if;

  select * into v_config from akbs_crm.fee_settings where id=true;

  with x as (
    select
      l.id,l.reference,l.name,l.phone,l.email,l.assigned_to,u.name assigned_name,l.created_at,
      l.details->'portal_form'->'_initialPayment' as p,
      round(v_config.initial_fee*(1-(case when v_config.offer_active then v_config.discount_percent else 0 end)/100.0),2) expected,
      tx.id transaction_id,
      tx.status transaction_status,
      tx.transaction_ref transaction_reference,
      tx.proof_path transaction_proof_path,
      tx.created_at transaction_created_at
    from akbs_crm.leads l
    left join akbs_crm.users u on u.id=l.assigned_to
    left join lateral (
      select t.id,t.status,t.transaction_ref,t.proof_path,t.created_at
      from akbs_crm.fee_transactions t
      where t.lead_id=l.id
        and t.source='CUSTOMER_PORTAL'
        and t.service_type='Initial Project Assessment & Registration Fee'
      order by t.created_at desc
      limit 1
    ) tx on true
    where l.source='CUSTOMER_PORTAL'
      and (v_user.role='ADMIN' or akbs_crm.visible(v_user,l))
  ), y as (
    select *,
      case
        when transaction_status='VERIFIED' then 'VERIFIED'
        when transaction_status='REJECTED' then 'REJECTED'
        when transaction_status='PENDING_VERIFICATION' then 'PENDING_VERIFICATION'
        when p is null then 'PENDING'
        when upper(coalesce(p->>'verificationStatus',''))='VERIFIED' then 'VERIFIED'
        when upper(coalesce(p->>'verificationStatus',''))='REJECTED' then 'REJECTED'
        when upper(coalesce(p->>'verificationStatus',''))='PENDING_VERIFICATION' then 'PENDING_VERIFICATION'
        else 'PROOF_SUBMITTED'
      end fee_status,
      coalesce((p->>'amount')::numeric,expected) amount,
      coalesce(transaction_reference,p->>'reference') reference_no,
      coalesce(transaction_proof_path,p->>'proofPath') proof_path,
      coalesce(transaction_created_at::text,p->>'submittedAt') submitted_at
    from x
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'leadId',id,
      'applicationId',reference,
      'customerName',name,
      'phone',phone,
      'email',email,
      'assignedTo',assigned_name,
      'createdAt',created_at,
      'transactionId',transaction_id,
      'status',fee_status,
      'amount',amount,
      'reference',reference_no,
      'proofPath',proof_path,
      'submittedAt',submitted_at
    ) order by created_at desc),'[]'::jsonb),
    coalesce(sum(expected),0),
    coalesce(sum(case when fee_status='VERIFIED' then amount else 0 end),0),
    count(*) filter(where fee_status='PENDING'),
    count(*) filter(where fee_status in ('PROOF_SUBMITTED','PENDING_VERIFICATION')),
    count(*) filter(where fee_status='VERIFIED'),
    count(*) filter(where fee_status='REJECTED')
  into
    v_rows,v_total_expected,v_total_received,
    v_pending,v_submitted,v_verified,v_rejected
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
      'totalLeads',jsonb_array_length(v_rows),
      'totalExpected',v_total_expected,
      'totalReceived',v_total_received,
      'pending',v_pending,
      'proofSubmitted',v_submitted,
      'verified',v_verified,
      'rejected',v_rejected
    )
  );
end
$$;

notify pgrst,'reload schema';
