-- 0006_half_star_ratings.sql
-- Book ratings in half steps: 0.5, 1, 1.5 … 5 (was whole numbers 1–5).
-- Existing ratings keep their value (4 stays 4.0). Safe to run more than once.
--
-- Postgres won't change the type of a column a view reads, so the public view is
-- dropped and recreated inside the same transaction. Visitors never see it missing.

begin;

drop view if exists public.books_public;

-- Remove whichever check currently guards rating (its name depends on how it was created).
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
    where con.conrelid = 'public.books'::regclass and con.contype = 'c' and att.attname = 'rating'
  loop
    execute format('alter table public.books drop constraint %I', c.conname);
  end loop;
end $$;

-- numeric(2,1) holds one digit before and one after the point: exactly 0.5 to 5.0.
alter table public.books alter column rating type numeric(2,1) using rating::numeric(2,1);

-- 0.5 to 5, and only whole or half values (4.3 is refused).
alter table public.books add constraint books_rating_half_steps
  check (rating between 0.5 and 5 and rating * 2 = trunc(rating * 2));

-- Same columns, same rules as 0001_schema.sql: the note is shown only when note_public is on.
create view public.books_public with (security_barrier = true) as
  select id, title, author, isbn, cover_url, shelf, rating, recommended, recommend_reason,
         case when note_public then note end as note,
         started_on, finished_on, created_at
  from public.books;

-- Read-only for everyone. Supabase's default privileges would otherwise give signed-in users
-- insert/update/delete on a new view, and a view runs as its owner, past row-level security.
revoke all on public.books_public from anon, authenticated, public;
grant select on public.books_public to anon, authenticated;

commit;
