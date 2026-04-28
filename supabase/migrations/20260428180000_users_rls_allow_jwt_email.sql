-- Allow authenticated clients to read/update their public.users row when either:
--   - id matches auth.uid(), or
--   - email matches the email claim on the JWT (covers id/email drift until reconciled).
-- Requires prior RLS enable + policies from 20260227120000_handle_new_user.sql (or equivalent).

alter table public.users enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select to authenticated
  using (
    id = (select auth.uid())
    or (
      (select auth.jwt() ->> 'email') is not null
      and lower(btrim(email)) = lower(btrim((select auth.jwt() ->> 'email')))
    )
  );

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update to authenticated
  using (
    id = (select auth.uid())
    or (
      (select auth.jwt() ->> 'email') is not null
      and lower(btrim(email)) = lower(btrim((select auth.jwt() ->> 'email')))
    )
  )
  with check (
    id = (select auth.uid())
    or (
      (select auth.jwt() ->> 'email') is not null
      and lower(btrim(email)) = lower(btrim((select auth.jwt() ->> 'email')))
    )
  );
