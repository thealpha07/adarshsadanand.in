-- 0004_learning.sql
-- "What I'm learning" on the homepage, edited from the vault's Homepage tab.
-- Same pattern as every other table: the admin writes the table, visitors read a filtered view.
-- Safe to run once; the seed rows at the bottom are skipped if topics already exist.

create table if not exists public.learning (
  id uuid primary key default gen_random_uuid(),
  topic text not null check (length(topic) between 1 and 60),
  focus text check (length(focus) <= 240),               -- what exactly, in one line
  stage text not null default 'started'
    check (stage in ('started', 'practising', 'applying')),
  started_on date,
  link text check (link is null or link ~ '^https://'),  -- optional course, repo or notes
  visible boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists learning_touch on public.learning;
create trigger learning_touch before update on public.learning
  for each row execute function public.touch_updated_at();

alter table public.learning enable row level security;
drop policy if exists "admin full access" on public.learning;
create policy "admin full access" on public.learning
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace view public.learning_public with (security_barrier = true) as
  select id, topic, focus, stage, started_on, link, sort_order
  from public.learning
  where visible;

revoke all on table public.learning from anon, public;
grant select on public.learning_public to anon, authenticated;

-- Starting topics. Edit or hide them from the vault.
insert into public.learning (topic, focus, stage, started_on, sort_order)
select * from (values
  ('Node.js', 'Server-side JavaScript: the event loop, Express and building REST APIs.', 'started', date '2026-10-01', 10),
  ('Risk management', 'How organisations identify, measure and control risk, alongside my GRC internship.', 'practising', date '2026-08-01', 20)
) as v(topic, focus, stage, started_on, sort_order)
where not exists (select 1 from public.learning);
