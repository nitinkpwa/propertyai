-- Future: site-wide Smart Notification Bar broadcasts
-- Apply when ready to replace localStorage-backed admin broadcasts.

create table if not exists public.site_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text,
  icon text default '📢',
  href text,
  category text not null default 'general'
    check (category in ('maintenance','feature','holiday','market_report','builder_update','general')),
  audience text not null default 'all'
    check (audience in ('public','authenticated','buyer','all')),
  priority text not null default 'market'
    check (priority in ('critical','high','intelligence','market')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists site_announcements_active_idx
  on public.site_announcements (active, starts_at desc)
  where active = true;

alter table public.site_announcements enable row level security;

-- Public read of active announcements
create policy "Anyone can read active announcements"
  on public.site_announcements for select
  using (
    active = true
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
  );

-- Admin write (adjust to your admin check)
-- create policy "Admins manage announcements"
--   on public.site_announcements for all
--   using (public.is_admin())
--   with check (public.is_admin());
