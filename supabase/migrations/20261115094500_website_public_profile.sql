-- Public display profile only; no schema/data migration or customer information.
create or replace function public.akbs_website_public_profile() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object(
   'brandName',left(coalesce(r.data#>>'{published,brandName}',''),120),
   'officeAddress',left(coalesce(r.data#>>'{published,officeAddress}',''),300),
   'phone',left(coalesce(r.data#>>'{published,phone}',''),30),
   'email',left(coalesce(r.data#>>'{published,email}',''),150)
 ) from akbs_crm.workspace_records r
 where r.kind='settings' and r.data->>'key'='akbs-website-profile'
   and jsonb_typeof(r.data->'published')='object'
 order by r.updated_at desc limit 1),'null'::jsonb);
$$;
revoke all on function public.akbs_website_public_profile() from public;
grant execute on function public.akbs_website_public_profile() to anon,authenticated;
