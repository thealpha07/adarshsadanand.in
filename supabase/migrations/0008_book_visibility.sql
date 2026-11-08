-- 0008_book_visibility.sql
-- 1. Hide a book from the public Library (it stays in the vault). Design: docs/adr/0013-hidden-books.md
-- 2. Drop the old books.author column: authors live in book_credits since 0007 (the "contract" step of ADR 0012).
-- Every existing book stays public. Safe to run more than once.
-- After this runs, 0007 can't be re-run on this database (its backfill reads books.author); it doesn't need to be.

begin;

-- ---------------------------------------------------------------------------
-- 1. Visibility: same field name and values as people, but books default to public
-- ---------------------------------------------------------------------------
alter table public.books add column if not exists visibility text not null default 'public';
alter table public.books drop constraint if exists books_visibility_check;
alter table public.books add constraint books_visibility_check check (visibility in ('public', 'private'));

-- save_book() learns the new field (same signature as 0007, so the vault calls it the same way).
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
    finished_on     = (nullif(p_book->>'finished_on', ''))::date,
    -- Missing means "keep what it is": a save that doesn't mention visibility (an old browser tab, a script)
    -- must never hide or un-hide a book. New books start public from the column default.
    visibility      = coalesce(nullif(p_book->>'visibility', ''), visibility)
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

-- The public view now leaves hidden books out (otherwise the same as 0007).
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
  from public.books b
  -- Hidden books never leave the database for visitors: not in lists, counts, search or the homepage.
  where b.visibility = 'public';

revoke all on public.books_public from anon, authenticated, public;
grant select on public.books_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Contract: remove the frozen author column (nothing reads or writes it since 0007)
-- ---------------------------------------------------------------------------
alter table public.books drop column if exists author;

commit;
