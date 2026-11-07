-- 0007_library_genres_credits.sql
-- Library: format, fiction/non-fiction, genres, credits with roles (author, story, art, translator, editor),
-- translation details, series and volumes, and a one-liner for every book. Design: docs/adr/0012-library-catalogue.md
--
-- Existing books keep working: each "A, B and C" in the old author column becomes Author credits,
-- every book becomes format "book", and recommend_reason becomes one_liner.
-- The old author column stays, unused, until a later migration drops it (expand, then contract).
-- Safe to run more than once.

begin;

-- ---------------------------------------------------------------------------
-- 1. New columns on books
-- ---------------------------------------------------------------------------
alter table public.books add column if not exists format text not null default 'book';
alter table public.books add column if not exists category text;
alter table public.books add column if not exists original_title text;
alter table public.books add column if not exists translated_from text;
alter table public.books add column if not exists series text;
alter table public.books add column if not exists series_number smallint;
alter table public.books add column if not exists volumes_read smallint;
alter table public.books add column if not exists volumes_total smallint;

-- The one-liner is for every book now, not only recommended ones.
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'books' and column_name = 'recommend_reason') then
    alter table public.books rename column recommend_reason to one_liner;
  end if;
end $$;

-- Rules (dropped first so a re-run replaces rather than duplicates them).
alter table public.books drop constraint if exists books_format_check;
alter table public.books add constraint books_format_check check (format in ('book', 'manga', 'light_novel', 'graphic_novel'));
alter table public.books drop constraint if exists books_category_check;
alter table public.books add constraint books_category_check check (category in ('fiction', 'nonfiction'));
alter table public.books drop constraint if exists books_one_liner_length;
alter table public.books add constraint books_one_liner_length check (char_length(one_liner) <= 160);
alter table public.books drop constraint if exists books_series_number_check;
-- Each rule says "empty is fine" explicitly: in SQL, null AND false is false, so a rule written only
-- as "series_number > 0 and series is not null" would reject every book without a series.
alter table public.books add constraint books_series_number_check
  check (series_number is null or (series_number > 0 and series is not null));
alter table public.books drop constraint if exists books_volumes_check;
alter table public.books add constraint books_volumes_check
  check ((volumes_read is null or volumes_read >= 0)
     and (volumes_total is null or volumes_total >= 1)
     and (volumes_read is null or volumes_total is null or volumes_read <= volumes_total));

-- Kept for one release so nothing breaks mid-deploy; replaced by book_credits.
alter table public.books alter column author drop not null;
comment on column public.books.author is 'Deprecated: replaced by book_credits (0007). No longer written; dropped in a later migration.';

-- ---------------------------------------------------------------------------
-- 2. Genres: a fixed list you can extend in the vault, and the link to books
-- ---------------------------------------------------------------------------
create table if not exists public.genres (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null unique,
  kind text not null check (kind in ('fiction', 'nonfiction', 'any')),
  sort smallint not null default 100
);

insert into public.genres (slug, name, kind, sort) values
  ('literary-fiction',    'Literary fiction',      'fiction',    10),
  ('historical-fiction',  'Historical fiction',    'fiction',    20),
  ('romance',             'Romance',               'fiction',    30),
  ('mythology',           'Mythology',             'fiction',    40),
  ('fantasy',             'Fantasy',               'fiction',    50),
  ('mystery-thriller',    'Mystery and thriller',  'fiction',    60),
  ('comfort-reads',       'Comfort reads',         'fiction',    70),
  ('self-help',           'Self-help',             'nonfiction', 110),
  ('psychology',          'Psychology',            'nonfiction', 120),
  ('philosophy',          'Philosophy',            'nonfiction', 130),
  ('business-management', 'Business and management', 'nonfiction', 140),
  ('history-politics',    'History and politics',  'nonfiction', 150),
  ('memoir-letters',      'Memoir and letters',    'nonfiction', 160),
  ('classics',            'Classics',              'any',        210),
  ('humour',              'Humour',                'any',        220)
on conflict (slug) do nothing;

create table if not exists public.book_genres (
  book_id uuid not null references public.books (id) on delete cascade,
  genre text not null references public.genres (slug) on update cascade,
  primary key (book_id, genre)
);

-- ---------------------------------------------------------------------------
-- 3. Credits: who made the book, and what they did
-- ---------------------------------------------------------------------------
create table if not exists public.book_credits (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  role text not null check (role in ('author', 'story', 'art', 'translator', 'editor')),
  position smallint not null default 0
);
create index if not exists book_credits_book_idx on public.book_credits (book_id, position);

-- Backfill: "Sandy Wight, Mick Hager and Steve Tyink" → three Author credits, in that order.
-- Only for books that have no credits yet, so a re-run adds nothing.
insert into public.book_credits (book_id, name, role, position)
select b.id, trim(part.name), 'author', (part.n - 1)::smallint
from public.books b
cross join lateral regexp_split_to_table(b.author, '\s*,\s*|\s+and\s+|\s*&\s*') with ordinality as part(name, n)
where b.author is not null and trim(part.name) <> ''
  and not exists (select 1 from public.book_credits c where c.book_id = b.id);

