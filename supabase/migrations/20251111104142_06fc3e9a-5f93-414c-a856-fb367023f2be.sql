-- Create test admin user function
-- This will create a user with email zmeena@admin.com and password 1234567890
-- and assign them the admin role

-- First, let's check if a helper function exists to create users
-- Since we can't directly insert into auth.users, we'll create the role assignment
-- The user will need to sign up with email: zmeena@admin.com and password: 1234567890

-- Note: You must first create the account through the UI or auth API with:
-- Email: zmeena@admin.com
-- Password: 1234567890

-- This migration will grant admin role to that user once they sign up
-- Using a known UUID pattern so we can reference it

-- Create a function to grant admin role by email
CREATE OR REPLACE FUNCTION public.grant_admin_by_email(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Find user by email from auth.users
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;

  -- If user exists, grant admin role
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, app_role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, app_role) DO NOTHING;
  END IF;
END;
$$;

-- Grant admin role to test account (will only work after the account is created)
SELECT public.grant_admin_by_email('zmeena@admin.com');