-- 0001_schema.sql
-- Tables, public views and Row Level Security for adarshsadanand.in.
--
-- Security model (read this first):
--   * Every table has RLS ON. With RLS on and no policy, a role can do nothing.
--   * Visitors (role "anon") never touch tables. They read *_public VIEWS that
--     already drop drafts, private rows and private columns.
--   * Only a user listed in public.admins, signed in WITH 2FA (aal2), can write.
--     A stolen password alone is not enough.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Admins and the one permission check everything uses
-- ---------------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- No policies: nobody reads or edits this table through the API.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid())
     and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;
comment on function public.is_admin() is 'True only for a listed admin whose session passed 2FA.';

-- Keeps updated_at honest without the app having to remember.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Thoughts (blog posts)
-- ---------------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(title) between 1 and 200),
  subtitle text,
  excerpt text,
  body_md text not null default '',
  cover_path text,
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_needs_date check (status = 'draft' or published_at is not null)
);
create trigger posts_touch before update on public.posts for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Library
-- ---------------------------------------------------------------------------
create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  isbn text,
  cover_url text,
  shelf text not null default 'want' check (shelf in ('want', 'reading', 'read')),
  rating smallint check (rating between 1 and 5),
  recommended boolean not null default false,
  recommend_reason text,
  note text,
  note_public boolean not null default false,
  started_on date,
  finished_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger books_touch before update on public.books for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- People journal
-- ---------------------------------------------------------------------------
create table public.people (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  alias text not null,
  initials text check (length(initials) <= 4),          -- private, never in the public view
  context text,                                          -- general only: "College", "Since I was born"
  met_label text,                                        -- "2000", "Oct 2026"
  impression_headline text,
  first_impression text,
  traits text[] not null default '{}',
  match_kind text,
  match_value text,
  match_reason text,
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger people_touch before update on public.people for each row execute function public.touch_updated_at();

create table public.anecdotes (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  occurred_label text,
  body text not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
create index anecdotes_person_idx on public.anecdotes (person_id);

-- ---------------------------------------------------------------------------
-- Vault file records (the bytes live in the private "vault" storage bucket)
-- ---------------------------------------------------------------------------
create table public.vault_files (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  storage_path text not null unique,
  size_bytes bigint not null check (size_bytes between 0 and 52428800),
  mime_type text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security: admin-only on every table
-- ---------------------------------------------------------------------------
alter table public.posts enable row level security;
alter table public.books enable row level security;
alter table public.people enable row level security;
alter table public.anecdotes enable row level security;
alter table public.vault_files enable row level security;

create policy "admin full access" on public.posts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin full access" on public.books for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin full access" on public.people for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin full access" on public.anecdotes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin full access" on public.vault_files for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Public views: the only thing visitors can read
-- (Views run as their owner, so they read past RLS; their WHERE clauses are the filter.)
-- ---------------------------------------------------------------------------
create view public.posts_public with (security_barrier = true) as
  select id, slug, title, subtitle, excerpt, body_md, cover_path, tags, status, published_at, created_at, updated_at
  from public.posts
  where status = 'published' and published_at <= now();

create view public.books_public with (security_barrier = true) as
  select id, title, author, isbn, cover_url, shelf, rating, recommended, recommend_reason,
         case when note_public then note end as note,
         started_on, finished_on, created_at
  from public.books;

create view public.people_public with (security_barrier = true) as
  select id, slug, alias, context, met_label, impression_headline, first_impression, traits,
         match_kind, match_value, match_reason, sort_order, created_at
  from public.people
  where visibility = 'public';

create view public.anecdotes_public with (security_barrier = true) as
  select a.id, a.person_id, a.occurred_label, a.body, a.created_at
  from public.anecdotes a
  join public.people p on p.id = a.person_id
  where a.is_public and p.visibility = 'public';

revoke all on public.posts, public.books, public.people, public.anecdotes, public.vault_files, public.admins from anon;
grant select on public.posts_public, public.books_public, public.people_public, public.anecdotes_public to anon, authenticated;