-- ---------------------------------------------------------------------------
-- 4. Who may read and write
-- ---------------------------------------------------------------------------
alter table public.genres enable row level security;
alter table public.book_genres enable row level security;
alter table public.book_credits enable row level security;

drop policy if exists "admin full access" on public.genres;
drop policy if exists "anyone can read" on public.genres;
drop policy if exists "admin full access" on public.book_genres;
drop policy if exists "admin full access" on public.book_credits;
create policy "anyone can read" on public.genres for select to anon, authenticated using (true);
create policy "admin full access" on public.genres for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin full access" on public.book_genres for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin full access" on public.book_credits for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Visitors read the genre list (for the filter) and nothing else directly; credits and genres
-- reach them through books_public, like every other public field.
-- Signed-in users get table access explicitly rather than through Supabase's defaults; the policies
-- above still limit every write (and every read of credits and links) to the admin.
revoke all on public.genres, public.book_genres, public.book_credits from anon, public;
grant select on public.genres to anon;
grant select, insert, update, delete on public.genres, public.book_genres, public.book_credits to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Save a book, its credits and its genres in one step
-- ---------------------------------------------------------------------------
-- Runs as the caller (security invoker), so row-level security still applies: only the admin can save.
-- One transaction: a dropped connection can't leave a book with half its credits.
create or replace function public.save_book(p_id uuid, p_book jsonb, p_credits jsonb, p_genres text[])
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid := p_id;
begin
  if nullif(trim(p_book->>'title'), '') is null then
    raise exception 'A book needs a title.';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(coalesce(p_credits, '[]')) c
    where c->>'role' in ('author', 'story') and nullif(trim(c->>'name'), '') is not null
  ) then
    raise exception 'Add at least one author (or, for manga, who wrote the story).';
  end if;

  if v_id is null then
    insert into books (title) values (trim(p_book->>'title')) returning id into v_id;
  end if;

  update books set
    title           = trim(p_book->>'title'),
    original_title  = nullif(trim(p_book->>'original_title'), ''),
    format          = coalesce(nullif(p_book->>'format', ''), 'book'),
    category        = nullif(p_book->>'category', ''),
    isbn            = nullif(regexp_replace(coalesce(p_book->>'isbn', ''), '[^0-9Xx]', '', 'g'), ''),
    cover_url       = nullif(trim(p_book->>'cover_url'), ''),
    shelf           = p_book->>'shelf',
    rating          = (nullif(p_book->>'rating', ''))::numeric,
    recommended     = coalesce((p_book->>'recommended')::boolean, false),
    one_liner       = nullif(trim(p_book->>'one_liner'), ''),
    note            = nullif(trim(p_book->>'note'), ''),
    note_public     = coalesce((p_book->>'note_public')::boolean, false),
    translated_from = nullif(trim(p_book->>'translated_from'), ''),
    series          = nullif(trim(p_book->>'series'), ''),
    series_number   = (nullif(p_book->>'series_number', ''))::smallint,
    volumes_read    = (nullif(p_book->>'volumes_read', ''))::smallint,
    volumes_total   = (nullif(p_book->>'volumes_total', ''))::smallint,
    started_on      = (nullif(p_book->>'started_on', ''))::date,
    finished_on     = (nullif(p_book->>'finished_on', ''))::date
  where id = v_id;
  if not found then
    raise exception 'That book no longer exists.';
  end if;

  delete from book_credits where book_id = v_id;
  insert into book_credits (book_id, name, role, position)
  select v_id, trim(c->>'name'), c->>'role', (n - 1)::smallint
  from jsonb_array_elements(coalesce(p_credits, '[]')) with ordinality as x(c, n)
  where nullif(trim(c->>'name'), '') is not null;

  delete from book_genres where book_id = v_id;
  insert into book_genres (book_id, genre)
  select distinct v_id, g from unnest(coalesce(p_genres, '{}')) as g;

  return v_id;
end $$;

revoke all on function public.save_book(uuid, jsonb, jsonb, text[]) from public, anon;
grant execute on function public.save_book(uuid, jsonb, jsonb, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. The public view, with credits and genres folded in
-- ---------------------------------------------------------------------------
drop view if exists public.books_public;
create view public.books_public with (security_barrier = true) as
  select b.id, b.title, b.original_title, b.format, b.category, b.isbn, b.cover_url, b.shelf, b.rating,
         b.recommended, b.one_liner,
         case when b.note_public then b.note end as note,
         b.translated_from, b.series, b.series_number, b.volumes_read, b.volumes_total,
         b.started_on, b.finished_on, b.created_at,
         coalesce((select json_agg(json_build_object('name', c.name, 'role', c.role) order by c.position, c.name)
                   from public.book_credits c where c.book_id = b.id), '[]'::json) as credits,
         coalesce((select array_agg(bg.genre order by g.sort, g.name)
                   from public.book_genres bg join public.genres g on g.slug = bg.genre where bg.book_id = b.id), '{}') as genres
  from public.books b;

-- Read-only for everyone (see 0006 for why authenticated is revoked too).
revoke all on public.books_public from anon, authenticated, public;
grant select on public.books_public to anon, authenticated;

commit;
