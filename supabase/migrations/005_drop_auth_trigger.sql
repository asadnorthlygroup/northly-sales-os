-- Drop the trigger-based approach (permission issues with supabase_auth_admin)
-- User profiles are now created via the /api/auth/sync API route using the service role key
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();
