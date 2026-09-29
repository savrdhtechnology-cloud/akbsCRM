-- Run inside a transaction AFTER the migration, always ROLLBACK.
do $$
declare aid uuid:=gen_random_uuid(); emp uuid:=gen_random_uuid(); token text:=encode(extensions.gen_random_bytes(32),'hex'); etoken text:=encode(extensions.gen_random_bytes(32),'hex'); cemail text:=gen_random_uuid()||'@example.invalid'; pemail text:=gen_random_uuid()||'@example.invalid'; req uuid; preq uuid; r jsonb; d jsonb; changed jsonb; lid uuid; f jsonb; ptoken text; ctoken text; cnt integer;
begin
 insert into akbs_crm.users(id,login,name,role) values(aid,'test-'||aid,'Draft test admin','ADMIN'),(emp,'test-'||emp,'Draft test employee','EMPLOYEE');
 insert into akbs_crm.crm2_sessions(user_id,token_hash,expires_at) values(aid,encode(extensions.digest(token,'sha256'),'hex'),now()+interval '10 minutes'),(emp,encode(extensions.digest(etoken,'sha256'),'hex'),now()+interval '10 minutes');
 insert into akbs_crm.portal_otp_challenges(kind,intent,email,code_hash,expires_at) values('customer','signup',cemail,encode(extensions.digest('123456','sha256'),'hex'),now()+interval '10 minutes'),('partner','signup',pemail,encode(extensions.digest('123456','sha256'),'hex'),now()+interval '10 minutes');
 r:=public.akbs_portal_otp_verify('customer','signup',cemail,'123456');ctoken:=r->>'sessionToken';
 r:=public.akbs_portal_otp_verify('partner','signup',pemail,'123456');ptoken:=r->>'sessionToken';
 assert not exists(select 1 from akbs_crm.leads where email in (cemail,pemail)),'OTP created a normal lead';
 assert (select count(*)=2 from akbs_crm.portal_drafts where email in(cemail,pemail)),'OTP did not seed drafts';
 r:=public.akbs_incomplete_applications('list','customer',jsonb_build_object('search',cemail),etoken);assert r->>'status'='403','Employee read admin drafts';
 r:=public.akbs_incomplete_applications('list','partner',jsonb_build_object('search',cemail),token);assert jsonb_array_length(r->'rows')=0,'Customer leaked to partner drafts';
 r:=public.akbs_incomplete_applications('list','customer',jsonb_build_object('search',pemail),token);assert jsonb_array_length(r->'rows')=0,'Partner leaked to customer drafts';
 select request_id into req from akbs_crm.portal_drafts where email=cemail;
 select request_id into preq from akbs_crm.portal_drafts where email=pemail;
 d:=public.akbs_incomplete_applications('get','customer',jsonb_build_object('email',cemail,'requestId',req),token);
 f:='{"fullName":"Synthetic Farmer","mobileNumber":"9999999999","preferredLanguage":"Hindi","projectObjective":"New Poultry Farm","poultryType":"Broiler (Meat)","shedType":"EC (Environment Controlled)","proposedCapacity":"20000","hasLand":"Yes","landOwnership":"Own Land","landAreaAcres":"1","state":"Madhya Pradesh","district":"Raisen","villageOrCity":"Test","approxProjectCost":"1 crore","needsLoan":"No","ownContribution":"30 lakh","discussedWithBank":"No","experience":"New farmer","supportNeeded":["DPR"],"startTimeline":"Within 3 months"}';
 r:=public.akbs_incomplete_applications('complete','customer',jsonb_build_object('email',cemail,'requestId',req,'expectedUpdatedAt',d->>'updatedAt','form',f),token);assert r->>'status'='400','Admin bypassed consent confirmation';
 changed:=public.akbs_incomplete_applications('save','customer',jsonb_build_object('email',cemail,'requestId',req,'expectedUpdatedAt',d->>'updatedAt','form',f),token);assert changed->>'ok'='true','Admin save failed';
 r:=public.akbs_incomplete_applications('save','customer',jsonb_build_object('email',cemail,'requestId',req,'expectedUpdatedAt',d->>'updatedAt','form',f),token);assert r->>'status'='409','Stale overwrite accepted';
 r:=public.akbs_incomplete_applications('complete','customer',jsonb_build_object('email',cemail,'requestId',req,'expectedUpdatedAt',changed->>'updatedAt','form',f,'consentConfirmed',true),token);assert r->>'completed'='true','Customer completion failed';lid:=(r->>'leadId')::uuid;
 r:=public.akbs_incomplete_applications('complete','customer',jsonb_build_object('email',cemail,'requestId',req,'expectedUpdatedAt',changed->>'updatedAt','form',f,'consentConfirmed',true),token);assert (r->>'leadId')::uuid=lid,'Retry returned different lead';
 assert (select count(*)=1 from akbs_crm.leads where email=cemail),'Duplicate customer lead';
 assert (select source='CUSTOMER_PORTAL' and details#>>'{consent,onBehalfOfApplicant}'='true' from akbs_crm.leads where id=lid),'Missing assisted consent provenance';
 r:=public.akbs_portal_draft_save('customer',ctoken,req,f,3);assert r->>'completed'='true','Late autosave not ignored';
 r:=public.akbs_incomplete_applications('list','customer',jsonb_build_object('search',cemail),token);assert jsonb_array_length(r->'rows')=0,'Submitted customer still incomplete';
 d:=public.akbs_incomplete_applications('get','partner',jsonb_build_object('email',pemail,'requestId',preq),token);
 f:='{"fullName":"Synthetic Partner","mobile":"9999999998","city":"Raisen","state":"Madhya Pradesh","category":"Referral / Business Partner"}';
 r:=public.akbs_incomplete_applications('complete','partner',jsonb_build_object('email',pemail,'requestId',preq,'expectedUpdatedAt',d->>'updatedAt','form',f,'consentConfirmed',true),token);assert r->>'completed'='true','Partner completion failed';
 assert exists(select 1 from akbs_crm.workspace_records where kind='partner' and data->>'email'=pemail and data->>'status'='Pending'),'Partner did not await approval';
 assert not exists(select 1 from akbs_crm.leads where email=pemail and source='CUSTOMER_PORTAL'),'Partner became customer lead';
 r:=public.akbs_incomplete_applications('complete','partner',jsonb_build_object('email',pemail,'requestId',preq),token);assert r->>'completed'='true','Partner retry failed';
 assert (select count(*)=1 from akbs_crm.workspace_records where kind='partner' and data->>'email'=pemail),'Duplicate partner';
 assert not has_table_privilege('anon','akbs_crm.portal_drafts','SELECT'),'Draft table exposed';
 assert not has_function_privilege('anon','akbs_crm.ensure_portal_draft(text,text,text)','EXECUTE'),'Seed helper exposed';
end $$;
