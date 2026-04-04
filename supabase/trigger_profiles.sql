-- Run this once in the Supabase SQL editor.
-- Creates a trigger that auto-inserts a profiles row whenever a new auth user
-- is created. Runs as security definer so it bypasses RLS.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar', '')
  );
  return new;
end;
$$;

-- Drop first so re-running is safe
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
