-- 0005_book_covers.sql
-- Book covers you upload yourself, so the Library shows a clean cover instead of a library scan.
-- Public read (covers are shown to everyone), admin-only write, images only, 2 MB each.
-- The vault resizes every cover to 600 px wide WebP before uploading, so files stay small.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('book-covers', 'book-covers', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

drop policy if exists "book covers: admin insert" on storage.objects;
drop policy if exists "book covers: admin update" on storage.objects;
drop policy if exists "book covers: admin delete" on storage.objects;
create policy "book covers: admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'book-covers' and public.is_admin());
create policy "book covers: admin update" on storage.objects for update to authenticated
  using (bucket_id = 'book-covers' and public.is_admin());
create policy "book covers: admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'book-covers' and public.is_admin());
