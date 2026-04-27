-- Run in Supabase SQL editor (or via CLI) on your project.
-- Creates a public.users row for every new auth user. Adjust if your schema differs.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, is_paid, plan_limit)
  values (new.id, coalesce(new.email, ''), false, 0)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Supabase: trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS: read/update own row from the browser client (for useAuth, queue viewed, etc.)
alter table public.users enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Appeals: client reads (denials banner) with RLS; writes remain server / service role.
alter table if exists public.appeals enable row level security;
drop policy if exists "appeals_select_own" on public.appeals;
create policy "appeals_select_own" on public.appeals
  for select to authenticated
  using (user_id = (select auth.uid()));
