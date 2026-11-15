-- Run against a test database or in this transaction; every fixture is rolled back.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
values ('901def21-14ac-4000-a000-000000000101','akbs-test-101@example.invalid',now(),'{}','{}'),
       ('901def22-14ac-4000-a000-000000000102','akbs-test-102@example.invalid',now(),'{}','{}');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"901def21-14ac-4000-a000-000000000101","role":"authenticated"}',true);
do $$ declare r jsonb; first_ref text; rejected boolean:=false; begin
 begin perform public.akbs_portal('submit','customer','{}'); exception when others then rejected:=true; end;
 assert rejected,'Unenrolled accounts must not submit';
 r:=public.akbs_portal('enroll','customer','{"name":"Portal test customer","consent":true,"role":"ADMIN"}');
 assert (r->>'enrolled')::boolean,'Enrollment failed';
 r:=public.akbs_portal('submit','customer','{"request_id":"901def21-14ac-4000-a000-000000000201","form":{"fullName":"Portal test customer","mobileNumber":"9999999999","proposedCapacity":"10,000","state":"Madhya Pradesh","district":"Test district","poultryType":"Broiler","email":"forged@example.invalid","assigned_to":"901def22-14ac-4000-a000-000000000102"},"consent":{"declarationAccepted":true,"communicationConsentAccepted":true}}');
 first_ref:=r->>'submittedId'; assert first_ref is not null,'No CRM reference returned';
 assert r->'applications'->0->'formData'->>'email'='akbs-test-101@example.invalid','Email ownership not enforced';
 r:=public.akbs_portal('submit','customer','{"request_id":"901def21-14ac-4000-a000-000000000201","form":{"fullName":"Portal test customer","mobileNumber":"9999999999","proposedCapacity":"10,000","state":"Madhya Pradesh","district":"Test district","poultryType":"Broiler"},"consent":{"declarationAccepted":true,"communicationConsentAccepted":true}}');
 assert r->>'submittedId'=first_ref and jsonb_array_length(r->'applications')=1,'Retry created a duplicate';
 rejected:=false;
 begin perform public.akbs_portal('submit','customer','{"request_id":"901def21-14ac-4000-a000-000000000203","form":{},"consent":{}}'); exception when others then rejected:=true; end;
 assert rejected,'Missing consent was accepted';
end $$;
select set_config('request.jwt.claims','{"sub":"901def22-14ac-4000-a000-000000000102","role":"authenticated"}',true);
do $$ declare r jsonb; begin
 r:=public.akbs_portal('snapshot','customer');
 assert jsonb_array_length(r->'applications')=0,'Another account can see applications';
 assert not (r->>'enrolled')::boolean,'Another account inherited enrollment';
 perform public.akbs_portal('enroll','partner','{"name":"Portal test partner","consent":true,"role":"ADMIN"}');
 r:=public.akbs_portal('submit','partner','{"request_id":"901def22-14ac-4000-a000-000000000202","form":{"fullName":"Portal test partner","mobile":"9999999998","businessName":"Test only partner"},"consent":{"declarationAccepted":true,"communicationConsentAccepted":true}}');
 assert r->>'submittedId' is not null,'Partner application not saved';
end $$;
reset role;
do $$ begin
 assert not has_function_privilege('anon','public.akbs_portal(text,text,jsonb)','EXECUTE'),'Anonymous RPC access';
 assert not has_function_privilege('authenticated','akbs_crm.portal_gateway(text,text,jsonb)','EXECUTE'),'Private gateway exposed';
 assert not has_table_privilege('authenticated','akbs_crm.portal_submissions','SELECT'),'Direct access to private submissions';
 assert (select count(*)=2 from akbs_crm.portal_submissions where auth_user_id in ('901def21-14ac-4000-a000-000000000101','901def22-14ac-4000-a000-000000000102')),'Wrong number of leads';
 assert not exists(select 1 from akbs_crm.portal_accounts a join akbs_crm.users u on u.id=a.crm_user_id where a.auth_user_id in ('901def21-14ac-4000-a000-000000000101','901def22-14ac-4000-a000-000000000102') and u.role<>upper(a.kind)),'Role escalation';
 assert exists(select 1 from akbs_crm.workspace_records r join akbs_crm.portal_accounts a on a.crm_user_id=r.created_by where a.auth_user_id='901def22-14ac-4000-a000-000000000102' and r.kind='partner'),'Partner missing in CRM';
 assert not exists(select 1 from akbs_crm.portal_submissions s join akbs_crm.leads l on l.id=s.lead_id where s.auth_user_id in ('901def21-14ac-4000-a000-000000000101','901def22-14ac-4000-a000-000000000102') and l.assigned_to is null) or not exists(select 1 from akbs_crm.users where role='EMPLOYEE' and active),'Active employee not assigned';
end $$;
rollback;
select 'PASS: account gate, consent, CRM submission, idempotency, ownership, roles, partner records and employee assignment' as portal_test_result;
