-- Run in Supabase SQL editor (billing gate reads public.users.is_paid by email).
alter table public.users
  add column if not exists is_paid boolean default false;

-- Optional: mark a specific account paid after fixing email-based lookups.
-- update public.users
-- set is_paid = true
-- where email = lower(trim('you@example.com'));
