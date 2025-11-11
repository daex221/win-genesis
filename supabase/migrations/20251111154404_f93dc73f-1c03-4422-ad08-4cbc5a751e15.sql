-- Grant admin role to admin@test.com after signup
SELECT public.grant_admin_by_email('admin@test.com');