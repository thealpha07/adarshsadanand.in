-- security.sql: read-only check. Safe to run any time; it changes nothing.
-- Answers one question per object: can a visitor (role "anon") read it?
--
-- Expected:
--   tables (posts, books, people, anecdotes, vault_files, admins, learning,
--           book_credits, book_genres):                            rls_on = true,  anon_can_select = false
--   genres (the Library's filter list):                            rls_on = true,  anon_can_select = true
--   views  (*_public):                                             rls_on = false, anon_can_select = true
--   check  "books_public shows a private book":                     anon_can_select = false (0008)

select
  c.relname                                         as object,
  case c.relkind when 'r' then 'table' when 'v' then 'view' end as kind,
  c.relrowsecurity                                  as rls_on,
  has_table_privilege('anon', c.oid, 'select')      as anon_can_select,
  has_table_privilege('anon', c.oid, 'insert')      as anon_can_insert
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('posts', 'books', 'people', 'anecdotes', 'vault_files', 'admins', 'learning',
                    'book_credits', 'book_genres', 'genres',
                    'posts_public', 'books_public', 'people_public', 'anecdotes_public', 'learning_public')
union all
-- A hidden (private) book must never reach visitors. "anon_can_select" here means: does the public view show one?
select 'books_public shows a private book', 'check', null,
       exists (select 1 from public.books_public p join public.books b on b.id = p.id where b.visibility = 'private'),
       null
order by kind, object;
