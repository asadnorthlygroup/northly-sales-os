-- Grant supabase_auth_admin access to public schema so the auth trigger can write user profiles
grant usage on schema public to supabase_auth_admin;
grant all privileges on public.users to supabase_auth_admin;

-- Ensure the trigger function is owned by postgres (superuser) for security definer to work
alter function handle_new_user() owner to postgres;
