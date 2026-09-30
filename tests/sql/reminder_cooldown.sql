-- Rollback-only recipient isolation, delivery locking and exact one-hour expiry.
begin;
do $$
declare actor uuid:=gen_random_uuid();a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();same_recipient uuid:=gen_random_uuid();
 token text:=encode(extensions.gen_random_bytes(32),'hex');suffix text:=replace(gen_random_uuid()::text,'-','');r jsonb;c jsonb;delivery uuid;other_delivery uuid;draft uuid:=gen_random_uuid();
begin
 insert into akbs_crm.users(id,login,name,role,must_change_password) values(actor,'reminder-test-'||suffix,'Reminder Test Admin','ADMIN',false);
 insert into akbs_crm.crm2_sessions(token_hash,user_id,expires_at) values(encode(extensions.digest(token,'sha256'),'hex'),actor,now()+interval '1 hour');
 insert into akbs_crm.leads(id,reference,name,email,source) values
 (a,'AKBS-2099-990021','First Reminder Fixture',suffix||'-a@example.invalid','WEBSITE'),
 (b,'AKBS-2099-990022','Other Reminder Fixture',suffix||'-b@example.invalid','WEBSITE'),
 (same_recipient,'AKBS-2099-990023','Same Recipient Fixture',suffix||'-a@example.invalid','WEBSITE');
 r:=public.akbs_collection_reminder_claim('invalid',jsonb_build_object('leadId',a,'purpose','registration'));
 if (r->>'status')::int<>401 then raise exception 'Unauthorized reminder claim was allowed';end if;
 r:=public.akbs_collection_reminder_claim(token,jsonb_build_object('leadId',a,'purpose','payment'));
 if (r->>'status')::int<>409 then raise exception 'Inquiry received payment reminder';end if;
 c:=public.akbs_collection_reminder_claim(token,jsonb_build_object('leadId',a,'purpose','registration'));
 if not (c->>'ok')::boolean or c->>'email'<>suffix||'-a@example.invalid' then raise exception 'Wrong recipient: %',c;end if;
 delivery:=(c->>'deliveryId')::uuid;
 if exists(select 1 from akbs_crm.collection_reminder_deliveries where email=suffix||'-b@example.invalid') then raise exception 'A single claim touched another customer';end if;
 r:=public.akbs_collection_reminder_claim(token,jsonb_build_object('leadId',a,'purpose','registration'));
 if (r->>'status')::int<>429 then raise exception 'Concurrent duplicate claim was allowed';end if;
 r:=public.akbs_collection_reminder_finish(delivery,'test-provider-accepted');
 if (r->>'retryAt')::timestamptz<>now()+interval '60 minutes' then raise exception 'Waiting period is not exactly 60 minutes';end if;
 r:=public.akbs_collection_reminder_claim(token,jsonb_build_object('leadId',a,'purpose','registration'));
 if (r->>'status')::int<>429 then raise exception 'Resend within one hour was allowed';end if;
 r:=public.akbs_collection_reminder_claim(token,jsonb_build_object('leadId',same_recipient,'purpose','registration'));
 if (r->>'status')::int<>429 then raise exception 'Another lead bypassed recipient cooldown';end if;
 r:=public.akbs_collection_reminder_state(token,jsonb_build_array(jsonb_build_object('leadId',a,'purpose','registration'),jsonb_build_object('leadId',b,'purpose','registration')));
 if r#>>array['states','lead:'||a::text||':registration','retryAt'] is null or r#>>array['states','lead:'||b::text||':registration','retryAt'] is not null then raise exception 'Cooldown state affected unrelated recipient';end if;
 c:=public.akbs_collection_reminder_claim(token,jsonb_build_object('leadId',b,'purpose','registration'));
 if not (c->>'ok')::boolean then raise exception 'Other recipient was incorrectly blocked';end if;
 other_delivery:=(c->>'deliveryId')::uuid;
 perform public.akbs_collection_reminder_finish(other_delivery,null,true);
 c:=public.akbs_collection_reminder_claim(token,jsonb_build_object('leadId',b,'purpose','registration'));
 if not (c->>'ok')::boolean then raise exception 'Definitively failed delivery could not be retried';end if;
 update akbs_crm.collection_reminder_deliveries set retry_at=now()-interval '1 second' where delivery_id=delivery;
 c:=public.akbs_collection_reminder_claim(token,jsonb_build_object('leadId',a,'purpose','registration'));
 if not (c->>'ok')::boolean or (c->>'deliveryId')::uuid=delivery then raise exception 'Resend did not unlock with a new delivery after expiry';end if;
 insert into akbs_crm.portal_drafts(kind,email,request_id,form,current_stage) values('customer',suffix||'-draft@example.invalid',draft,jsonb_build_object('fullName','Saved Draft Fixture'),1);
 c:=public.akbs_collection_reminder_claim(token,jsonb_build_object('purpose','registration','draftKind','customer','draftEmail',suffix||'-draft@example.invalid','draftRequestId',draft));
 if not (c->>'ok')::boolean or c->>'email'<>suffix||'-draft@example.invalid' or c->>'draftId'<>draft::text then raise exception 'Draft reminder did not resolve exact recipient: %',c;end if;
 perform public.akbs_collection_reminder_finish((c->>'deliveryId')::uuid,'test-draft-provider-id');
 r:=public.akbs_collection_reminder_state(token,jsonb_build_array(jsonb_build_object('purpose','registration','draftKind','customer','draftEmail',suffix||'-draft@example.invalid','draftRequestId',draft)));
 if r#>>array['states','draft:customer:'||suffix||'-draft@example.invalid:'||draft::text||':registration','retryAt'] is null then raise exception 'Draft cooldown missing after reload';end if;
 if has_function_privilege('anon','public.akbs_collection_delivery_config()','execute') or has_function_privilege('authenticated','public.akbs_collection_reminder_finish(uuid,text,boolean)','execute') then raise exception 'Internal delivery functions exposed';end if;
end $$;
rollback;
select 'PASS' as reminder_recipient_and_cooldown_tests;
