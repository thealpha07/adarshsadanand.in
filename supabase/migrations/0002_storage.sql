-- 0002_storage.sql
-- Two buckets:
--   blog-images  public read, admin write. Covers and inline images for Thoughts.
--   vault        private. Downloads only through signed links that expire.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('blog-images', 'blog-images', true, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']),
  ('vault', 'vault', false, 52428800,
    array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic',
      'application/zip', 'application/x-zip-compressed',
      'text/plain', 'text/markdown'
    ])
on conflict (id) do nothing;

-- Anyone may read blog images (the bucket is public); only the admin may change them.
create policy "blog images: admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'blog-images' and public.is_admin());
create policy "blog images: admin update" on storage.objects for update to authenticated
  using (bucket_id = 'blog-images' and public.is_admin());
create policy "blog images: admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'blog-images' and public.is_admin());

-- The vault: every operation, admin with 2FA only.
create policy "vault: admin select" on storage.objects for select to authenticated
  using (bucket_id = 'vault' and public.is_admin());
create policy "vault: admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'vault' and public.is_admin());
create policy "vault: admin update" on storage.objects for update to authenticated
  using (bucket_id = 'vault' and public.is_admin());
create policy "vault: admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'vault' and public.is_admin());
