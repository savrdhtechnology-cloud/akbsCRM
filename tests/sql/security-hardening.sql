-- Run after the hardening migration inside ONE transaction, ending with ROLLBACK.
-- Fixtures do not send email or alter existing customer data.
do $$
declare r jsonb; n integer; uid uuid:=gen_random_uuid(); other_uid uuid:=gen_random_uuid(); lid uuid:=gen_random_uuid(); other_lid uuid:=gen_random_uuid(); tok text:=encode(extensions.gen_random_bytes(32),'hex'); ptok text:=encode(extensions.gen_random_bytes(32),'hex'); test_email text:=gen_random_uuid()::text||'@example.invalid'; failed boolean; fid uuid; qid uuid; q jsonb;
begin
 assert not has_function_privilege('anon','public.akbs_crm_workspace_legacy(text,jsonb,text)','EXECUTE'),'Legacy bypass remains';
 assert not has_table_privilege('authenticated','public.soft_quotations','UPDATE'),'Direct quotation writes allowed';
 assert not has_function_privilege('anon','akbs_crm.security_event(uuid,text,text,text,jsonb,jsonb)','EXECUTE'),'Audit forgery allowed';
 assert not has_function_privilege('anon','public.akbs_payment_proof_save(text,text,text,text)','EXECUTE'),'Service-only payment API exposed';
 insert into akbs_crm.portal_otp_challenges(kind,intent,email,code_hash,expires_at) values('customer','signup',test_email,encode(extensions.digest('123456','sha256'),'hex'),now()+interval '10 minutes');
 for n in 1..5 loop r:=public.akbs_portal_otp_verify('customer','signup',test_email,'999999'); assert r->>'error' is not null,'Incorrect OTP accepted';end loop;
 assert (select attempts=5 from akbs_crm.portal_otp_challenges where email=test_email order by created_at desc limit 1),'OTP attempt rollback';
 r:=public.akbs_portal_otp_verify('customer','signup',test_email,'123456');assert r->>'status'='429','OTP lockout bypass';
 update akbs_crm.portal_otp_challenges set attempts=0 where portal_otp_challenges.email=test_email;
 r:=public.akbs_portal_otp_verify('customer','signup',test_email,'123456');assert length(r->>'sessionToken')=64,'Valid OTP broken';
 failed:=false;begin perform public.akbs_portal_otp_verify('customer','signup',test_email,'123456');exception when others then failed:=true;end;assert failed,'OTP replay allowed';
 failed:=false;begin perform akbs_crm.validate_portal_form('{"fullName":"Test","_initialPayment":{"verificationStatus":"VERIFIED"}}');exception when others then failed:=true;end;assert failed,'Payment injection allowed';
 failed:=false;begin perform akbs_crm.validate_lead_details('{"portal_form":{"_initialPayment":{"amount":0}}}');exception when others then failed:=true;end;assert failed,'Staff nested payment injection allowed';
 assert not akbs_crm.valid_file(convert_to('<script>bad</script>','UTF8'),'image/png'),'Forged MIME allowed';
 assert akbs_crm.valid_file(decode('89504e470d0a1a0a00000000','hex'),'image/png'),'Valid PNG rejected';
 insert into akbs_crm.users(id,login,name,role) values(uid,'security-'||uid,'Security test manager','MANAGER'),(other_uid,'security-'||other_uid,'Security test customer','CUSTOMER');
 insert into akbs_crm.crm2_sessions(token_hash,user_id,expires_at) values(encode(extensions.digest(tok,'sha256'),'hex'),uid,now()+interval '10 minutes');
 insert into akbs_crm.leads(id,reference,name,source,manager_id,customer_id) values(lid,'SECURITY-'||lid,'Security own lead','MANUAL',uid,other_uid),(other_lid,'SECURITY-'||other_lid,'Security foreign lead','MANUAL',other_uid,null);

 -- Create a foreign draft as admin; manager cannot hijack it using their own lead.
 update akbs_crm.users set role='ADMIN' where id=uid;
 qid:=gen_random_uuid();
 q:=jsonb_build_object('quote',jsonb_build_object('id',qid,'quotationNo','SEC-'||qid,'customer',jsonb_build_object('leadId',other_lid),'status','APPROVED'));
 r:=public.akbs_soft_quotation_workspace('save_draft',q,tok);
 assert r->>'error' is null,'Admin quotation draft failed';
 assert (select status='DRAFT' from public.soft_quotations where id=qid),'Client-approved status accepted';
 update akbs_crm.users set role='MANAGER' where id=uid;
 q:=jsonb_set(q,'{quote,customer,leadId}',to_jsonb(lid));
 r:=public.akbs_soft_quotation_workspace('save_draft',q,tok);assert r->>'status'='403','Quotation IDOR remains';
 update akbs_crm.users set role='EMPLOYEE' where id=uid;
 r:=public.akbs_soft_quotation_workspace('approve',jsonb_build_object('id',qid),tok);assert r->>'status'='403','Employee quotation approval allowed';
 update akbs_crm.users set role='MANAGER' where id=uid;
 update akbs_crm.settings set gateway_hash=encode(extensions.digest('rollback-test-only','sha256'),'hex');
 r:=public.akbs_crm_gateway('rollback-test-only','website_inquiry',jsonb_build_object('name','Security rollback test','email',test_email,'phone','9999999999','message','Rollback-only inquiry test'),null);
 assert r->>'error' is null,'Website inquiry rejected';
 assert exists(select 1 from akbs_crm.leads where email=test_email and source='WEBSITE'),'Website inquiry not connected to CRM';
 update akbs_crm.users set must_change_password=true where id=uid;
 failed:=false;begin perform public.akbs_fee_staff(p_action=>'snapshot',p_data=>'{}',p_token=>tok);exception when others then failed:=true;end;assert failed,'First-password fee bypass';
 update akbs_crm.users set must_change_password=false where id=uid;
 -- User role is re-read server-side, not taken from supplied payload.
 update akbs_crm.users set role='FINANCE' where id=uid;
 r:=public.akbs_soft_quotation_workspace('approve','{}',tok);assert r->>'status'='403','Finance quotation approval bypass';
 update akbs_crm.users set role='MANAGER' where id=uid;
 insert into akbs_crm.fee_transactions(id,lead_id,amount,discount,payable,created_by,transaction_ref) values(gen_random_uuid(),lid,100,0,100,uid,'SEC'||replace(lid::text,'-','')) returning id into fid;
 failed:=false;begin insert into akbs_crm.fee_transactions(lead_id,amount,discount,payable,created_by,transaction_ref) values(other_lid,100,0,100,uid,'SEC'||replace(lid::text,'-',''));exception when others then failed:=true;end;assert failed,'Duplicate UTR allowed';
 update akbs_crm.fee_transactions set status='VERIFIED' where id=fid;
 failed:=false;begin update akbs_crm.fee_transactions set amount=1,payable=1 where id=fid;exception when others then failed:=true;end;assert failed,'Verified amount mutable';
 insert into akbs_crm.portal_custom_accounts(kind,email,crm_user_id) values('customer',test_email,other_uid);
 insert into akbs_crm.portal_custom_sessions(kind,email,token_hash,expires_at) values('customer',test_email,encode(extensions.digest(ptok,'sha256'),'hex'),now()+interval '10 minutes');
 failed:=false;begin perform public.akbs_payment_proof_save(ptok,'SECURITY-'||other_lid,'OTHER123','');exception when others then failed:=true;end;assert failed,'Foreign payment writable';
 r:=public.akbs_payment_proof_save(ptok,'SECURITY-'||lid,'OWN'||replace(lid::text,'-',''),null);assert r->>'ok'='true','Own payment reference rejected';
 update akbs_crm.leads set details=jsonb_set(details,'{portal_form,_initialPayment,verificationStatus}','"VERIFIED"') where id=lid;
 failed:=false;begin perform public.akbs_payment_proof_save(ptok,'SECURITY-'||lid,'REPLACED123','');exception when others then failed:=true;end;assert failed,'Verified proof replace allowed';
end $$;
