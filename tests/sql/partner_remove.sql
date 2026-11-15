-- Transactional fixtures only; caller must ROLLBACK.
do $$
declare aid uuid:=gen_random_uuid(); eid uuid:=gen_random_uuid(); uid uuid:=gen_random_uuid(); rid uuid:=gen_random_uuid(); rid2 uuid:=gen_random_uuid(); tok text:=encode(extensions.gen_random_bytes(32),'hex'); etok text:=encode(extensions.gen_random_bytes(32),'hex'); r jsonb;
begin
 insert into akbs_crm.users(id,login,name,role,active,must_change_password) values(aid,aid::text,'Removal admin test','ADMIN',true,false),(eid,eid::text,'Removal employee test','EMPLOYEE',true,false),(uid,uid::text,'Removal partner test','PARTNER',true,false);
 insert into akbs_crm.crm2_sessions(user_id,token_hash,expires_at) values(aid,encode(extensions.digest(tok,'sha256'),'hex'),now()+interval '5 minutes'),(eid,encode(extensions.digest(etok,'sha256'),'hex'),now()+interval '5 minutes');
 insert into akbs_crm.sessions(user_id,token_hash,expires_at) values(uid,encode(extensions.digest(uid::text,'sha256'),'hex'),now()+interval '5 minutes');
 insert into akbs_crm.workspace_records(id,kind,data,created_by) values(rid,'partner',jsonb_build_object('name','Remove fixture','status','Active','portalUserId',uid),aid),(rid2,'partner',jsonb_build_object('name','Duplicate fixture','status','Active','portalUserId',uid),aid);
 r:=public.akbs_crm_partner_remove(rid,1,'');assert r->>'status'='401','Anonymous removal';
 r:=public.akbs_crm_partner_remove(rid,1,etok);assert r->>'status'='403','Employee removal';
 r:=public.akbs_crm_partner_remove(rid,0,tok);assert r->>'status'='409','Stale version accepted';
 r:=public.akbs_crm_partner_remove(rid,1,tok);assert r->>'ok'='true','Removal failed';
 assert (select data ? 'removedAt' from akbs_crm.workspace_records where id=rid),'No retained record';
 assert (select active from akbs_crm.users where id=uid),'Shared account disabled';
 r:=public.akbs_crm_partner_remove(rid,1,tok);assert r->>'alreadyRemoved'='true','Retry not idempotent';
 r:=public.akbs_crm_partner_remove(rid2,1,tok);assert r->>'portalAccessDisabled'='true','Final account not disabled';
 assert not(select active from akbs_crm.users where id=uid),'Account still active';
 assert not exists(select 1 from akbs_crm.sessions where user_id=uid),'Sessions not revoked';
 assert (select count(*)=2 from akbs_crm.workspace_records where id in(rid,rid2)),'Audit records deleted';
end $$;
