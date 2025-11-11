-- Delete the admin@test.com user account so they can sign up fresh
-- First delete from user_roles
DELETE FROM public.user_roles 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'admin@test.com'
);

-- Then delete the auth user
-- Note: This requires using the service role, which this migration has access to
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@test.com';
  
  IF admin_user_id IS NOT NULL THEN
    -- Delete from auth.users (cascades to other tables)
    DELETE FROM auth.users WHERE id = admin_user_id;
  END IF;
END $$;