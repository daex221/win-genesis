-- Add unique constraint to user_roles table
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_app_role_key UNIQUE (user_id, app_role);

-- Now grant admin role to admin@test.com
-- Note: The user must first sign up with this email before this will work
SELECT public.grant_admin_by_email('admin@test.com');