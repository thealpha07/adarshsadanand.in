-- seed.sql
-- First real content, so every page has something true to show on day one.

insert into public.posts (slug, title, subtitle, excerpt, body_md, tags, status, published_at)
values (
  'are-we-really-the-same-person',
  'Are we really the same person?',
  'The me you see and the me I know',
  'The person I know myself as is a unique and unknown being. Every conversation I''ve had has built a version of me in someone else''s mind.',
  E'The person I know myself as is a unique and unknown being.\n\nAll my conversations and interactions have led to the creation of a version of me in everyone''s mind. A friend holds one. A colleague holds another. Someone I met once holds a sketch.\n\n> If one takes all these versions and brings them together, will the person born from that accumulation really be the me I know I am?',
  array['identity', 'perception'],
  'published',
  now()
)
on conflict (slug) do nothing;

insert into public.books (title, author, isbn, cover_url, shelf, started_on)
values ('Tuesdays with Morrie', 'Mitch Albom', '9780385484510',
        'https://covers.openlibrary.org/b/isbn/9780385484510-L.jpg', 'reading', current_date);

insert into public.people (slug, alias, context, met_label, impression_headline, first_impression,
                           match_kind, match_value, match_reason, visibility, sort_order)
values ('lighthouse', 'Lighthouse', 'Since I was born', '2000',
        'Standing tall, showing me where to go',
        'Whenever I lose my way, they shed a light and help me reach the shore.',
        'A lighthouse', 'Standing tall', 'Always there, always directing me where to go.',
        'public', 1)
on conflict (slug) do nothing;
