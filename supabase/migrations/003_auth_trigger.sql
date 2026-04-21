-- Auto-create user profile on first Google OAuth login
-- Maps known email addresses to their pre-assigned roles

create or replace function handle_new_user()
returns trigger as $$
declare
  assigned_role user_role;
begin
  -- Map email to role
  assigned_role := case new.email
    when 'asad@northlygroup.com'   then 'admin'::user_role
    when 'abdul@northlygroup.com'  then 'admin'::user_role
    when 'asif@northlygroup.com'   then 'ae'::user_role
    when 'andrew@northlygroup.com' then 'ae'::user_role
    when 'hamza@northlygroup.com'  then 'ae'::user_role
    when 'nick@northlygroup.com'   then 'ae'::user_role
    when 'arvin@northlygroup.com'  then 'sdr'::user_role
    when 'preksha@northlygroup.com' then 'sdr'::user_role
    else 'readonly'::user_role
  end;

  insert into public.users (id, email, full_name, role, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    assigned_role,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set
      email      = excluded.email,
      full_name  = coalesce(excluded.full_name, users.full_name),
      avatar_url = coalesce(excluded.avatar_url, users.avatar_url),
      updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

-- Fire on every new auth signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
