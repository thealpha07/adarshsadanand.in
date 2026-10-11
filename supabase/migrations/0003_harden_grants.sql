-- 0003_harden_grants.sql
-- Belt and braces: remove every direct privilege visitors could have on the base tables,
-- including grants inherited through PUBLIC and Supabase's default privileges.
-- RLS already returns zero rows to anon; this makes the database refuse outright.
-- Safe to run more than once.

revoke all on table public.posts, public.books, public.people, public.anecdotes,
                    public.vault_files, public.admins
  from anon, public;

-- Future tables in this schema start closed to visitors too.
alter default privileges in schema public revoke all on tables from anon;

-- Visitors keep exactly what they need: the four public views.
grant select on public.posts_public, public.books_public, public.people_public, public.anecdotes_public
  to anon, authenticated;
