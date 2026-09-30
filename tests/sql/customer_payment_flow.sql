-- Canonical customer payment integration test.
-- Safe to run against a development/test database: all records are rolled back.
begin;

do $$
declare
  c1 uuid:=gen_random_uuid();
  c2 uuid:=gen_random_uuid();
  admin_id uuid:=gen_random_uuid();
  l1 uuid:=gen_random_uuid();
  l2 uuid:=gen_random_uuid();
  l3 uuid:=gen_random_uuid();
  token1 text:='payment-flow-customer-token-'||gen_random_uuid()::text;
  admin_token text:='payment-flow-admin-token-'||gen_random_uuid()::text;
  suffix text:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  app1 text;
  app2 text;
  app3 text;
  ref1 text;
  ref2 text;
  ref3 text;
  ref4 text;
  r jsonb;
  dashboard jsonb;
  corr uuid:=gen_random_uuid();
begin
  app1:='AKBS-2099-990001';
  app2:='AKBS-2099-990002';
  app3:='AKBS-2099-990003';
  ref1:='UTR'||suffix||'01';
  ref2:='UTR'||suffix||'02';
  ref3:='UTR'||suffix||'03';
  ref4:='UTR'||suffix||'04';

  insert into akbs_crm.users(id,login,name,role,must_change_password,profile)
  values
    (c1,'test-customer-'||suffix,'Payment Test Customer','CUSTOMER',false,'{}'::jsonb),
    (c2,'test-other-'||suffix,'Other Payment Customer','CUSTOMER',false,'{}'::jsonb),
    (admin_id,'test-admin-'||suffix,'Payment Test Admin','ADMIN',false,'{}'::jsonb);

  insert into akbs_crm.portal_custom_accounts(kind,email,crm_user_id)
  values
    ('customer','payment-'||lower(suffix)||'-1@example.invalid',c1),
    ('customer','payment-'||lower(suffix)||'-2@example.invalid',c2);

  insert into akbs_crm.portal_custom_sessions(kind,email,token_hash,expires_at)
  values
    ('customer','payment-'||lower(suffix)||'-1@example.invalid',
     encode(digest(token1,'sha256'),'hex'),now()+interval '1 hour');

  insert into akbs_crm.crm2_sessions(token_hash,user_id,expires_at)
  values(encode(digest(admin_token,'sha256'),'hex'),admin_id,now()+interval '1 hour');

  insert into akbs_crm.leads(id,reference,name,phone,email,source,customer_id,details)
  values
    (l1,app1,'Payment Test Customer','9999999991','payment-'||lower(suffix)||'-1@example.invalid','CUSTOMER_PORTAL',c1,jsonb_build_object('portal_form',jsonb_build_object('fullName','Payment Test Customer'))),
    (l2,app2,'Other Payment Customer','9999999992','payment-'||lower(suffix)||'-2@example.invalid','CUSTOMER_PORTAL',c2,jsonb_build_object('portal_form',jsonb_build_object('fullName','Other Payment Customer'))),
    (l3,app3,'Payment Test Customer','9999999991','payment-'||lower(suffix)||'-1@example.invalid','CUSTOMER_PORTAL',c1,jsonb_build_object('portal_form',jsonb_build_object('fullName','Payment Test Customer')));

  insert into akbs_crm.portal_custom_submissions(kind,email,request_id,lead_id,form_hash)
  values
    ('customer','payment-'||lower(suffix)||'-1@example.invalid',gen_random_uuid(),l1,'hash-1-'||suffix),
    ('customer','payment-'||lower(suffix)||'-2@example.invalid',gen_random_uuid(),l2,'hash-2-'||suffix),
    ('customer','payment-'||lower(suffix)||'-1@example.invalid',gen_random_uuid(),l3,'hash-3-'||suffix);

  -- A. Valid application + valid payment.
  r:=public.akbs_customer_payment_submit(token1,app1,ref1,'test/payment-proof-1.png',repeat('a',64),corr);
  if coalesce((r->>'ok')::boolean,false) is not true
     or r->>'applicationId'<>app1
     or r->>'status'<>'PENDING_VERIFICATION' then
    raise exception 'A failed: %',r;
  end if;

  -- B. Invalid application.
  r:=public.akbs_customer_payment_submit(token1,'AKBS-NOT-FOUND-'||suffix,ref2,'test/payment-proof-2.png',repeat('b',64),gen_random_uuid());
  if r->>'code'<>'APPLICATION_NOT_FOUND' then raise exception 'B failed: %',r; end if;

  -- D. Unauthorized application.
  r:=public.akbs_customer_payment_submit(token1,app2,ref3,'test/payment-proof-3.png',repeat('c',64),gen_random_uuid());
  if r->>'code'<>'APPLICATION_NOT_AUTHORIZED' then raise exception 'D failed: %',r; end if;

  -- E. Duplicate UTR.
  r:=public.akbs_customer_payment_submit(token1,app3,ref1,'test/payment-proof-4.png',repeat('d',64),gen_random_uuid());
  if r->>'code'<>'DUPLICATE_PAYMENT_REFERENCE' then raise exception 'E failed: %',r; end if;

  -- Duplicate proof hash.
  r:=public.akbs_customer_payment_submit(token1,app3,ref4,'test/payment-proof-1-copy.png',repeat('a',64),gen_random_uuid());
  if r->>'code'<>'DUPLICATE_PAYMENT_PROOF' then raise exception 'Duplicate proof failed: %',r; end if;

  -- I. Fee Dashboard / verification queue sees canonical pending payment.
  dashboard:=public.akbs_fee_staff('snapshot',admin_token,'{}'::jsonb);
  if not exists(
    select 1 from jsonb_array_elements(dashboard->'rows') row_data
    where row_data->>'applicationId'=app1
      and row_data->>'status'='PENDING_VERIFICATION'
      and row_data->>'reference'=ref1
  ) then
    raise exception 'I failed: pending verification row missing';
  end if;

  -- J. Admin/Finance verification updates canonical transaction + compatibility JSON.
  perform public.akbs_fee_staff('verify',admin_token,jsonb_build_object('leadId',l1,'status','VERIFIED'));

  if not exists(select 1 from akbs_crm.fee_transactions where lead_id=l1 and status='VERIFIED') then
    raise exception 'J failed: fee transaction not verified';
  end if;

  if (select details#>>'{portal_form,_initialPayment,verificationStatus}' from akbs_crm.leads where id=l1) <> 'VERIFIED' then
    raise exception 'J failed: compatibility payment state not verified';
  end if;

  if not exists(
    select 1 from akbs_crm.security_events
    where request_id=corr::text
      and action='PAYMENT_SUBMITTED'
      and after_data->>'applicationId'=app1
  ) then
    raise exception 'Audit correlation event missing';
  end if;
end $$;

rollback;

select 'PASS' as customer_payment_integration_tests;
