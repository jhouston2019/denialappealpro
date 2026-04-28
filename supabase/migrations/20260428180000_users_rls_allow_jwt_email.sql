-- Optional: lets the browser Supabase client read/update public.users when email matches
-- the JWT, even if public.users.id != auth.uid() (legacy / mismatched id linkage).
-- Run if useAuth / client queries against public.users return no rows while logged in.

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select to authenticated
  using (
    id = (select auth.uid())
    or lower(trim(email)) = lower(trim(coalesce((select auth.jwt() ->> 'email'), '')))
  );

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update to authenticated
  using (
    id = (select auth.uid())
    or lower(trim(email)) = lower(trim(coalesce((select auth.jwt() ->> 'email'), '')))
  )
  with check (
    id = (select auth.uid())
    or lower(trim(email)) = lower(trim(coalesce((select auth.jwt() ->> 'email'), '')))
  );
