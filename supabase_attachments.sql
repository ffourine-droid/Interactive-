-- ==========================================
-- AZILEARN COMMUNITY - ATTACHMENTS SQL SCHEMA
-- ==========================================

-- 1. Create the post_attachments table with dual links (post or reply relationship)
create table if nulls not exists public.post_attachments (
    id uuid default gen_random_uuid() primary key,
    post_id uuid references public.posts(id) on delete cascade,
    reply_id uuid references public.replies(id) on delete cascade,
    file_name text not null,
    file_type text not null check (file_type in ('image', 'pdf', 'pptx', 'docx')),
    storage_path text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    -- Constraint: Each attachment belongs to either a post OR a reply (not both and at least one)
    constraint attachment_belongs_exactly_to_one check (
        (post_id is not null and reply_id is null) or
        (post_id is null and reply_id is not null)
    )
);

-- Enable RLS (Row Level Security) on the metadata table
alter table public.post_attachments enable row level security;

-- Setup Access Policies for post_attachments
create policy "Allow everyone to read attachments" 
on public.post_attachments 
for select 
using (true);

create policy "Allow authenticated users to upload and link attachments" 
on public.post_attachments 
for insert 
with check (auth.role() = 'authenticated');

create policy "Allow teachers and owners to delete attachments" 
on public.post_attachments 
for delete 
using (
    -- Allow delete if authenticated user is the post author, reply author, or a teacher
    exists (
        select 1 from public.posts p 
        where p.id = post_attachments.post_id and p.author_id = auth.uid()
    ) or
    exists (
        select 1 from public.replies r
        where r.id = post_attachments.reply_id and r.author_id = auth.uid()
    ) or
    -- Allow teachers
    exists (
        select 1 from public.teachers t
        where t.id = auth.uid()
    )
);


-- 2. Supabase Storage Bucket & Object Policies Configuration
-- Assumes bucket "community-attachments" already exists

-- policy for selecting/reading attachments publically
create policy "Everyone can view attachments"
on storage.objects for select
using ( bucket_id = 'community-attachments' );

-- policy for inserting/uploading files
create policy "Authenticated users can upload attachments"
on storage.objects for insert
with check (
    bucket_id = 'community-attachments' 
    and auth.role() = 'authenticated'
);

-- policy for deleting attachments (teachers or owners)
create policy "Authenticated users can delete attachments"
on storage.objects for delete
using (
    bucket_id = 'community-attachments' 
    and auth.role() = 'authenticated'
);
