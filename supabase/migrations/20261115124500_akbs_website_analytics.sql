-- Privacy-first website traffic analytics for AKBS public pages.
-- Store a keyed one-way visitor hash, page path, referrer host and coarse device only.
create schema if not exists akbs_crm;

create table if not exists akbs_crm.website_page_views (
  id bigint generated always as identity primary key,
  visitor_hash text not null,
  page_path text not null,
  referrer_host text not null default '',
  device_type text not null check (device_type in ('mobile','tablet','desktop')),
  created_at timestamptz not null default now()
);

create index if not exists website_page_views_created_at_idx
  on akbs_crm.website_page_views (created_at desc);
create index if not exists website_page_views_visitor_created_at_idx
  on akbs_crm.website_page_views (visitor_hash, created_at desc);

alter table akbs_crm.website_page_views enable row level security;
revoke all on table akbs_crm.website_page_views from public, anon, authenticated;

create or replace function public.akbs_crm_website_visitor_track(p_key text, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_visitor_hash text;
  v_path text;
  v_referrer text;
  v_device text;
  v_rate_key text;
begin
  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 2048 then
    return jsonb_build_object('error','Invalid analytics event','status',400);
  end if;
  if coalesce(p_key,'') = '' or not exists (
    select 1 from akbs_crm.settings
    where gateway_hash = encode(extensions.digest(p_key,'sha256'),'hex')
  ) then
    return jsonb_build_object('error','Not authorized','status',403);
  end if;

  v_path := coalesce(p_data->>'path','');
  v_referrer := lower(coalesce(p_data->>'referrer_host',''));
  v_device := coalesce(p_data->>'device','');
  v_rate_key := coalesce(p_data->>'rate_key','');
  if coalesce(p_data->>'visitor_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     or length(v_path) < 1 or length(v_path) > 500
     or left(v_path,1) <> '/' or left(v_path,2) = '//'
     or position('?' in v_path) > 0 or position('#' in v_path) > 0
     or length(v_referrer) > 253
     or (v_referrer <> '' and v_referrer !~ '^[a-z0-9.-]+$')
     or v_device not in ('mobile','tablet','desktop')
     or v_rate_key !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('error','Invalid analytics event','status',400);
  end if;

  if not akbs_crm.rate('website-analytics-ip:'||v_rate_key,120,60) then
    return jsonb_build_object('error','Too many analytics events','status',429);
  end if;

  v_visitor_hash := encode(extensions.digest(p_key||':'||(p_data->>'visitor_id'),'sha256'),'hex');
  if not akbs_crm.rate('website-analytics-session:'||v_visitor_hash,30,60) then
    return jsonb_build_object('error','Too many analytics events','status',429);
  end if;

  insert into akbs_crm.website_page_views(visitor_hash,page_path,referrer_host,device_type)
  values(v_visitor_hash,v_path,v_referrer,v_device);

  return jsonb_build_object('ok',true);
end
$function$;

create or replace function public.akbs_crm_website_analytics(p_action text, p_data jsonb default '{}'::jsonb, p_token text default ''::text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user akbs_crm.users;
  v_days integer;
  v_since timestamptz;
begin
  select u.* into v_user
  from akbs_crm.users u
  join akbs_crm.crm2_sessions s on s.user_id=u.id
  where s.token_hash=encode(extensions.digest(coalesce(p_token,''),'sha256'),'hex')
    and s.expires_at>now()
    and u.active
  limit 1;

  if v_user.id is null then return jsonb_build_object('error','Please sign in','status',401); end if;
  if v_user.role <> 'ADMIN' or v_user.must_change_password then
    return jsonb_build_object('error','Admin access required','status',403);
  end if;
  if p_action <> 'summary' then return jsonb_build_object('error','Unknown action','status',400); end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object'
     or coalesce(p_data->>'days','30') !~ '^[0-9]{1,3}$' then
    return jsonb_build_object('error','Invalid date range','status',400);
  end if;

  v_days := greatest(7,least(90,coalesce(nullif(p_data->>'days','')::integer,30)));
  v_since := now() - make_interval(days => v_days);
  if not akbs_crm.rate('website-analytics-read:'||v_user.id::text,60,60) then
    return jsonb_build_object('error','Please wait before refreshing analytics','status',429);
  end if;

  return jsonb_build_object(
    'totalViews',(select count(*) from akbs_crm.website_page_views where created_at>=v_since),
    'uniqueVisitors',(select count(distinct visitor_hash) from akbs_crm.website_page_views where created_at>=v_since),
    'activeNow',(select count(distinct visitor_hash) from akbs_crm.website_page_views where created_at>=now()-interval '5 minutes'),
    'totalPages',(select count(distinct page_path) from akbs_crm.website_page_views where created_at>=v_since),
    'daily',coalesce((
      select jsonb_agg(jsonb_build_object('date',d.day::text,'views',coalesce(v.views,0)) order by d.day)
      from generate_series((current_date-(v_days-1))::timestamp,current_date::timestamp,interval '1 day') as d(day)
      left join (
        select created_at::date as day,count(*) as views
        from akbs_crm.website_page_views where created_at>=v_since group by created_at::date
      ) v on v.day=d.day::date
    ),'[]'::jsonb),
    'pages',coalesce((
      select jsonb_agg(jsonb_build_object('path',p.page_path,'views',p.views,'visitors',p.visitors) order by p.views desc)
      from (
        select page_path,count(*) as views,count(distinct visitor_hash) as visitors
        from akbs_crm.website_page_views where created_at>=v_since
        group by page_path order by count(*) desc limit 10
      ) p
    ),'[]'::jsonb),
    'sources',coalesce((
      select jsonb_agg(jsonb_build_object('label',s.label,'visits',s.visits) order by s.visits desc)
      from (
        select coalesce(nullif(referrer_host,''),'Direct') as label,count(*) as visits
        from akbs_crm.website_page_views where created_at>=v_since
        group by coalesce(nullif(referrer_host,''),'Direct') order by count(*) desc limit 8
      ) s
    ),'[]'::jsonb),
    'devices',coalesce((
      select jsonb_agg(jsonb_build_object('label',d.device_type,'visits',d.visits) order by d.visits desc)
      from (
        select device_type,count(*) as visits from akbs_crm.website_page_views
        where created_at>=v_since group by device_type order by count(*) desc
      ) d
    ),'[]'::jsonb),
    'recent',coalesce((
      select jsonb_agg(jsonb_build_object('at',r.created_at,'path',r.page_path,'source',coalesce(nullif(r.referrer_host,''),'Direct'),'device',r.device_type) order by r.created_at desc)
      from (
        select created_at,page_path,referrer_host,device_type
        from akbs_crm.website_page_views order by created_at desc limit 50
      ) r
    ),'[]'::jsonb)
  );
end
$function$;

revoke all on function public.akbs_crm_website_visitor_track(text,jsonb) from public;
grant execute on function public.akbs_crm_website_visitor_track(text,jsonb) to anon;
revoke all on function public.akbs_crm_website_analytics(text,jsonb,text) from public;
grant execute on function public.akbs_crm_website_analytics(text,jsonb,text) to anon;
