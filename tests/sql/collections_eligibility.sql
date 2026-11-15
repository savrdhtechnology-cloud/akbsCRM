-- Isolated workflow and permission fixtures. No records or notifications persist.
begin;
do $$
declare
 a uuid:=gen_random_uuid(); f uuid:=gen_random_uuid(); e uuid:=gen_random_uuid();
 inquiry uuid:=gen_random_uuid(); app uuid:=gen_random_uuid(); invalid_app uuid:=gen_random_uuid();
 atoken text:=encode(extensions.gen_random_bytes(32),'hex');
 ftoken text:=encode(extensions.gen_random_bytes(32),'hex');
 etoken text:=encode(extensions.gen_random_bytes(32),'hex');
 suffix text:=replace(gen_random_uuid()::text,'-','');
 r jsonb; demand uuid; tx uuid; denied boolean;
begin
 insert into akbs_crm.users(id,login,name,role,must_change_password) values
 (a,'collections-admin-'||suffix,'Collections Test Admin','ADMIN',false),
 (f,'collections-finance-'||suffix,'Collections Test Finance','FINANCE',false),
 (e,'collections-employee-'||suffix,'Collections Test Employee','EMPLOYEE',false);
 insert into akbs_crm.crm2_sessions(token_hash,user_id,expires_at) values
 (encode(extensions.digest(atoken,'sha256'),'hex'),a,now()+interval '1 hour'),
 (encode(extensions.digest(ftoken,'sha256'),'hex'),f,now()+interval '1 hour'),
 (encode(extensions.digest(etoken,'sha256'),'hex'),e,now()+interval '1 hour');
 insert into akbs_crm.leads(id,reference,name,phone,email,source) values
 (inquiry,'AKBS-2099-990011','Inquiry Fixture','9999999991','inquiry@example.invalid','WEBSITE'),
 (app,'AKBS-2099-990012','Application Fixture','9999999992','application@example.invalid','WEBSITE'),
 (invalid_app,'INCOMPLETE-'||suffix,'Incomplete Fixture','9999999993','incomplete@example.invalid','WEBSITE');
 if exists(select 1 from akbs_crm.fee_transactions where lead_id in(inquiry,app,invalid_app)) then raise exception 'Lead insertion created a premature fee';end if;
 if (select akbs_crm.application_ready(l) from akbs_crm.leads l where id=inquiry) then raise exception 'Inquiry reference enabled fees';end if;
 r:=public.akbs_collection_email_context(atoken,inquiry,'payment');
 if (r->>'status')::int<>409 then raise exception 'Inquiry fee reminder was not blocked: %',r;end if;
 r:=public.akbs_collection_email_context(atoken,inquiry,'registration');
 if not (r->>'ok')::boolean or r->>'applicationId' is not null then raise exception 'Inquiry registration reminder unavailable: %',r;end if;
 denied:=false;
 begin perform public.akbs_fee_transactions_staff('create',atoken,jsonb_build_object('leadId',inquiry,'serviceType','Registration Fee','amount',2999));
 exception when others then denied:=true;end;
 if not denied then raise exception 'Inquiry registration demand was allowed';end if;

 insert into akbs_crm.portal_custom_submissions(kind,email,request_id,lead_id,form_hash) values
 ('customer','application@example.invalid',gen_random_uuid(),app,'application-'||suffix),
 ('customer','incomplete@example.invalid',gen_random_uuid(),invalid_app,'incomplete-'||suffix);
 if (select akbs_crm.application_ready(l) from akbs_crm.leads l where id=invalid_app) then raise exception 'Missing application ID enabled fees';end if;
 if exists(select 1 from akbs_crm.fee_transactions where lead_id=invalid_app) then raise exception 'Missing application ID created a fee';end if;
 select id into demand from akbs_crm.fee_transactions where lead_id=app;
 if demand is null or (select count(*) from akbs_crm.fee_transactions where lead_id=app)<>1 then raise exception 'Submitted application did not create exactly one demand';end if;
 r:=public.akbs_fee_staff('snapshot',ftoken);
 if not exists(select 1 from jsonb_array_elements(r->'rows') x where x->>'leadId'=app::text and x->>'status'='PENDING') then raise exception 'Finance cannot see pending applications';end if;
 r:=public.akbs_collection_email_context(ftoken,app,'payment');
 if not (r->>'ok')::boolean or r->>'email'<>'application@example.invalid' then raise exception 'Pending payment email context failed: %',r;end if;
 denied:=false;
 begin perform public.akbs_fee_staff('verify',ftoken,jsonb_build_object('leadId',app,'status','VERIFIED'));
 exception when others then denied:=true;end;
 if not denied then raise exception 'Empty pending demand was verified';end if;

 r:=public.akbs_fee_transactions_staff('create',ftoken,jsonb_build_object('leadId',app,'serviceType','Registration Fee','amount',3000,'discount',100,'transactionRef','test-'||suffix,'paymentMethod','Bank Transfer'));
 tx:=(r->>'transactionId')::uuid;
 if tx<>demand or (select count(*) from akbs_crm.fee_transactions where lead_id=app)<>1 then raise exception 'Manual submission duplicated the demand';end if;
 r:=public.akbs_fee_staff('snapshot',atoken);
 if not exists(select 1 from jsonb_array_elements(r->'rows') x where x->>'leadId'=app::text and x->>'status'='UNDER_REVIEW' and (x->>'payable')::numeric=2900 and (x->>'baseAmount')::numeric=3000) then raise exception 'Canonical manual payment/discount missing';end if;
 r:=public.akbs_collection_email_context(ftoken,app,'payment');
 if (r->>'status')::int<>409 then raise exception 'Submitted payment still received pending reminder';end if;
 denied:=false;
 begin perform public.akbs_fee_staff('verify',etoken,jsonb_build_object('leadId',app,'status','VERIFIED'));
 exception when others then denied:=true;end;
 if not denied then raise exception 'Employee verified a payment';end if;
 perform public.akbs_fee_staff('verify',ftoken,jsonb_build_object('leadId',app,'status','REJECTED'));
 r:=public.akbs_collection_email_context(ftoken,app,'receipt');
 if (r->>'status')::int<>409 then raise exception 'Rejected payment produced receipt context';end if;
 r:=public.akbs_fee_transactions_staff('create',atoken,jsonb_build_object('leadId',app,'serviceType','Initial Registration Fee','amount',2999,'transactionRef','resubmit-'||suffix));
 perform public.akbs_fee_staff('verify',atoken,jsonb_build_object('leadId',app,'status','VERIFIED'));
 r:=public.akbs_collection_email_context(ftoken,app,'receipt');
 if not (r->>'ok')::boolean or r#>>'{row,status}'<>'VERIFIED' or r#>>'{row,verifiedAt}' is null then raise exception 'Finance receipt unavailable: %',r;end if;
 r:=public.akbs_collection_email_context(etoken,app,'receipt');
 if (r->>'status')::int<>403 then raise exception 'Employee can email receipts';end if;
 denied:=false;
 begin perform public.akbs_fee_staff('verify',atoken,jsonb_build_object('leadId',app,'status','REJECTED'));
 exception when others then denied:=true;end;
 if not denied then raise exception 'Verified payment was editable';end if;
 denied:=false;
 begin perform public.akbs_fee_transactions_staff('create',atoken,jsonb_build_object('leadId',app,'serviceType','Consultation Fee','amount',100,'transactionRef','RESUBMIT '||suffix));
 exception when others then denied:=true;end;
 if not denied then raise exception 'Normalized duplicate UTR was allowed';end if;
 r:=public.akbs_fee_transactions_staff('create',ftoken,jsonb_build_object('leadId',inquiry,'serviceType','Consultation Fee','amount',100,'transactionRef','consult-'||suffix));
 if (r->>'transactionId') is null then raise exception 'Other fee types were broken';end if;
end $$;
rollback;
select 'PASS' as collections_eligibility_and_permissions;
