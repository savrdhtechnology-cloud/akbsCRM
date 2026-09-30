-- Resolve saved drafts through the existing RPC using its named parameters.
create or replace function public.akbs_reminder_target_context(p_token text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare c jsonb;d jsonb;u akbs_crm.users;purpose text:=coalesce(p_data->>'purpose','payment');
begin
 if purpose not in ('payment','registration') then return jsonb_build_object('error','Invalid reminder purpose','status',400);end if;
 if nullif(p_data->>'leadId','') is not null then
  if p_data ? 'draftEmail' or p_data ? 'draftRequestId' then return jsonb_build_object('error','Choose exactly one customer','status',400);end if;
  c:=public.akbs_collection_email_context(p_token,(p_data->>'leadId')::uuid,purpose);
  if c ? 'error' then return c;end if;
  return c||jsonb_build_object('purpose',purpose,'targetKey','lead:'||(p_data->>'leadId'));
 end if;
 if purpose<>'registration' or p_data->>'draftKind'<>'customer' or coalesce(p_data->>'draftEmail','')='' or coalesce(p_data->>'draftRequestId','')='' then
  return jsonb_build_object('error','Choose one customer application','status',400);
 end if;
 d:=public.akbs_incomplete_applications(p_action=>'get',p_kind=>'customer',p_data=>jsonb_build_object('email',p_data->>'draftEmail','requestId',p_data->>'draftRequestId'),p_token=>p_token);
 if d ? 'error' then return d;end if;
 if coalesce((d->>'completed')::boolean,false) then return jsonb_build_object('error','Application already submitted. Use its payment actions.','status',409);end if;
 select usr.* into u from akbs_crm.users usr join akbs_crm.crm2_sessions s on s.user_id=usr.id
 where s.token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex') and s.expires_at>now() and usr.active limit 1;
 if u.id is null then return jsonb_build_object('error','Please sign in','status',401);end if;
 return jsonb_build_object('ok',true,'purpose',purpose,'email',lower(btrim(d->>'email')),'customerName',coalesce(nullif(d#>>'{form,fullName}',''),'Customer'),'actorId',u.id,'actorName',u.name,'draftId',d->>'requestId','targetKey','draft:customer:'||lower(btrim(d->>'email'))||':'||(d->>'requestId'));
exception when invalid_text_representation then return jsonb_build_object('error','Invalid customer application','status',400);
end $$;
notify pgrst,'reload schema';
