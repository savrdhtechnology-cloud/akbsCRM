begin;
-- Soft removal retains referrals, commissions and the original partner record for audit.
create or replace function public.akbs_crm_partner_remove(p_id uuid,p_version integer,p_token text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor akbs_crm.users; rec akbs_crm.workspace_records; uid uuid; disabled boolean:=false;
begin
 select u.* into actor from akbs_crm.users u join akbs_crm.crm2_sessions s on s.user_id=u.id
 where s.token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') and s.expires_at>now() and u.active;
 if actor.id is null then return jsonb_build_object('error','Please sign in','status',401);end if;
 if actor.role<>'ADMIN' or actor.must_change_password then return jsonb_build_object('error','Admin access required','status',403);end if;
 -- Serialize removals of records sharing a portal account.
 perform pg_advisory_xact_lock(hashtextextended('akbs-partner-remove',0));
 select * into rec from akbs_crm.workspace_records where id=p_id and kind='partner' for update;
 if rec.id is null then return jsonb_build_object('error','Partner not found','status',404);end if;
 if rec.data ? 'removedAt' then return jsonb_build_object('ok',true,'alreadyRemoved',true);end if;
 if p_version is distinct from rec.version then return jsonb_build_object('error','Partner changed. Refresh before removing.','status',409);end if;
 uid:=nullif(rec.data->>'portalUserId','')::uuid;
 -- Detach the archived record from access-sync triggers; retain the original link for audit.
 update akbs_crm.workspace_records set data=(data-'portalUserId')||jsonb_build_object('status','Removed','removedAt',now(),'removedBy',actor.id,'removedPortalUserId',uid),version=version+1,updated_at=now() where id=rec.id;
 if uid is not null and not exists(select 1 from akbs_crm.workspace_records r where r.kind='partner' and r.id<>rec.id and not(r.data ? 'removedAt') and r.data->>'portalUserId'=uid::text) then
  update akbs_crm.users set active=false,profile=coalesce(profile,'{}')||jsonb_build_object('partner_status','INACTIVE') where id=uid and role='PARTNER';
  if found then
   disabled:=true;
   delete from akbs_crm.sessions where user_id=uid;
   delete from akbs_crm.crm2_sessions where user_id=uid;
   update akbs_crm.portal_custom_sessions set revoked_at=now() where kind='partner' and lower(email) in (select lower(email) from akbs_crm.portal_custom_accounts where kind='partner' and crm_user_id=uid);
  end if;
 end if;
 perform akbs_crm.security_event(actor.id,'PARTNER_REMOVED','partner',rec.id::text,to_jsonb(rec),jsonb_build_object('portalAccessDisabled',disabled));
 return jsonb_build_object('ok',true,'portalAccessDisabled',disabled);
end $$;
revoke all on function public.akbs_crm_partner_remove(uuid,integer,text) from public;
grant execute on function public.akbs_crm_partner_remove(uuid,integer,text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
