-- security.sql: read-only check. Safe to run any time; it changes nothing.
-- Answers one question per object: can a visitor (role "anon") read it?
--
-- Expected:
--   tables (posts, books, people, anecdotes, vault_files, admins): rls_on = true,  anon_can_select = false
--   views  (*_public):                                             rls_on = false, anon_can_select = true

select
  c.relname                                         as object,
  case c.relkind when 'r' then 'table' when 'v' then 'view' end as kind,
  c.relrowsecurity                                  as rls_on,
  has_table_privilege('anon', c.oid, 'select')      as anon_can_select,
  has_table_privilege('anon', c.oid, 'insert')      as anon_can_insert
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('posts', 'books', 'people', 'anecdotes', 'vault_files', 'admins',
                    'posts_public', 'books_public', 'people_public', 'anecdotes_public')
order by kind, object;
