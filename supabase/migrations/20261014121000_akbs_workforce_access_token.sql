-- =============================================================================
-- AI Workforce access token (14 Oct 2026)
--
-- The edge function akbs-workforce-reminder accepts calls only from the SAVRDH
-- AI Workforce. The plain token lives only in the Workforce vault
-- (akbs_workforce_function_token); AKBS stores just its SHA-256 here.
-- To rotate: generate a new 64-char token, put it in the Workforce vault, and
-- update token_sha256 below to its SHA-256.
-- =============================================================================
create table if not exists akbs_crm.workforce_access (
  id boolean primary key default true check (id),
  token_sha256 text not null check (token_sha256 ~ '^[0-9a-f]{64}$'),
  note text,
  updated_at timestamptz not null default now()
);
alter table akbs_crm.workforce_access enable row level security;
revoke all on akbs_crm.workforce_access from public, anon, authenticated;

insert into akbs_crm.workforce_access(id,token_sha256,note)
values(true,'2a75b7a84a429edf1701b796ec95a34f5eba63eda40aacd101d6a846ccb95b9b','SHA-256 of the SAVRDH AI Workforce token (plain token lives only in the Workforce vault: akbs_workforce_function_token)')
on conflict(id) do update set token_sha256=excluded.token_sha256,note=excluded.note,updated_at=now();

create or replace function public.akbs_workforce_token_ok(p_token text)
returns boolean language sql stable security definer set search_path to ''
as $$
  select coalesce(length(p_token)=64 and exists(
    select 1 from akbs_crm.workforce_access w
    where w.token_sha256=encode(extensions.digest(p_token,'sha256'),'hex')),false);
$$;
revoke all on function public.akbs_workforce_token_ok(text) from public, anon, authenticated;
grant execute on function public.akbs_workforce_token_ok(text) to service_role;
